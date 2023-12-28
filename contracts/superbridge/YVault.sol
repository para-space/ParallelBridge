// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "solmate/mixins/ERC4626.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {Gauge} from "./Gauge.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import {RescueFundsLib} from "./RescueFundsLib.sol";
import "openzeppelin-contracts/contracts/utils/math/Math.sol";

// add report external function (called from cron)
// call report from withdraw and deposit too (with timestamp check, settable by admin)
// pausable vault
// redeem all from strategy and detach
// reentrancy guard

contract YVault is Gauge, Ownable2Step, ERC4626 {
    using SafeTransferLib for ERC20;
    ERC20 public immutable token__;

    uint256 public totalIdle; // Amount of tokens that are in the vault
    uint256 public totalDebt; // Amount of tokens that strategy have borrowed

    uint256 public totalProfit; // Amount of tokens that strategy have earned
    uint256 public totalLoss; // Amount of tokens that strategy have lost
    uint256 public debtRatio; // Debt ratio for the Vault (in BPS, <= 10k)
    address public strategy; // address of the strategy contract
    uint256 public constant MAX_BPS = 10_000;
    struct UpdateLimitParams {
        bool isLock;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    error ConnectorUnavailable();
    error ZeroAmount();
    error DebtRatioTooHigh();
    error ZeroAddress();
    error InvestingAboveThreshold();
    error NotEnoughAssets();

    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event TokensDeposited(address depositor, uint256 depositAmount);
    event TokensInvested(uint256 amount);
    event TokensHarvested(uint256 amount);

    event TokensWithdrawn(
        address depositor,
        address receiver,
        uint256 depositAmount
    );

    event PendingTokensTransferred(
        address connector,
        address receiver,
        uint256 unlockedAmount,
        uint256 pendingAmount
    );
    event TokensPending(
        address connector,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount
    );
    event TokensUnlocked(
        address connector,
        address receiver,
        uint256 unlockedAmount
    );
    event WithdrawFromStrategy(uint256 withdrawn, uint256 loss);

    event StrategyReported(
        address strategy,
        uint256 profit,
        uint256 loss,
        uint256 debtPayment,
        uint256 totalProfit,
        uint256 totalLoss,
        uint256 totalDebt,
        uint256 credit,
        uint256 debtRatio
    );

    constructor(
        address token_,
        string memory name_,
        string memory symbol_
    ) ERC4626(ERC20(token_), name_, symbol_) {
        token__ = ERC20(token_);
    }

    function setDebtRatio(uint256 debtRatio_) external onlyOwner {
        if (debtRatio_ > MAX_BPS) revert DebtRatioTooHigh();
        debtRatio = debtRatio_;
    }

    function setStrategy(address strategy_) external onlyOwner {
        if (strategy_ == address(0)) revert ZeroAddress();
        strategy = strategy_;
    }

    /// @notice Returns the total quantity of all assets under control of this
    ///    Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @dev Explain to a developer any extra details
    /// @return total quantity of all assets under control of this
    ///    Vault
    function totalAssets() public view override returns (uint256) {
        return _totalAssets();
    }

    function _totalAssets() internal view returns (uint256) {
        return totalIdle + totalDebt;
    }

    function deposit(
        uint256 assets_,
        address receiver_
    ) public override returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        totalIdle += assets_;
        return super.deposit(assets_, receiver_);
    }

    function withdraw(
        uint256 assets_,
        address receiver_,
        address owner_
    ) public override returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (assets_ > totalIdle) revert NotEnoughAssets();

        totalIdle -= assets_;
        return super.withdraw(assets_, receiver_, owner_);
    }

    function withdrawFromStrategy(
        uint256 assets_
    ) external onlyOwner returns (uint256) {
        uint256 preBalance = token__.balanceOf(address(this));
        uint256 loss = IStrategy(strategy).withdraw(assets_);
        uint256 withdrawn = token__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt -= withdrawn;
        if (loss > 0) _reportLoss(loss);
        emit WithdrawFromStrategy(withdrawn, loss);
        return withdrawn;
    }

    function maxAvailableShares() public view returns (uint256) {
        return convertToShares(_totalAssets());
    }

    function report(
        uint256 profit_,
        uint256 loss_,
        uint256 debtPayment_
    ) external returns (uint256) {
        // Only approved strategies can call this function
        require(msg.sender == strategy, "Not a strategy");

        // No lying about total available to withdraw
        require(
            token__.balanceOf(msg.sender) >= profit_ + debtPayment_,
            "Insufficient balance for reporting"
        );

        // We have a loss to report, do it before the rest of the calculations
        if (loss_ > 0) _reportLoss(loss_);

        // Returns are always "realized profits"
        totalProfit += profit_;

        // Compute the line of credit the Vault is able to offer the Strategy (if any)
        uint256 credit = _creditAvailable();

        // Outstanding debt the Strategy wants to take back from the Vault (if any)
        // debtOutstanding <= StrategyParams.totalDebt
        uint256 debt = _debtOutstanding();
        uint256 debtPayment = Math.min(debtPayment_, debt);

        if (debtPayment > 0) {
            totalDebt -= debtPayment;
            debt -= debtPayment;
        }

        // Update the actual debt based on the full credit we are extending to the Strategy
        // or the returns if we are taking funds back
        // credit + strategies[msg.sender].totalDebt is always < debtLimit
        // At least one of credit or debt is always 0 (both can be 0)
        if (credit > 0) totalDebt += credit;

        // Give/take balance to Strategy, based on the difference between the reported profits
        // (if any), the debt payment (if any), the credit increase we are offering (if any),
        // and the debt needed to be paid off (if any)
        // This is just used to adjust the balance of tokens between the Strategy and
        // the Vault based on the Strategy's debt limit (as well as the Vault's).
        uint256 totalAvailable = profit_ + debtPayment;

        if (totalAvailable < credit) {
            // Credit surplus, give to Strategy
            totalIdle -= credit - totalAvailable;
            token__.safeTransfer(msg.sender, credit - totalAvailable);
        } else if (totalAvailable > credit) {
            // Credit deficit, take from Strategy
            totalIdle += totalAvailable - credit;
            token__.safeTransferFrom(
                msg.sender,
                address(this),
                totalAvailable - credit
            );
        }
        // else, don't do anything because it is balanced

        // Profit is locked and gradually released per block
        // compute current locked profit and replace with sum of current and new
        // uint256 lockedProfitBeforeLoss = _calculateLockedProfit() + profit - totalFees;

        // if (lockedProfitBeforeLoss > loss) {
        //     lockedProfit = lockedProfitBeforeLoss - loss;
        // } else {
        //     lockedProfit = 0;
        // }

        // Update reporting time
        // strategies[msg.sender].lastReport = block.timestamp;
        // lastReport = block.timestamp;

        emit StrategyReported(
            msg.sender,
            profit_,
            loss_,
            debtPayment,
            totalProfit,
            totalLoss,
            totalDebt,
            credit,
            debtRatio
        );

        if (debtRatio == 0) {
            // Take every last penny the Strategy has (Emergency Exit/revokeStrategy)
            // This is different than debt in order to extract *all* of the returns
            return IStrategy(msg.sender).estimatedTotalAssets();
        } else {
            // Otherwise, just return what we have as debt outstanding
            return debt;
        }
    }

    function _reportLoss(uint256 loss) internal {
        // Loss can only be up to the amount of debt issued to strategy
        require(totalDebt >= loss, "Loss exceeds total debt");
        // Adjust strategy's parameters by the loss
        totalLoss += loss;
        totalDebt -= loss;
    }

    function _creditAvailable() internal view returns (uint256) {
        uint256 vaultTotalAssets = _totalAssets();
        uint256 vaultDebtLimit = (debtRatio * vaultTotalAssets) / MAX_BPS;
        uint256 vaultTotalDebt = totalDebt;

        if (vaultDebtLimit <= vaultTotalDebt) return 0;

        // Start with debt limit left for the Strategy
        uint256 availableCredit = vaultDebtLimit - vaultTotalDebt;

        // Can only borrow up to what the contract has in reserve
        // NOTE: Running near 100% is discouraged
        return Math.min(availableCredit, totalIdle);
    }

    function creditAvailable() external view returns (uint256) {
        // @notice
        //     Amount of tokens in Vault a Strategy has access to as a credit line.

        //     This will check the Strategy's debt limit, as well as the tokens
        //     available in the Vault, and determine the maximum amount of tokens
        //     (if any) the Strategy may draw on.

        //     In the rare case the Vault is in emergency shutdown this will return 0.
        // @param strategy The Strategy to check. Defaults to caller.
        // @return The quantity of tokens available for the Strategy to draw on.

        return _creditAvailable();
    }

    function _debtOutstanding() internal view returns (uint256) {
        // See note on `debtOutstanding()`.
        if (debtRatio == 0) {
            return totalDebt;
        }

        uint256 debtLimit = ((debtRatio * _totalAssets()) / MAX_BPS);

        if (totalDebt <= debtLimit) return 0;
        else return totalDebt - debtLimit;
    }

    function debtOutstanding() external view returns (uint256) {
        // @notice
        //     Determines if `strategy` is past its debt limit and if any tokens
        //     should be withdrawn to the Vault.
        // @param strategy The Strategy to check. Defaults to the caller.
        // @return The quantity of tokens to withdraw.

        return _debtOutstanding();
    }

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}

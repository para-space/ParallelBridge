// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

import "solmate/mixins/ERC4626.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {Gauge} from "./Gauge.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import "./RescueFundsLib.sol";
import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";


// add rebalance external function (called from cron)
// call rebalance from withdraw and deposit too (with timestamp check, settable by admin)
// pausable vault
// redeem all from strategy and detach
// reentrancy guard




contract ParallelVault is Gauge, Ownable2Step, ERC4626, ReentrancyGuard {
    using SafeTransferLib for ERC20;
    ERC20 public immutable token__;

    uint256 public totalIdle; // Amount of tokens that are in the vault
    uint256 public totalDebt; // Amount of tokens that strategy have borrowed
    uint256 public debtRatio; // Debt ratio for the Vault (in BPS, <= 10k)
    uint128 public lastRebalanceTimestamp; // Timstamp of last rebalance
    uint128 public rebalanceingDelay; // Delay between rebalances
    address public strategy; // address of the strategy contract
    bool public emergencyShutdown; // if true, no funds can be invested in the strategy

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
    error InvestingAboveThreshold();
    error NotEnoughAssets();
    error VaultShutdown();

    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event TokensDeposited(address depositor, uint256 depositAmount);
    event TokensInvested(uint256 amount);
    event TokensHarvested(uint256 amount);

    event TokensWithdrawn(
        address depositor,
        address receiver,
        uint256 depositAmount
    );

    event WithdrawFromStrategy(uint256 withdrawn);

    event Rebalanced(
        uint256 totalIdle,
        uint256 totalDebt,
        uint256 credit,
        uint256 debtOutstanding
    );

        event ShutdownStateUpdated(
        bool shutdownState
    );

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }
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

    function setRebalanceingDelay(address rebalanceingDelay_) external onlyOwner {
        rebalanceingDelay = rebalanceingDelay_;
    }

    function updateEmergencyShutdownState(bool shutdownState_) external onlyOwner {
        if (shutdownState_) {
            // If we're exiting emergency shutdown, we need to empty strategy
            _withdrawAllFromStrategy();
        }
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
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
    ) public override nonReentrant notShutdown returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        totalIdle += assets_;
        _checkDelayAndRebalance();
        return super.deposit(assets_, receiver_);
    }

    function withdraw(
        uint256 assets_,
        address receiver_,
        address owner_
    ) external override nonReentrant notShutdown returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (assets_ > totalIdle) revert NotEnoughAssets();

        totalIdle -= assets_;
        _checkDelayAndRebalance();
        return super.withdraw(assets_, receiver_, owner_);
    }

    function withdrawFromStrategy(
        uint256 assets_
    ) external onlyOwner returns (uint256) {
        _withdrawFromStrategy(assets_);
    }

    function _withdrawFromStrategy(
        uint256 assets_
    ) internal returns (uint256) {
        uint256 preBalance = token__.balanceOf(address(this));
        IStrategy(strategy).withdraw(assets_);
        uint256 withdrawn = token__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt -= withdrawn;
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }

    function _withdrawAllFromStrategy() internal returns (uint256) {
        uint256 preBalance = token__.balanceOf(address(this));
        IStrategy(strategy).withdrawAll();
        uint256 withdrawn = token__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt = 0;
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }


    function maxAvailableShares() public view returns (uint256) {
        return convertToShares(_totalAssets());
    }

    function rebalance() external notShutdown returns (uint256) {
        _rebalance();
    }

    function _checkDelayAndRebalance() internal returns (uint256) {

        uint128 timeElapsed = uint128(block.timestamp) - lastRebalanceTimestamp;
        if (timeElapsed >= rebalanceingDelay) {
            return _rebalance();
        }
    }

    function _rebalance() internal returns (uint256) {

        lastRebalanceTimestamp = uint128(block.timestamp);
        // Compute the line of credit the Vault is able to offer the Strategy (if any)
        uint256 credit = _creditAvailable();
        uint256 pendingDebt = _debtOutstanding();

        if (credit>0) {
            // Credit surplus, give to Strategy
            totalIdle -= credit;
            totalDebt += credit;
            token__.safeTransfer(strategy, credit);
            IStrategy(strategy).invest();

        } else if (pendingDebt > 0) {
            // Credit deficit, take from Strategy
            _withdrawFromStrategy(pendingDebt);
        }

        emit Rebalanced(totalIdle, totalDebt, credit, pendingDebt);
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

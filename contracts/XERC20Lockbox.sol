// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.4 <0.9.0;

import {IXERC20} from "./interfaces/IXERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IXERC20Lockbox} from "./interfaces/IXERC20Lockbox.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";

contract XERC20Lockbox is Ownable, IXERC20Lockbox {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    /**
     * @notice The XERC20 token of this contract
     */
    IXERC20 public immutable XERC20;

    /**
     * @notice The ERC20 token of this contract
     */
    IERC20 public immutable ERC20;

    /**
     * @notice Whether the ERC20 token is the native gas token of this chain
     */
    bool public immutable IS_GAS_TOKEN;

    /**
     * @notice Exchange rate between xERC20 and ERC20
     */
    uint256 public exchangeRate;

    /**
     * @notice Address of the strategy contract
     */
    address public strategy;

    /**
     * @notice Constructor
     *
     * @param _xerc20 The address of the XERC20 contract
     * @param _erc20 The address of the ERC20 contract
     * @param _isGasToken Whether the ERC20 token is the native gas token of this chain or not
     */

    constructor(
        address _xerc20,
        address _erc20,
        bool _isGasToken,
        address initialOwner
    ) {
        _transferOwnership(initialOwner);
        XERC20 = IXERC20(_xerc20);
        ERC20 = IERC20(_erc20);
        IS_GAS_TOKEN = _isGasToken;
        exchangeRate = 1e18;
    }

    /**
     * @notice Deposit native tokens into the lockbox
     */

    function depositGasToken() public payable {
        if (!IS_GAS_TOKEN) revert IXERC20Lockbox_NotGasToken();

        _deposit(msg.sender, msg.value);
    }

    /**
     * @notice Deposit ERC20 tokens into the lockbox
     *
     * @param _amount The amount of tokens to deposit
     */

    function deposit(uint256 _amount) external {
        if (IS_GAS_TOKEN) revert IXERC20Lockbox_GasToken();

        _deposit(msg.sender, _amount);
    }

    /**
     * @notice Deposit ERC20 tokens into the lockbox, and send the XERC20 to a user
     *
     * @param _to The user to send the XERC20 to
     * @param _amount The amount of tokens to deposit
     */

    function depositTo(address _to, uint256 _amount) external {
        if (IS_GAS_TOKEN) revert IXERC20Lockbox_GasToken();

        _deposit(_to, _amount);
    }

    /**
     * @notice Deposit the native asset into the lockbox, and send the XERC20 to a user
     *
     * @param _to The user to send the XERC20 to
     */

    function depositGasTokenTo(address _to) public payable {
        if (!IS_GAS_TOKEN) revert IXERC20Lockbox_NotGasToken();

        _deposit(_to, msg.value);
    }

    /**
     * @notice Withdraw ERC20 tokens from the lockbox
     *
     * @param _amount The amount of tokens to withdraw
     */

    function withdraw(uint256 _amount) external {
        _withdraw(msg.sender, _amount);
    }

    /**
     * @notice Withdraw tokens from the lockbox
     *
     * @param _to The user to withdraw to
     * @param _amount The amount of tokens to withdraw
     */

    function withdrawTo(address _to, uint256 _amount) external {
        _withdraw(_to, _amount);
    }

    /**
     * @notice Withdraw tokens from the lockbox
     *
     * @param _to The user to withdraw to
     * @param _amount The amount of tokens to withdraw
     */

    function _withdraw(address _to, uint256 _amount) internal {
        uint256 share = (_amount * 1e18) / exchangeRate;

        emit Withdraw(_to, _amount, share);

        XERC20.burn(msg.sender, share);

        if (IS_GAS_TOKEN) {
            (bool _success, ) = payable(_to).call{value: _amount}("");
            if (!_success) revert IXERC20Lockbox_WithdrawFailed();
        } else {
            ERC20.safeTransfer(_to, _amount);
        }
    }

    /**
     * @notice Deposit tokens into the lockbox
     *
     * @param _to The address to send the XERC20 to
     * @param _amount The amount of tokens to deposit
     */

    function _deposit(address _to, uint256 _amount) internal {
        if (!IS_GAS_TOKEN) {
            ERC20.safeTransferFrom(msg.sender, address(this), _amount);
        }

        uint256 share = (_amount * 1e18) / exchangeRate;

        XERC20.mint(_to, share);
        emit Deposit(_to, _amount, share);
    }

    receive() external payable {
        depositGasToken();
    }

    /**
     * @notice Update exchange Rate, only owner can call this function
     *
     * @param _exchangeRate New exchange rate value
     */
    function setExchangeRate(uint256 _exchangeRate) external onlyOwner {
        exchangeRate = _exchangeRate;
    }

    /**
     * @notice Update strategy address, only owner can call this function
     *
     * @param strategy_ New strategy contract address
     */
    function setStrategy(address strategy_) external onlyOwner {
        strategy = strategy_;
    }

    /**
     * @notice yield interest by strategy contract, only owner can call this function
     *
     * @param amount yield amount
     */
    function strategyYield(uint256 amount) external onlyOwner {
        if (IS_GAS_TOKEN) {
            (bool success, ) = strategy.call{value: amount}(new bytes(0));
            require(success, "ETH_TRANSFER_FAILED");
        } else {
            ERC20.safeTransfer(strategy, amount);
        }
        IStrategy(strategy).invest(amount);
    }

    /**
     * @notice withdraw asset from yield contract, only owner can call this function
     *
     * @param amount withdraw amount
     */
    function strategyWithdraw(uint256 amount) external onlyOwner {
        if (amount == 0) {
            IStrategy(strategy).withdrawAll();
        } else {
            IStrategy(strategy).withdraw(amount);
        }
    }

    /**
     * @notice Rescue erc20 from this contract address. only owner can call this function
     * @param token The token address to be rescued.
     * @param to The account address to receive token
     * @param amount The amount to be rescued
     **/
    function rescueERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit RescueERC20(token, to, amount);
    }
}

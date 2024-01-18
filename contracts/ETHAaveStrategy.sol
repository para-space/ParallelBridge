// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IAAVEPool.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IwstETH.sol";
import "./interfaces/ILido.sol";
import "./interfaces/IXERC20Lockbox.sol";

contract ETHAaveStrategy is Initializable {
    using SafeERC20 for IERC20;

    address public immutable lido;
    address public immutable wstETH;
    address public immutable aavePool;
    address public immutable vault;

    error NotAllow();
    error ErrorStrategy();

    modifier onlyVault() {
        if (msg.sender != vault) revert NotAllow();
        _;
    }

    constructor(address _wstETH, address _aavePool, address _vault) {
        bool isGasToken = IXERC20Lockbox(_vault).IS_GAS_TOKEN();
        if (!isGasToken) revert ErrorStrategy();
        aavePool = _aavePool;
        vault = _vault;
        wstETH = _wstETH;
        lido = IwstETH(wstETH).stETH();
    }

    function initialize() public initializer {
        IERC20(wstETH).safeIncreaseAllowance(aavePool, type(uint256).max);
    }

    function withdraw(
        uint256 amount_
    ) public onlyVault returns (uint256 loss_) {
        uint256 wstETHAmount = IwstETH(wstETH).getWstETHByStETH(amount_);
        //1. AAVE -> wstETH
        IAAVEPool(aavePool).withdraw(wstETH, wstETHAmount, address(this));
        //2. wstETH -> stETH
        IwstETH(wstETH).unwrap(wstETHAmount);
        //3. transfer stETH to vault, since we can't withdraw stETH to ETH instantly
        ILido(lido).transfer(vault, amount_);
        return amount_;
    }

    function withdrawAll() external {
        uint256 totalAsset = totalYieldAsset();
        withdraw(totalAsset);
    }

    function totalYieldAsset() public view returns (uint256 totalAssets_) {
        address aToken = IAAVEPool(aavePool)
            .getReserveData(wstETH)
            .aTokenAddress;
        uint256 totalBalance = IERC20(aToken).balanceOf(address(this));
        return IwstETH(wstETH).getStETHByWstETH(totalBalance);
    }

    function invest(uint256 amount_) external payable onlyVault {
        //1. ETH -> stETH
        ILido(lido).submit{value: amount_}(address(0));
        //2. stETH -> wstETH
        uint256 wstETHAmount = IwstETH(wstETH).wrap(amount_);
        //3. wstETH -> AAVE
        IAAVEPool(aavePool).supply(wstETH, wstETHAmount, address(this), 0);
    }

    receive() external payable {}
}

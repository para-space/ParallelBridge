// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IAAVEPool.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IwstETH.sol";
import "../interfaces/ILido.sol";

contract wETHAaveStrategy is Initializable {
    using SafeERC20 for IERC20;

    address public weth;
    address public lido;
    address public wstETH;
    address public aavePool;
    address public token;
    address public vault;

    error NotAllow();

    modifier onlyVault() {
        if (msg.sender != vault) revert NotAllow();
        _;
    }

    function initialize(address _aavePool, address _vault) public initializer {
        aavePool = _aavePool;
        token = IERC4626(_vault).asset();
        vault = _vault;
        IERC20(token).safeIncreaseAllowance(aavePool, type(uint256).max);
    }

    function withdraw(uint256 amount_) external onlyVault returns (uint256 loss_) {
        uint256 wstETHAmount = IwstETH(wstETH).getWstETHByStETH(amount_);
        //1. AAVE -> wstETH
        IAAVEPool(aavePool).withdraw(wstETH, wstETHAmount, address(this));
        //2. wstETH -> stETH
        return IAAVEPool(aavePool).withdraw(token, amount_, vault);
    }

    function withdrawAll() onlyVault external {
        uint256 totalAsset = totalYieldAsset();
        IAAVEPool(aavePool).withdraw(token, totalAsset, vault);
    }

    function totalYieldAsset() public view returns (uint256 totalAssets_) {
        address aToken = IAAVEPool(aavePool)
        .getReserveData(token)
        .aTokenAddress;
        uint256 totalBalance = IERC20(aToken).balanceOf(address(this));
        return IwstETH(wstETH).getStETHByWstETH(totalBalance);
    }

    function invest(uint256 amount_) external onlyVault {
        //1. weth -> ETH
        IWETH(weth).withdraw(amount_);
        //2. ETH -> stETH
        ILido(lido).submit{value: amount}(address(0));
        //3. stETH -> wstETH
        uint256 wstETHAmount = IwstETH(wstETH).wrap(amount_);
        //4. wstETH -> AAVE
        IAAVEPool(aavePool).supply(wstETH, wstETHAmount, address(this), 0);
    }
}

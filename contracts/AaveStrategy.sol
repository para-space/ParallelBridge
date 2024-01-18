// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IXERC20Lockbox.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IAAVEPool.sol";

contract AaveStrategy is Initializable {
    using SafeERC20 for IERC20;

    address public aavePool;
    IERC20 public token;
    address public vault;

    error NotAllow();

    modifier onlyVault() {
        if (msg.sender != vault) revert NotAllow();
        _;
    }

    function initialize(address _aavePool, address _vault) public initializer {
        aavePool = _aavePool;
        token = IXERC20Lockbox(_vault).ERC20();
        vault = _vault;
        token.safeIncreaseAllowance(aavePool, type(uint256).max);
    }

    function withdraw(
        uint256 amount_
    ) external onlyVault returns (uint256 loss_) {
        return IAAVEPool(aavePool).withdraw(address(token), amount_, vault);
    }

    function withdrawAll() external onlyVault {
        uint256 totalAsset = totalYieldAsset();
        IAAVEPool(aavePool).withdraw(address(token), totalAsset, vault);
    }

    function totalYieldAsset() public view returns (uint256 totalAssets_) {
        address aToken = IAAVEPool(aavePool)
            .getReserveData(address(token))
            .aTokenAddress;
        return IERC20(aToken).balanceOf(address(this));
    }

    function invest(uint256 amount_) external onlyVault {
        IAAVEPool(aavePool).supply(address(token), amount_, address(this), 0);
    }
}

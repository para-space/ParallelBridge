// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

import "../interfaces/IStrategy.sol";
import "../interfaces/IAAVEPool.sol";

 contract AaveStrategy {
     address public immutable aavePool;
     address public immutable token;
     address public immutable vault;

     constructor(address _aavePool, address _token, address _vault) {
         aavePool = _aavePool;
         token = _token;
         vault = _vault;
     }

     function withdraw(uint256 amount_) external returns (uint256 loss_) {
        return IAAVEPool(aavePool).withdraw(token, amount_, _vault);
     }

     function withdrawAll() external {
         uint256 totalAsset = totalYieldAsset();
        IAAVEPool(aavePool).withdraw(token, totalAsset, _vault);
     }

     function totalYieldAsset()
     public
     view
     returns (uint256 totalAssets_) {
         address aToken = IAAVEPool(aavePool)
         .getReserveData(token)
         .aTokenAddress;
         return IERC20(aToken).balanceOf(address(this));
     }

     function invest(uint256 amount_) external {
        IAAVEPool(aavePool).supply(token, amount_, address(this), 0);
     }
 }

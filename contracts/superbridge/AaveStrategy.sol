// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;



contract AaveStrategy {
    function withdraw(uint256 amount_) external returns (uint256 loss_);
    function estimatedTotalAssets() external view returns (uint256 totalAssets_);
}
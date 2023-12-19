pragma solidity 0.8.13;

interface IStrategy {

    function withdraw(uint256 amount_) external returns (uint256 loss_);
    function estimatedTotalAssets() external view returns (uint256 totalAssets_);
}
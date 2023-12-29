pragma solidity 0.8.19;

interface IStrategy {
    function withdraw(uint256 amount_) external returns (uint256 loss_);
    function withdrawAll() external;
    function estimatedTotalAssets() external view returns (uint256 totalAssets_);
    function invest() external;
}
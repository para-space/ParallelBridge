// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

interface IStrategy {
    function withdraw(uint256 amount_) external returns (uint256 loss_);

    function withdrawAll() external;

    function totalYieldAsset() external view returns (uint256 totalAssets_);

    function invest(uint256 amount_) external;
}

// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

interface INFTStrategy {
    function withdrawNFTs(
        address assetAddr_,
        uint256[] memory tokenIds_
    ) external;

    function withdrawNFT(address assetAddr_, uint256 tokenId_) external;

    function totalYieldAsset(
        address assetAddr_
    ) external view returns (uint256 totalAssets_);

    function depositNFTs(
        address assetAddr_,
        uint256[] memory tokenIds_
    ) external;
}

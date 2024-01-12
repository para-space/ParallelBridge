// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILido is IERC20 {
    function getPooledEthByShares(
        uint256 _sharesAmount
    ) external view returns (uint256);

    function getSharesByPooledEth(
        uint256 _pooledEth
    ) external view returns (uint256);

    function submit(address _referral) external payable returns (uint256);
}

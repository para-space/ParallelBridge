// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ILido.sol";

contract MockLido is ILido {
    function getPooledEthByShares(uint256) external pure returns (uint256) {
        return 1e18;
    }

    function getSharesByPooledEth(uint256) external pure returns (uint256) {
        return 1e18;
    }

    function submit(address) external payable returns (uint256) {
        return msg.value;
    }

    function totalSupply() external pure returns (uint256) {
        return 0;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }

    function allowance(address, address) external pure returns (uint256) {
        return 0;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function transferFrom(
        address,
        address,
        uint256
    ) external pure returns (bool) {
        return true;
    }
}

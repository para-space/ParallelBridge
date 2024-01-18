// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IAAVEPool.sol";

contract MockAAVE is IAAVEPool {
    function getReserveData(
        address
    ) external pure returns (ReserveData memory) {
        ReserveData memory tmp;
        return tmp;
    }

    function supply(address asset, uint256 amount, address, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}

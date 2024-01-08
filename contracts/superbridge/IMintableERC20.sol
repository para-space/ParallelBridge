// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract IMintableERC20 is ERC20 {
    function mint(address receiver_, uint256 amount_) external virtual;

    function burn(address burner_, uint256 amount_) external virtual;
}

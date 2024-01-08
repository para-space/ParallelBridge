// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// USDC's standard token
abstract contract IFiatTokenV2_1_Mintable is ERC20 {
    function mint(address receiver_, uint256 amount_) external virtual;

    function burn(uint256 _amount) external virtual;
}

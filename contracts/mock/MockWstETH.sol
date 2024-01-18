// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IwstETH.sol";

contract MockWstETH is IwstETH, ERC20 {
    address internal stETH_;

    constructor(address _stETH) ERC20("TEST WSTETH", "TEST WSTETH") {
        stETH_ = _stETH;
    }

    function stETH() external view returns (address) {
        return stETH_;
    }

    function stEthPerToken() external pure returns (uint256) {
        return 1e18;
    }

    function wrap(uint256 _stETHAmount) external returns (uint256) {
        IERC20(stETH_).transferFrom(_msgSender(), address(this), _stETHAmount);
        _mint(_msgSender(), _stETHAmount);
        return _stETHAmount;
    }

    function unwrap(uint256 _wstETHAmount) external returns (uint256) {
        _burn(_msgSender(), _wstETHAmount);
        IERC20(stETH_).transfer(_msgSender(), _wstETHAmount);
        return _wstETHAmount;
    }

    function getStETHByWstETH(
        uint256 _wstETHAmount
    ) external pure returns (uint256) {
        return _wstETHAmount;
    }

    function getWstETHByStETH(
        uint256 _stETHAmount
    ) external pure returns (uint256) {
        return _stETHAmount;
    }
}

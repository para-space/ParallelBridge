// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract ParallelProxy is TransparentUpgradeableProxy {
    constructor(
        address implementation,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(implementation, admin_, _data) {}

    error OnlyProxyAdmin();

    function changeImpl(address impl) external {
        if (msg.sender != _getAdmin()) {
            revert OnlyProxyAdmin();
        }
        _upgradeTo(impl);
    }

    function changeAdmin(address admin_) external {
        if (msg.sender != _getAdmin()) {
            revert OnlyProxyAdmin();
        }

        _changeAdmin(admin_);
    }
}

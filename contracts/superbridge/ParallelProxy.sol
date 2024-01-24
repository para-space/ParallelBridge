// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

contract ParallelProxy is
    TransparentUpgradeableProxy,
    ITransparentUpgradeableProxy
{
    constructor(
        address implementation,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(implementation, admin_, _data) {}

    error OnlyProxyAdmin();

    function upgradeToAndCall(
        address newImplementation,
        bytes calldata data
    ) external payable {
        if (msg.sender != _proxyAdmin()) {
            revert OnlyProxyAdmin();
        }
        ERC1967Utils.upgradeToAndCall(newImplementation, data);
    }

    receive() external payable {}
}
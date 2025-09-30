// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title UpgradeableVulnerable
 * @notice Minimal proxy-like contract with an insecure, public upgrade function (educational).
 * @dev This contract demonstrates how a missing access control on upgrades leads to catastrophic compromise.
 *
 * === WHAT'S WRONG / WHY IT'S VULNERABLE ===
 * - upgrade() is public with no authorization — any address can change implementation to a malicious one.
 * - No events emitted on upgrade (poor auditability).
 * - Not using EIP-1967 / standardized storage layout or initializer patterns (structural risks).
 *
 * How to use in Remix for teaching:
 * - Deploy a simple logic contract (e.g., stores an integer).
 * - Deploy this proxy with the logic addr.
 * - Any address can call upgrade(newImpl) to hijack the proxy — demonstrate danger.
 */
contract UpgradeableVulnerable {
    // simple implementation pointer
    address public implementation;

    constructor(address impl) {
        require(impl != address(0), "zero impl");
        implementation = impl;
    }

    /**
     * @notice Upgrade implementation (VULNERABLE).
     * @dev No access control at all.
     */
    function upgrade(address newImpl) external {
        require(newImpl != address(0), "zero impl");
        implementation = newImpl;
    }

    /**
     * @dev Delegate all calls to implementation.
     */
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "no impl set");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(0, 0, size)
            switch result
            case 0 { revert(0, size) }
            default { return(0, size) }
        }
    }

    receive() external payable {}
}

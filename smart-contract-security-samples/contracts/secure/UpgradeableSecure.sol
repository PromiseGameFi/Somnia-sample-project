// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title UpgradeableSecure
 * @notice Compact, owner-controlled proxy-like contract for tutorial use (Remix-ready).
 * @dev Security & gas choices:
 *  - immutable owner set at deployment (prevents later takeover).
 *  - owner-only upgradeTo with event emission.
 *  - prevents setting the same implementation (avoids unnecessary state writes).
 *
 * NOTE: This is a simplified educational proxy. For production prefer audited patterns
 * (OpenZeppelin's Transparent Proxy / UUPS / EIP-1967) and robust initialization.
 */
contract UpgradeableSecure {
    address private _implementation;
    address public immutable owner;
    event Upgraded(address indexed oldImpl, address indexed newImpl);

    constructor(address impl) {
        require(impl != address(0), "zero impl");
        owner = msg.sender;
        _implementation = impl;
        emit Upgraded(address(0), impl);
    }

    /**
     * @notice Owner-only upgrade function.
     */
    function upgradeTo(address newImpl) external {
        require(msg.sender == owner, "only owner");
        require(newImpl != address(0), "zero impl");
        address old = _implementation;
        require(newImpl != old, "same impl");
        _implementation = newImpl;
        emit Upgraded(old, newImpl);
    }

    /**
     * @notice Read current implementation.
     */
    function implementation() external view returns (address) {
        return _implementation;
    }

    /**
     * @dev Delegate all calls to current implementation.
     */
    fallback() external payable {
        address impl = _implementation;
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

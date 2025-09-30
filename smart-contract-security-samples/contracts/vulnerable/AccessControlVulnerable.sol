// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title AccessControlVulnerable
 * @notice Naive, intentionally vulnerable role-based access control example for education.
 * @dev This file is written for Remix (no external imports). It demonstrates bad authorization patterns.
 *
 * === How to use (Remix) ===
 * - Deploy the contract (deployer receives ADMIN and WRITER).
 * - Any account holding a role can call grantRole to grant the same role to others.
 * - Use this to demonstrate role escalation and why owner separation and events matter.
 *
 * === WHAT'S WRONG / WHY IT'S VULNERABLE ===
 * - Authorization model: any holder of a role can grant that same role to others (role escalation).
 * - No owner/admin separation for sensitive roles (ADMIN should be restricted to owner/guardian).
 * - No events for role changes — poor auditability.
 * - No protections against malicious revocation or accidental locking-out.
 */
contract AccessControlVulnerable {
    // role => account => bool
    mapping(bytes32 => mapping(address => bool)) public roles;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant WRITER = keccak256("WRITER");

    // Example protected data
    string public data;

    /**
     * @dev Deployer gets both roles initially.
     */
    constructor() {
        roles[ADMIN][msg.sender] = true;
        roles[WRITER][msg.sender] = true;
    }

    /**
     * @notice Grant a role to `account`.
     * @dev VULNERABLE: Only checks that caller already has the same role;
     *      this allows role escalation once a role exists on any account.
     */
    function grantRole(bytes32 role, address account) external {
        require(account != address(0), "zero account");
        // BAD: any role-holder can grant the same role to others
        require(roles[role][msg.sender], "only role-holder");
        roles[role][account] = true;
    }

    /**
     * @notice Revoke a role from `account`.
     * @dev VULNERABLE: Any holder of the role can revoke it from others.
     */
    function revokeRole(bytes32 role, address account) external {
        require(roles[role][msg.sender], "only role-holder");
        roles[role][account] = false;
    }

    /**
     * @notice Write new data (requires WRITER).
     * @dev No events and no logging of who changed the data.
     */
    function write(string calldata newData) external {
        require(roles[WRITER][msg.sender], "not writer");
        data = newData;
    }

    /**
     * @notice Emergency reset (requires ADMIN).
     * @dev If ADMIN is compromised, attacker can clear state.
     */
    function emergencyReset() external {
        require(roles[ADMIN][msg.sender], "not admin");
        data = "";
    }

    /**
     * @notice Check role membership.
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }
}

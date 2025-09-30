// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title AccessControlSecure
 * @notice Compact, secure role-based access control example designed for Remix & tutorial use.
 * @dev Key choices:
 *   - immutable owner set at deployment (cheaper to read, prevents owner takeovers).
 *   - owner may grant/revoke ADMIN; ADMIN may grant/revoke lower roles (least privilege).
 *   - events for all role changes and data writes for auditability.
 *
 * NatSpec and inline comments explain design; public view hasRole exposes membership.
 */
contract AccessControlSecure {
    // role => account => bool
    mapping(bytes32 => mapping(address => bool)) private _roles;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant WRITER = keccak256("WRITER");

    // immutable owner reduces gas on reads and prevents later takeover
    address public immutable owner;

    string public data;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event DataWritten(address indexed sender, string newData);

    /**
     * @dev Deploying address becomes immutable owner and first ADMIN.
     */
    constructor() {
        owner = msg.sender;
        _roles[ADMIN][msg.sender] = true;
        emit RoleGranted(ADMIN, msg.sender, msg.sender);
    }

    // ---------- modifiers ----------
    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyAdmin() {
        require(_roles[ADMIN][msg.sender], "only admin");
        _;
    }

    // ---------- role management ----------
    /**
     * @notice Grant a role to `account`.
     * @dev Only owner can grant ADMIN. ADMIN can grant lower-level roles.
     */
    function grantRole(bytes32 role, address account) external {
        require(account != address(0), "zero address");
        if (role == ADMIN) {
            require(msg.sender == owner, "only owner can grant admin");
        } else {
            require(_roles[ADMIN][msg.sender], "only admin can grant");
        }
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    /**
     * @notice Revoke a role from `account`.
     * @dev Only owner can revoke ADMIN. ADMIN can revoke lower roles.
     */
    function revokeRole(bytes32 role, address account) external {
        require(account != address(0), "zero address");
        if (role == ADMIN) {
            require(msg.sender == owner, "only owner can revoke admin");
        } else {
            require(_roles[ADMIN][msg.sender], "only admin can revoke");
        }
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    /**
     * @notice Write data as a WRITER.
     * @dev Emits event to maintain audit trail.
     */
    function write(string calldata newData) external {
        require(_roles[WRITER][msg.sender], "not writer");
        data = newData;
        emit DataWritten(msg.sender, newData);
    }

    /**
     * @notice Check whether `account` has `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }
}

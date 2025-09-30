// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UpgradeableVulnerable
 * @dev Demonstrates vulnerabilities in upgradeable contracts
 * 
 * VULNERABILITIES:
 * 1. Unprotected upgrade function
 * 2. No initialization protection
 * 3. Storage layout issues
 * 4. Missing access controls on critical functions
 * 5. Potential for storage collisions
 */
contract UpgradeableVulnerable {
    // Storage layout - vulnerable to collisions
    address public implementation;
    address public admin;
    bool public initialized;
    
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    string public name;
    string public symbol;
    
    // Additional storage that could cause collisions
    uint256 public version;
    mapping(address => bool) public authorized;
    
    event Upgraded(address indexed newImplementation);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    
    /**
     * @dev VULNERABLE: No protection against multiple initialization
     */
    function initialize(string memory _name, string memory _symbol, address _admin) external {
        // VULNERABLE: Can be called multiple times!
        name = _name;
        symbol = _symbol;
        admin = _admin;
        totalSupply = 0;
        version = 1;
        initialized = true;
    }
    
    /**
     * @dev VULNERABLE: Anyone can upgrade the contract!
     */
    function upgrade(address newImplementation) external {
        // VULNERABLE: No access control!
        require(newImplementation != address(0), "Invalid implementation");
        
        implementation = newImplementation;
        emit Upgraded(newImplementation);
    }
    
    /**
     * @dev VULNERABLE: Admin can be changed by anyone
     */
    function changeAdmin(address newAdmin) external {
        // VULNERABLE: No access control!
        require(newAdmin != address(0), "Invalid admin");
        
        address oldAdmin = admin;
        admin = newAdmin;
        
        emit AdminChanged(oldAdmin, newAdmin);
    }
    
    /**
     * @dev VULNERABLE: Mint function with weak access control
     */
    function mint(address to, uint256 amount) external {
        // VULNERABLE: Only checks if caller is authorized, but authorization can be manipulated
        require(authorized[msg.sender] || msg.sender == admin, "Not authorized");
        require(to != address(0), "Invalid address");
        
        balances[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev VULNERABLE: Anyone can authorize themselves
     */
    function authorize(address user) external {
        // VULNERABLE: No access control!
        authorized[user] = true;
    }
    
    /**
     * @dev VULNERABLE: Revoke authorization without proper checks
     */
    function revokeAuthorization(address user) external {
        // VULNERABLE: Anyone can revoke anyone's authorization!
        authorized[user] = false;
    }
    
    /**
     * @dev Transfer tokens
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Invalid address");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev VULNERABLE: Upgrade version without proper checks
     */
    function upgradeVersion(uint256 newVersion) external {
        // VULNERABLE: No access control and no validation!
        version = newVersion;
    }
    
    /**
     * @dev VULNERABLE: Reset contract state
     */
    function reset() external {
        // VULNERABLE: Anyone can reset the contract!
        totalSupply = 0;
        version = 0;
        initialized = false;
        
        // Note: This doesn't clear mappings, creating inconsistent state
    }
    
    /**
     * @dev VULNERABLE: Delegate call to arbitrary address
     */
    function delegateCall(address target, bytes calldata data) external returns (bool success, bytes memory result) {
        // VULNERABLE: No access control on delegate calls!
        require(target != address(0), "Invalid target");
        
        (success, result) = target.delegatecall(data);
    }
    
    /**
     * @dev VULNERABLE: Self-destruct without proper protection
     */
    function destroy() external {
        // VULNERABLE: Anyone can destroy the contract!
        selfdestruct(payable(msg.sender));
    }
    
    /**
     * @dev Get balance of an address
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    /**
     * @dev Check if address is authorized
     */
    function isAuthorized(address user) external view returns (bool) {
        return authorized[user];
    }
    
    /**
     * @dev VULNERABLE: Emergency function without proper access control
     */
    function emergencyStop() external {
        // VULNERABLE: No access control!
        // This could be used to manipulate contract state
        initialized = false;
    }
    
    /**
     * @dev VULNERABLE: Update storage slot directly
     */
    function updateStorageSlot(uint256 slot, uint256 value) external {
        // VULNERABLE: Direct storage manipulation without access control!
        assembly {
            sstore(slot, value)
        }
    }
}
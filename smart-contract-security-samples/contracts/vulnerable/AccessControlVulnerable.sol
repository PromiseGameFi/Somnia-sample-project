// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AccessControlVulnerable
 * @dev Demonstrates common access control vulnerabilities
 * 
 * VULNERABILITIES DEMONSTRATED:
 * 1. Missing access control on critical functions
 * 2. Weak authentication using tx.origin
 * 3. No role-based access control
 * 4. Anyone can call admin functions
 * 5. Improper ownership management
 */
contract AccessControlVulnerable {
    address public owner;
    address public admin;
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorized;
    uint256 public totalSupply;
    uint256 public maxSupply = 1000000 * 10**18;
    bool public initialized;
    bool public paused;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        owner = msg.sender;
        admin = msg.sender;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can initialize
     */
    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        totalSupply = 0;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can mint tokens
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Invalid address");
        require(totalSupply + amount <= maxSupply, "Exceeds max supply");
        
        balances[to] += amount;
        totalSupply += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can burn tokens
     */
    function burn(address from, uint256 amount) external {
        require(balances[from] >= amount, "Insufficient balance");
        
        balances[from] -= amount;
        totalSupply -= amount;
        
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
    
    /**
     * @dev VULNERABLE: Uses tx.origin instead of msg.sender
     */
    function authenticate(address user) external {
        require(tx.origin == owner, "Not authorized");
        authorized[user] = true;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can change owner
     */
    function transferOwnership(address newOwner) external {
        require(newOwner != address(0), "Invalid address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can pause
     */
    function pause() external {
        paused = true;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can unpause
     */
    function unpause() external {
        paused = false;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can change admin
     */
    function changeAdmin(address newAdmin) external {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can set max supply
     */
    function setMaxSupply(uint256 _maxSupply) external {
        maxSupply = _maxSupply;
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can withdraw funds
     */
    function emergencyWithdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev VULNERABLE: No access control - anyone can reset authorization
     */
    function revokeAuthorization(address user) external {
        authorized[user] = false;
    }
    
    /**
     * @dev Basic transfer function
     */
    function transfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid address");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
    
    /**
     * @dev View functions
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function isAuthorized(address user) external view returns (bool) {
        return authorized[user];
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
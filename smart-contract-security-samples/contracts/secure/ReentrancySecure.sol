// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReentrancySecure
 * @dev Demonstrates secure patterns to prevent reentrancy attacks
 * 
 * SECURITY FEATURES:
 * 1. ReentrancyGuard modifier protection
 * 2. Checks-Effects-Interactions pattern
 * 3. State updates before external calls
 * 4. Proper error handling
 */
contract ReentrancySecure is ReentrancyGuard, Ownable {
    mapping(address => uint256) public balances;
    mapping(address => bool) public depositors;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    
    error InsufficientBalance(uint256 requested, uint256 available);
    error TransferFailed();
    error InvalidAmount();
    error NotDepositor();
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    /**
     * @dev Deposit Ether to the contract
     */
    function deposit() external payable {
        if (msg.value == 0) revert InvalidAmount();
        
        balances[msg.sender] += msg.value;
        depositors[msg.sender] = true;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev SECURE: Withdraw with reentrancy protection and CEI pattern
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        uint256 userBalance = balances[msg.sender];
        if (userBalance < amount) {
            revert InsufficientBalance(amount, userBalance);
        }
        
        // SECURE: Update state BEFORE external call (Effects)
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        if (balances[msg.sender] == 0) {
            depositors[msg.sender] = false;
        }
        
        // SECURE: External call AFTER state updates (Interactions)
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Withdraw all funds with reentrancy protection
     */
    function withdrawAll() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientBalance(1, 0);
        
        // SECURE: Update state BEFORE external call
        balances[msg.sender] = 0;
        depositors[msg.sender] = false;
        totalDeposits -= amount;
        
        // SECURE: External call AFTER state updates
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Emergency withdraw with reentrancy protection
     */
    function emergencyWithdraw() external nonReentrant {
        if (!depositors[msg.sender]) revert NotDepositor();
        
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientBalance(1, 0);
        
        // SECURE: Update state BEFORE external call
        balances[msg.sender] = 0;
        depositors[msg.sender] = false;
        totalDeposits -= amount;
        
        // SECURE: External call AFTER state updates
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Batch withdrawal with reentrancy protection
     */
    function batchWithdraw(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= 50, "Too many recipients"); // Gas limit protection
        
        // SECURE: Update all states BEFORE any external calls
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            
            uint256 userBalance = balances[recipient];
            if (userBalance < amount) {
                revert InsufficientBalance(amount, userBalance);
            }
            
            balances[recipient] -= amount;
            totalDeposits -= amount;
            
            if (balances[recipient] == 0) {
                depositors[recipient] = false;
            }
        }
        
        // SECURE: External calls AFTER all state updates
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            if (!success) revert TransferFailed();
            
            emit Withdrawal(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev SECURE: Reward distribution with reentrancy protection
     */
    function distributeRewards(address[] calldata users, uint256 rewardPerUser) 
        external 
        onlyOwner 
        nonReentrant 
    {
        uint256 totalReward = users.length * rewardPerUser;
        require(address(this).balance >= totalReward, "Insufficient contract balance");
        require(users.length <= 100, "Too many users");
        
        // SECURE: No state to update, but still use reentrancy guard
        // External calls in a protected context
        for (uint256 i = 0; i < users.length; i++) {
            (bool success, ) = users[i].call{value: rewardPerUser}("");
            if (!success) revert TransferFailed();
        }
    }
    
    /**
     * @dev Get user balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get balance of a user
     */
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get contract balance
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
     * @dev Owner can deposit to contract
     */
    function ownerDeposit() external payable onlyOwner {
        // Owner can add funds without updating user balances
    }
    
    /**
     * @dev SECURE: Owner emergency drain with reentrancy protection
     */
    function emergencyDrain() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        
        // SECURE: External call with proper protection
        (bool success, ) = owner().call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
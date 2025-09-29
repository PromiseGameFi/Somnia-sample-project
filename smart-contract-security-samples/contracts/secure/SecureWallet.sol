// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SecureWallet
 * @dev SECURE CONTRACT - Safe for production use
 * 
 * This contract demonstrates proper access control implementation.
 * Only the owner can withdraw funds, using OpenZeppelin's Ownable pattern.
 * 
 * SECURITY MEASURES:
 * - Uses OpenZeppelin's Ownable for access control
 * - Uses ReentrancyGuard for additional protection
 * - Proper event emission
 * - Input validation
 */
contract SecureWallet is Ownable, ReentrancyGuard {
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        // Ownable constructor automatically sets msg.sender as owner
    }
    
    /**
     * @dev Allows anyone to deposit Ether into the wallet
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev SECURE: Only owner can withdraw funds
     * 
     * Security measures:
     * 1. onlyOwner modifier ensures only owner can call
     * 2. nonReentrant modifier prevents reentrancy attacks
     * 3. Input validation
     * 4. Proper event emission
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(owner(), amount);
    }
    
    /**
     * @dev SECURE: Only owner can withdraw all funds
     */
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(owner(), balance);
    }
    
    /**
     * @dev Emergency function to withdraw to a specific address (owner only)
     */
    function emergencyWithdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(to, amount);
    }
    
    /**
     * @dev Get the wallet balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Override transferOwnership to add event emission
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferInitiated(owner(), newOwner);
        super.transferOwnership(newOwner);
    }
    
    /**
     * @dev Receive function to accept Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
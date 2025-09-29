// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VulnerableWallet
 * @dev VULNERABLE CONTRACT - DO NOT USE IN PRODUCTION
 * 
 * This contract demonstrates access control vulnerabilities.
 * Anyone can withdraw funds because there's no proper access control.
 * 
 * VULNERABILITY: Missing access control
 * ATTACK VECTOR: Anyone can call withdraw function
 * IMPACT: Complete drainage of wallet funds by unauthorized users
 */
contract VulnerableWallet {
    address public owner;
    
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Allows anyone to deposit Ether into the wallet
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev VULNERABLE: Anyone can withdraw funds!
     * 
     * This function lacks proper access control.
     * It should only allow the owner to withdraw funds,
     * but currently anyone can call it and drain the wallet.
     */
    function withdraw(uint256 amount) external {
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // VULNERABILITY: No access control check!
        // Missing: require(msg.sender == owner, "Only owner can withdraw");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev VULNERABLE: Anyone can withdraw all funds!
     */
    function withdrawAll() external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // VULNERABILITY: No access control check!
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev Get the wallet balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Receive function to accept Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
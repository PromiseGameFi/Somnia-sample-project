// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VulnerableBank
 * @dev VULNERABLE CONTRACT - DO NOT USE IN PRODUCTION
 * 
 * This contract demonstrates a classic reentrancy vulnerability in a simple bank.
 * Users can deposit and withdraw funds, but the withdraw function is vulnerable
 * to reentrancy attacks.
 * 
 * VULNERABILITY: External call before state update
 * ATTACK VECTOR: Malicious contract with receive/fallback function calling withdraw
 * IMPACT: Complete drainage of contract funds
 */
contract VulnerableBank {
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
     * @dev VULNERABLE: Withdraw function susceptible to reentrancy attack
     * 
     * The vulnerability exists because:
     * 1. We check the balance (require statement)
     * 2. We make an external call (msg.sender.call)
     * 3. We update the state AFTER the external call
     * 
     * An attacker can exploit this by:
     * 1. Depositing some amount
     * 2. Calling withdraw from a malicious contract
     * 3. In the receive/fallback function, calling withdraw again
     * 4. Repeating until the contract is drained
     */
    function withdraw(uint256 amount) external {
        // Check: Verify user has sufficient balance
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Interaction: External call BEFORE state update (VULNERABLE)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // Effects: Update state AFTER external call (VULNERABLE)
        balances[msg.sender] -= amount;
        emit Withdrawal(msg.sender, amount);
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
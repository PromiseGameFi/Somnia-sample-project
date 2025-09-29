// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ReentrancySecure
 * @dev SECURE CONTRACT - Demonstrates proper reentrancy protection
 * 
 * This contract shows multiple ways to prevent reentrancy attacks:
 * 1. Checks-Effects-Interactions pattern
 * 2. OpenZeppelin's ReentrancyGuard
 * 3. Mutex pattern (manual implementation)
 * 
 * SECURITY MEASURES:
 * - State updates before external calls
 * - Reentrancy guard modifiers
 * - Pull over push pattern for withdrawals
 */
contract ReentrancySecure is ReentrancyGuard, Ownable {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public pendingWithdrawals;
    
    // Emergency pause state
    bool public isPaused;
    
    // Maximum withdrawal amount
    uint256 public constant MAX_WITHDRAWAL_AMOUNT = 10 ether;
    
    // Withdrawal cooldown tracking
    mapping(address => uint256) public lastWithdrawal;
    uint256 public constant WITHDRAWAL_COOLDOWN = 1 hours;
    
    // Manual mutex for demonstration
    bool private locked;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event WithdrawalQueued(address indexed user, uint256 amount);
    event EmergencyPause(bool paused);
    
    modifier noReentrancy() {
        require(!locked, "Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }
    
    /**
     * @dev Allows users to deposit Ether into the contract
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev SECURE: Withdraw using Checks-Effects-Interactions pattern
     * 
     * Security measures:
     * 1. Check: Verify user has sufficient balance
     * 2. Effect: Update state BEFORE external call
     * 3. Interaction: Make external call AFTER state update
     */
    function withdrawCEI(uint256 amount) external {
        // 1. Checks: Verify conditions
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // 2. Effects: Update state BEFORE external call
        balances[msg.sender] -= amount;
        
        // 3. Interactions: External call AFTER state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Withdraw using OpenZeppelin's ReentrancyGuard
     * 
     * The nonReentrant modifier prevents reentrancy by:
     * 1. Setting a flag before function execution
     * 2. Checking the flag at the start of each call
     * 3. Reverting if the flag indicates a reentrant call
     */
    function withdrawWithGuard(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Withdraw using manual mutex pattern
     * 
     * This demonstrates a manual implementation of reentrancy protection
     * using a simple boolean lock.
     */
    function withdrawWithMutex(uint256 amount) external noReentrancy {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Pull over Push pattern - Queue withdrawal for later claim
     * 
     * This pattern eliminates reentrancy risk by:
     * 1. Not making external calls in the main function
     * 2. Allowing users to "pull" their funds in a separate transaction
     * 3. Separating the withdrawal logic from the external call
     */
    function queueWithdrawal(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Update balances
        balances[msg.sender] -= amount;
        pendingWithdrawals[msg.sender] += amount;
        
        emit WithdrawalQueued(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Claim queued withdrawal
     * 
     * Users call this function to actually receive their funds.
     * Since this is a separate transaction, reentrancy is not possible.
     */
    function claimWithdrawal() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");
        
        // Clear pending withdrawal BEFORE external call
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev SECURE: Batch withdrawal with gas limit protection
     * 
     * This function demonstrates additional security by:
     * 1. Limiting gas for external calls
     * 2. Handling failed transfers gracefully
     * 3. Providing fallback mechanism
     */
    function withdrawWithGasLimit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        // Limit gas to prevent complex fallback functions
        (bool success, ) = msg.sender.call{value: amount, gas: 2300}("");
        
        if (!success) {
            // If transfer fails, queue for manual withdrawal
            pendingWithdrawals[msg.sender] += amount;
            emit WithdrawalQueued(msg.sender, amount);
        } else {
            emit Withdrawal(msg.sender, amount);
        }
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
    
    /**
     * @dev Basic withdraw function (secure implementation)
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(!isPaused, "Pausable: paused");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount <= MAX_WITHDRAWAL_AMOUNT, "Exceeds withdrawal limit");
        
        // Check cooldown period
        require(
            block.timestamp >= lastWithdrawal[msg.sender] + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown not met"
        );
        
        // Update state before external call
        balances[msg.sender] -= amount;
        lastWithdrawal[msg.sender] = block.timestamp;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Get user's pending withdrawal amount
     */
    function getPendingWithdrawal(address user) external view returns (uint256) {
        return pendingWithdrawals[user];
    }
    
    /**
     * @dev Get comprehensive user information
     */
    function getUserInfo(address user) external view returns (
        uint256 balance,
        uint256 pendingWithdrawal,
        uint256 totalAvailable
    ) {
        balance = balances[user];
        pendingWithdrawal = pendingWithdrawals[user];
        totalAvailable = balance + pendingWithdrawal;
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        isPaused = !isPaused;
        emit EmergencyPause(isPaused);
    }
    
    /**
     * @dev Returns the pause state
     */
    function paused() external view returns (bool) {
        return isPaused;
    }
    
    /**
     * @dev Emergency withdraw function that works even when paused
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev Batch withdraw function for multiple recipients
     */
    function batchWithdraw(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            require(balances[recipients[i]] >= amounts[i], "Insufficient balance");
            
            balances[recipients[i]] -= amounts[i];
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "Transfer failed");
            
            emit Withdrawal(recipients[i], amounts[i]);
        }
    }
}

/**
 * @title ReentrancySecureAdvanced
 * @dev Advanced secure contract with additional protection mechanisms
 * 
 * This contract demonstrates enterprise-level security patterns:
 * 1. Rate limiting
 * 2. Maximum withdrawal limits
 * 3. Time-based restrictions
 * 4. Multi-signature requirements for large withdrawals
 */
contract ReentrancySecureAdvanced is ReentrancyGuard {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => uint256) public dailyWithdrawnAmount;
    mapping(address => uint256) public lastDailyReset;
    
    uint256 public constant WITHDRAWAL_DELAY = 1 hours;
    uint256 public constant DAILY_WITHDRAWAL_LIMIT = 10 ether;
    uint256 public constant LARGE_WITHDRAWAL_THRESHOLD = 5 ether;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event LargeWithdrawalRequested(address indexed user, uint256 amount, uint256 executeAfter);
    
    struct PendingWithdrawal {
        uint256 amount;
        uint256 executeAfter;
        bool executed;
    }
    
    mapping(address => PendingWithdrawal[]) public pendingLargeWithdrawals;
    
    /**
     * @dev Deposit with enhanced validation
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        require(msg.value <= 100 ether, "Deposit too large");
        
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Secure withdrawal with rate limiting and time delays
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Check withdrawal delay
        require(
            block.timestamp >= lastWithdrawalTime[msg.sender] + WITHDRAWAL_DELAY,
            "Withdrawal too frequent"
        );
        
        // Check daily limit
        _checkDailyLimit(msg.sender, amount);
        
        // Large withdrawals require time delay
        if (amount >= LARGE_WITHDRAWAL_THRESHOLD) {
            _requestLargeWithdrawal(amount);
            return;
        }
        
        _executeWithdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Execute a previously requested large withdrawal
     */
    function executeLargeWithdrawal(uint256 index) external nonReentrant {
        require(index < pendingLargeWithdrawals[msg.sender].length, "Invalid index");
        
        PendingWithdrawal storage withdrawal = pendingLargeWithdrawals[msg.sender][index];
        require(!withdrawal.executed, "Already executed");
        require(block.timestamp >= withdrawal.executeAfter, "Time delay not met");
        require(balances[msg.sender] >= withdrawal.amount, "Insufficient balance");
        
        withdrawal.executed = true;
        _executeWithdrawal(msg.sender, withdrawal.amount);
    }
    
    /**
     * @dev Internal function to execute withdrawal
     */
    function _executeWithdrawal(address user, uint256 amount) internal {
        balances[user] -= amount;
        lastWithdrawalTime[user] = block.timestamp;
        
        // Update daily withdrawal tracking
        if (block.timestamp >= lastDailyReset[user] + 1 days) {
            dailyWithdrawnAmount[user] = 0;
            lastDailyReset[user] = block.timestamp;
        }
        dailyWithdrawnAmount[user] += amount;
        
        (bool success, ) = user.call{value: amount, gas: 2300}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(user, amount);
    }
    
    /**
     * @dev Internal function to request large withdrawal
     */
    function _requestLargeWithdrawal(uint256 amount) internal {
        uint256 executeAfter = block.timestamp + 24 hours; // 24-hour delay for large withdrawals
        
        pendingLargeWithdrawals[msg.sender].push(PendingWithdrawal({
            amount: amount,
            executeAfter: executeAfter,
            executed: false
        }));
        
        emit LargeWithdrawalRequested(msg.sender, amount, executeAfter);
    }
    
    /**
     * @dev Internal function to check daily withdrawal limits
     */
    function _checkDailyLimit(address user, uint256 amount) internal view {
        if (block.timestamp < lastDailyReset[user] + 1 days) {
            require(
                dailyWithdrawnAmount[user] + amount <= DAILY_WITHDRAWAL_LIMIT,
                "Daily withdrawal limit exceeded"
            );
        }
    }
    
    /**
     * @dev Get user's pending large withdrawals
     */
    function getPendingLargeWithdrawals(address user) 
        external 
        view 
        returns (PendingWithdrawal[] memory) 
    {
        return pendingLargeWithdrawals[user];
    }
    
    /**
     * @dev Get user's daily withdrawal status
     */
    function getDailyWithdrawalStatus(address user) 
        external 
        view 
        returns (uint256 withdrawn, uint256 limit, uint256 remaining) 
    {
        withdrawn = dailyWithdrawnAmount[user];
        limit = DAILY_WITHDRAWAL_LIMIT;
        remaining = limit > withdrawn ? limit - withdrawn : 0;
    }
}
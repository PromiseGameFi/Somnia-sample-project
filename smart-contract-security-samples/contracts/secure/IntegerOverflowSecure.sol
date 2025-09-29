// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // Using 0.8+ for built-in overflow protection

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IntegerOverflowSecure
 * @dev Demonstrates secure practices to prevent integer overflow and underflow
 * 
 * Security measures implemented:
 * 1. Solidity 0.8+ built-in overflow protection
 * 2. SafeMath library for additional safety (optional in 0.8+)
 * 3. Explicit bounds checking
 * 4. Safe arithmetic operations
 * 5. Input validation and sanitization
 * 6. Reentrancy protection
 * 7. Access controls
 */
contract IntegerOverflowSecure is ReentrancyGuard, Ownable {
    using SafeMath for uint256; // Optional in 0.8+, but demonstrates best practices
    
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastWithdrawal;
    
    uint256 public totalSupply;
    uint256 public constant WITHDRAWAL_DELAY = 1 days;
    uint256 public constant MAX_WITHDRAWAL = 1000 ether;
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;
    uint256 public constant MAX_TRANSFER_AMOUNT = 10_000 ether;
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_RATE = 10000; // 100% in basis points
    uint256 public constant MAX_PERIODS = 100;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event SecurityAlert(string alertType, address user, uint256 value);
    
    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be positive");
        require(amount <= MAX_TRANSFER_AMOUNT, "Amount exceeds maximum");
        _;
    }
    
    modifier withinSupplyLimit(uint256 additionalAmount) {
        require(totalSupply + additionalAmount <= MAX_SUPPLY, "Would exceed max supply");
        _;
    }
    
    modifier sufficientBalance(address user, uint256 amount) {
        require(balances[user] >= amount, "Insufficient balance");
        _;
    }
    
    modifier withdrawalDelayMet(address user) {
        require(
            block.timestamp >= lastWithdrawal[user] + WITHDRAWAL_DELAY,
            "Withdrawal delay not met"
        );
        _;
    }
    
    /**
     * @dev Secure deposit function with overflow protection
     */
    function deposit() 
        external 
        payable 
        nonReentrant 
        validAmount(msg.value)
        withinSupplyLimit(msg.value)
    {
        // Solidity 0.8+ automatically checks for overflow
        balances[msg.sender] += msg.value;
        totalSupply += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Secure withdrawal function with underflow protection
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant
        validAmount(amount)
        sufficientBalance(msg.sender, amount)
        withdrawalDelayMet(msg.sender)
    {
        require(amount <= MAX_WITHDRAWAL, "Exceeds maximum withdrawal");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // Update state before external call (CEI pattern)
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        lastWithdrawal[msg.sender] = block.timestamp;
        
        // External call last
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Secure transfer function with comprehensive checks
     */
    function transfer(address to, uint256 amount) 
        external 
        nonReentrant
        validAmount(amount)
        sufficientBalance(msg.sender, amount)
    {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot transfer to self");
        
        // Check for overflow in recipient balance
        require(
            balances[to] <= type(uint256).max - amount,
            "Recipient balance would overflow"
        );
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
    
    /**
     * @dev Secure batch transfer with overflow protection
     */
    function batchTransfer(address[] calldata recipients, uint256 amount) 
        external 
        nonReentrant
        validAmount(amount)
    {
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_BATCH_SIZE, "Too many recipients");
        
        // Safe multiplication check
        uint256 totalAmount;
        bool overflow;
        
        // Method 1: Using try-catch for overflow detection
        try this.safeMul(recipients.length, amount) returns (uint256 result) {
            totalAmount = result;
        } catch {
            revert("Total amount calculation overflow");
        }
        
        // Alternative Method 2: Manual overflow check
        // if (amount > 0 && recipients.length > type(uint256).max / amount) {
        //     revert("Multiplication overflow");
        // }
        // totalAmount = recipients.length * amount;
        
        require(
            balances[msg.sender] >= totalAmount,
            "Insufficient balance for batch transfer"
        );
        
        balances[msg.sender] -= totalAmount;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(recipients[i] != msg.sender, "Cannot transfer to self");
            
            // Check for overflow in recipient balance
            require(
                balances[recipients[i]] <= type(uint256).max - amount,
                "Recipient balance would overflow"
            );
            
            balances[recipients[i]] += amount;
            emit Transfer(msg.sender, recipients[i], amount);
        }
    }
    
    /**
     * @dev Safe multiplication helper function
     */
    function safeMul(uint256 a, uint256 b) external pure returns (uint256) {
        return a * b; // Will revert on overflow in Solidity 0.8+
    }
    
    /**
     * @dev Secure reward calculation with bounds checking
     */
    function calculateReward(uint256 principal, uint256 rate, uint256 time) 
        external 
        pure 
        returns (uint256) 
    {
        require(principal > 0, "Principal must be positive");
        require(rate <= MAX_RATE, "Rate too high");
        require(time > 0 && time <= 365 days, "Invalid time period");
        
        // Check for multiplication overflow before calculation
        require(
            principal <= type(uint256).max / rate,
            "Principal * rate would overflow"
        );
        
        uint256 temp = principal * rate;
        require(
            temp <= type(uint256).max / time,
            "Reward calculation would overflow"
        );
        
        return (temp * time) / 10000;
    }
    
    /**
     * @dev Secure time-based bonus calculation
     */
    function getTimeBonus(uint256 depositTime) external returns (uint256) {
        require(depositTime > 0, "Invalid deposit time");
        require(depositTime <= block.timestamp, "Deposit time in future");
        
        uint256 timeDiff = block.timestamp - depositTime;
        
        // Cap the time difference to prevent overflow
        uint256 maxTimeDiff = type(uint256).max / 100;
        if (timeDiff > maxTimeDiff) {
            timeDiff = maxTimeDiff;
            emit SecurityAlert("Time difference capped", msg.sender, timeDiff);
        }
        
        return timeDiff * 100; // 100 wei per second bonus
    }
    
    /**
     * @dev Secure fee calculation with bounds checking
     */
    function calculateFee(uint256 amount, uint256 feeRate) 
        external 
        pure 
        returns (uint256) 
    {
        require(amount > 0, "Amount must be positive");
        require(feeRate <= 10000, "Fee rate too high"); // Max 100%
        
        // Check for overflow
        require(
            amount <= type(uint256).max / feeRate,
            "Fee calculation would overflow"
        );
        
        return (amount * feeRate) / 10000;
    }
    
    /**
     * @dev Secure compound interest calculation
     */
    function compoundInterest(
        uint256 principal, 
        uint256 rate, 
        uint256 periods
    ) external pure returns (uint256) {
        require(principal > 0, "Principal must be positive");
        require(rate <= MAX_RATE, "Rate too high");
        require(periods <= MAX_PERIODS, "Too many periods");
        
        uint256 result = principal;
        uint256 multiplier = 10000 + rate; // Convert to basis points
        
        for (uint256 i = 0; i < periods; i++) {
            // Check for overflow before multiplication
            require(
                result <= type(uint256).max / multiplier,
                "Compound calculation would overflow"
            );
            
            result = (result * multiplier) / 10000;
            
            // Additional safety check
            require(result >= principal, "Result underflow detected");
        }
        
        return result;
    }
    
    /**
     * @dev Secure array sum calculation with overflow protection
     */
    function sumArray(uint256[] calldata numbers) external pure returns (uint256) {
        require(numbers.length > 0, "Empty array");
        require(numbers.length <= 1000, "Array too large");
        
        uint256 sum = 0;
        
        for (uint256 i = 0; i < numbers.length; i++) {
            // Check for overflow before addition
            require(
                sum <= type(uint256).max - numbers[i],
                "Array sum would overflow"
            );
            
            sum += numbers[i];
        }
        
        return sum;
    }
    
    /**
     * @dev Secure token sale with bonus calculation
     */
    function buyTokensWithBonus(uint256 baseAmount, uint256 bonusPercent) 
        external 
        payable 
        nonReentrant
        returns (uint256) 
    {
        require(msg.value > 0, "Must send ETH");
        require(baseAmount > 0, "Invalid base amount");
        require(bonusPercent <= 100, "Bonus too high");
        
        // Safe bonus calculation
        require(
            baseAmount <= type(uint256).max / bonusPercent,
            "Bonus calculation would overflow"
        );
        
        uint256 bonus = (baseAmount * bonusPercent) / 100;
        
        // Check for addition overflow
        require(
            baseAmount <= type(uint256).max - bonus,
            "Total tokens would overflow"
        );
        
        uint256 totalTokens = baseAmount + bonus;
        
        // Check supply limits
        require(
            totalSupply + totalTokens <= MAX_SUPPLY,
            "Would exceed max supply"
        );
        
        // Check user balance overflow
        require(
            balances[msg.sender] <= type(uint256).max - totalTokens,
            "User balance would overflow"
        );
        
        balances[msg.sender] += totalTokens;
        totalSupply += totalTokens;
        
        return totalTokens;
    }
    
    /**
     * @dev Secure withdrawal with penalty calculation
     */
    function withdrawWithPenalty(uint256 amount, uint256 penaltyPercent) 
        external 
        nonReentrant
        sufficientBalance(msg.sender, amount)
        withdrawalDelayMet(msg.sender)
    {
        require(amount > 0, "Must withdraw something");
        require(penaltyPercent <= 100, "Invalid penalty percentage");
        require(amount <= MAX_WITHDRAWAL, "Exceeds maximum withdrawal");
        
        // Safe penalty calculation
        uint256 penalty = (amount * penaltyPercent) / 100;
        
        // Ensure penalty doesn't exceed amount
        require(penalty <= amount, "Penalty calculation error");
        
        uint256 netAmount = amount - penalty;
        require(address(this).balance >= netAmount, "Insufficient contract balance");
        
        // Update state before external call
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        lastWithdrawal[msg.sender] = block.timestamp;
        
        // External call
        (bool success, ) = payable(msg.sender).call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, netAmount);
    }
    
    /**
     * @dev Emergency function to pause contract (owner only)
     */
    function emergencyPause() external onlyOwner {
        // Implementation would include pause functionality
        emit SecurityAlert("Emergency pause activated", msg.sender, block.timestamp);
    }
    
    /**
     * @dev Safe division with zero check
     */
    function safeDiv(uint256 a, uint256 b) external pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }
    
    /**
     * @dev Safe percentage calculation
     */
    function calculatePercentage(uint256 amount, uint256 percentage) 
        external 
        pure 
        returns (uint256) 
    {
        require(amount > 0, "Amount must be positive");
        require(percentage <= 10000, "Percentage too high"); // Max 100%
        
        // Check for overflow
        require(
            amount <= type(uint256).max / percentage,
            "Percentage calculation would overflow"
        );
        
        return (amount * percentage) / 10000;
    }
    
    // Getter functions
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }
    
    function getLastWithdrawal(address user) external view returns (uint256) {
        return lastWithdrawal[user];
    }
    
    function getMaxValues() external pure returns (
        uint256 maxSupply,
        uint256 maxWithdrawal,
        uint256 maxTransfer,
        uint256 maxBatchSize
    ) {
        return (MAX_SUPPLY, MAX_WITHDRAWAL, MAX_TRANSFER_AMOUNT, MAX_BATCH_SIZE);
    }
}

/**
 * @title SafeMathDemo
 * @dev Demonstrates explicit SafeMath usage (optional in Solidity 0.8+)
 */
contract SafeMathDemo {
    using SafeMath for uint256;
    
    /**
     * @dev Demonstrates SafeMath operations
     */
    function demonstrateSafeMath(
        uint256 a, 
        uint256 b
    ) external pure returns (
        uint256 sum,
        uint256 difference,
        uint256 product,
        uint256 quotient
    ) {
        // These will revert on overflow/underflow
        sum = a.add(b);
        difference = a.sub(b);
        product = a.mul(b);
        quotient = a.div(b);
        
        return (sum, difference, product, quotient);
    }
    
    /**
     * @dev Safe power calculation
     */
    function safePower(uint256 base, uint256 exponent) 
        external 
        pure 
        returns (uint256) 
    {
        require(exponent <= 100, "Exponent too large");
        
        if (exponent == 0) return 1;
        if (base == 0) return 0;
        if (base == 1) return 1;
        
        uint256 result = 1;
        
        for (uint256 i = 0; i < exponent; i++) {
            // Check for overflow before multiplication
            require(
                result <= type(uint256).max / base,
                "Power calculation would overflow"
            );
            result = result.mul(base);
        }
        
        return result;
    }
}

/**
 * @title OverflowDetector
 * @dev Utility contract for detecting potential overflows
 */
library OverflowDetector {
    /**
     * @dev Check if addition would overflow
     */
    function willAddOverflow(uint256 a, uint256 b) internal pure returns (bool) {
        return a > type(uint256).max - b;
    }
    
    /**
     * @dev Check if multiplication would overflow
     */
    function willMulOverflow(uint256 a, uint256 b) internal pure returns (bool) {
        if (a == 0) return false;
        return b > type(uint256).max / a;
    }
    
    /**
     * @dev Check if subtraction would underflow
     */
    function willSubUnderflow(uint256 a, uint256 b) internal pure returns (bool) {
        return a < b;
    }
    
    /**
     * @dev Safe addition with overflow detection
     */
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256, bool) {
        if (willAddOverflow(a, b)) {
            return (0, false);
        }
        return (a + b, true);
    }
    
    /**
     * @dev Safe multiplication with overflow detection
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256, bool) {
        if (willMulOverflow(a, b)) {
            return (0, false);
        }
        return (a * b, true);
    }
}
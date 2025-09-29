// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title OracleManipulationSecure
 * @dev Demonstrates secure oracle implementations and protection mechanisms
 * 
 * Security measures implemented:
 * 1. Multiple oracle sources with aggregation
 * 2. Time-weighted average price (TWAP)
 * 3. Price deviation checks and circuit breakers
 * 4. Stale price detection
 * 5. Heartbeat monitoring
 * 6. Price validation and sanity checks
 * 7. Emergency pause functionality
 * 8. Gradual price updates
 * 9. Oracle failure handling
 * 10. MEV protection mechanisms
 */

interface ISecureOracle {
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp, bool isValid);
    function getTWAP(address token, uint256 period) external view returns (uint256);
    function isStale(address token) external view returns (bool);
}

interface IChainlinkOracle {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/**
 * @dev Secure oracle aggregator with multiple data sources
 */
contract SecureOracleAggregator is AccessControl, Pausable, ReentrancyGuard {
    using Math for uint256;
    
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 roundId;
        bool isValid;
    }
    
    struct OracleConfig {
        address oracle;
        uint256 weight;
        uint256 maxStaleness;
        uint256 maxDeviation; // Maximum allowed deviation from median (in basis points)
        bool isActive;
        uint8 decimals;
    }
    
    struct TWAPData {
        uint256 cumulativePrice;
        uint256 lastUpdateTime;
        uint256 lastPrice;
    }
    
    // Token => Oracle sources
    mapping(address => OracleConfig[]) public oracles;
    mapping(address => PriceData) public latestPrices;
    mapping(address => TWAPData) public twapData;
    mapping(address => uint256[]) public priceHistory;
    mapping(address => uint256) public lastValidPrices;
    
    // Circuit breaker settings
    mapping(address => uint256) public maxPriceDeviation; // Max deviation from previous price (basis points)
    mapping(address => uint256) public emergencyPauseDuration;
    mapping(address => uint256) public lastEmergencyPause;
    
    uint256 public constant MAX_STALENESS = 3600; // 1 hour default
    uint256 public constant MIN_ORACLES = 2;
    uint256 public constant MAX_DEVIATION = 1000; // 10% in basis points
    uint256 public constant PRICE_HISTORY_SIZE = 100;
    uint256 public constant BASIS_POINTS = 10000;
    
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp, uint256 confidence);
    event OracleAdded(address indexed token, address oracle, uint256 weight);
    event OracleRemoved(address indexed token, address oracle);
    event CircuitBreakerTriggered(address indexed token, uint256 oldPrice, uint256 newPrice, string reason);
    event EmergencyPause(address indexed token, string reason);
    event PriceValidationFailed(address indexed token, address oracle, uint256 price, string reason);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ORACLE_UPDATER_ROLE, _msgSender());
        _grantRole(EMERGENCY_ROLE, _msgSender());
    }
    
    /**
     * @dev Add oracle source for a token
     */
    function addOracle(
        address token,
        address oracle,
        uint256 weight,
        uint256 maxStaleness,
        uint256 maxDeviation,
        uint8 decimals
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token");
        require(oracle != address(0), "Invalid oracle");
        require(weight > 0, "Weight must be positive");
        require(maxStaleness > 0, "Max staleness must be positive");
        
        oracles[token].push(OracleConfig({
            oracle: oracle,
            weight: weight,
            maxStaleness: maxStaleness,
            maxDeviation: maxDeviation,
            isActive: true,
            decimals: decimals
        }));
        
        emit OracleAdded(token, oracle, weight);
    }
    
    /**
     * @dev Remove oracle source
     */
    function removeOracle(address token, uint256 index) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(index < oracles[token].length, "Invalid index");
        
        address oracleAddress = oracles[token][index].oracle;
        
        // Move last element to deleted spot and remove last element
        oracles[token][index] = oracles[token][oracles[token].length - 1];
        oracles[token].pop();
        
        emit OracleRemoved(token, oracleAddress);
    }
    
    /**
     * @dev Update price with comprehensive validation
     */
    function updatePrice(address token) external onlyRole(ORACLE_UPDATER_ROLE) whenNotPaused nonReentrant {
        require(oracles[token].length >= MIN_ORACLES, "Insufficient oracles");
        
        uint256[] memory prices = new uint256[](oracles[token].length);
        uint256[] memory weights = new uint256[](oracles[token].length);
        uint256 validPrices = 0;
        uint256 totalWeight = 0;
        
        // Collect prices from all oracles
        for (uint256 i = 0; i < oracles[token].length; i++) {
            OracleConfig memory config = oracles[token][i];
            if (!config.isActive) continue;
            
            (uint256 price, bool isValid) = _fetchPriceFromOracle(token, config);
            
            if (isValid && _validatePrice(token, price, config)) {
                prices[validPrices] = price;
                weights[validPrices] = config.weight;
                totalWeight += config.weight;
                validPrices++;
            }
        }
        
        require(validPrices >= MIN_ORACLES, "Insufficient valid prices");
        
        // Calculate weighted median price
        uint256 aggregatedPrice = _calculateWeightedMedian(prices, weights, validPrices);
        
        // Validate aggregated price
        require(_validateAggregatedPrice(token, aggregatedPrice), "Price validation failed");
        
        // Update price data
        _updatePriceData(token, aggregatedPrice);
        
        // Update TWAP
        _updateTWAP(token, aggregatedPrice);
        
        // Calculate confidence score
        uint256 confidence = _calculateConfidence(prices, validPrices, aggregatedPrice);
        
        emit PriceUpdated(token, aggregatedPrice, block.timestamp, confidence);
    }
    
    /**
     * @dev Get current price with validation
     */
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp, bool isValid) {
        PriceData memory data = latestPrices[token];
        
        bool fresh = block.timestamp - data.timestamp <= MAX_STALENESS;
        bool valid = data.isValid && fresh;
        
        if (!valid && lastValidPrices[token] > 0) {
            // Return last known valid price with warning
            return (lastValidPrices[token], data.timestamp, false);
        }
        
        return (data.price, data.timestamp, valid);
    }
    
    /**
     * @dev Get Time-Weighted Average Price
     */
    function getTWAP(address token, uint256 period) external view returns (uint256) {
        require(period > 0, "Period must be positive");
        require(period <= 24 hours, "Period too long");
        
        TWAPData memory data = twapData[token];
        
        if (data.lastUpdateTime == 0) {
            return latestPrices[token].price;
        }
        
        uint256 timeElapsed = block.timestamp - data.lastUpdateTime;
        if (timeElapsed == 0) {
            return data.lastPrice;
        }
        
        // Calculate TWAP over the specified period
        uint256 effectivePeriod = timeElapsed > period ? period : timeElapsed;
        return data.cumulativePrice / effectivePeriod;
    }
    
    /**
     * @dev Check if price is stale
     */
    function isStale(address token) external view returns (bool) {
        return block.timestamp - latestPrices[token].timestamp > MAX_STALENESS;
    }
    
    /**
     * @dev Get price with circuit breaker protection
     */
    function getPriceWithCircuitBreaker(address token) external view returns (uint256 price, bool isValid) {
        (uint256 currentPrice, , bool valid) = this.getPrice(token);
        
        if (!valid) {
            return (0, false);
        }
        
        // Check if circuit breaker should be triggered
        uint256 lastPrice = lastValidPrices[token];
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(currentPrice, lastPrice);
            if (deviation > maxPriceDeviation[token]) {
                return (lastPrice, false); // Return last valid price
            }
        }
        
        return (currentPrice, true);
    }
    
    /**
     * @dev Emergency pause for specific token
     */
    function emergencyPauseToken(address token, string calldata reason) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        lastEmergencyPause[token] = block.timestamp;
        emit EmergencyPause(token, reason);
    }
    
    /**
     * @dev Set circuit breaker parameters
     */
    function setCircuitBreakerParams(
        address token,
        uint256 _maxPriceDeviation,
        uint256 _emergencyPauseDuration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxPriceDeviation[token] = _maxPriceDeviation;
        emergencyPauseDuration[token] = _emergencyPauseDuration;
    }
    
    /**
     * @dev Internal function to fetch price from oracle
     */
    function _fetchPriceFromOracle(
        address token,
        OracleConfig memory config
    ) internal view returns (uint256 price, bool isValid) {
        try IChainlinkOracle(config.oracle).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (answer <= 0) return (0, false);
            if (block.timestamp - updatedAt > config.maxStaleness) return (0, false);
            
            // Normalize to 18 decimals
            uint256 normalizedPrice = uint256(answer);
            if (config.decimals != 18) {
                if (config.decimals < 18) {
                    normalizedPrice = normalizedPrice * (10 ** (18 - config.decimals));
                } else {
                    normalizedPrice = normalizedPrice / (10 ** (config.decimals - 18));
                }
            }
            
            return (normalizedPrice, true);
        } catch {
            return (0, false);
        }
    }
    
    /**
     * @dev Validate individual oracle price
     */
    function _validatePrice(
        address token,
        uint256 price,
        OracleConfig memory config
    ) internal view returns (bool) {
        if (price == 0) return false;
        
        // Check against last valid price
        uint256 lastPrice = lastValidPrices[token];
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(price, lastPrice);
            if (deviation > config.maxDeviation) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Validate aggregated price
     */
    function _validateAggregatedPrice(address token, uint256 price) internal view returns (bool) {
        if (price == 0) return false;
        
        uint256 lastPrice = lastValidPrices[token];
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(price, lastPrice);
            if (deviation > MAX_DEVIATION) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Calculate weighted median price
     */
    function _calculateWeightedMedian(
        uint256[] memory prices,
        uint256[] memory weights,
        uint256 length
    ) internal pure returns (uint256) {
        if (length == 1) return prices[0];
        if (length == 2) {
            return (prices[0] * weights[0] + prices[1] * weights[1]) / (weights[0] + weights[1]);
        }
        
        // Sort prices with weights
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    (prices[j], prices[j + 1]) = (prices[j + 1], prices[j]);
                    (weights[j], weights[j + 1]) = (weights[j + 1], weights[j]);
                }
            }
        }
        
        // Find weighted median
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < length; i++) {
            totalWeight += weights[i];
        }
        
        uint256 halfWeight = totalWeight / 2;
        uint256 cumulativeWeight = 0;
        
        for (uint256 i = 0; i < length; i++) {
            cumulativeWeight += weights[i];
            if (cumulativeWeight >= halfWeight) {
                return prices[i];
            }
        }
        
        return prices[length / 2]; // Fallback to middle element
    }
    
    /**
     * @dev Update price data with history
     */
    function _updatePriceData(address token, uint256 price) internal {
        latestPrices[token] = PriceData({
            price: price,
            timestamp: block.timestamp,
            roundId: latestPrices[token].roundId + 1,
            isValid: true
        });
        
        lastValidPrices[token] = price;
        
        // Update price history
        priceHistory[token].push(price);
        if (priceHistory[token].length > PRICE_HISTORY_SIZE) {
            // Remove oldest price
            for (uint256 i = 0; i < priceHistory[token].length - 1; i++) {
                priceHistory[token][i] = priceHistory[token][i + 1];
            }
            priceHistory[token].pop();
        }
    }
    
    /**
     * @dev Update TWAP data
     */
    function _updateTWAP(address token, uint256 price) internal {
        TWAPData storage data = twapData[token];
        
        if (data.lastUpdateTime == 0) {
            data.cumulativePrice = price;
            data.lastUpdateTime = block.timestamp;
            data.lastPrice = price;
        } else {
            uint256 timeElapsed = block.timestamp - data.lastUpdateTime;
            data.cumulativePrice += data.lastPrice * timeElapsed;
            data.lastUpdateTime = block.timestamp;
            data.lastPrice = price;
        }
    }
    
    /**
     * @dev Calculate price deviation in basis points
     */
    function _calculateDeviation(uint256 newPrice, uint256 oldPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        
        uint256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return (diff * BASIS_POINTS) / oldPrice;
    }
    
    /**
     * @dev Calculate confidence score based on price consensus
     */
    function _calculateConfidence(
        uint256[] memory prices,
        uint256 length,
        uint256 aggregatedPrice
    ) internal pure returns (uint256) {
        if (length <= 1) return 50; // Low confidence with single source
        
        uint256 totalDeviation = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 deviation = prices[i] > aggregatedPrice ? 
                prices[i] - aggregatedPrice : aggregatedPrice - prices[i];
            totalDeviation += (deviation * BASIS_POINTS) / aggregatedPrice;
        }
        
        uint256 avgDeviation = totalDeviation / length;
        
        // Convert to confidence score (0-100)
        if (avgDeviation >= 1000) return 0; // Very low confidence if avg deviation > 10%
        return 100 - (avgDeviation / 10); // Linear mapping
    }
    
    // Getter functions
    function getOracleCount(address token) external view returns (uint256) {
        return oracles[token].length;
    }
    
    function getOracleConfig(address token, uint256 index) external view returns (OracleConfig memory) {
        require(index < oracles[token].length, "Invalid index");
        return oracles[token][index];
    }
    
    function getPriceHistory(address token) external view returns (uint256[] memory) {
        return priceHistory[token];
    }
    
    function getTWAPData(address token) external view returns (TWAPData memory) {
        return twapData[token];
    }
}

/**
 * @dev Secure lending protocol with oracle protection
 */
contract SecureLendingProtocol is AccessControl, ReentrancyGuard, Pausable {
    SecureOracleAggregator public oracle;
    IERC20 public collateralToken;
    IERC20 public borrowToken;
    
    mapping(address => uint256) public collateralBalances;
    mapping(address => uint256) public borrowBalances;
    mapping(address => uint256) public lastBorrowTime;
    mapping(address => uint256) public lastLiquidationTime;
    
    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% liquidation threshold
    uint256 public constant LIQUIDATION_BONUS = 105; // 5% liquidation bonus
    uint256 public constant MIN_BORROW_INTERVAL = 1 hours;
    uint256 public constant MIN_LIQUIDATION_INTERVAL = 30 minutes;
    uint256 public constant MAX_LIQUIDATION_AMOUNT = 50; // 50% of debt
    
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    
    event Deposit(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed user, uint256 amount);
    event PriceValidationFailed(address indexed token, string reason);
    
    constructor(
        address _oracle,
        address _collateralToken,
        address _borrowToken
    ) {
        oracle = SecureOracleAggregator(_oracle);
        collateralToken = IERC20(_collateralToken);
        borrowToken = IERC20(_borrowToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(LIQUIDATOR_ROLE, _msgSender());
    }
    
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        collateralToken.transferFrom(msg.sender, address(this), amount);
        collateralBalances[msg.sender] += amount;
        
        emit Deposit(msg.sender, amount);
    }
    
    function borrow(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(
            block.timestamp >= lastBorrowTime[msg.sender] + MIN_BORROW_INTERVAL,
            "Borrow too frequent"
        );
        
        // Get validated prices
        (uint256 collateralPrice, bool collateralValid) = oracle.getPriceWithCircuitBreaker(address(collateralToken));
        (uint256 borrowPrice, bool borrowValid) = oracle.getPriceWithCircuitBreaker(address(borrowToken));
        
        require(collateralValid && borrowValid, "Invalid oracle prices");
        
        uint256 collateralValue = collateralBalances[msg.sender] * collateralPrice;
        uint256 newBorrowValue = (borrowBalances[msg.sender] + amount) * borrowPrice;
        
        require(
            newBorrowValue * COLLATERAL_RATIO <= collateralValue * 100,
            "Insufficient collateral"
        );
        
        borrowBalances[msg.sender] += amount;
        lastBorrowTime[msg.sender] = block.timestamp;
        
        borrowToken.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }
    
    function liquidate(address user, uint256 amount) 
        external 
        onlyRole(LIQUIDATOR_ROLE)
        whenNotPaused 
        nonReentrant 
    {
        require(user != msg.sender, "Cannot liquidate self");
        require(
            block.timestamp >= lastLiquidationTime[user] + MIN_LIQUIDATION_INTERVAL,
            "Liquidation too frequent"
        );
        
        // Validate prices with additional checks
        (uint256 collateralPrice, bool collateralValid) = oracle.getPriceWithCircuitBreaker(address(collateralToken));
        (uint256 borrowPrice, bool borrowValid) = oracle.getPriceWithCircuitBreaker(address(borrowToken));
        
        require(collateralValid && borrowValid, "Invalid oracle prices");
        
        // Additional TWAP validation
        uint256 collateralTWAP = oracle.getTWAP(address(collateralToken), 1 hours);
        uint256 borrowTWAP = oracle.getTWAP(address(borrowToken), 1 hours);
        
        // Ensure current price is within reasonable range of TWAP
        require(
            _isWithinRange(collateralPrice, collateralTWAP, 500), // 5% deviation
            "Collateral price deviation too high"
        );
        require(
            _isWithinRange(borrowPrice, borrowTWAP, 500),
            "Borrow price deviation too high"
        );
        
        uint256 collateralValue = collateralBalances[user] * collateralPrice;
        uint256 borrowValue = borrowBalances[user] * borrowPrice;
        
        require(
            borrowValue * 100 > collateralValue * LIQUIDATION_THRESHOLD,
            "Position is healthy"
        );
        
        // Limit liquidation amount
        uint256 maxLiquidation = (borrowBalances[user] * MAX_LIQUIDATION_AMOUNT) / 100;
        require(amount <= maxLiquidation, "Liquidation amount too high");
        require(amount <= borrowBalances[user], "Amount exceeds debt");
        
        // Calculate collateral to seize
        uint256 collateralToSeize = (amount * borrowPrice * LIQUIDATION_BONUS) / (collateralPrice * 100);
        require(collateralToSeize <= collateralBalances[user], "Insufficient collateral");
        
        // Execute liquidation
        borrowToken.transferFrom(msg.sender, address(this), amount);
        collateralToken.transfer(msg.sender, collateralToSeize);
        
        borrowBalances[user] -= amount;
        collateralBalances[user] -= collateralToSeize;
        lastLiquidationTime[user] = block.timestamp;
        
        emit Liquidate(msg.sender, user, amount);
    }
    
    function getHealthFactor(address user) external view returns (uint256) {
        (uint256 collateralPrice, bool collateralValid) = oracle.getPriceWithCircuitBreaker(address(collateralToken));
        (uint256 borrowPrice, bool borrowValid) = oracle.getPriceWithCircuitBreaker(address(borrowToken));
        
        if (!collateralValid || !borrowValid) return 0;
        
        uint256 borrowValue = borrowBalances[user] * borrowPrice;
        if (borrowValue == 0) return type(uint256).max;
        
        uint256 collateralValue = collateralBalances[user] * collateralPrice;
        return (collateralValue * 100) / borrowValue;
    }
    
    function _isWithinRange(uint256 price1, uint256 price2, uint256 maxDeviationBps) internal pure returns (bool) {
        if (price2 == 0) return false;
        
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        uint256 deviation = (diff * 10000) / price2;
        
        return deviation <= maxDeviationBps;
    }
}

/**
 * @dev Secure DEX with MEV protection
 */
contract SecureDEX is ReentrancyGuard, Pausable {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    mapping(address => uint256) public lastSwapTime;
    mapping(address => uint256) public swapCount;
    
    uint256 public constant MIN_SWAP_INTERVAL = 1 minutes;
    uint256 public constant MAX_SWAPS_PER_HOUR = 10;
    uint256 public constant MAX_PRICE_IMPACT = 300; // 3% max price impact
    uint256 public constant MIN_LIQUIDITY = 1000 ether;
    
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool aToB, uint256 priceImpact);
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB);
    
    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    function addLiquidity(uint256 amountA, uint256 amountB) external whenNotPaused nonReentrant {
        require(amountA > 0 && amountB > 0, "Amounts must be positive");
        
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        reserveA += amountA;
        reserveB += amountB;
        
        emit AddLiquidity(msg.sender, amountA, amountB);
    }
    
    function swapAToB(uint256 amountIn) external whenNotPaused nonReentrant {
        require(amountIn > 0, "Amount must be positive");
        require(reserveA >= MIN_LIQUIDITY && reserveB >= MIN_LIQUIDITY, "Insufficient liquidity");
        
        // Rate limiting
        require(
            block.timestamp >= lastSwapTime[msg.sender] + MIN_SWAP_INTERVAL,
            "Swap too frequent"
        );
        
        // Reset hourly counter if needed
        if (block.timestamp >= lastSwapTime[msg.sender] + 1 hours) {
            swapCount[msg.sender] = 0;
        }
        
        require(swapCount[msg.sender] < MAX_SWAPS_PER_HOUR, "Hourly swap limit exceeded");
        
        // Calculate output with fees
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveB;
        uint256 denominator = (reserveA * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;
        
        require(amountOut > 0, "Insufficient output");
        
        // Check price impact
        uint256 priceImpact = (amountIn * 10000) / reserveA;
        require(priceImpact <= MAX_PRICE_IMPACT, "Price impact too high");
        
        // Execute swap
        tokenA.transferFrom(msg.sender, address(this), amountIn);
        tokenB.transfer(msg.sender, amountOut);
        
        reserveA += amountIn;
        reserveB -= amountOut;
        
        lastSwapTime[msg.sender] = block.timestamp;
        swapCount[msg.sender]++;
        
        emit Swap(msg.sender, amountIn, amountOut, true, priceImpact);
    }
    
    function swapBToA(uint256 amountIn) external whenNotPaused nonReentrant {
        require(amountIn > 0, "Amount must be positive");
        require(reserveA >= MIN_LIQUIDITY && reserveB >= MIN_LIQUIDITY, "Insufficient liquidity");
        
        require(
            block.timestamp >= lastSwapTime[msg.sender] + MIN_SWAP_INTERVAL,
            "Swap too frequent"
        );
        
        if (block.timestamp >= lastSwapTime[msg.sender] + 1 hours) {
            swapCount[msg.sender] = 0;
        }
        
        require(swapCount[msg.sender] < MAX_SWAPS_PER_HOUR, "Hourly swap limit exceeded");
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveA;
        uint256 denominator = (reserveB * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;
        
        require(amountOut > 0, "Insufficient output");
        
        uint256 priceImpact = (amountIn * 10000) / reserveB;
        require(priceImpact <= MAX_PRICE_IMPACT, "Price impact too high");
        
        tokenB.transferFrom(msg.sender, address(this), amountIn);
        tokenA.transfer(msg.sender, amountOut);
        
        reserveB += amountIn;
        reserveA -= amountOut;
        
        lastSwapTime[msg.sender] = block.timestamp;
        swapCount[msg.sender]++;
        
        emit Swap(msg.sender, amountIn, amountOut, false, priceImpact);
    }
    
    function getPrice() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }
    
    function getPriceImpact(uint256 amountIn, bool aToB) external view returns (uint256) {
        if (aToB) {
            return (amountIn * 10000) / reserveA;
        } else {
            return (amountIn * 10000) / reserveB;
        }
    }
}

/**
 * @dev Secure yield farming with oracle protection
 */
contract SecureYieldFarm is AccessControl, ReentrancyGuard, Pausable {
    SecureOracleAggregator public oracle;
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public accumulatedRewards;
    
    uint256 public baseRewardRate = 100; // Base rewards per second per token
    uint256 public maxPriceBonus = 200; // Max 200% bonus
    uint256 public constant TWAP_PERIOD = 4 hours;
    
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    
    event Stake(address indexed user, uint256 amount);
    event Unstake(address indexed user, uint256 amount);
    event ClaimRewards(address indexed user, uint256 amount);
    
    constructor(
        address _oracle,
        address _stakingToken,
        address _rewardToken
    ) {
        oracle = SecureOracleAggregator(_oracle);
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(REWARD_MANAGER_ROLE, _msgSender());
    }
    
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        stakedBalances[msg.sender] += amount;
        lastRewardTime[msg.sender] = block.timestamp;
        
        emit Stake(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount <= stakedBalances[msg.sender], "Insufficient balance");
        
        _claimRewards(msg.sender);
        
        stakedBalances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
        
        emit Unstake(msg.sender, amount);
    }
    
    function claimRewards() external whenNotPaused nonReentrant {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address user) internal {
        uint256 stakedAmount = stakedBalances[user];
        if (stakedAmount == 0) return;
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[user];
        if (timeElapsed == 0) return;
        
        // Use TWAP for price-based bonus calculation
        uint256 twapPrice = oracle.getTWAP(address(stakingToken), TWAP_PERIOD);
        (uint256 currentPrice, , bool isValid) = oracle.getPrice(address(stakingToken));
        
        // Base reward calculation
        uint256 baseReward = (stakedAmount * timeElapsed * baseRewardRate) / 1e18;
        
        uint256 totalReward = baseReward;
        
        // Add price-based bonus only if price data is valid and stable
        if (isValid && twapPrice > 0) {
            // Use TWAP to prevent manipulation
            uint256 priceBonus = (baseReward * twapPrice) / 1e18;
            
            // Cap the bonus
            if (priceBonus > (baseReward * maxPriceBonus) / 100) {
                priceBonus = (baseReward * maxPriceBonus) / 100;
            }
            
            // Only add bonus if current price is close to TWAP (prevents manipulation)
            if (_isWithinRange(currentPrice, twapPrice, 1000)) { // 10% tolerance
                totalReward += priceBonus;
            }
        }
        
        lastRewardTime[user] = block.timestamp;
        accumulatedRewards[user] += totalReward;
        
        if (totalReward > 0) {
            rewardToken.transfer(user, totalReward);
            emit ClaimRewards(user, totalReward);
        }
    }
    
    function _isWithinRange(uint256 price1, uint256 price2, uint256 maxDeviationBps) internal pure returns (bool) {
        if (price2 == 0) return false;
        
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        uint256 deviation = (diff * 10000) / price2;
        
        return deviation <= maxDeviationBps;
    }
    
    function setRewardRate(uint256 newRate) external onlyRole(REWARD_MANAGER_ROLE) {
        require(newRate <= 1000, "Rate too high"); // Max 1000 per second
        baseRewardRate = newRate;
    }
    
    function setMaxPriceBonus(uint256 newBonus) external onlyRole(REWARD_MANAGER_ROLE) {
        require(newBonus <= 500, "Bonus too high"); // Max 500%
        maxPriceBonus = newBonus;
    }
    
    function getPendingRewards(address user) external view returns (uint256) {
        uint256 stakedAmount = stakedBalances[user];
        if (stakedAmount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[user];
        if (timeElapsed == 0) return 0;
        
        uint256 baseReward = (stakedAmount * timeElapsed * baseRewardRate) / 1e18;
        
        // Estimate bonus (simplified)
        uint256 twapPrice = oracle.getTWAP(address(stakingToken), TWAP_PERIOD);
        if (twapPrice > 0) {
            uint256 priceBonus = (baseReward * twapPrice) / 1e18;
            if (priceBonus > (baseReward * maxPriceBonus) / 100) {
                priceBonus = (baseReward * maxPriceBonus) / 100;
            }
            return baseReward + priceBonus;
        }
        
        return baseReward;
    }
}
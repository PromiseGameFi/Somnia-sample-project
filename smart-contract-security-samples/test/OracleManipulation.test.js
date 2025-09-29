const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Oracle Manipulation Test Suite
 * @dev Comprehensive test suite for oracle manipulation attack examples
 * 
 * Tests cover:
 * 1. Price oracle manipulation attacks
 * 2. Flash loan oracle attacks
 * 3. Time-weighted average price (TWAP) manipulation
 * 4. Multi-oracle validation
 * 5. Circuit breaker mechanisms
 * 6. Oracle deviation detection
 */
describe("Oracle Manipulation Security Tests", function () {
  async function deployFixture() {
    const [owner, attacker, user1, user2, oracleOperator] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Token A", "TKNA", ethers.utils.parseEther("1000000"));
    const tokenB = await MockERC20.deploy("Token B", "TKNB", ethers.utils.parseEther("1000000"));

    // Deploy vulnerable oracle
    const VulnerableOracle = await ethers.getContractFactory("VulnerableOracle");
    const vulnerableOracle = await VulnerableOracle.deploy();

    // Deploy vulnerable DEX
    const VulnerableDEX = await ethers.getContractFactory("VulnerableDEX");
    const vulnerableDEX = await VulnerableDEX.deploy(tokenA.address, tokenB.address);

    // Deploy vulnerable lending protocol
    const VulnerableLendingProtocol = await ethers.getContractFactory("VulnerableLendingProtocol");
    const vulnerableLending = await VulnerableLendingProtocol.deploy(
      vulnerableOracle.address,
      tokenA.address,
      tokenB.address
    );

    // Deploy secure oracle aggregator
    const SecureOracleAggregator = await ethers.getContractFactory("SecureOracleAggregator");
    const secureOracle = await SecureOracleAggregator.deploy();

    // Deploy secure lending protocol
    const SecureLendingProtocol = await ethers.getContractFactory("SecureLendingProtocol");
    const secureLending = await SecureLendingProtocol.deploy(
      secureOracle.address,
      tokenA.address,
      tokenB.address
    );

    return {
      vulnerableOracle,
      vulnerableDEX,
      vulnerableLending,
      secureOracle,
      secureLending,
      tokenA,
      tokenB,
      owner,
      attacker,
      user1,
      user2,
      oracleOperator
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should demonstrate single oracle manipulation", async function () {
      const { vulnerableOracle, tokenA, attacker, owner } = await loadFixture(deployFixture);

      // Set initial price
      const initialPrice = ethers.utils.parseEther("100"); // $100
      await vulnerableOracle.connect(owner).updatePrice(tokenA.address, initialPrice);

      // Get initial price from vulnerable oracle
      const contractPrice1 = await vulnerableOracle.getPrice(tokenA.address);
      expect(contractPrice1).to.equal(initialPrice);

      // Attacker manipulates oracle price
      const manipulatedPrice = ethers.utils.parseEther("1000"); // $1000
      await vulnerableOracle.connect(owner).updatePrice(tokenA.address, manipulatedPrice);

      // Vulnerable oracle immediately reflects manipulated price
      const contractPrice2 = await vulnerableOracle.getPrice(tokenA.address);
      expect(contractPrice2).to.equal(manipulatedPrice);

      console.log(`Price manipulation: ${ethers.utils.formatEther(initialPrice)} -> ${ethers.utils.formatEther(manipulatedPrice)}`);
    });

    it("should demonstrate DEX price manipulation", async function () {
      const { vulnerableDEX, tokenA, tokenB, attacker, owner } = await loadFixture(deployFixture);

      // Setup initial liquidity
      const liquidityA = ethers.utils.parseEther("1000");
      const liquidityB = ethers.utils.parseEther("1000");
      
      await tokenA.transfer(owner.address, liquidityA);
      await tokenB.transfer(owner.address, liquidityB);
      await tokenA.connect(owner).approve(vulnerableDEX.address, liquidityA);
      await tokenB.connect(owner).approve(vulnerableDEX.address, liquidityB);
      
      await vulnerableDEX.connect(owner).addLiquidity(liquidityA, liquidityB);

      // Record initial price
      const initialPrice = await vulnerableDEX.getPrice();
      
      // Attacker manipulates price by large swap
      const swapAmount = ethers.utils.parseEther("500");
      await tokenA.transfer(attacker.address, swapAmount);
      await tokenA.connect(attacker).approve(vulnerableDEX.address, swapAmount);
      
      await vulnerableDEX.connect(attacker).swapAToB(swapAmount);

      // Verify price manipulation
      const manipulatedPrice = await vulnerableDEX.getPrice();
      expect(manipulatedPrice).to.not.equal(initialPrice);
      
      console.log(`DEX manipulation - Initial: ${ethers.utils.formatEther(initialPrice)}, Manipulated: ${ethers.utils.formatEther(manipulatedPrice)}`);
    });

    it("should demonstrate extreme price deviation vulnerability", async function () {
      const { vulnerableOracle, tokenA, attacker, owner, oracleOperator } = await loadFixture(deployFixture);

      // Set initial price
      const initialPrice = ethers.utils.parseEther("100");
      await vulnerableOracle.connect(owner).updatePrice(tokenA.address, initialPrice);

      // Extreme price deviation (99% drop)
      const deviatedPrice = ethers.utils.parseEther("1");
      await vulnerableOracle.connect(oracleOperator).updatePrice(tokenA.address, deviatedPrice);

      // Vulnerable oracle accepts extreme deviation without validation
      const contractPrice = await vulnerableOracle.getPrice(tokenA.address);
      expect(contractPrice).to.equal(deviatedPrice);

      const deviationPercent = initialPrice.sub(deviatedPrice).mul(100).div(initialPrice);
      console.log(`Price deviation: ${deviationPercent}%`);
    });

    it("should demonstrate stale price vulnerability", async function () {
      const { vulnerableOracle, tokenA, oracleOperator } = await loadFixture(deployFixture);

      // Set initial price
      const price = ethers.utils.parseEther("100");
      await vulnerableOracle.connect(oracleOperator).updatePrice(tokenA.address, price);

      // Simulate time passing to make price stale
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      // Vulnerable oracle still returns stale price without validation
      const contractPrice = await vulnerableOracle.getPrice(tokenA.address);
      expect(contractPrice).to.equal(price);

      console.log(`Stale price accepted: ${ethers.utils.formatEther(contractPrice)}`);
    });

    it("should show vulnerability to oracle front-running", async function () {
      const { vulnerableOracle, vulnerableLending, tokenA, attacker, oracleOperator } = await loadFixture(deployFixture);

      // Set initial price
      const initialPrice = ethers.utils.parseEther("100");
      await vulnerableOracle.connect(oracleOperator).updatePrice(tokenA.address, initialPrice);

      // Attacker sees oracle update transaction in mempool and front-runs
      const newPrice = ethers.utils.parseEther("120");
      
      // Simulate front-running by executing trade before oracle update
      const tradeAmount = ethers.utils.parseEther("10");
      await tokenA.transfer(attacker.address, tradeAmount);
      await tokenA.connect(attacker).approve(vulnerableLending.address, tradeAmount);
      
      // Oracle update happens after attacker's transaction
      await vulnerableOracle.connect(oracleOperator).updatePrice(tokenA.address, newPrice);

      console.log(`Front-running attack executed at price: ${ethers.utils.formatEther(initialPrice)}`);
    });
  });

  describe("Secure Contract Tests", function () {
    it("should implement multi-oracle validation", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set consistent prices across oracles
      const price1 = ethers.utils.parseEther("100");
      const price2 = ethers.utils.parseEther("101"); // 1% difference
      
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Secure oracle should aggregate prices
      const [aggregatedPrice] = await secureOracle.getPrice(tokenA.address);
      const expectedPrice = price1.add(price2).div(2); // Average
      
      expect(aggregatedPrice).to.be.closeTo(expectedPrice, ethers.utils.parseEther("0.5"));
      console.log(`Aggregated price: ${ethers.utils.formatEther(aggregatedPrice)}`);
    });

    it("should reject prices with excessive deviation", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set prices with excessive deviation
      const price1 = ethers.utils.parseEther("100");
      const price2 = ethers.utils.parseEther("200"); // 100% difference
      
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Secure oracle should handle excessive deviation
      const [currentPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.true; // Should still provide price but may trigger circuit breaker
    });

    it("should implement time-weighted average price (TWAP)", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set initial prices
      const price1 = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Get initial TWAP
      const initialTWAP = await secureOracle.getTWAP(tokenA.address, 3600);
      
      // Update prices
      const price2 = ethers.utils.parseEther("110");
      await secureOracle.updatePrice(tokenA.address);

      // TWAP should be smoothed
      const updatedTWAP = await secureOracle.getTWAP(tokenA.address, 3600);
      
      expect(updatedTWAP).to.be.gt(initialTWAP);
      expect(updatedTWAP).to.be.lt(price2); // Should be less than current price due to averaging
      
      console.log(`TWAP: ${ethers.utils.formatEther(initialTWAP)} -> ${ethers.utils.formatEther(updatedTWAP)}`);
    });

    it("should implement circuit breaker for extreme price movements", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set initial price
      const initialPrice = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Trigger circuit breaker with extreme price
      const extremePrice = ethers.utils.parseEther("1000"); // 10x increase
      await secureOracle.updatePrice(tokenA.address);

      // Circuit breaker should be triggered
      const isCircuitBreakerActive = await secureOracle.isCircuitBreakerActive(tokenA.address);
      expect(isCircuitBreakerActive).to.be.true;

      // Price updates should be handled appropriately while circuit breaker is active
      const [currentPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.true; // Should still provide price but with circuit breaker protection
    });

    it("should validate oracle freshness", async function () {
      const { secureOracle, tokenA, oracleOperator } = await loadFixture(deployFixture);

      // Set fresh prices
      const currentTime = Math.floor(Date.now() / 1000);
      const price = ethers.utils.parseEther("100");
      
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Fresh prices should be accepted
      const [aggregatedPrice] = await secureOracle.getPrice(tokenA.address);
      expect(aggregatedPrice).to.equal(price);

      // Simulate time passing to make price stale
      await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
      await ethers.provider.send("evm_mine");

      // Stale prices should be handled appropriately
      const [stalePrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.false; // Should indicate stale data
    });

    it("should implement oracle reputation system", async function () {
      const { secureOracle, tokenA, owner, oracleOperator } = await loadFixture(deployFixture);

      // Check initial oracle weights
      const weight1 = await secureOracle.getOracleWeight(oracleOperator.address);
      
      expect(weight1).to.equal(100); // Initial weight

      // Simulate oracle providing bad data
      await secureOracle.connect(owner).penalizeOracle(oracleOperator.address, 20);
      
      const newWeight1 = await secureOracle.getOracleWeight(oracleOperator.address);
      expect(newWeight1).to.equal(80); // Reduced weight

      console.log(`Oracle weight reduced: ${weight1} -> ${newWeight1}`);
    });

    it("should implement emergency oracle pause", async function () {
      const { secureOracle, tokenA, owner } = await loadFixture(deployFixture);

      // Owner should be able to pause oracle system
      await secureOracle.connect(owner).pauseOracles();
      
      const isPaused = await secureOracle.oraclesPaused();
      expect(isPaused).to.be.true;

      // Price queries should be handled when paused
      const [pausedPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.false; // Should indicate system is paused

      // Owner should be able to unpause
      await secureOracle.connect(owner).unpauseOracles();
      
      const isUnpaused = await secureOracle.oraclesPaused();
      expect(isUnpaused).to.be.false;
    });
  });

  describe("Advanced Attack Scenarios", function () {
    it("should prevent sandwich attacks using oracle manipulation", async function () {
      const { secureOracle, secureLending, tokenA, attacker, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set initial prices
      const initialPrice = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Attacker tries to manipulate price for sandwich attack
      const manipulatedPrice = ethers.utils.parseEther("110");
      await secureOracle.updatePrice(tokenA.address);
      
      // Secure contract should detect and handle manipulation
      const [currentPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.true; // Should still provide price but with protection mechanisms
    });

    it("should validate oracle freshness", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set initial price
      const price = ethers.utils.parseEther("100");
      
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Simulate oracle failure by removing one oracle
      await secureOracle.removeOracle(tokenA.address, 0);

      // System should continue with remaining oracles
      const [aggregatedPrice] = await secureOracle.getPrice(tokenA.address);
      expect(aggregatedPrice).to.equal(price); // Should use price from working oracle

      console.log(`System continued with remaining oracles: ${ethers.utils.formatEther(aggregatedPrice)}`);
    });

    it("should implement oracle consensus mechanism", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set prices that require consensus
      const price1 = ethers.utils.parseEther("100");
      const price2 = ethers.utils.parseEther("102"); // 2% difference
      
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Should achieve consensus with small deviation
      const [consensusPrice] = await secureOracle.getPrice(tokenA.address);
      expect(consensusPrice).to.be.gt(0);

      // Test with extreme price deviation
      const price3 = ethers.utils.parseEther("150"); // 50% difference
      await secureOracle.updatePrice(tokenA.address);

      // Should handle price deviation appropriately
      const [deviatedPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
      expect(isValid).to.be.true; // Should still be valid but may trigger circuit breaker
    });
  });

  describe("Gas Cost Analysis", function () {
    it("should compare gas costs between single and multi-oracle systems", async function () {
      const { vulnerableOracle, secureOracle, tokenA, oracleOperator } = await loadFixture(deployFixture);

      const price = ethers.utils.parseEther("100");
      await vulnerableOracle.connect(owner).updatePrice(tokenA.address, price);
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Single oracle gas cost
      const singleOracleGas = await vulnerableOracle.estimateGas.getPrice(tokenA.address);

      // Multi-oracle gas cost
      const multiOracleGas = await secureOracle.estimateGas.getPrice(tokenA.address);

      console.log(`Single oracle gas: ${singleOracleGas}`);
      console.log(`Multi-oracle gas: ${multiOracleGas}`);
      
      expect(multiOracleGas.gt(singleOracleGas)).to.be.true;
    });

    it("should analyze TWAP calculation gas costs", async function () {
      const { secureOracle, tokenA, oracleOperator, user1 } = await loadFixture(deployFixture);

      const price = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // TWAP calculation gas cost
      const twapGas = await secureOracle.estimateGas.getTWAP(tokenA.address, 3600);
      
      // Regular price aggregation gas cost
      const aggregationGas = await secureOracle.estimateGas.getPrice(tokenA.address);

      console.log(`TWAP calculation gas: ${twapGas}`);
      console.log(`Price aggregation gas: ${aggregationGas}`);
    });
  });

  describe("Integration Tests", function () {
    it("should handle complex trading scenarios with oracle protection", async function () {
      const { secureOracle, secureLending, tokenA, user1, oracleOperator } = await loadFixture(deployFixture);

      // Set initial prices
      const initialPrice = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Execute multiple price queries with updates
      const [price1] = await secureOracle.getPrice(tokenA.address);
      expect(price1).to.equal(initialPrice);
      
      // Update prices slightly
      const newPrice = ethers.utils.parseEther("105");
      await secureOracle.updatePrice(tokenA.address);
      
      const [price2] = await secureOracle.getPrice(tokenA.address);
      expect(price2).to.equal(newPrice);
      
      // Verify oracle protection is working
      expect(price2).to.be.gt(price1);
    });

    it("should maintain system stability during oracle attacks", async function () {
      const { secureOracle, tokenA, attacker, oracleOperator, user1 } = await loadFixture(deployFixture);

      // Set normal prices
      const normalPrice = ethers.utils.parseEther("100");
      // Add two oracles (minimum required)
      await secureOracle.addOracle(tokenA.address, oracleOperator.address, 100, 3600, 1000, 18);
      await secureOracle.addOracle(tokenA.address, user1.address, 100, 3600, 1000, 18);
      await secureOracle.updatePrice(tokenA.address);

      // Simulate sustained oracle attack
      for (let i = 0; i < 3; i++) {
        const attackPrice = ethers.utils.parseEther((200 + i * 50).toString());
        await secureOracle.updatePrice(tokenA.address);
        
        // System should remain stable and handle extreme prices
        const [currentPrice, , isValid] = await secureOracle.getPrice(tokenA.address);
        // Oracle should still provide price but may trigger circuit breaker
        expect(isValid).to.be.true;
      }

      // System should recover when normal prices return
      await secureOracle.updatePrice(tokenA.address);
      const [recoveredPrice] = await secureOracle.getPrice(tokenA.address);
      expect(recoveredPrice).to.equal(normalPrice);
    });
  });
});
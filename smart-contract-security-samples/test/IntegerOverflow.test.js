const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Integer Overflow Test Suite
 * @dev Comprehensive test suite for integer overflow/underflow examples
 * 
 * Tests cover:
 * 1. Classic overflow/underflow attacks
 * 2. SafeMath protection mechanisms
 * 3. Solidity 0.8+ built-in overflow protection
 * 4. Edge cases and boundary conditions
 * 5. Gas optimization considerations
 * 6. Time-based calculations
 */
describe("Integer Overflow Security Tests", function () {
  async function deployFixture() {
    const [owner, attacker, user1, user2] = await ethers.getSigners();

    // Deploy vulnerable contracts
    const IntegerOverflowVulnerable = await ethers.getContractFactory("IntegerOverflowVulnerable");
    const vulnerableContract = await IntegerOverflowVulnerable.connect(owner).deploy();
    await vulnerableContract.deployed();

    // Deploy secure contracts
    const IntegerOverflowSecure = await ethers.getContractFactory("IntegerOverflowSecure");
    const secureContract = await IntegerOverflowSecure.connect(owner).deploy();
    await secureContract.deployed();

    return {
      vulnerableContract,
      secureContract,
      owner,
      attacker,
      user1,
      user2
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should demonstrate integer overflow in addition", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      // Set balance to maximum uint256 value
      const maxUint256 = ethers.constants.MaxUint256;
      await vulnerableContract.connect(user1).setBalance(maxUint256);

      const initialBalance = await vulnerableContract.balances(user1.address);
      expect(initialBalance).to.equal(maxUint256);

      // Adding 1 should cause overflow in vulnerable contract
      await vulnerableContract.connect(user1).add(1);
      
      const finalBalance = await vulnerableContract.balances(user1.address);
      // In vulnerable contract, this would wrap around to 0
      console.log(`Balance after overflow: ${finalBalance.toString()}`);
    });

    it("should demonstrate integer underflow in subtraction", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      // Start with balance of 0
      await vulnerableContract.connect(user1).setBalance(0);
      
      const initialBalance = await vulnerableContract.balances(user1.address);
      expect(initialBalance).to.equal(0);

      // Subtracting 1 from 0 should cause underflow
      await vulnerableContract.connect(user1).subtract(1);
      
      const finalBalance = await vulnerableContract.balances(user1.address);
      // In vulnerable contract, this would wrap around to max uint256
      console.log(`Balance after underflow: ${finalBalance.toString()}`);
    });

    it("should demonstrate multiplication overflow", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      // Set balance to a large value that will overflow when multiplied
      const largeValue = ethers.BigNumber.from("2").pow(128); // 2^128
      await vulnerableContract.connect(user1).setBalance(largeValue);

      const initialBalance = await vulnerableContract.balances(user1.address);
      expect(initialBalance).to.equal(largeValue);

      // Multiply by 2^128 should cause overflow
      await vulnerableContract.connect(user1).multiply(largeValue);
      
      const finalBalance = await vulnerableContract.balances(user1.address);
      console.log(`Balance after multiplication overflow: ${finalBalance.toString()}`);
    });

    it("should demonstrate time-based overflow vulnerability", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      // Set a very large timestamp that could cause overflow
      const largeTimestamp = ethers.constants.MaxUint256.sub(100);
      
      // This should demonstrate time calculation overflow
      const result = await vulnerableContract.calculateTimeBonus(largeTimestamp, 200);
      console.log(`Time bonus calculation result: ${result.toString()}`);
    });

    it("should show vulnerable batch operations", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      const amounts = [
        ethers.constants.MaxUint256.div(2),
        ethers.constants.MaxUint256.div(2),
        1 // This should cause overflow
      ];

      // Batch add should be vulnerable to overflow
      await vulnerableContract.connect(user1).batchAdd(amounts);
      
      const finalBalance = await vulnerableContract.balances(user1.address);
      console.log(`Balance after batch overflow: ${finalBalance.toString()}`);
    });
  });

  describe("Secure Contract Tests", function () {
    it("should prevent integer overflow in addition", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Set balance to maximum uint256 value
      const maxUint256 = ethers.constants.MaxUint256;
      await secureContract.connect(user1).setBalance(maxUint256);

      const initialBalance = await secureContract.balances(user1.address);
      expect(initialBalance).to.equal(maxUint256);

      // Adding 1 should revert due to overflow protection
      await expect(
        secureContract.connect(user1).add(1)
      ).to.be.revertedWith("SafeMath: addition overflow");
    });

    it("should prevent integer underflow in subtraction", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Start with balance of 0
      await secureContract.connect(user1).setBalance(0);
      
      const initialBalance = await secureContract.balances(user1.address);
      expect(initialBalance).to.equal(0);

      // Subtracting 1 from 0 should revert due to underflow protection
      await expect(
        secureContract.connect(user1).subtract(1)
      ).to.be.revertedWith("SafeMath: subtraction overflow");
    });

    it("should prevent multiplication overflow", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Set balance to a large value that will overflow when multiplied
      const largeValue = ethers.BigNumber.from("2").pow(128); // 2^128
      await secureContract.connect(user1).setBalance(largeValue);

      const initialBalance = await secureContract.balances(user1.address);
      expect(initialBalance).to.equal(largeValue);

      // Multiply by 2^128 should revert due to overflow protection
      await expect(
        secureContract.connect(user1).multiply(largeValue)
      ).to.be.revertedWith("SafeMath: multiplication overflow");
    });

    it("should handle safe time-based calculations", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Test normal time calculation
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = 3600; // 1 hour
      
      const result = await secureContract.calculateTimeBonus(currentTime, timeDiff);
      expect(result).to.be.gt(0);
      console.log(`Safe time bonus calculation: ${result.toString()}`);
    });

    it("should implement safe batch operations", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const amounts = [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("3")
      ];

      // Safe batch add should work without overflow
      await secureContract.connect(user1).batchAdd(amounts);
      
      const finalBalance = await secureContract.balances(user1.address);
      const expectedBalance = ethers.utils.parseEther("6");
      expect(finalBalance).to.equal(expectedBalance);
    });

    it("should implement proper bounds checking", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const maxAllowedValue = await secureContract.MAX_ALLOWED_VALUE();
      
      // Should allow values up to the maximum
      await secureContract.connect(user1).setBalance(maxAllowedValue);
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(maxAllowedValue);

      // Should reject values above the maximum
      await expect(
        secureContract.connect(user1).setBalance(maxAllowedValue.add(1))
      ).to.be.revertedWith("Value exceeds maximum allowed");
    });

    it("should implement safe division with zero check", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      await secureContract.connect(user1).setBalance(ethers.utils.parseEther("10"));

      // Division by zero should revert
      await expect(
        secureContract.connect(user1).divide(0)
      ).to.be.revertedWith("SafeMath: division by zero");

      // Normal division should work
      await secureContract.connect(user1).divide(2);
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(ethers.utils.parseEther("5"));
    });

    it("should implement percentage calculations safely", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const baseAmount = ethers.utils.parseEther("100");
      await secureContract.connect(user1).setBalance(baseAmount);

      // Calculate 10% safely
      const percentage = 10;
      await secureContract.connect(user1).calculatePercentage(percentage);
      
      const balance = await secureContract.balances(user1.address);
      const expectedBalance = ethers.utils.parseEther("10"); // 10% of 100
      expect(balance).to.equal(expectedBalance);
    });
  });

  describe("Edge Cases and Boundary Tests", function () {
    it("should handle maximum uint256 values correctly", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const maxUint256 = ethers.constants.MaxUint256;
      
      // Should be able to set max value
      await secureContract.connect(user1).setBalance(maxUint256);
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(maxUint256);

      // Should not be able to add to max value
      await expect(
        secureContract.connect(user1).add(1)
      ).to.be.reverted;
    });

    it("should handle zero values correctly", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Set balance to 0
      await secureContract.connect(user1).setBalance(0);
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(0);

      // Should not be able to subtract from zero
      await expect(
        secureContract.connect(user1).subtract(1)
      ).to.be.reverted;

      // Should be able to add to zero
      await secureContract.connect(user1).add(1);
      const newBalance = await secureContract.balances(user1.address);
      expect(newBalance).to.equal(1);
    });

    it("should handle large array operations safely", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Create array with many small values
      const amounts = Array(100).fill(ethers.utils.parseEther("0.01"));
      
      // Should handle large batch operations
      await secureContract.connect(user1).batchAdd(amounts);
      
      const balance = await secureContract.balances(user1.address);
      const expectedBalance = ethers.utils.parseEther("1"); // 100 * 0.01
      expect(balance).to.equal(expectedBalance);
    });

    it("should handle precision in decimal calculations", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const amount = ethers.utils.parseEther("1.123456789");
      await secureContract.connect(user1).setBalance(amount);

      // Test precision preservation
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(amount);
    });
  });

  describe("Gas Cost Analysis", function () {
    it("should compare gas costs between vulnerable and secure implementations", async function () {
      const { vulnerableContract, secureContract, user1 } = await loadFixture(deployFixture);

      const amount = ethers.utils.parseEther("1");
      
      // Test vulnerable contract gas usage
      const vulnerableTx = await vulnerableContract.connect(user1).add(amount);
      const vulnerableReceipt = await vulnerableTx.wait();

      // Test secure contract gas usage
      const secureTx = await secureContract.connect(user1).add(amount);
      const secureReceipt = await secureTx.wait();

      console.log(`Vulnerable contract add gas: ${vulnerableReceipt.gasUsed}`);
      console.log(`Secure contract add gas: ${secureReceipt.gasUsed}`);
      
      // Secure implementation should use more gas due to SafeMath checks
      expect(secureReceipt.gasUsed.gt(vulnerableReceipt.gasUsed)).to.be.true;
    });

    it("should analyze gas costs for batch operations", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const smallBatch = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2")];
      const largeBatch = Array(50).fill(ethers.utils.parseEther("0.1"));

      // Small batch operation
      const smallTx = await secureContract.connect(user1).batchAdd(smallBatch);
      const smallReceipt = await smallTx.wait();

      // Reset balance
      await secureContract.connect(user1).setBalance(0);

      // Large batch operation
      const largeTx = await secureContract.connect(user1).batchAdd(largeBatch);
      const largeReceipt = await largeTx.wait();

      console.log(`Small batch (2 items) gas: ${smallReceipt.gasUsed}`);
      console.log(`Large batch (50 items) gas: ${largeReceipt.gasUsed}`);
      
      // Gas should scale with batch size
      expect(largeReceipt.gasUsed.gt(smallReceipt.gasUsed)).to.be.true;
    });
  });

  describe("Integration Tests", function () {
    it("should handle complex mathematical operations safely", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      // Start with a base amount
      const baseAmount = ethers.utils.parseEther("100");
      await secureContract.connect(user1).setBalance(baseAmount);

      // Perform a series of operations
      await secureContract.connect(user1).multiply(2); // 200 ETH
      await secureContract.connect(user1).add(ethers.utils.parseEther("50")); // 250 ETH
      await secureContract.connect(user1).divide(5); // 50 ETH
      await secureContract.connect(user1).subtract(ethers.utils.parseEther("10")); // 40 ETH

      const finalBalance = await secureContract.balances(user1.address);
      const expectedBalance = ethers.utils.parseEther("40");
      expect(finalBalance).to.equal(expectedBalance);
    });

    it("should maintain consistency across multiple users", async function () {
      const { secureContract, user1, user2 } = await loadFixture(deployFixture);

      const amount1 = ethers.utils.parseEther("100");
      const amount2 = ethers.utils.parseEther("200");

      // Set different balances for different users
      await secureContract.connect(user1).setBalance(amount1);
      await secureContract.connect(user2).setBalance(amount2);

      // Perform operations on both accounts
      await secureContract.connect(user1).multiply(2);
      await secureContract.connect(user2).divide(2);

      const balance1 = await secureContract.balances(user1.address);
      const balance2 = await secureContract.balances(user2.address);

      expect(balance1).to.equal(ethers.utils.parseEther("200"));
      expect(balance2).to.equal(ethers.utils.parseEther("100"));
    });
  });
});
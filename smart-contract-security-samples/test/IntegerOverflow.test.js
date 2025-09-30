const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Integer Overflow Test Suite
 * @dev Simplified test suite for integer overflow examples
 * 
 * Tests cover:
 * 1. Vulnerable contract overflow/underflow scenarios
 * 2. Secure contract protection mechanisms
 * 3. Basic arithmetic operations
 */
describe("Integer Overflow Security Tests", function () {
  async function deployFixture() {
    const [owner, user1, user2, maliciousUser] = await ethers.getSigners();

    // Deploy vulnerable contract (Solidity 0.7.6)
    const IntegerOverflowVulnerable = await ethers.getContractFactory("IntegerOverflowVulnerable");
    const vulnerableContract = await IntegerOverflowVulnerable.connect(owner).deploy();
    await vulnerableContract.deployed();

    // Deploy secure contract (Solidity 0.8+)
    const IntegerOverflowSecure = await ethers.getContractFactory("IntegerOverflowSecure");
    const secureContract = await IntegerOverflowSecure.connect(owner).deploy();
    await secureContract.deployed();

    return {
      vulnerableContract,
      secureContract,
      owner,
      user1,
      user2,
      maliciousUser
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should allow integer overflow in mint function", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);
      
      const maxUint256 = ethers.constants.MaxUint256;
      
      // First mint some tokens
      await vulnerableContract.connect(user1).mint(user1.address, 100);
      
      // Try to mint max amount - this should overflow
      await vulnerableContract.connect(user1).mint(user1.address, maxUint256);
      
      // Balance should have overflowed and wrapped around
      const balance = await vulnerableContract.balanceOf(user1.address);
      expect(balance).to.equal(99); // 100 + MaxUint256 = 99 (overflow)
    });

    it("should allow integer underflow in burn function", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);
      
      // Start with small balance
      await vulnerableContract.connect(user1).mint(user1.address, 50);
      
      // Try to burn more than balance - this should underflow
      await vulnerableContract.connect(user1).burn(user1.address, 100);
      
      // Balance should have underflowed
      const balance = await vulnerableContract.balanceOf(user1.address);
      expect(balance).to.equal(ethers.constants.MaxUint256.sub(49)); // 50 - 100 = MaxUint256 - 49 (underflow)
    });

    it("should allow overflow in transfer function", async function () {
      const { vulnerableContract, user1, user2 } = await loadFixture(deployFixture);
      
      // Give user2 max balance
      await vulnerableContract.connect(user1).mint(user2.address, ethers.constants.MaxUint256);
      
      // Give user1 some tokens
      await vulnerableContract.connect(user1).mint(user1.address, 100);
      
      // Transfer from user1 to user2 - should overflow user2's balance
      await vulnerableContract.connect(user1).transfer(user2.address, 50);
      
      const balance2 = await vulnerableContract.balanceOf(user2.address);
      expect(balance2).to.equal(49); // MaxUint256 + 50 = 49 (overflow)
    });

    it("should allow overflow in calculateReward function", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);
      
      const largeBalance = ethers.utils.parseEther("1000000000"); // 1 billion tokens
      const largeRate = ethers.utils.parseEther("1000000000"); // 1 billion rate
      
      await vulnerableContract.connect(user1).mint(user1.address, largeBalance);
      
      // This should overflow in the multiplication
      const reward = await vulnerableContract.calculateReward(user1.address, largeRate);
      
      // The result should be much smaller than expected due to overflow
      const expectedWithoutOverflow = largeBalance.mul(largeRate).div(ethers.utils.parseEther("1"));
      expect(reward).to.not.equal(expectedWithoutOverflow);
    });

    it("should allow overflow in batchMint function", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);
      
      const recipients = [user1.address, user1.address];
      const amounts = [ethers.constants.MaxUint256, 100];
      
      await vulnerableContract.connect(user1).batchMint(recipients, amounts);
      
      // Total supply should have overflowed
      const totalSupply = await vulnerableContract.totalSupply();
      expect(totalSupply).to.equal(99); // MaxUint256 + 100 = 99 (overflow)
    });

    it("should allow overflow in compound function", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);
      
      const largeAmount = ethers.utils.parseEther("1000000000");
      await vulnerableContract.connect(user1).mint(user1.address, largeAmount);
      
      // Compound with high rate should overflow
      await vulnerableContract.connect(user1).compound(user1.address, 1000); // 10x multiplier
      
      const balance = await vulnerableContract.balanceOf(user1.address);
      // Should be much less than expected due to overflow
      expect(balance).to.be.lt(largeAmount.mul(10));
    });
  });

  describe("Secure Contract Tests", function () {
    it("should prevent overflow in mint function", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      const maxUint256 = ethers.constants.MaxUint256;
      
      // First mint some tokens
      await secureContract.connect(user1).mint(user1.address, 100);
      
      // Try to mint max amount - this should revert
      await expect(
        secureContract.connect(user1).mint(user1.address, maxUint256)
      ).to.be.reverted;
    });

    it("should prevent underflow in burn function", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      // Start with small balance
      await secureContract.connect(user1).mint(user1.address, 50);
      
      // Try to burn more than balance - this should revert
      await expect(
        secureContract.connect(user1).burn(user1.address, 100)
      ).to.be.reverted;
    });

    it("should prevent overflow in transfer function", async function () {
      const { secureContract, user1, user2 } = await loadFixture(deployFixture);
      
      // Give user2 near max balance
      const nearMax = ethers.constants.MaxUint256.sub(10);
      await secureContract.connect(user1).mint(user2.address, nearMax);
      
      // Give user1 some tokens
      await secureContract.connect(user1).mint(user1.address, 100);
      
      // Transfer from user1 to user2 - should revert due to overflow protection
      await expect(
        secureContract.connect(user1).transfer(user2.address, 50)
      ).to.be.reverted;
    });

    it("should handle large calculations safely in calculateReward", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      const largeBalance = ethers.utils.parseEther("1000"); // Reasonable amount
      const rate = ethers.utils.parseEther("2"); // 2x rate
      
      await secureContract.connect(user1).mint(user1.address, largeBalance);
      
      const reward = await secureContract.calculateReward(user1.address, rate);
      
      // Should calculate correctly without overflow
      const expected = largeBalance.mul(rate).div(ethers.utils.parseEther("1"));
      expect(reward).to.equal(expected);
    });

    it("should prevent overflow in batchMint function", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      const recipients = [user1.address, user1.address];
      const amounts = [ethers.constants.MaxUint256, 100];
      
      // Should revert due to overflow protection
      await expect(
        secureContract.connect(user1).batchMint(recipients, amounts)
      ).to.be.reverted;
    });

    it("should handle valid batchMint operations", async function () {
      const { secureContract, user1, user2 } = await loadFixture(deployFixture);
      
      const recipients = [user1.address, user2.address];
      const amounts = [100, 200];
      
      await secureContract.connect(user1).batchMint(recipients, amounts);
      
      expect(await secureContract.balanceOf(user1.address)).to.equal(100);
      expect(await secureContract.balanceOf(user2.address)).to.equal(200);
      expect(await secureContract.totalSupply()).to.equal(300);
    });

    it("should prevent division by zero in calculateShare", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      await secureContract.connect(user1).mint(user1.address, 100);
      
      // Should revert when total supply is 0 (after burning all)
      await secureContract.connect(user1).burn(user1.address, 100);
      
      await expect(
        secureContract.calculateShare(user1.address, 1000)
      ).to.be.reverted;
    });

    it("should handle compound operations safely", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      const initialAmount = ethers.utils.parseEther("100");
      await secureContract.connect(user1).mint(user1.address, initialAmount);
      
      // Compound with reasonable multiplier
      await secureContract.connect(user1).compound(user1.address, 200); // 2x multiplier
      
      const balance = await secureContract.balanceOf(user1.address);
      expect(balance).to.equal(initialAmount.mul(2));
    });

    it("should prevent overflow in compound function", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      const largeAmount = ethers.constants.MaxUint256.div(2);
      await secureContract.connect(user1).mint(user1.address, largeAmount);
      
      // Try to compound with multiplier that would cause overflow
      await expect(
        secureContract.connect(user1).compound(user1.address, 300) // 3x multiplier
      ).to.be.reverted;
    });

    it("should validate input parameters", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);
      
      // Should reject zero address
      await expect(
        secureContract.connect(user1).mint(ethers.constants.AddressZero, 100)
      ).to.be.reverted;
      
      // Should reject zero amount in mint
      await expect(
        secureContract.connect(user1).mint(user1.address, 0)
      ).to.be.reverted;
    });
  });

  describe("Gas Cost Comparison", function () {
    it("should compare gas costs between vulnerable and secure implementations", async function () {
      const { vulnerableContract, secureContract, user1 } = await loadFixture(deployFixture);
      
      // Test mint operation gas costs
      const vulnerableTx = await vulnerableContract.connect(user1).mint(user1.address, 1000);
      const vulnerableReceipt = await vulnerableTx.wait();
      
      const secureTx = await secureContract.connect(user1).mint(user1.address, 1000);
      const secureReceipt = await secureTx.wait();
      
      console.log(`Vulnerable mint gas used: ${vulnerableReceipt.gasUsed}`);
      console.log(`Secure mint gas used: ${secureReceipt.gasUsed}`);
      
      // Secure implementation should use more gas due to overflow checks
      expect(secureReceipt.gasUsed.gt(vulnerableReceipt.gasUsed)).to.be.true;
    });
  });
});
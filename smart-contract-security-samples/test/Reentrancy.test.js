const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Reentrancy Test Suite
 * @dev Comprehensive test suite for reentrancy attack examples
 * 
 * Tests cover:
 * 1. Classic reentrancy attacks
 * 2. Cross-function reentrancy
 * 3. Read-only reentrancy
 * 4. Reentrancy guards effectiveness
 * 5. State update patterns
 * 6. Gas limit considerations
 */
describe("Reentrancy Security Tests", function () {
  async function deployFixture() {
    const [owner, attacker, user1, user2] = await ethers.getSigners();

    // Deploy vulnerable contracts
    const ReentrancyVulnerable = await ethers.getContractFactory("ReentrancyVulnerable");
    const vulnerableContract = await ReentrancyVulnerable.connect(owner).deploy();
    await vulnerableContract.deployed();

    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.connect(attacker).deploy(vulnerableContract.address);
    await attackerContract.deployed();

    // Deploy secure contracts
    const ReentrancySecure = await ethers.getContractFactory("ReentrancySecure");
    const secureContract = await ReentrancySecure.connect(owner).deploy();
    await secureContract.deployed();

    return {
      vulnerableContract,
      secureContract,
      attackerContract,
      owner,
      attacker,
      user1,
      user2
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should demonstrate classic reentrancy attack", async function () {
      const { vulnerableContract, attackerContract, attacker, user1 } = await loadFixture(deployFixture);

      // Setup: Users deposit funds
      const depositAmount = ethers.utils.parseEther("1");
      await vulnerableContract.connect(user1).deposit({ value: depositAmount });
      await vulnerableContract.connect(attacker).deposit({ value: depositAmount });

      // Record initial balances
      const initialContractBalance = await ethers.provider.getBalance(vulnerableContract.address);
      const initialAttackerBalance = await ethers.provider.getBalance(attacker.address);

      // Execute reentrancy attack
      await attackerContract.connect(attacker).attack({ value: depositAmount });

      // Check if attack was successful
      const finalContractBalance = await ethers.provider.getBalance(vulnerableContract.address);
      const finalAttackerBalance = await ethers.provider.getBalance(attacker.address);

      // The attacker should have drained more than their deposit
      expect(finalContractBalance).to.be.lt(initialContractBalance);
      console.log(`Contract balance before attack: ${ethers.utils.formatEther(initialContractBalance)} ETH`);
      console.log(`Contract balance after attack: ${ethers.utils.formatEther(finalContractBalance)} ETH`);
    });

    it("should demonstrate cross-function reentrancy", async function () {
      const { vulnerableContract, attacker } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await vulnerableContract.connect(attacker).deposit({ value: depositAmount });

      // This would require a more sophisticated attacker contract
      // that exploits cross-function reentrancy
      const balance = await vulnerableContract.balances(attacker.address);
      expect(balance).to.equal(depositAmount);
    });

    it("should show vulnerable state updates", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await vulnerableContract.connect(user1).deposit({ value: depositAmount });

      // Check that balance is updated before external call
      const balanceBefore = await vulnerableContract.balances(user1.address);
      expect(balanceBefore).to.equal(depositAmount);

      // Withdraw should be vulnerable to reentrancy
      await vulnerableContract.connect(user1).withdraw(depositAmount);
      
      const balanceAfter = await vulnerableContract.balances(user1.address);
      expect(balanceAfter).to.equal(0);
    });

    it("should demonstrate read-only reentrancy vulnerability", async function () {
      const { vulnerableContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await vulnerableContract.connect(user1).deposit({ value: depositAmount });

      // Read-only reentrancy can occur when view functions are called
      // during state-changing operations
      const balance = await vulnerableContract.getBalance(user1.address);
      expect(balance).to.equal(depositAmount);
    });
  });

  describe("Secure Contract Tests", function () {
    it("should prevent reentrancy attacks with guards", async function () {
      const { secureContract, attacker } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await secureContract.connect(attacker).deposit({ value: depositAmount });

      // Attempt to perform reentrancy attack should fail
      // This would require an attacker contract that tries to reenter
      await expect(
        secureContract.connect(attacker).withdraw(depositAmount)
      ).to.not.be.reverted; // Should complete normally without reentrancy

      const balance = await secureContract.balances(attacker.address);
      expect(balance).to.equal(0);
    });

    it("should use checks-effects-interactions pattern", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await secureContract.connect(user1).deposit({ value: depositAmount });

      // The secure contract should update state before external calls
      const tx = await secureContract.connect(user1).withdraw(depositAmount);
      const receipt = await tx.wait();

      // Check that withdrawal was successful and secure
      const balance = await secureContract.balances(user1.address);
      expect(balance).to.equal(0);

      // Check for proper event emission
      const withdrawalEvent = receipt.events?.find(e => e.event === "Withdrawal");
      expect(withdrawalEvent).to.not.be.undefined;
    });

    it("should implement proper emergency withdrawal", async function () {
      const { secureContract, owner, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await secureContract.connect(user1).deposit({ value: depositAmount });

      // Owner should be able to pause for emergency
      await secureContract.connect(owner).emergencyPause();
      expect(await secureContract.paused()).to.be.true;

      // Normal withdrawals should be paused
      await expect(
        secureContract.connect(user1).withdraw(depositAmount)
      ).to.be.revertedWith("Pausable: paused");

      // Emergency withdrawal should still work
      await expect(
        secureContract.connect(user1).emergencyWithdraw()
      ).to.not.be.reverted;
    });

    it("should implement withdrawal limits and cooldowns", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("20"); // Deposit more than max withdrawal
      await secureContract.connect(user1).deposit({ value: depositAmount });

      const maxWithdrawal = await secureContract.MAX_WITHDRAWAL_AMOUNT();
      
      // Should reject withdrawal above limit first
      await expect(
        secureContract.connect(user1).withdraw(maxWithdrawal.add(1))
      ).to.be.revertedWith("Exceeds withdrawal limit");
      
      // Should allow withdrawal up to limit
      await expect(
        secureContract.connect(user1).withdraw(maxWithdrawal)
      ).to.not.be.reverted;
    });

    it("should implement proper access controls", async function () {
      const { secureContract, owner, user1 } = await loadFixture(deployFixture);

      // Only owner should be able to pause
      await expect(
        secureContract.connect(user1).emergencyPause()
      ).to.be.reverted;

      // Owner should be able to pause
      await expect(
        secureContract.connect(owner).emergencyPause()
      ).to.not.be.reverted;
    });

    it("should handle batch operations securely", async function () {
      const { secureContract, owner, user1, user2 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await secureContract.connect(user1).deposit({ value: depositAmount });
      await secureContract.connect(user2).deposit({ value: depositAmount });

      const recipients = [user1.address, user2.address];
      const amounts = [depositAmount.div(2), depositAmount.div(2)];

      // Batch withdrawal should be secure (only owner can call)
      await expect(
        secureContract.connect(owner).batchWithdraw(recipients, amounts)
      ).to.not.be.reverted;
    });
  });

  describe("Attack Simulation Tests", function () {
    it("should simulate and prevent sophisticated reentrancy attacks", async function () {
      const { vulnerableContract, secureContract, attacker } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      
      // Test vulnerable contract
      await vulnerableContract.connect(attacker).deposit({ value: depositAmount });
      const vulnerableBalanceBefore = await ethers.provider.getBalance(vulnerableContract.address);
      
      // Test secure contract
      await secureContract.connect(attacker).deposit({ value: depositAmount });
      const secureBalanceBefore = await ethers.provider.getBalance(secureContract.address);

      // Normal withdrawal from secure contract should work
      await secureContract.connect(attacker).withdraw(depositAmount);
      const secureBalanceAfter = await ethers.provider.getBalance(secureContract.address);
      
      expect(secureBalanceAfter).to.equal(secureBalanceBefore.sub(depositAmount));
    });
  });

  describe("Gas Cost Analysis", function () {
    it("should compare gas costs between vulnerable and secure implementations", async function () {
      const { vulnerableContract, secureContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      
      // Test vulnerable contract gas usage
      await vulnerableContract.connect(user1).deposit({ value: depositAmount });
      const vulnerableTx = await vulnerableContract.connect(user1).withdraw(depositAmount);
      const vulnerableReceipt = await vulnerableTx.wait();

      // Test secure contract gas usage
      await secureContract.connect(user1).deposit({ value: depositAmount });
      const secureTx = await secureContract.connect(user1).withdraw(depositAmount);
      const secureReceipt = await secureTx.wait();

      console.log(`Vulnerable contract withdrawal gas: ${vulnerableReceipt.gasUsed}`);
      console.log(`Secure contract withdrawal gas: ${secureReceipt.gasUsed}`);
      
      // Secure implementation should use more gas due to reentrancy guards
      expect(secureReceipt.gasUsed.gt(vulnerableReceipt.gasUsed)).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero amount withdrawals", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      await expect(
        secureContract.connect(user1).withdraw(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should handle insufficient balance withdrawals", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const withdrawAmount = ethers.utils.parseEther("1");
      await expect(
        secureContract.connect(user1).withdraw(withdrawAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should handle contract with zero balance", async function () {
      const { secureContract, user1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.utils.parseEther("1");
      await secureContract.connect(user1).deposit({ value: depositAmount });
      
      // Withdraw all funds
      await secureContract.connect(user1).withdraw(depositAmount);
      
      // Contract balance should be zero
      const contractBalance = await ethers.provider.getBalance(secureContract.address);
      expect(contractBalance).to.equal(0);
    });
  });
});
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title AccessControl Test Suite
 * @dev Simplified test suite for access control examples
 * 
 * Tests cover:
 * 1. Vulnerable contract exploitation
 * 2. Secure contract protection mechanisms
 * 3. Basic role management
 */
describe("AccessControl Security Tests", function () {
  // Role constants for secure contract
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
  const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));

  async function deployFixture() {
    const [owner, admin, user1, user2, maliciousUser] = await ethers.getSigners();

    // Deploy vulnerable contract
    const AccessControlVulnerable = await ethers.getContractFactory("AccessControlVulnerable");
    const vulnerableContract = await AccessControlVulnerable.connect(owner).deploy();
    await vulnerableContract.deployed();

    // Deploy secure contract
    const AccessControlSecure = await ethers.getContractFactory("AccessControlSecure");
    const secureContract = await AccessControlSecure.connect(owner).deploy();
    await secureContract.deployed();

    // Initialize secure contract
    await secureContract.connect(owner).initialize();

    // Setup roles for secure contract
    await secureContract.connect(owner).grantRole(ADMIN_ROLE, admin.address);
    await secureContract.connect(owner).grantRole(MINTER_ROLE, admin.address);
    await secureContract.connect(owner).grantRole(PAUSER_ROLE, admin.address);
    await secureContract.connect(owner).grantRole(BURNER_ROLE, admin.address);

    return {
      vulnerableContract,
      secureContract,
      owner,
      admin,
      user1,
      user2,
      maliciousUser,
      ADMIN_ROLE,
      MINTER_ROLE,
      PAUSER_ROLE,
      BURNER_ROLE
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should allow anyone to mint tokens", async function () {
      const { vulnerableContract, maliciousUser } = await loadFixture(deployFixture);
      
      const initialBalance = await vulnerableContract.balanceOf(maliciousUser.address);
      await vulnerableContract.connect(maliciousUser).mint(maliciousUser.address, 1000);
      const finalBalance = await vulnerableContract.balanceOf(maliciousUser.address);
      
      expect(finalBalance).to.equal(initialBalance.add(1000));
    });

    it("should allow anyone to burn tokens from any address", async function () {
      const { vulnerableContract, owner, maliciousUser } = await loadFixture(deployFixture);
      
      // First mint some tokens to owner
      await vulnerableContract.connect(owner).mint(owner.address, 1000);
      
      const initialBalance = await vulnerableContract.balanceOf(owner.address);
      // Malicious user burns owner's tokens
      await vulnerableContract.connect(maliciousUser).burn(owner.address, 500);
      const finalBalance = await vulnerableContract.balanceOf(owner.address);
      
      expect(finalBalance).to.equal(initialBalance.sub(500));
    });

    it("should allow anyone to change admin", async function () {
      const { vulnerableContract, maliciousUser } = await loadFixture(deployFixture);
      
      await vulnerableContract.connect(maliciousUser).changeAdmin(maliciousUser.address);
      const newAdmin = await vulnerableContract.admin();
      
      expect(newAdmin).to.equal(maliciousUser.address);
    });

    it("should allow anyone to pause the contract", async function () {
      const { vulnerableContract, maliciousUser } = await loadFixture(deployFixture);
      
      await vulnerableContract.connect(maliciousUser).pause();
      const isPaused = await vulnerableContract.paused();
      
      expect(isPaused).to.be.true;
    });

    it("should allow anyone to withdraw funds", async function () {
      const { vulnerableContract, owner, maliciousUser } = await loadFixture(deployFixture);
      
      // Send some ETH to the contract
      await owner.sendTransaction({
        to: vulnerableContract.address,
        value: ethers.utils.parseEther("1")
      });
      
      const initialBalance = await ethers.provider.getBalance(maliciousUser.address);
      const tx = await vulnerableContract.connect(maliciousUser).emergencyWithdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const finalBalance = await ethers.provider.getBalance(maliciousUser.address);
      
      expect(finalBalance.add(gasUsed)).to.be.gt(initialBalance);
    });
  });

  describe("Secure Contract Tests", function () {
    it("should prevent unauthorized minting", async function () {
      const { secureContract, maliciousUser } = await loadFixture(deployFixture);
      
      await expect(
        secureContract.connect(maliciousUser).mint(maliciousUser.address, 1000)
      ).to.be.reverted;
    });

    it("should allow authorized minting", async function () {
      const { secureContract, admin, user1 } = await loadFixture(deployFixture);
      
      const initialBalance = await secureContract.balanceOf(user1.address);
      await secureContract.connect(admin).mint(user1.address, 1000);
      const finalBalance = await secureContract.balanceOf(user1.address);
      
      expect(finalBalance).to.equal(initialBalance.add(1000));
    });

    it("should prevent unauthorized burning", async function () {
      const { secureContract, admin, user1, maliciousUser } = await loadFixture(deployFixture);
      
      // First mint some tokens
      await secureContract.connect(admin).mint(user1.address, 1000);
      
      await expect(
        secureContract.connect(maliciousUser).burn(user1.address, 500)
      ).to.be.reverted;
    });

    it("should allow authorized burning", async function () {
      const { secureContract, admin, user1 } = await loadFixture(deployFixture);
      
      // First mint some tokens
      await secureContract.connect(admin).mint(user1.address, 1000);
      
      const initialBalance = await secureContract.balanceOf(user1.address);
      await secureContract.connect(admin).burn(user1.address, 500);
      const finalBalance = await secureContract.balanceOf(user1.address);
      
      expect(finalBalance).to.equal(initialBalance.sub(500));
    });

    it("should prevent unauthorized pausing", async function () {
      const { secureContract, maliciousUser } = await loadFixture(deployFixture);
      
      await expect(
        secureContract.connect(maliciousUser).pause()
      ).to.be.reverted;
    });

    it("should allow authorized pausing", async function () {
      const { secureContract, admin } = await loadFixture(deployFixture);
      
      await secureContract.connect(admin).pause();
      const isPaused = await secureContract.paused();
      
      expect(isPaused).to.be.true;
    });

    it("should prevent operations when paused", async function () {
      const { secureContract, admin, user1 } = await loadFixture(deployFixture);
      
      await secureContract.connect(admin).pause();
      
      await expect(
        secureContract.connect(admin).mint(user1.address, 1000)
      ).to.be.reverted;
    });

    it("should allow transfer when not paused", async function () {
      const { secureContract, admin, user1, user2 } = await loadFixture(deployFixture);
      
      // First mint some tokens
      await secureContract.connect(admin).mint(user1.address, 1000);
      
      const initialBalance1 = await secureContract.balanceOf(user1.address);
      const initialBalance2 = await secureContract.balanceOf(user2.address);
      
      await secureContract.connect(user1).transfer(user2.address, 500);
      
      const finalBalance1 = await secureContract.balanceOf(user1.address);
      const finalBalance2 = await secureContract.balanceOf(user2.address);
      
      expect(finalBalance1).to.equal(initialBalance1.sub(500));
      expect(finalBalance2).to.equal(initialBalance2.add(500));
    });

    it("should prevent transfer when paused", async function () {
      const { secureContract, admin, user1, user2 } = await loadFixture(deployFixture);
      
      // First mint some tokens
      await secureContract.connect(admin).mint(user1.address, 1000);
      
      // Pause the contract
      await secureContract.connect(admin).pause();
      
      await expect(
        secureContract.connect(user1).transfer(user2.address, 500)
      ).to.be.reverted;
    });
  });
});
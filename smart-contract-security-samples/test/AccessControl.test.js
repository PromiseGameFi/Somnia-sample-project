const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title AccessControl Test Suite
 * @dev Comprehensive test suite for access control examples
 * 
 * Tests cover:
 * 1. Vulnerable contract exploitation
 * 2. Secure contract protection mechanisms
 * 3. Edge cases and attack scenarios
 * 4. Role management and permissions
 * 5. Time-locked operations
 * 6. Multi-signature functionality
 * 7. Emergency procedures
 */
describe("AccessControl Security Tests", function () {
  // Role constants
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
  const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
  const EMERGENCY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_ROLE"));
  const DEPLOYER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPLOYER_ROLE"));

  async function deployFixture() {
    const [owner, admin, user1, user2, maliciousUser, emergencyResponder] = await ethers.getSigners();

    // Deploy vulnerable contracts
    const AccessControlVulnerable = await ethers.getContractFactory("AccessControlVulnerable");
    const vulnerableContract = await AccessControlVulnerable.connect(owner).deploy();
    await vulnerableContract.deployed();

    const AccessControlAttacker = await ethers.getContractFactory("AccessControlAttacker");
    const attacker = await AccessControlAttacker.connect(maliciousUser).deploy(vulnerableContract.address);
    await attacker.deployed();

    // Deploy secure contracts
    const AccessControlSecure = await ethers.getContractFactory("AccessControlSecure");
    const secureContract = await AccessControlSecure.connect(owner).deploy();
    await secureContract.deployed();

    const AccessControlFactory = await ethers.getContractFactory("AccessControlFactory");
    const factory = await AccessControlFactory.connect(owner).deploy();
    await factory.deployed();

    // Setup roles for secure contract
    await secureContract.connect(owner).grantRoleSecure(ADMIN_ROLE, admin.address);
    await secureContract.connect(owner).grantRoleSecure(EMERGENCY_ROLE, emergencyResponder.address);

    return {
      vulnerableContract,
      secureContract,
      attacker,
      factory,
      owner,
      admin,
      user1,
      user2,
      maliciousUser,
      emergencyResponder
    };
  }

  describe("Vulnerable Contract Tests", function () {
    it("should demonstrate missing access control vulnerability", async function () {
      const { vulnerableContract, maliciousUser } = await loadFixture(deployFixture);

      // Malicious user should be able to call admin functions without proper access control
      await expect(
        vulnerableContract.connect(maliciousUser).adminFunction()
      ).to.not.be.reverted;
    });

    it("should demonstrate tx.origin vulnerability", async function () {
      const { vulnerableContract, owner, maliciousUser } = await loadFixture(deployFixture);

      // Set up the vulnerable contract with owner
      await vulnerableContract.connect(owner).initialize();
      
      // Malicious user can exploit tx.origin vulnerability
      // This would require a more complex setup with contract interactions
      expect(await vulnerableContract.owner()).to.equal(owner.address);
    });

    it("should demonstrate unprotected initialization", async function () {
      const { vulnerableContract, maliciousUser } = await loadFixture(deployFixture);

      // Anyone can initialize the contract if not properly protected
      await vulnerableContract.connect(maliciousUser).initialize();
      expect(await vulnerableContract.initialized()).to.be.true;
    });

    it("should demonstrate role escalation vulnerability", async function () {
      const { vulnerableContract, owner, maliciousUser } = await loadFixture(deployFixture);

      await vulnerableContract.connect(owner).initialize();
      
      // Malicious user might be able to escalate privileges
      await vulnerableContract.connect(maliciousUser).addAdmin(maliciousUser.address);
      expect(await vulnerableContract.isAdmin(maliciousUser.address)).to.be.true;
    });
  });

  describe("Secure Contract Tests", function () {
    it("should properly enforce role-based access control", async function () {
      const { secureContract, admin, maliciousUser } = await loadFixture(deployFixture);

      // Only admin should be able to mint
      await secureContract.connect(admin).grantRoleSecure(MINTER_ROLE, admin.address);
      
      await expect(
        secureContract.connect(admin).mint(admin.address, ethers.utils.parseEther("100"))
      ).to.not.be.reverted;

      // Malicious user should not be able to mint
      await expect(
        secureContract.connect(maliciousUser).mint(maliciousUser.address, ethers.utils.parseEther("100"))
      ).to.be.reverted;
    });

    it("should implement proper two-step ownership transfer", async function () {
      const { secureContract, owner, admin } = await loadFixture(deployFixture);

      // Start ownership transfer
      await secureContract.connect(owner).transferOwnership(admin.address);
      
      // Ownership should not be transferred yet
      expect(await secureContract.owner()).to.equal(owner.address);
      
      // Accept ownership transfer
      await secureContract.connect(admin).acceptOwnership();
      
      // Now ownership should be transferred
      expect(await secureContract.owner()).to.equal(admin.address);
    });

    it("should implement time-locked operations", async function () {
      const { secureContract, admin } = await loadFixture(deployFixture);

      const operation = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CRITICAL_OPERATION"));
      const timeLockId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("timelock_1"));

      // Schedule time-locked operation
      await secureContract.connect(admin).scheduleTimeLock(operation, timeLockId);

      // Should not be able to execute immediately
      await expect(
        secureContract.connect(admin).executeTimeLock(timeLockId)
      ).to.be.revertedWith("TimeLock not ready");
    });

    it("should implement multi-signature functionality", async function () {
      const { secureContract, owner, admin } = await loadFixture(deployFixture);

      const target = admin.address;
      const data = "0x";
      const value = 0;

      // Create multi-sig proposal
      const tx = await secureContract.connect(admin).createMultiSigProposal(target, data, value);
      const receipt = await tx.wait();
      
      // Extract proposal ID from events
      const event = receipt.events?.find(e => e.event === "MultiSigProposalCreated");
      expect(event).to.not.be.undefined;
    });

    it("should implement emergency pause functionality", async function () {
      const { secureContract, emergencyResponder, admin } = await loadFixture(deployFixture);

      // Emergency responder should be able to pause
      await secureContract.connect(emergencyResponder).emergencyPause();
      expect(await secureContract.paused()).to.be.true;

      // Operations should be paused
      await secureContract.connect(admin).grantRoleSecure(MINTER_ROLE, admin.address);
      await expect(
        secureContract.connect(admin).mint(admin.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");

      // Emergency responder should be able to unpause
      await secureContract.connect(emergencyResponder).emergencyUnpause();
      expect(await secureContract.paused()).to.be.false;
    });

    it("should implement proper input validation", async function () {
      const { secureContract, admin } = await loadFixture(deployFixture);

      await secureContract.connect(admin).grantRoleSecure(MINTER_ROLE, admin.address);

      // Should reject zero address
      await expect(
        secureContract.connect(admin).mint(ethers.constants.AddressZero, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Invalid address");

      // Should reject zero amount
      await expect(
        secureContract.connect(admin).mint(admin.address, 0)
      ).to.be.revertedWith("Amount must be positive");

      // Should reject amounts that exceed max supply
      const maxSupply = await secureContract.MAX_SUPPLY();
      await expect(
        secureContract.connect(admin).mint(admin.address, maxSupply.add(1))
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("should implement batch operations with size limits", async function () {
      const { secureContract, admin } = await loadFixture(deployFixture);

      await secureContract.connect(admin).grantRoleSecure(MINTER_ROLE, admin.address);

      const recipients = [admin.address, admin.address];
      const amounts = [ethers.utils.parseEther("10"), ethers.utils.parseEther("20")];

      // Should allow valid batch operations
      await expect(
        secureContract.connect(admin).batchMint(recipients, amounts)
      ).to.not.be.reverted;

      // Should reject mismatched arrays
      await expect(
        secureContract.connect(admin).batchMint([admin.address], amounts)
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("Factory Contract Tests", function () {
    it("should deploy new access control contracts", async function () {
      const { factory, owner } = await loadFixture(deployFixture);

      await factory.connect(owner).grantRole(DEPLOYER_ROLE, owner.address);
      
      const tx = await factory.connect(owner).deployAccessControlContract();
      const receipt = await tx.wait();
      
      const event = receipt.events?.find(e => e.event === "ContractDeployed");
      expect(event).to.not.be.undefined;
      
      const deployedAddress = event?.args?.contractAddress;
      expect(await factory.isDeployedContract(deployedAddress)).to.be.true;
    });
  });

  describe("Gas Cost Analysis", function () {
    it("should compare gas costs between vulnerable and secure implementations", async function () {
      const { vulnerableContract, secureContract, owner, admin } = await loadFixture(deployFixture);

      // Initialize vulnerable contract
      const vulnerableTx = await vulnerableContract.connect(owner).initialize();
      const vulnerableReceipt = await vulnerableTx.wait();

      // Setup secure contract
      await secureContract.connect(admin).grantRoleSecure(MINTER_ROLE, admin.address);
      const secureTx = await secureContract.connect(admin).mint(admin.address, ethers.utils.parseEther("100"));
      const secureReceipt = await secureTx.wait();

      console.log(`Vulnerable contract gas used: ${vulnerableReceipt.gasUsed}`);
      console.log(`Secure contract gas used: ${secureReceipt.gasUsed}`);
      
      // Secure implementation should use more gas due to additional checks
      expect(secureReceipt.gasUsed.gt(vulnerableReceipt.gasUsed)).to.be.true;
    });
  });
});
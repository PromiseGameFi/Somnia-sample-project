const { ethers } = require("hardhat");

async function main() {
  console.log("=== Smart Contract Security Demonstration ===");
  console.log("Educational examples of common vulnerabilities and their mitigations");
  console.log("");

  // Get signers
  const [deployer, attacker, user] = await ethers.getSigners();
  console.log("Demo participants:");
  console.log("  Deployer:", deployer.address);
  console.log("  Attacker:", attacker.address);
  console.log("  User:", user.address);
  console.log("");

  const demoAmount = ethers.utils.parseEther("1");

  // Demonstrate Reentrancy Vulnerability
  await demonstrateReentrancy(deployer, attacker, user, demoAmount);
  
  // Demonstrate Access Control Vulnerability
  await demonstrateAccessControl(deployer, attacker, user, demoAmount);
  
  // Demonstrate Integer Overflow Vulnerability
  await demonstrateIntegerOverflow(deployer, attacker, user, demoAmount);
  
  // Demonstrate Upgradeable Contract Vulnerability
  await demonstrateUpgradeableVulnerability(deployer, attacker, user);
  
  // Show security tips
  showQuickTips();
  
  // Show useful commands
  showCommands();
}

async function demonstrateReentrancy(deployer, attacker, user, amount) {
  console.log("🔴 === REENTRANCY VULNERABILITY DEMO ===");
  
  // Deploy vulnerable reentrancy contract
  const ReentrancyVulnerable = await ethers.getContractFactory("ReentrancyVulnerable");
  const reentrancyVulnerable = await ReentrancyVulnerable.deploy();
  await reentrancyVulnerable.deployed();
  console.log("ReentrancyVulnerable deployed to:", reentrancyVulnerable.address);
  
  // User deposits funds
  await reentrancyVulnerable.connect(user).deposit({ value: amount });
  console.log("User deposited:", ethers.utils.formatEther(amount), "ETH");
  console.log("User balance:", ethers.utils.formatEther(await reentrancyVulnerable.getBalance(user.address)), "ETH");
  
  console.log("\n⚠️  Vulnerability: External call before state update allows reentrancy");
  console.log("💡 Mitigation: Use ReentrancyGuard and Checks-Effects-Interactions pattern");
  
  // Deploy secure reentrancy contract
  console.log("\n🟢 Secure Implementation:");
  const ReentrancySecure = await ethers.getContractFactory("ReentrancySecure");
  const reentrancySecure = await ReentrancySecure.deploy();
  await reentrancySecure.deployed();
  console.log("ReentrancySecure deployed to:", reentrancySecure.address);
  console.log("✅ Uses ReentrancyGuard and proper state management");
  
  console.log("");
}

async function demonstrateAccessControl(deployer, attacker, user, amount) {
  console.log("🔴 === ACCESS CONTROL VULNERABILITY DEMO ===");
  
  // Deploy vulnerable access control contract
  const AccessControlVulnerable = await ethers.getContractFactory("AccessControlVulnerable");
  const accessControlVulnerable = await AccessControlVulnerable.deploy();
  await accessControlVulnerable.deployed();
  console.log("AccessControlVulnerable deployed to:", accessControlVulnerable.address);
  
  // Initialize the contract
  await accessControlVulnerable.connect(deployer).initialize();
  console.log("Contract initialized by deployer");
  
  console.log("\n⚠️  Vulnerability: Missing access control and weak authentication");
  console.log("💡 Mitigation: Use proper access control with OpenZeppelin AccessControl");
  
  // Deploy secure access control contract
  console.log("\n🟢 Secure Implementation:");
  const AccessControlSecure = await ethers.getContractFactory("AccessControlSecure");
  const accessControlSecure = await AccessControlSecure.deploy();
  await accessControlSecure.deployed();
  console.log("AccessControlSecure deployed to:", accessControlSecure.address);
  console.log("✅ Uses OpenZeppelin AccessControl for proper role management");
  
  console.log("");
}

async function demonstrateIntegerOverflow(deployer, attacker, user, amount) {
  console.log("🔴 === INTEGER OVERFLOW VULNERABILITY DEMO ===");
  
  // Deploy vulnerable integer overflow contract
  const IntegerOverflowVulnerable = await ethers.getContractFactory("IntegerOverflowVulnerable");
  const integerOverflowVulnerable = await IntegerOverflowVulnerable.deploy();
  await integerOverflowVulnerable.deployed();
  console.log("IntegerOverflowVulnerable deployed to:", integerOverflowVulnerable.address);
  
  console.log("\n⚠️  Vulnerability: No overflow/underflow protection in Solidity < 0.8.0");
  console.log("💡 Mitigation: Use SafeMath library or Solidity >= 0.8.0 with built-in checks");
  
  // Deploy secure integer overflow contract
  console.log("\n🟢 Secure Implementation:");
  const IntegerOverflowSecure = await ethers.getContractFactory("IntegerOverflowSecure");
  const integerOverflowSecure = await IntegerOverflowSecure.deploy();
  await integerOverflowSecure.deployed();
  console.log("IntegerOverflowSecure deployed to:", integerOverflowSecure.address);
  console.log("✅ Uses SafeMath and proper overflow protection");
  
  console.log("");
}

async function demonstrateUpgradeableVulnerability(deployer, attacker, user) {
  console.log("🔴 === UPGRADEABLE CONTRACT VULNERABILITY DEMO ===");
  
  // Deploy vulnerable proxy
  const VulnerableProxy = await ethers.getContractFactory("VulnerableProxy");
  const vulnerableProxy = await VulnerableProxy.deploy(ethers.constants.AddressZero);
  await vulnerableProxy.deployed();
  console.log("VulnerableProxy deployed to:", vulnerableProxy.address);
  
  console.log("\n⚠️  Vulnerability: Unprotected upgrade mechanism and storage collisions");
  console.log("💡 Mitigation: Use OpenZeppelin upgradeable contracts with proper access control");
  
  // Deploy secure upgradeable factory
  console.log("\n🟢 Secure Implementation:");
  const SecureUpgradeableFactory = await ethers.getContractFactory("SecureUpgradeableFactory");
  const secureUpgradeableFactory = await SecureUpgradeableFactory.deploy();
  await secureUpgradeableFactory.deployed();
  console.log("SecureUpgradeableFactory deployed to:", secureUpgradeableFactory.address);
  console.log("✅ Uses proper access control and upgrade safety mechanisms");
  
  console.log("");
}

function showQuickTips() {
  console.log("💡 === SECURITY QUICK TIPS ===");
  console.log("1. Always use the Checks-Effects-Interactions pattern");
  console.log("2. Implement proper access control with OpenZeppelin");
  console.log("3. Use ReentrancyGuard for functions with external calls");
  console.log("4. Validate all inputs and handle edge cases");
  console.log("5. Keep contracts simple and modular");
  console.log("6. Use established libraries (OpenZeppelin) over custom code");
  console.log("7. Implement emergency pause mechanisms");
  console.log("8. Regular security audits and testing");
  console.log("");
}

function showCommands() {
  console.log("🔧 === USEFUL COMMANDS ===");
  console.log("Testing:");
  console.log("  npx hardhat test                    # Run all tests");
  console.log("  npx hardhat test --grep \"reentrancy\" # Run specific tests");
  console.log("");
  console.log("Analysis:");
  console.log("  npx hardhat compile                 # Compile contracts");
  console.log("  npx hardhat size-contracts          # Check contract sizes");
  console.log("");
  console.log("Network:");
  console.log("  npx hardhat node                    # Start local network");
  console.log("  npx hardhat run scripts/deploy.js --network localhost");
  console.log("");
  console.log("Security Tools:");
  console.log("  npm install -g @crytic/slither-analyzer");
  console.log("  slither .                           # Static analysis");
  console.log("");
}

// Execute the demo
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Demo failed:", error);
    process.exit(1);
  });
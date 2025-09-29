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
  
  // Show security tips
  showQuickTips();
  
  // Show useful commands
  showCommands();
}

async function demonstrateReentrancy(deployer, attacker, user, amount) {
  console.log("🔴 === REENTRANCY VULNERABILITY DEMO ===");
  
  // Deploy vulnerable bank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.deployed();
  console.log("VulnerableBank deployed to:", vulnerableBank.address);
  
  // User deposits funds
  await vulnerableBank.connect(user).deposit({ value: amount });
  console.log("User deposited:", ethers.utils.formatEther(amount), "ETH");
  console.log("User balance in bank:", ethers.utils.formatEther(await vulnerableBank.getBalance(user.address)), "ETH");
  
  console.log("\n⚠️  Vulnerability: External call before state update allows reentrancy");
  console.log("💡 Mitigation: Use ReentrancyGuard and Checks-Effects-Interactions pattern");
  
  // Deploy secure bank
  console.log("\n🟢 Secure Implementation:");
  const SecureBank = await ethers.getContractFactory("SecureBank");
  const secureBank = await SecureBank.deploy();
  await secureBank.deployed();
  console.log("SecureBank deployed to:", secureBank.address);
  console.log("✅ Uses ReentrancyGuard and proper state management");
  
  console.log("");
}

async function demonstrateAccessControl(deployer, attacker, user, amount) {
  console.log("🔴 === ACCESS CONTROL VULNERABILITY DEMO ===");
  
  // Deploy vulnerable wallet
  const VulnerableWallet = await ethers.getContractFactory("VulnerableWallet");
  const vulnerableWallet = await VulnerableWallet.deploy();
  await vulnerableWallet.deployed();
  console.log("VulnerableWallet deployed to:", vulnerableWallet.address);
  
  // Owner deposits funds
  await vulnerableWallet.connect(deployer).deposit({ value: amount });
  console.log("Owner deposited:", ethers.utils.formatEther(amount), "ETH");
  console.log("Wallet balance:", ethers.utils.formatEther(await vulnerableWallet.getBalance()), "ETH");
  
  console.log("\n⚠️  Vulnerability: Missing access control allows anyone to withdraw");
  console.log("💡 Mitigation: Use proper access control modifiers (onlyOwner)");
  
  // Deploy secure wallet
  console.log("\n🟢 Secure Implementation:");
  const SecureWallet = await ethers.getContractFactory("SecureWallet");
  const secureWallet = await SecureWallet.deploy();
  await secureWallet.deployed();
  console.log("SecureWallet deployed to:", secureWallet.address);
  console.log("✅ Uses OpenZeppelin Ownable for proper access control");
  
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
const { ethers } = require("hardhat");

async function main() {
  console.log("=== Smart Contract Security Samples Deployment ===");
  console.log("Deploying vulnerable and secure contract examples...");
  console.log("");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  console.log("");

  // Deploy Vulnerable Contracts
  console.log("🔴 Deploying Vulnerable Contracts:");
  
  // Deploy VulnerableBank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.deployed();
  console.log("  VulnerableBank deployed to:", vulnerableBank.address);

  // Deploy VulnerableWallet
  const VulnerableWallet = await ethers.getContractFactory("VulnerableWallet");
  const vulnerableWallet = await VulnerableWallet.deploy();
  await vulnerableWallet.deployed();
  console.log("  VulnerableWallet deployed to:", vulnerableWallet.address);

  console.log("");

  // Deploy Secure Contracts
  console.log("🟢 Deploying Secure Contracts:");
  
  // Deploy SecureBank
  const SecureBank = await ethers.getContractFactory("SecureBank");
  const secureBank = await SecureBank.deploy();
  await secureBank.deployed();
  console.log("  SecureBank deployed to:", secureBank.address);

  // Deploy SecureWallet
  const SecureWallet = await ethers.getContractFactory("SecureWallet");
  const secureWallet = await SecureWallet.deploy();
  await secureWallet.deployed();
  console.log("  SecureWallet deployed to:", secureWallet.address);

  console.log("");

  // Setup test data
  console.log("📊 Setting up test data...");
  
  // Add initial deposits to banks
  const depositAmount = ethers.utils.parseEther("10");
  
  await vulnerableBank.deposit({ value: depositAmount });
  console.log("  Added 10 ETH to VulnerableBank");
  
  await secureBank.deposit({ value: depositAmount });
  console.log("  Added 10 ETH to SecureBank");

  console.log("");
  
  // Print deployment summary
  console.log("=== Deployment Summary ===");
  console.log("\n📋 Contract Addresses:");
  console.log("  VulnerableBank:", vulnerableBank.address);
  console.log("  VulnerableWallet:", vulnerableWallet.address);
  console.log("  SecureBank:", secureBank.address);
  console.log("  SecureWallet:", secureWallet.address);
  
  console.log("\n🔧 Next Steps:");
  console.log("  1. Run security demo: npx hardhat run scripts/security-demo.js");
  console.log("  2. Run tests: npx hardhat test");
  console.log("  3. Verify contracts on Etherscan (if on mainnet/testnet)");
  
  console.log("\n⚠️  Security Warning:");
  console.log("  🔴 NEVER deploy vulnerable contracts to mainnet!");
  console.log("  🔴 These are for educational purposes only!");
  console.log("  🟢 Always use secure implementations in production");

  // Save deployment addresses to a file
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      VulnerableBank: vulnerableBank.address,
      VulnerableWallet: vulnerableWallet.address,
      SecureBank: secureBank.address,
      SecureWallet: secureWallet.address
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    'deployment-addresses.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n📄 Deployment addresses saved to deployment-addresses.json");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
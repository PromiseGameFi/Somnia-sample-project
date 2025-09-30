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
  
  // Deploy IntegerOverflowVulnerable
  const IntegerOverflowVulnerable = await ethers.getContractFactory("IntegerOverflowVulnerable");
  const integerOverflowVulnerable = await IntegerOverflowVulnerable.deploy();
  await integerOverflowVulnerable.deployed();
  console.log("  IntegerOverflowVulnerable deployed to:", integerOverflowVulnerable.address);

  // Deploy AccessControlVulnerable
  const AccessControlVulnerable = await ethers.getContractFactory("AccessControlVulnerable");
  const accessControlVulnerable = await AccessControlVulnerable.deploy();
  await accessControlVulnerable.deployed();
  console.log("  AccessControlVulnerable deployed to:", accessControlVulnerable.address);

  // Deploy ReentrancyVulnerable
  const ReentrancyVulnerable = await ethers.getContractFactory("ReentrancyVulnerable");
  const reentrancyVulnerable = await ReentrancyVulnerable.deploy();
  await reentrancyVulnerable.deployed();
  console.log("  ReentrancyVulnerable deployed to:", reentrancyVulnerable.address);

  // Deploy UpgradeableVulnerable (VulnerableProxy)
  const VulnerableProxy = await ethers.getContractFactory("VulnerableProxy");
  const vulnerableProxy = await VulnerableProxy.deploy(ethers.constants.AddressZero);
  await vulnerableProxy.deployed();
  console.log("  UpgradeableVulnerable (VulnerableProxy) deployed to:", vulnerableProxy.address);

  console.log("");

  // Deploy Secure Contracts
  console.log("🟢 Deploying Secure Contracts:");
  
  // Deploy IntegerOverflowSecure
  const IntegerOverflowSecure = await ethers.getContractFactory("IntegerOverflowSecure");
  const integerOverflowSecure = await IntegerOverflowSecure.deploy();
  await integerOverflowSecure.deployed();
  console.log("  IntegerOverflowSecure deployed to:", integerOverflowSecure.address);

  // Deploy AccessControlSecure
  const AccessControlSecure = await ethers.getContractFactory("AccessControlSecure");
  const accessControlSecure = await AccessControlSecure.deploy();
  await accessControlSecure.deployed();
  console.log("  AccessControlSecure deployed to:", accessControlSecure.address);

  // Deploy ReentrancySecure
  const ReentrancySecure = await ethers.getContractFactory("ReentrancySecure");
  const reentrancySecure = await ReentrancySecure.deploy();
  await reentrancySecure.deployed();
  console.log("  ReentrancySecure deployed to:", reentrancySecure.address);

  // Deploy UpgradeableSecure (SecureUpgradeableFactory)
  const SecureUpgradeableFactory = await ethers.getContractFactory("SecureUpgradeableFactory");
  const secureUpgradeableFactory = await SecureUpgradeableFactory.deploy();
  await secureUpgradeableFactory.deployed();
  console.log("  UpgradeableSecure (SecureUpgradeableFactory) deployed to:", secureUpgradeableFactory.address);

  console.log("");

  // Setup test data
  console.log("📊 Setting up test data...");
  
  // Add initial deposits to reentrancy contracts
  const depositAmount = ethers.utils.parseEther("10");
  
  await reentrancyVulnerable.deposit({ value: depositAmount });
  console.log("  Added 10 ETH to ReentrancyVulnerable");
  
  await reentrancySecure.deposit({ value: depositAmount });
  console.log("  Added 10 ETH to ReentrancySecure");

  console.log("");
  
  // Print deployment summary
  console.log("=== Deployment Summary ===");
  console.log("\n📋 Contract Addresses:");
  console.log("  IntegerOverflowVulnerable:", integerOverflowVulnerable.address);
  console.log("  AccessControlVulnerable:", accessControlVulnerable.address);
  console.log("  ReentrancyVulnerable:", reentrancyVulnerable.address);
  console.log("  UpgradeableVulnerable:", vulnerableProxy.address);
  console.log("  IntegerOverflowSecure:", integerOverflowSecure.address);
  console.log("  AccessControlSecure:", accessControlSecure.address);
  console.log("  ReentrancySecure:", reentrancySecure.address);
  console.log("  UpgradeableSecure:", secureUpgradeableFactory.address);
  
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
      IntegerOverflowVulnerable: integerOverflowVulnerable.address,
      AccessControlVulnerable: accessControlVulnerable.address,
      ReentrancyVulnerable: reentrancyVulnerable.address,
      UpgradeableVulnerable: vulnerableProxy.address,
      IntegerOverflowSecure: integerOverflowSecure.address,
      AccessControlSecure: accessControlSecure.address,
      ReentrancySecure: reentrancySecure.address,
      UpgradeableSecure: secureUpgradeableFactory.address
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
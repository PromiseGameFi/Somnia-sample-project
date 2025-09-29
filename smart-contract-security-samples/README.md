# Smart Contract Security Samples

A comprehensive collection of smart contract security examples demonstrating common vulnerabilities and their secure implementations. This project serves as an educational resource for developers learning about smart contract security best practices.

## 🎯 Purpose

This repository contains:
- **Vulnerable contracts** that demonstrate common security issues
- **Secure implementations** that show how to prevent these vulnerabilities
- **Comprehensive tests** that verify both vulnerabilities and mitigations
- **Interactive demonstrations** for hands-on learning

⚠️ **WARNING**: The vulnerable contracts are for educational purposes only. Never use them in production!

## 📁 Project Structure

```
smart-contract-security-samples/
├── contracts/
│   ├── vulnerable/          # Vulnerable contract examples
│   │   ├── ReentrancyVulnerable.sol
│   │   ├── IntegerOverflowVulnerable.sol
│   │   ├── AccessControlVulnerable.sol
│   │   ├── OracleManipulationVulnerable.sol
│   │   ├── UpgradeableVulnerable.sol
│   │   ├── VulnerableBank.sol
│   │   └── VulnerableWallet.sol
│   └── secure/              # Secure implementations
│       ├── ReentrancySecure.sol
│       ├── IntegerOverflowSecure.sol
│       ├── AccessControlSecure.sol
│       ├── OracleManipulationSecure.sol
│       ├── UpgradeableSecure.sol
│       ├── SecureBank.sol
│       └── SecureWallet.sol
├── scripts/                 # Deployment and demo scripts
│   ├── deploy.js
│   └── security-demo.js
├── test/                    # Comprehensive test suites
│   ├── ReentrancyTest.t.sol
│   ├── IntegerOverflowTest.t.sol
│   ├── AccessControlTest.t.sol
│   ├── OracleManipulationTest.t.sol
│   └── UpgradeableTest.t.sol
├── docs/                    # Documentation
│   ├── 01-overview.md
│   ├── 02-vulnerabilities.md
│   ├── 03-secure-patterns.md
│   ├── 04-testing.md
│   └── 05-maintenance.md
├── hardhat.config.js        # Hardhat configuration
├── package.json            # Project metadata and scripts
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Git](https://git-scm.com/)
- Your preferred development framework (see tabs below)

### Framework Selection

Choose your preferred development framework:

<!-- Framework Tabs -->
<div class="framework-tabs">
  <div class="tab-buttons">
    <button class="tab-button active" onclick="showTab('hardhat')">Hardhat</button>
    <button class="tab-button" onclick="showTab('foundry')">Foundry</button>
    <button class="tab-button" onclick="showTab('remix')">Remix</button>
  </div>

  <!-- Hardhat Tab -->
  <div id="hardhat" class="tab-content active">

### 🔨 Hardhat Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd smart-contract-security-samples
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile contracts**:
   ```bash
   npx hardhat compile
   ```

4. **Run tests**:
   ```bash
   npx hardhat test
   ```

5. **Deploy contracts**:
   ```bash
   # Start local network
   npx hardhat node
   
   # Deploy (in another terminal)
   npx hardhat run scripts/deploy.js --network localhost
   ```

6. **Run security demo**:
   ```bash
   npx hardhat run scripts/security-demo.js --network localhost
   ```

#### Hardhat Commands

```bash
# Development
npm run compile        # Compile contracts
npm run test          # Run tests
npm run coverage      # Test coverage
npm run node          # Start local network

# Deployment
npm run deploy                    # Deploy to hardhat network
npm run deploy:localhost          # Deploy to localhost
npm run deploy:sepolia           # Deploy to Sepolia testnet

# Security
npm run demo                     # Run security demo
npm run analyze                  # Run Slither analysis
npm run lint                     # Lint contracts

# Utilities
npm run clean                    # Clean artifacts
npm run size                     # Check contract sizes
```

  </div>

  <!-- Foundry Tab -->
  <div id="foundry" class="tab-content">

### ⚒️ Foundry Setup

1. **Install Foundry**:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd smart-contract-security-samples
   
   # Convert to Foundry structure
   mkdir src lib
   cp -r contracts/* src/
   ```

3. **Create foundry.toml**:
   ```toml
   [profile.default]
   src = "src"
   out = "out"
   libs = ["lib"]
   
   [dependencies]
   forge-std = { git = "https://github.com/foundry-rs/forge-std", version = "v1.5.3" }
   openzeppelin-contracts = { git = "https://github.com/OpenZeppelin/openzeppelin-contracts", version = "v4.9.0" }
   ```

4. **Install dependencies**:
   ```bash
   forge install
   ```

5. **Build and test**:
   ```bash
   forge build
   forge test
   ```

#### Foundry Commands

```bash
# Development
forge build                      # Compile contracts
forge test                       # Run tests
forge test -vvv                  # Verbose testing
forge coverage                   # Test coverage

# Testing
forge test --match-contract ReentrancyTest
forge test --fuzz-runs 1000
forge test --gas-report

# Deployment
anvil                           # Start local node
forge script scripts/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Analysis
forge fmt                       # Format code
forge doc                       # Generate docs
```

  </div>

  <!-- Remix Tab -->
  <div id="remix" class="tab-content">

### 🌐 Remix IDE Setup

1. **Open Remix IDE**:
   - Go to [remix.ethereum.org](https://remix.ethereum.org)

2. **Import contracts**:
   - Click "File Explorer" → "Load from GitHub"
   - Enter repository URL or upload files manually
   - Navigate to `contracts/` folder

3. **Install dependencies**:
   - In Remix, go to "File Explorer"
   - Create `.deps/npm/@openzeppelin/contracts` folder
   - Import OpenZeppelin contracts via GitHub or npm

4. **Compile contracts**:
   - Go to "Solidity Compiler" tab
   - Select Solidity version 0.8.19
   - Enable optimization (200 runs)
   - Click "Compile"

5. **Deploy and test**:
   - Go to "Deploy & Run Transactions" tab
   - Select environment (JavaScript VM, Injected Web3, etc.)
   - Deploy vulnerable and secure contracts
   - Interact with contracts to see differences

#### Remix Workflow

```javascript
// Example interaction in Remix console

// Deploy VulnerableBank
const vulnerableBank = await VulnerableBank.deploy()

// Deposit funds
await vulnerableBank.deposit({value: web3.utils.toWei("1", "ether")})

// Check balance
const balance = await vulnerableBank.getBalance(accounts[0])
console.log("Balance:", web3.utils.fromWei(balance, "ether"), "ETH")

// Deploy SecureBank for comparison
const secureBank = await SecureBank.deploy()
```

#### Remix Features

- **Visual Debugging**: Step through transactions
- **Gas Analysis**: See gas costs for each operation
- **Static Analysis**: Built-in security analysis
- **Plugin Ecosystem**: Slither, MythX integration
- **Easy Sharing**: Share workspaces via GitHub

  </div>
</div>

<style>
.framework-tabs {
  margin: 20px 0;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 20px;
}

.tab-button {
  background: none;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-weight: 500;
}

.tab-button.active {
  border-bottom-color: #007acc;
  color: #007acc;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}
</style>

<script>
function showTab(framework) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(framework).classList.add('active');
  
  // Add active class to clicked button
  event.target.classList.add('active');
}
</script>

<!-- End Framework Tabs -->

## 🔍 Security Vulnerabilities Covered

### 1. Reentrancy Attacks
- **Vulnerable**: `VulnerableBank.sol` - Classic reentrancy in withdraw function
- **Secure**: `SecureBank.sol` - Uses ReentrancyGuard and CEI pattern
- **Key Concepts**: Checks-Effects-Interactions, ReentrancyGuard, Pull-over-Push

### 2. Access Control Issues
- **Vulnerable**: `VulnerableWallet.sol` - Missing access control on withdraw
- **Secure**: `SecureWallet.sol` - Proper owner-only access control
- **Key Concepts**: Role-based access, tx.origin vs msg.sender, Proper initialization

### 3. Integer Overflow/Underflow
- **Vulnerable**: `IntegerOverflowVulnerable.sol`
- **Secure**: `IntegerOverflowSecure.sol`
- **Key Concepts**: SafeMath, Solidity 0.8+ protection, Input validation

### 4. Oracle Manipulation
- **Vulnerable**: `OracleManipulationVulnerable.sol`
- **Secure**: `OracleManipulationSecure.sol`
- **Key Concepts**: Price aggregation, TWAP, Circuit breakers, Stale price detection

### 5. Upgradeable Contract Vulnerabilities
- **Vulnerable**: `UpgradeableVulnerable.sol`
- **Secure**: `UpgradeableSecure.sol`
- **Key Concepts**: Storage collisions, Initialization, Upgrade authorization, Timelocks

## 📊 Security Analysis Tools

### Static Analysis with Slither

```bash
# Install Slither
pip install slither-analyzer

# Run analysis
slither .

# Run specific detectors
slither . --detect reentrancy-eth,integer-overflow

# Generate report
slither . --print human-summary
```

### Other Security Tools

- **Mythril**: `myth analyze contracts/vulnerable/VulnerableBank.sol`
- **Manticore**: Symbolic execution for deep analysis
- **Echidna**: Property-based fuzzing
- **MythX**: Professional security analysis platform

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

- [📖 Overview](docs/01-overview.md) - Project overview and architecture
- [🔴 Vulnerabilities](docs/02-vulnerabilities.md) - Detailed vulnerability explanations
- [🟢 Secure Patterns](docs/03-secure-patterns.md) - Security best practices
- [🧪 Testing Guide](docs/04-testing.md) - Testing and auditing methodologies
- [🔧 Maintenance](docs/05-maintenance.md) - Post-deployment security practices

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new vulnerabilities or mitigations
4. Ensure all tests pass
5. Submit a pull request

### Adding New Vulnerabilities

When adding new vulnerability examples:

1. Create vulnerable contract in `contracts/vulnerable/`
2. Create secure implementation in `contracts/secure/`
3. Add comprehensive tests in `test/`
4. Update the demo script if applicable
5. Document the vulnerability and mitigation

## ⚠️ Security Disclaimer

**IMPORTANT**: This repository contains intentionally vulnerable smart contracts for educational purposes. These contracts:

- Should NEVER be used in production
- May contain severe security vulnerabilities
- Are designed to demonstrate attack vectors
- Should only be deployed on test networks

Always use the secure implementations and follow security best practices in production code.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter issues or have questions:

1. Check the [Issues](../../issues) page
2. Review the test files for usage examples
3. Run the interactive demonstrations
4. Consult the security resources in the docs

## 🔄 Updates

This repository is regularly updated with:

- New vulnerability examples
- Latest security best practices
- Updated dependencies
- Improved test coverage
- Enhanced documentation

Star the repository to stay updated with the latest security examples and best practices!

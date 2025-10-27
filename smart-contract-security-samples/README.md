# Smart Contract Security Samples

A curated collection of Solidity smart contracts demonstrating common security vulnerabilities and their secure implementations. This repository serves as an educational resource for developers learning smart contract security best practices.

## Purpose

This repository provides **side-by-side comparisons** of vulnerable and secure smart contract implementations, making it easy to understand:

- **What makes contracts vulnerable** - Clear examples of common security pitfalls
- **How to fix vulnerabilities** - Secure implementations with detailed explanations
- **Why security matters** - Real-world context and impact of each vulnerability type

## Repository Structure

```
contracts/
├── vulnerable/          # Intentionally vulnerable contracts for educational purposes
│   ├── ReentrancyVulnerable.sol
│   ├── AccessControlVulnerable.sol
│   ├── IntegerOverflowVulnerable.sol
│   └── UpgradeableVulnerable.sol
└── secure/              # Secure implementations demonstrating best practices
    ├── ReentrancySecure.sol
    ├── AccessControlSecure.sol
    ├── IntegerOverflowSecure.sol
    └── UpgradeableSecure.sol
```

## Vulnerability Categories

### 1. Reentrancy Attacks
- **Vulnerable**: [`ReentrancyVulnerable.sol`](contracts/vulnerable/ReentrancyVulnerable.sol)
- **Secure**: [`ReentrancySecure.sol`](contracts/secure/ReentrancySecure.sol)

Demonstrates the classic reentrancy vulnerability where external calls are made before state updates, allowing attackers to drain contract funds.

**Key Learning**: Checks-Effects-Interactions pattern and reentrancy guards

### 2. Access Control Flaws
- **Vulnerable**: [`AccessControlVulnerable.sol`](contracts/vulnerable/AccessControlVulnerable.sol)
- **Secure**: [`AccessControlSecure.sol`](contracts/secure/AccessControlSecure.sol)

Shows improper role management where any role holder can grant the same role to others, leading to privilege escalation.

**Key Learning**: Proper role hierarchy, owner separation, and event logging

### 3. Integer Overflow/Underflow
- **Vulnerable**: [`IntegerOverflowVulnerable.sol`](contracts/vulnerable/IntegerOverflowVulnerable.sol)
- **Secure**: [`IntegerOverflowSecure.sol`](contracts/secure/IntegerOverflowSecure.sol)

Illustrates arithmetic vulnerabilities that can lead to unexpected behavior in token balances and supply calculations.

**Key Learning**: SafeMath usage and Solidity 0.8+ built-in overflow protection

### 4. Upgradeable Contract Security
- **Vulnerable**: [`UpgradeableVulnerable.sol`](contracts/vulnerable/UpgradeableVulnerable.sol)
- **Secure**: [`UpgradeableSecure.sol`](contracts/secure/UpgradeableSecure.sol)

Explores security considerations in proxy patterns and upgradeable contracts.

**Key Learning**: Storage layout preservation, initialization security, and upgrade authorization

## Getting Started

### Prerequisites
- [Foundry](https://getfoundry.sh/) or [Hardhat](https://hardhat.org/) for local development
- [Remix IDE](https://remix.ethereum.org/) for browser-based testing
- Basic understanding of Solidity and Ethereum

### Quick Start with Remix

1. **Open Remix IDE** in your browser
2. **Import contracts** by copying the code from this repository
3. **Deploy vulnerable contracts** first to understand the attack vectors
4. **Deploy secure contracts** to see the proper implementations
5. **Compare implementations** side-by-side to understand the differences

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd smart-contract-security-samples

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
forge build

# Run tests (if available)
forge test
```

## Educational Features

### Comprehensive Documentation
Each contract includes:
- **Detailed NatSpec comments** explaining the vulnerability or security measure
- **Inline code comments** highlighting critical security decisions
- **"What's Wrong" sections** in vulnerable contracts explaining the specific issues
- **Design rationale** in secure contracts explaining security choices

### Remix-Optimized
- **No external dependencies** - All contracts are self-contained
- **Clear deployment instructions** in contract comments
- **Step-by-step exploitation guides** for educational purposes
- **Gas-efficient implementations** suitable for testing environments

### Real-World Context
- Based on **actual vulnerabilities** found in production contracts
- Includes **historical examples** and impact assessments
- Demonstrates **current best practices** and industry standards

## Important Security Notice

**WARNING**: The contracts in the `vulnerable/` directory contain intentional security flaws and should **NEVER** be deployed with real funds on any network. They are designed purely for educational purposes.

### Safe Usage Guidelines
- ✅ Use in local development environments
- ✅ Deploy on testnets for learning
- ✅ Use in Remix for experimentation
- ❌ **NEVER deploy vulnerable contracts on mainnet**
- ❌ **NEVER use with real funds**

## Learning Path

1. **Start with Reentrancy** - The most common and impactful vulnerability
2. **Study Access Control** - Foundation of smart contract security
3. **Understand Integer Issues** - Critical for financial applications
4. **Explore Upgradeability** - Advanced topic for complex systems

## Contributing

Contributions are welcome! Please ensure:
- New vulnerabilities include both vulnerable and secure implementations
- Code is well-documented with clear explanations
- Examples are Remix-compatible and self-contained
- Security warnings are prominently displayed

## Additional Resources

- [Smart Contract Security Documentation](../../../SmartContract/) - Comprehensive security guide
- [OpenZeppelin Security Guidelines](https://docs.openzeppelin.com/contracts/4.x/security)
- [ConsenSys Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry](https://swcregistry.io/) - Smart Contract Weakness Classification

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Remember**: Security is not a destination but a journey. These examples provide a foundation, but always conduct thorough audits and testing before deploying contracts with real value.
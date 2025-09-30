// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title AccessControlSecure
 * @dev Demonstrates secure access control implementation
 * 
 * SECURITY FEATURES:
 * 1. Role-based access control using OpenZeppelin AccessControl
 * 2. Proper authentication using msg.sender
 * 3. Multi-level permission system
 * 4. Secure ownership transfer with 2-step process
 * 5. Pausable functionality for emergency stops
 * 6. Reentrancy protection
 * 7. Input validation and error handling
 */
contract AccessControlSecure is AccessControl, Pausable, ReentrancyGuard, Ownable2Step {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    mapping(address => uint256) private _balances;
    mapping(address => bool) private _authorized;
    
    uint256 private _totalSupply;
    uint256 private _maxSupply = 1000000 * 10**18;
    bool private _initialized;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event MaxSupplyChanged(uint256 oldMaxSupply, uint256 newMaxSupply);
    event AuthorizationGranted(address indexed user, address indexed grantor);
    event AuthorizationRevoked(address indexed user, address indexed revoker);
    
    modifier onlyInitialized() {
        require(_initialized, "Contract not initialized");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address: zero address");
        require(addr != address(this), "Invalid address: contract address");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than zero");
        _;
    }
    
    constructor() {
        // Grant all roles to the deployer initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        // Set role admin relationships
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Initialize the contract - only admin can call
     */
    function initialize() external onlyRole(ADMIN_ROLE) {
        require(!_initialized, "Already initialized");
        _initialized = true;
        _totalSupply = 0;
    }
    
    /**
     * @dev Mint tokens - only minter role can call
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        onlyInitialized
        whenNotPaused
        validAddress(to)
        validAmount(amount)
        nonReentrant
    {
        require(_totalSupply + amount <= _maxSupply, "Exceeds maximum supply");
        
        _balances[to] += amount;
        _totalSupply += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev Burn tokens - only burner role can call
     */
    function burn(address from, uint256 amount) 
        external 
        onlyRole(BURNER_ROLE) 
        onlyInitialized
        whenNotPaused
        validAddress(from)
        validAmount(amount)
        nonReentrant
    {
        require(_balances[from] >= amount, "Insufficient balance to burn");
        
        _balances[from] -= amount;
        _totalSupply -= amount;
        
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
    
    /**
     * @dev Grant authorization - only admin can call
     */
    function grantAuthorization(address user) 
        external 
        onlyRole(ADMIN_ROLE) 
        validAddress(user)
    {
        _authorized[user] = true;
        emit AuthorizationGranted(user, msg.sender);
    }
    
    /**
     * @dev Revoke authorization - only admin can call
     */
    function revokeAuthorization(address user) 
        external 
        onlyRole(ADMIN_ROLE) 
        validAddress(user)
    {
        _authorized[user] = false;
        emit AuthorizationRevoked(user, msg.sender);
    }
    
    /**
     * @dev Set maximum supply - only admin can call
     */
    function setMaxSupply(uint256 newMaxSupply) 
        external 
        onlyRole(ADMIN_ROLE) 
        validAmount(newMaxSupply)
    {
        require(newMaxSupply >= _totalSupply, "New max supply cannot be less than current supply");
        
        uint256 oldMaxSupply = _maxSupply;
        _maxSupply = newMaxSupply;
        
        emit MaxSupplyChanged(oldMaxSupply, newMaxSupply);
    }
    
    /**
     * @dev Pause contract - only pauser role can call
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract - only pauser role can call
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw - only admin can call
     */
    function emergencyWithdraw() 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Transfer tokens
     */
    function transfer(address to, uint256 amount) 
        external 
        onlyInitialized
        whenNotPaused
        validAddress(to)
        validAmount(amount)
        nonReentrant
        returns (bool)
    {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev View functions
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
    
    function maxSupply() external view returns (uint256) {
        return _maxSupply;
    }
    
    function isAuthorized(address user) external view returns (bool) {
        return _authorized[user];
    }
    
    function initialized() external view returns (bool) {
        return _initialized;
    }
    
    /**
     * @dev Check if address has admin role
     */
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev Check if address has minter role
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Check if address has pauser role
     */
    function isPauser(address account) external view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }
    
    /**
     * @dev Check if address has burner role
     */
    function isBurner(address account) external view returns (bool) {
        return hasRole(BURNER_ROLE, account);
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}

/**
 * @title AccessControlFactory
 * @dev Factory contract for deploying AccessControlSecure contracts
 */
contract AccessControlFactory is AccessControl {
    address[] public deployedContracts;
    mapping(address => bool) public isDeployedContract;
    
    event ContractDeployed(address indexed contractAddress, address indexed deployer);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Deploy a new AccessControlSecure contract
     */
    function deployAccessControlContract() external returns (address) {
        AccessControlSecure newContract = new AccessControlSecure();
        address contractAddress = address(newContract);
        
        deployedContracts.push(contractAddress);
        isDeployedContract[contractAddress] = true;
        
        emit ContractDeployed(contractAddress, msg.sender);
        return contractAddress;
    }
    
    /**
     * @dev Get all deployed contracts
     */
    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
    
    /**
     * @dev Get number of deployed contracts
     */
    function getDeployedContractCount() external view returns (uint256) {
        return deployedContracts.length;
    }
}
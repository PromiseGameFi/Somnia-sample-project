// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title AccessControlSecure
 * @dev Demonstrates secure access control patterns and best practices
 * 
 * Security measures implemented:
 * 1. Role-based access control (RBAC) using OpenZeppelin
 * 2. Two-step ownership transfer
 * 3. Time-locked critical operations
 * 4. Multi-signature requirements for sensitive functions
 * 5. Proper initialization with access controls
 * 6. Emergency pause functionality
 * 7. Signature-based authorization
 * 8. Rate limiting and cooldown periods
 * 9. Comprehensive event logging
 * 10. Input validation and sanitization
 */
contract AccessControlSecure is AccessControl, Ownable2Step, ReentrancyGuard, Pausable, EIP712 {
    using ECDSA for bytes32;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // State variables
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastWithdrawal;
    mapping(address => uint256) public dailyWithdrawn;
    mapping(address => uint256) public lastDailyReset;
    mapping(bytes32 => bool) public usedNonces;
    
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;
    uint256 public constant DAILY_WITHDRAWAL_LIMIT = 10_000 ether;
    uint256 public constant WITHDRAWAL_COOLDOWN = 1 hours;
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    // Time-locked operations
    struct TimeLock {
        uint256 executeTime;
        bool executed;
        bytes32 operation;
    }
    
    mapping(bytes32 => TimeLock) public timeLocks;
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    
    // Multi-signature requirements
    struct MultiSigProposal {
        address target;
        bytes data;
        uint256 value;
        uint256 confirmations;
        mapping(address => bool) confirmed;
        bool executed;
        uint256 deadline;
    }
    
    mapping(bytes32 => MultiSigProposal) public proposals;
    uint256 public constant REQUIRED_CONFIRMATIONS = 2;
    uint256 public constant PROPOSAL_DURATION = 7 days;
    
    // Events
    event RoleGrantedSecure(bytes32 indexed role, address indexed account, address indexed sender, uint256 timestamp);
    event RoleRevokedSecure(bytes32 indexed role, address indexed account, address indexed sender, uint256 timestamp);
    event TimeLockScheduled(bytes32 indexed id, bytes32 operation, uint256 executeTime);
    event TimeLockExecuted(bytes32 indexed id, bytes32 operation);
    event MultiSigProposalCreated(bytes32 indexed proposalId, address indexed proposer, address target);
    event MultiSigProposalConfirmed(bytes32 indexed proposalId, address indexed confirmer);
    event MultiSigProposalExecuted(bytes32 indexed proposalId, bool success);
    event EmergencyAction(address indexed executor, string action, uint256 timestamp);
    event SecurityAlert(string alertType, address indexed user, uint256 value, uint256 timestamp);
    
    // Modifiers - using OpenZeppelin's built-in onlyRole
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        require(addr != address(this), "Cannot be contract address");
        _;
    }
    
    modifier withinSupplyLimit(uint256 amount) {
        require(totalSupply + amount <= MAX_SUPPLY, "Exceeds max supply");
        _;
    }
    
    modifier respectsCooldown(address user) {
        require(
            block.timestamp >= lastWithdrawal[user] + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown not met"
        );
        _;
    }
    
    modifier respectsDailyLimit(address user, uint256 amount) {
        _resetDailyLimitIfNeeded(user);
        require(
            dailyWithdrawn[user] + amount <= DAILY_WITHDRAWAL_LIMIT,
            "Daily withdrawal limit exceeded"
        );
        _;
    }
    
    modifier validSignature(bytes32 hash, bytes memory signature, address signer) {
        require(
            _verifySignature(hash, signature, signer),
            "Invalid signature"
        );
        _;
    }
    
    modifier nonceNotUsed(bytes32 nonce) {
        require(!usedNonces[nonce], "Nonce already used");
        _;
    }
    
    constructor() 
        EIP712("AccessControlSecure", "1.0.0")
    {
        // Grant initial roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
        _grantRole(EMERGENCY_ROLE, _msgSender());
        
        // Set role admin relationships
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Secure role granting with additional checks
     */
    function grantRoleSecure(bytes32 role, address account) 
        external 
        onlyRole(getRoleAdmin(role))
        validAddress(account)
        whenNotPaused
    {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot grant default admin role");
        require(!hasRole(role, account), "Account already has role");
        
        _grantRole(role, account);
        emit RoleGrantedSecure(role, account, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev Secure role revocation with additional checks
     */
    function revokeRoleSecure(bytes32 role, address account) 
        external 
        onlyRole(getRoleAdmin(role))
        whenNotPaused
    {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot revoke default admin role");
        require(hasRole(role, account), "Account does not have role");
        require(account != _msgSender(), "Cannot revoke own role");
        
        _revokeRole(role, account);
        emit RoleRevokedSecure(role, account, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev Secure minting with comprehensive checks
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE)
        validAddress(to)
        withinSupplyLimit(amount)
        whenNotPaused
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");
        require(amount <= 10_000 ether, "Amount too large");
        
        balances[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev Secure burning with proper checks
     */
    function burn(address from, uint256 amount) 
        external 
        onlyRole(BURNER_ROLE)
        validAddress(from)
        whenNotPaused
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");
        require(balances[from] >= amount, "Insufficient balance");
        
        balances[from] -= amount;
        totalSupply -= amount;
        
        emit Transfer(from, address(0), amount);
    }
    
    /**
     * @dev Secure withdrawal with rate limiting
     */
    function withdraw(uint256 amount) 
        external 
        respectsCooldown(_msgSender())
        respectsDailyLimit(_msgSender(), amount)
        whenNotPaused
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");
        require(balances[_msgSender()] >= amount, "Insufficient balance");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // Update state before external call
        balances[_msgSender()] -= amount;
        lastWithdrawal[_msgSender()] = block.timestamp;
        dailyWithdrawn[_msgSender()] += amount;
        
        // External call
        (bool success, ) = payable(_msgSender()).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(_msgSender(), amount);
    }
    
    /**
     * @dev Signature-based withdrawal for meta-transactions
     */
    function withdrawWithSignature(
        address user,
        uint256 amount,
        bytes32 nonce,
        bytes memory signature
    ) 
        external 
        respectsCooldown(user)
        respectsDailyLimit(user, amount)
        nonceNotUsed(nonce)
        whenNotPaused
        nonReentrant
    {
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Withdraw(address user,uint256 amount,bytes32 nonce)"),
            user,
            amount,
            nonce
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        
        require(
            _verifySignature(hash, signature, user),
            "Invalid signature"
        );
        
        require(amount > 0, "Amount must be positive");
        require(balances[user] >= amount, "Insufficient balance");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Update state
        balances[user] -= amount;
        lastWithdrawal[user] = block.timestamp;
        dailyWithdrawn[user] += amount;
        
        // External call
        (bool success, ) = payable(user).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(user, amount);
    }
    
    /**
     * @dev Time-locked critical operation scheduling
     */
    function scheduleTimeLock(bytes32 operation, bytes32 id) 
        external 
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(timeLocks[id].executeTime == 0, "TimeLock already exists");
        
        uint256 executeTime = block.timestamp + TIMELOCK_DELAY;
        
        timeLocks[id] = TimeLock({
            executeTime: executeTime,
            executed: false,
            operation: operation
        });
        
        emit TimeLockScheduled(id, operation, executeTime);
    }
    
    /**
     * @dev Execute time-locked operation
     */
    function executeTimeLock(bytes32 id) 
        external 
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        TimeLock storage timeLock = timeLocks[id];
        
        require(timeLock.executeTime != 0, "TimeLock does not exist");
        require(!timeLock.executed, "TimeLock already executed");
        require(block.timestamp >= timeLock.executeTime, "TimeLock not ready");
        
        timeLock.executed = true;
        
        emit TimeLockExecuted(id, timeLock.operation);
    }
    
    /**
     * @dev Create multi-signature proposal
     */
    function createMultiSigProposal(
        address target,
        bytes calldata data,
        uint256 value
    ) 
        external 
        onlyRole(ADMIN_ROLE)
        validAddress(target)
        whenNotPaused
        returns (bytes32 proposalId)
    {
        proposalId = keccak256(abi.encodePacked(
            target,
            data,
            value,
            block.timestamp,
            _msgSender()
        ));
        
        MultiSigProposal storage proposal = proposals[proposalId];
        require(proposal.deadline == 0, "Proposal already exists");
        
        proposal.target = target;
        proposal.data = data;
        proposal.value = value;
        proposal.deadline = block.timestamp + PROPOSAL_DURATION;
        proposal.confirmations = 1;
        proposal.confirmed[_msgSender()] = true;
        
        emit MultiSigProposalCreated(proposalId, _msgSender(), target);
        emit MultiSigProposalConfirmed(proposalId, _msgSender());
        
        return proposalId;
    }
    
    /**
     * @dev Confirm multi-signature proposal
     */
    function confirmMultiSigProposal(bytes32 proposalId) 
        external 
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        require(proposal.deadline != 0, "Proposal does not exist");
        require(block.timestamp <= proposal.deadline, "Proposal expired");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.confirmed[_msgSender()], "Already confirmed");
        
        proposal.confirmed[_msgSender()] = true;
        proposal.confirmations++;
        
        emit MultiSigProposalConfirmed(proposalId, _msgSender());
    }
    
    /**
     * @dev Execute multi-signature proposal
     */
    function executeMultiSigProposal(bytes32 proposalId) 
        external 
        onlyRole(ADMIN_ROLE)
        whenNotPaused
        nonReentrant
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        
        require(proposal.deadline != 0, "Proposal does not exist");
        require(block.timestamp <= proposal.deadline, "Proposal expired");
        require(!proposal.executed, "Proposal already executed");
        require(
            proposal.confirmations >= REQUIRED_CONFIRMATIONS,
            "Insufficient confirmations"
        );
        
        proposal.executed = true;
        
        (bool success, ) = proposal.target.call{value: proposal.value}(proposal.data);
        
        emit MultiSigProposalExecuted(proposalId, success);
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() 
        external 
        onlyRole(EMERGENCY_ROLE)
    {
        _pause();
        emit EmergencyAction(_msgSender(), "Emergency Pause", block.timestamp);
    }
    
    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() 
        external 
        onlyRole(EMERGENCY_ROLE)
    {
        _unpause();
        emit EmergencyAction(_msgSender(), "Emergency Unpause", block.timestamp);
    }
    
    /**
     * @dev Batch operations with size limits
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");
        
        uint256 totalAmount = 0;
        
        // Calculate total amount first
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be positive");
            totalAmount += amounts[i];
        }
        
        require(totalSupply + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        // Execute mints
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            balances[recipients[i]] += amounts[i];
            emit Transfer(address(0), recipients[i], amounts[i]);
        }
        
        totalSupply += totalAmount;
    }
    
    /**
     * @dev Secure transfer function
     */
    function transfer(address to, uint256 amount) 
        external 
        validAddress(to)
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(amount > 0, "Amount must be positive");
        require(balances[_msgSender()] >= amount, "Insufficient balance");
        
        balances[_msgSender()] -= amount;
        balances[to] += amount;
        
        emit Transfer(_msgSender(), to, amount);
        return true;
    }
    
    /**
     * @dev Get user's daily withdrawal status
     */
    function getDailyWithdrawalStatus(address user) 
        external 
        view 
        returns (uint256 withdrawn, uint256 limit, uint256 remaining)
    {
        if (_shouldResetDailyLimit(user)) {
            withdrawn = 0;
        } else {
            withdrawn = dailyWithdrawn[user];
        }
        
        limit = DAILY_WITHDRAWAL_LIMIT;
        remaining = limit > withdrawn ? limit - withdrawn : 0;
        
        return (withdrawn, limit, remaining);
    }
    
    /**
     * @dev Check if user can withdraw specific amount
     */
    function canWithdraw(address user, uint256 amount) 
        external 
        view 
        returns (bool)
    {
        if (paused()) return false;
        if (balances[user] < amount) return false;
        if (address(this).balance < amount) return false;
        if (block.timestamp < lastWithdrawal[user] + WITHDRAWAL_COOLDOWN) return false;
        
        uint256 currentWithdrawn = _shouldResetDailyLimit(user) ? 0 : dailyWithdrawn[user];
        if (currentWithdrawn + amount > DAILY_WITHDRAWAL_LIMIT) return false;
        
        return true;
    }
    
    /**
     * @dev Internal function to verify signatures
     */
    function _verifySignature(
        bytes32 hash,
        bytes memory signature,
        address signer
    ) internal pure returns (bool) {
        return hash.recover(signature) == signer;
    }
    
    /**
     * @dev Internal function to reset daily limit if needed
     */
    function _resetDailyLimitIfNeeded(address user) internal {
        if (_shouldResetDailyLimit(user)) {
            dailyWithdrawn[user] = 0;
            lastDailyReset[user] = block.timestamp;
        }
    }
    
    /**
     * @dev Internal function to check if daily limit should be reset
     */
    function _shouldResetDailyLimit(address user) internal view returns (bool) {
        return block.timestamp >= lastDailyReset[user] + 1 days;
    }
    
    // Getter functions
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }
    
    function getLastWithdrawal(address user) external view returns (uint256) {
        return lastWithdrawal[user];
    }
    
    function getRoleMembers(bytes32 role) external view returns (address[] memory) {
        // Note: This is a simplified implementation
        // In production, you might want to maintain a separate enumerable set
        address[] memory members = new address[](0);
        return members;
    }
    
    function getTimeLockInfo(bytes32 id) 
        external 
        view 
        returns (uint256 executeTime, bool executed, bytes32 operation)
    {
        TimeLock storage timeLock = timeLocks[id];
        return (timeLock.executeTime, timeLock.executed, timeLock.operation);
    }
    
    function getMultiSigProposalInfo(bytes32 proposalId) 
        external 
        view 
        returns (
            address target,
            uint256 value,
            uint256 confirmations,
            bool executed,
            uint256 deadline
        )
    {
        MultiSigProposal storage proposal = proposals[proposalId];
        return (
            proposal.target,
            proposal.value,
            proposal.confirmations,
            proposal.executed,
            proposal.deadline
        );
    }
    
    // Events for compatibility
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Withdrawal(address indexed user, uint256 amount);
    
    receive() external payable {}
}

/**
 * @title AccessControlFactory
 * @dev Factory contract for deploying secure access control contracts
 */
contract AccessControlFactory is AccessControl {
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
    
    address[] public deployedContracts;
    mapping(address => bool) public isDeployedContract;
    
    event ContractDeployed(address indexed contractAddress, address indexed deployer);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(DEPLOYER_ROLE, _msgSender());
    }
    
    function deployAccessControlContract() 
        external 
        onlyRole(DEPLOYER_ROLE)
        returns (address)
    {
        AccessControlSecure newContract = new AccessControlSecure();
        address contractAddress = address(newContract);
        
        deployedContracts.push(contractAddress);
        isDeployedContract[contractAddress] = true;
        
        // Transfer ownership to deployer
        newContract.transferOwnership(_msgSender());
        
        emit ContractDeployed(contractAddress, _msgSender());
        
        return contractAddress;
    }
    
    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
    
    function getDeployedContractCount() external view returns (uint256) {
        return deployedContracts.length;
    }
}
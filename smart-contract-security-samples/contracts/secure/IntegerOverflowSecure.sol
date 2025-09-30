// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IntegerOverflowSecure
 * @notice Safe token-like contract for tutorial: owner-only minting, checked arithmetic, gas-conscious batch ops.
 * @dev Designed to compile in Remix (no external imports). Solidity 0.8+ uses checked arithmetic by default.
 *
 * Gas & security choices:
 *  - owner is immutable (cheaper reads).
 *  - calldata for batch arrays; cached length; unchecked loop increment for gas.
 *  - per-item validation; events emitted for visibility.
 */
contract IntegerOverflowSecure {
    mapping(address => uint256) private _balances;
    uint256 public totalSupply;
    address public immutable owner;

    event Mint(address indexed to, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event BatchMint(address indexed caller, uint256 totalMinted);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Mint tokens to `to` (owner only).
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "only owner");
        require(to != address(0), "zero address");
        _balances[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount);
    }

    /**
     * @notice Transfer tokens from `from` to `to`.
     * @dev Simple tutorial API. Production ERC20s use allowance patterns and msg.sender checks.
     */
    function transfer(address from, address to, uint256 amount) external {
        require(to != address(0), "zero address");
        uint256 fromBal = _balances[from];
        require(fromBal >= amount, "insufficient balance");
        _balances[from] = fromBal - amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    /**
     * @notice Batch mint (owner only).
     * @dev Uses calldata arrays, caches length, emits per-item Mint and a single BatchMint summary.
     */
    function batchAdd(address[] calldata recipients, uint256[] calldata amounts) external {
        require(msg.sender == owner, "only owner");
        uint256 len = recipients.length;
        require(len == amounts.length, "length mismatch");

        uint256 totalMinted = 0;
        for (uint256 i = 0; i < len; ) {
            address to = recipients[i];
            uint256 amt = amounts[i];
            require(to != address(0), "zero address in batch");
            _balances[to] += amt;
            totalSupply += amt;
            totalMinted += amt;
            emit Mint(to, amt);
            unchecked { ++i; }
        }
        emit BatchMint(msg.sender, totalMinted);
    }

    /**
     * @notice Get balance of `who`.
     */
    function balanceOf(address who) external view returns (uint256) {
        return _balances[who];
    }
}

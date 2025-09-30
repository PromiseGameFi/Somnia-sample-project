// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IntegerOverflowVulnerable
 * @notice Educational contract showing poor handling of balances and arithmetic (vulnerable design).
 * @dev This contract is intentionally insecure and compact for tutorial purposes.
 *
 * === WHAT'S WRONG / WHY IT'S VULNERABLE ===
 * - Anybody can mint tokens -> unlimited supply (economic attack).
 * - transfer subtracts without checking sender balance; on pre-0.8 compilers this would underflow silently.
 * - batchAdd has no per-item restrictions or caps and can corrupt totalSupply.
 * - No events/auditing and no ownership control on sensitive functions.
 *
 * NOTE: Solidity 0.8+ reverts on overflow/underflow, so some errors will revert here; the logic is still incorrect.
 */
contract IntegerOverflowVulnerable {
    // naive public mapping for simplicity (exposes storage directly)
    mapping(address => uint256) public balance;
    uint256 public totalSupply;

    /**
     * @notice Mint tokens to `to`.
     * @dev VULNERABLE: No access control — anyone can mint arbitrary amounts to any address.
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "zero address");
        balance[to] += amount;
        totalSupply += amount;
    }

    /**
     * @notice Transfer tokens from `from` to `to`.
     * @dev VULNERABLE: No check that `from` has sufficient balance before subtraction.
     *      In older compilers this would underflow silently. In 0.8+ it will revert, but logic remains insecure.
     */
    function transfer(address from, address to, uint256 amount) external {
        require(to != address(0), "zero address");
        // Missing check: require(balance[from] >= amount)
        balance[from] -= amount; // may revert in 0.8+; would underflow silently pre-0.8
        balance[to] += amount;
    }

    /**
     * @notice Batch add amounts to recipients.
     * @dev VULNERABLE: No authorization; per-item validation minimal.
     */
    function batchAdd(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "zero addr in batch");
            balance[recipients[i]] += amounts[i];
            totalSupply += amounts[i];
        }
    }

    /**
     * @notice Query balance (redundant with public mapping).
     */
    function balanceOf(address who) external view returns (uint256) {
        return balance[who];
    }
}

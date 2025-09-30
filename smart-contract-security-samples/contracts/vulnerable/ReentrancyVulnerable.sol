// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ReentrancyVulnerable
 * @notice Classic vulnerable withdraw pattern for tutorial exploitation in Remix.
 * @dev Demonstrates why updating state after external calls is dangerous.
 *
 * === WHAT'S WRONG / WHY IT'S VULNERABLE ===
 * - State (deposits) is updated *after* sending ETH via an external call.
 * - No reentrancy guard or checks-effects-interactions.
 * - Using call() before updating balances allows an attacker to re-enter withdraw() and drain funds.
 *
 * WARNING: Use only in local/Remix test environments. Do NOT deploy vulnerable contracts with real funds on mainnet.
 */
contract ReentrancyVulnerable {
    mapping(address => uint256) public deposits;

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);

    /**
     * @notice Deposit ETH into contract.
     */
    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH (VULNERABLE).
     * @dev Vulnerability: sends ETH to msg.sender before updating deposits mapping.
     */
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "insufficient balance");

        // INTERACTION before EFFECTS -> vulnerable to reentrancy
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "transfer failed");

        // EFFECTS: update balance after external call -> attacker can re-enter here
        deposits[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Returns contract ETH balance.
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

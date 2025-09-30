// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ReentrancySecure
 * @notice Secure deposit/withdraw contract using checks-effects-interactions and a reentrancy guard.
 * @dev Gas & security choices:
 *  - canonical reentrancy guard (_NOT_ENTERED / _ENTERED)
 *  - state updated before external calls
 *  - events for deposits/withdrawals
 *
 * Designed to be compact and Remix-friendly for tutorial purposes.
 */
contract ReentrancySecure {
    mapping(address => uint256) private _deposits;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);

    modifier nonReentrant() {
        require(_status == _NOT_ENTERED, "reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Deposit ETH into contract.
     */
    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        _deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH safely.
     * @dev Uses nonReentrant guard and updates state before external interaction.
     */
    function withdraw(uint256 amount) external nonReentrant {
        uint256 bal = _deposits[msg.sender];
        require(bal >= amount, "insufficient balance");

        // EFFECTS
        _deposits[msg.sender] = bal - amount;

        // INTERACTIONS
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice View deposit balance.
     */
    function depositOf(address who) external view returns (uint256) {
        return _deposits[who];
    }

    /**
     * @notice Contract ETH balance.
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

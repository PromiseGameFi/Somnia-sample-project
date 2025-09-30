// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleTarget
 * @dev A simple contract for testing delegate calls
 */
contract SimpleTarget {
    uint256 public value;
    
    function setValue(uint256 _value) external {
        value = _value;
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}
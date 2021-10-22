// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;


contract FavNumber {
    uint256 public favValue;

    function setValue(uint256 _value) public {
        favValue = _value;
    }

    constructor(uint256 _initial_value) public {
        favValue = _initial_value;
    }
}

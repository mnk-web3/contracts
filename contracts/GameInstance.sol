// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;


import "./DMNK.sol";


contract GameInstance {
    DMNK private _parent;
    constructor() {
        _parent = DMNK(msg.sender);
    }
}

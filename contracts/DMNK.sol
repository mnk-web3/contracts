// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./GameInstance.sol" as GI;
import "./Types.sol" as T;

contract DMNK {
    // DMNK owner
    address payable _minter;
    // Events
    event GameCreated(address game, address initiator);

    function new_game() public {
        GI.GameInstance game = new GI.GameInstance();
        emit GameCreated(address(game), tx.origin);
    }

    constructor() {
        _minter = payable(msg.sender);
    }
}

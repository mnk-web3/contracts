// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./GameInstance.sol" as GI;
import "./Types.sol" as T;

contract DMNK {
    // DMNK owner
    address payable _minter;
    mapping(address => bool) _known_games;
    // Events
    event GameCreated(address game, address initiator);

    function verify_game_address(address game) public view returns (bool) {
        return _known_games[game];
    }

    function new_game() public {
        GI.GameInstance game = new GI.GameInstance();
        _known_games[address(game)] = true;
        emit GameCreated(address(game), tx.origin);
    }

    constructor() {
        _minter = payable(msg.sender);
    }
}

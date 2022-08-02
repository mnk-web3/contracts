// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;


import "./Game.sol" as G;
import "./Structs.sol" as S;


contract Gateway {
    address payable _minter;

    mapping(address => bool) _known_games;

    event GameCreated(address game, address initiator);

    function verify_game_address(address game) public view returns (bool) {
        return _known_games[game];
    }

    function new_game(S.Settings calldata settings, S.Cell[] calldata gouged) public {
        G.GameInstance game = new G.GameInstance(settings, gouged);
        _known_games[address(game)] = true;
        emit GameCreated(address(game), tx.origin);
    }

    constructor() {
        _minter = payable(msg.sender);
    }
}

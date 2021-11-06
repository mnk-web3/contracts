// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;


import "./GameInstance.sol" as GI;


enum GameStatus {
    Pending,
    Running,
    Complete
}

struct AddressPair {
    address payable main;
    address operational;
}

struct LookupResult {
    address game;
    bool success;
}

struct Participant {
    AddressPair addresses;
    uint256 deposit;
    uint256 range_from;
    uint256 range_to;
}

enum Role {
    Unknown, Alice, Bob
}

struct Move {
    uint8 x;
    uint8 y;
}

struct State {
    Role currentTurn;
    GameStatus status;
}

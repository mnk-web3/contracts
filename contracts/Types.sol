// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./GameInstance.sol" as GI;

enum GameStatus {
    Pending,
    Running,
    Complete,
    Aborted
}

struct LookupResult {
    address game;
    bool success;
}

struct Participant {
    address addr;
    uint256 deposit;
}

enum Role {
    Unknown,
    Alice,
    Bob
}

struct Move {
    uint8 x;
    uint8 y;
}

struct State {
    Role currentTurn;
    GameStatus status;
    uint256 lastMoveBlockNum;
}

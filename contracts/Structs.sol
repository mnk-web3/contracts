// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;


struct Cell {
    uint8 x;
    uint8 y;
}


enum GameStatus {
    Created,     // just being created via the constructor
    Waiting,     // initiator has joined the game
    Running,     // opponents has joined the game
    Completed,   // game has ended normally with a win
    Aborted,     // initiator decided to abandon the game
    Exhausted    // the move pool been exhausted, draw state
}


enum CellOwner {
    Available,
    Gouged,
    Alice,
    Bob
}


// https://en.wikipedia.org/wiki/M,n,k-game
struct Settings {
    uint8 m; // board's width
    uint8 n; // board's height
    uint8 k; // winning streak length
}


struct State {
    uint block_game_deployed;
    uint block_recent_move;
    CellOwner currentTurn;
    GameStatus status;
}

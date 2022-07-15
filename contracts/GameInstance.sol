// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;


enum GameStatus {
    Created,
    Waiting,
    Running,
    Completed,
    Aborted
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

struct State {
    Role currentTurn;
    GameStatus status;
}


contract GameInstance {
    // Bid, initialy (while game status == GameStatus.Created) is set to 0
    uint256 private _bid;
    // Players
    mapping(Role => address) private _participants;
    // State of the game itself
    State private _state;

    event PlayerJoined(address game, address player);
    event GameCancelled(address game);

    function join() public payable {
        if (_state.status == GameStatus.Created) {
            require(_participants[Role.Alice] == tx.origin, "Alice must join the game first");
            require(msg.value > 0, "Bid must be > 0");
            _bid = msg.value;
            _state.status = GameStatus.Waiting;
        } else if (_state.status == GameStatus.Waiting) {
            require(_participants[Role.Alice] != tx.origin, "Alice, you should not play with yourself");
            require(msg.value == _bid, "Your deposit is invalid");
            _participants[Role.Bob] = tx.origin;
            _state.status = GameStatus.Running;
        } else {
            revert("Invalid game state to call the 'join' function in");
        }
        emit PlayerJoined(address(this), tx.origin);
    }

    function get_current_player() view public returns (address) {
        return _participants[_state.currentTurn];
    }

    function get_game_status() view public returns (GameStatus) {
        return _state.status;
    }

    function get_players() view public returns (address, address) {
        return (_participants[Role.Alice], _participants[Role.Bob]);
    }

    function cancel_game() public {
        require(
            _state.status == GameStatus.Created || _state.status == GameStatus.Waiting,
            "You can only cancel the game while it is just Created or Waiting"
        );
        require(tx.origin == _participants[Role.Alice], "Only owner can cancel the game");
        // Here Alice's funds already have been put into contract, so invoke refund
        if (_state.status == GameStatus.Waiting) {
            (bool refundStatus, ) = tx.origin.call{value: _bid}("");
            require(refundStatus, "Failed to cancel the game and refund");
        }
        _state.status = GameStatus.Aborted;
        emit GameCancelled(address(this));
    }

    constructor() {
        // The one, who created the game becomes Alice
        _participants[Role.Alice] = tx.origin;
        // At this stage Bob is still unknown
        _participants[Role.Bob] = address(0);
        _state = State({
            currentTurn: Role.Alice,
            status: GameStatus.Created
        });
    }
}

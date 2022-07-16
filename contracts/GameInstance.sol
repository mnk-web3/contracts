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


struct Settings {
    uint8 m;
    uint8 n;
    uint8 k;
}


function is_move_exists(
    mapping(uint8 => mapping(uint8 => Role)) storage moves,
    uint8 x,
    uint8 y
) view returns (bool) {
    return (moves[x][y] == Role.Alice || moves[x][y] == Role.Bob);
}


function check_winner(
    mapping(uint8 => mapping(uint8 => Role)) storage moves,
    uint8 x,
    uint8 y,
    Role turn,
    Settings storage settings
) view returns (bool) {
    // Check verticals
    // 0x0
    // 0x0
    // 0x0
    uint8 verticalCounter = 0;
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x][y + shift] == turn) {
            verticalCounter++;
        } else {
            break;
        }
        if (y + shift == settings.n - 1) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x][y - shift] == turn) {
            verticalCounter++;
        } else {
            break;
        }
        if (y - shift == 0) {
            break;
        }
    }
    verticalCounter--;
    if (verticalCounter >= settings.k) {
        return true;
    }

    // Check horizontals
    // 000
    // xxx
    // 000
    uint8 horizontalCounter = 0;
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x + shift][y] == turn) {
            horizontalCounter++;
        } else {
            break;
        }
        if (x + shift == settings.m - 1) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x - shift][y] == turn) {
            horizontalCounter++;
        } else {
            break;
        }
        if (x - shift == 0) {
            break;
        }
    }
    horizontalCounter--;
    if (horizontalCounter >= settings.k) {
        return true;
    }

    // Check first diagonal
    // x00
    // 0x0
    // 00x
    uint8 firstDiagonalCounter = 0;
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x - shift][y + shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x - shift == 0) || (y + shift == settings.n - 1)) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x + shift][y - shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == settings.m - 1) || (y - shift == 0)) {
            break;
        }
    }
    firstDiagonalCounter--;
    if (firstDiagonalCounter >= settings.k) {
        return true;
    }

    // Check second diagonal
    // 00x
    // 0x0
    // x00
    uint8 secondDiagonalCounter = 0;
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x + shift][y + shift] == turn) {
            secondDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == settings.m - 1) || (y + shift == settings.n - 1)) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= settings.k; shift++) {
        if (moves[x - shift][y - shift] == turn) {
            secondDiagonalCounter++;
        } else {
            break;
        }
        if ((x - shift == 0) || (y - shift == 0)) {
            break;
        }
    }
    secondDiagonalCounter--;
    if (secondDiagonalCounter >= settings.k) {
        return true;
    }

    return false;
}


contract GameInstance {
    // Bid, initialy (while game status == GameStatus.Created) is set to 0
    uint256 private _bid;
    State private _state;
    mapping(uint8 => mapping(uint8 => Role)) private _moves;
    mapping(Role => address) private _participants;

    // Size of the game field and the winning row length
    Settings private _settings;

    event PlayerJoined(address game, address player);
    event GameCancelled(address game);
    event Move(address player, uint8 x, uint8 y);

    function append_move(uint8 x, uint8 y) external {
        require( _state.status == GameStatus.Running, "This game is not running.");
        // If it is running, check that the caller is elidable to call
        require(_participants[_state.currentTurn] == tx.origin, "This is not your turn, bud.");
        // Check that the move is inbounds
        require(
            x < _settings.m && y < _settings.n && x >= 0 && y >= 0,
            "This move is outside the game board."
        );
        // Check that this move hasnt been done yet
        require(
            !is_move_exists(_moves, x, y),
            "This move has been played already."
        );

        _moves[x][y] = _state.currentTurn;
        emit Move(msg.sender, x, y);
    
        // Check if the current player just won the game
        if (check_winner(_moves, x, y, _state.currentTurn, _settings)) {
            _state.status = GameStatus.Completed;
        } else {
            // Switch the player
            if (_state.currentTurn == Role.Alice) {
                _state.currentTurn = Role.Bob;
            } else {
                _state.currentTurn = Role.Alice;
            }
        }
    }

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

    function get_mnk() view public returns (uint8, uint8, uint8) {
        return (_settings.m, _settings.n, _settings.k);
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

    constructor(uint8 m, uint8 n, uint8 k) {
        require(
            k <= m && k <= n && m > 0 && n > 0 && k > 0,
            "K should be <= N && <= M and > 0"
        );
        // The one, who created the game becomes Alice
        _participants[Role.Alice] = tx.origin;
        // At this stage Bob is still unknown
        _participants[Role.Bob] = address(0);
        _state = State({
            currentTurn: Role.Alice,
            status: GameStatus.Created
        });
        _settings = Settings({
            m: m, n: n, k: k
        });
    }
}

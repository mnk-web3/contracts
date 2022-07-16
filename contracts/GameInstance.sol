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
    event MoveAppended(address game, address player, uint8 x, uint8 y, bool is_winner);

    function append_move(uint8 x, uint8 y) public {
        require( _state.status == GameStatus.Running, "ERROR: the game is not running");
        require(_participants[_state.currentTurn] == tx.origin, "ERROR: not your turn");
        require(
            x < _settings.m && y < _settings.n && x >= 0 && y >= 0, "ERROR: illegal move (outside the board)"
        );
        require(!is_move_exists(_moves, x, y), "ERROR: illegal move (already taken)");

        _moves[x][y] = _state.currentTurn;
    
        // Check if the current player just won the game
        if (check_winner(_moves, x, y, _state.currentTurn, _settings)) {
            _state.status = GameStatus.Completed;
            // Unlock funds and write the log
            payable(tx.origin).transfer(2 * _bid);
            emit MoveAppended(address(this), tx.origin, x, y, true);
        } else {
            // Switch the player
            if (_state.currentTurn == Role.Alice) {
                _state.currentTurn = Role.Bob;
            } else {
                _state.currentTurn = Role.Alice;
            }
            emit MoveAppended(address(this), tx.origin, x, y, false);
        }
    }

    function join() public payable {
        if (_state.status == GameStatus.Created) {
            require(_participants[Role.Alice] == tx.origin, "ERROR: game initiator should join first");
            require(msg.value > 0, "ERROR: bid should be > 0");
            _bid = msg.value;
            _state.status = GameStatus.Waiting;
        } else if (_state.status == GameStatus.Waiting) {
            require(_participants[Role.Alice] != tx.origin, "ERROR: trying to join as self opponent");
            require(msg.value == _bid, "ERROR: your deposit doesnt match the game's requirement");
            _participants[Role.Bob] = tx.origin;
            _state.status = GameStatus.Running;
        } else {
            revert("ERROR: you are not allowed to join");
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

    function get_winner() view public returns (address) {
        if (_state.status != GameStatus.Completed) {
            return address(0x0);
        }
        return this.get_current_player();
    }

    function get_settings() view public returns (uint8, uint8, uint8) {
        return (_settings.m, _settings.n, _settings.k);
    }

    function cancel_game() public {
        require(
            _state.status == GameStatus.Created || _state.status == GameStatus.Waiting,
            "ERROR: you are not allowed to cancel the game (invalid state)"
        );
        require(
            tx.origin == _participants[Role.Alice],
            "ERROR: you are not allowed to cancel the game (permission denied)"
        );
        // Here Alice's funds already have been put into contract, so invoke refund
        if (_state.status == GameStatus.Waiting) {
            payable(tx.origin).transfer(_bid);
        }
        _state.status = GameStatus.Aborted;
        emit GameCancelled(address(this));
    }

    constructor(uint8 m, uint8 n, uint8 k) {
        require( k <= m && k <= n && m > 0 && n > 0 && k > 0, "ERROR: invalid settings");
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

// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./Structs.sol" as S;


uint8 constant MAXUINT8 = 255;


function min(uint8 a, uint8 b) pure returns (uint8) {
    return a <= b ? a : b;
}


function check_vertical(
    mapping(uint8 => mapping(uint8 => S.CellOwner)) storage moves,
    uint8 x,
    uint8 y,
    S.CellOwner turn,
    S.Settings storage settings
) view returns (bool) {
    uint8 counter = 1;
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (min(MAXUINT8, settings.n - 1) - shift < y || moves[x][y+shift] != turn) {
            break;
        }
        counter++;
    }
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (y < shift || moves[x][y-shift] != turn) {
            break;
        }
        counter++;
    }
    return counter == settings.k;
}


function check_horizontal(
    mapping(uint8 => mapping(uint8 => S.CellOwner)) storage moves,
    uint8 x,
    uint8 y,
    S.CellOwner turn,
    S.Settings storage settings
) view returns (bool) {
    uint8 counter = 1;
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (min(MAXUINT8, settings.m - 1) - shift < x || moves[x+shift][y] != turn) {
            break;
        }
        counter++;
    }
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (x < shift || moves[x-shift][y] != turn) {
            break;
        }
        counter++;
    }
    return counter == settings.k;
}


function check_diagonal_main(
    mapping(uint8 => mapping(uint8 => S.CellOwner)) storage moves,
    uint8 x,
    uint8 y,
    S.CellOwner turn,
    S.Settings storage settings
) view returns (bool) {
    uint8 counter = 1;
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (
            min(MAXUINT8, settings.m - 1) - shift < x ||
            min(MAXUINT8, settings.n - 1) - shift < y ||
            moves[x+shift][y+shift] != turn
        ) {
            break;
        }
        counter++;
    }
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (x < shift || y < shift || moves[x-shift][y-shift] != turn) {
            break;
        }
        counter++;
    }
    return counter == settings.k;
}


function check_diagonal_secondary(
    mapping(uint8 => mapping(uint8 => S.CellOwner)) storage moves,
    uint8 x,
    uint8 y,
    S.CellOwner turn,
    S.Settings storage settings
) view returns (bool) {
    uint8 counter = 1;
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (
            x < shift                                 ||
            min(MAXUINT8, settings.n - 1) - shift < y ||
            moves[x-shift][y+shift] != turn
        ) {
            break;
        }
        counter++;
    }
    for (uint8 shift = 1; shift < settings.k; shift++) {
        if (
            min(MAXUINT8, settings.m - 1) - shift < x ||
            y < shift                                 ||
            moves[x+shift][y-shift] != turn
        ) {
            break;
        }
        counter++;
    }
    return counter == settings.k;
}


function check_winner(
    mapping(uint8 => mapping(uint8 => S.CellOwner)) storage moves,
    uint8 x,
    uint8 y,
    S.CellOwner turn,
    S.Settings storage settings
) view returns (bool) {
    return (
        check_vertical(moves, x, y, turn, settings)          ||
        check_horizontal(moves, x, y, turn, settings)        ||
        check_diagonal_main(moves, x, y, turn, settings)     ||
        check_diagonal_secondary(moves, x, y, turn, settings)
    );
}


contract GameInstance {
    // Bid, initialy (while game status == GameStatus.Created) is set to 0
    uint256 private _bid;
    S.State private _state;
    mapping(uint8 => mapping(uint8 => S.CellOwner)) private _moves;
    // Denormalized propertry of the _moves field. Need this as there's len(_moves)
    uint16 private _moves_counter;
    mapping(S.CellOwner => address) private _players;

    // Size of the game field and the winning row length
    S.Settings private _settings;

    event PlayerJoined(address game, address player);
    event GameCancelled(address game);
    event MoveAppended(address game, address player, uint8 x, uint8 y, bool is_winner);

    function append_move(uint8 x, uint8 y) public {
        require( _state.status == S.GameStatus.Running, "ERROR: the game is not running");
        require(_players[_state.currentTurn] == tx.origin, "ERROR: not your turn");
        require(
            x < _settings.m && y < _settings.n && x >= 0 && y >= 0, "ERROR: illegal move (outside the board)"
        );
        require(_moves[x][y] == S.CellOwner.Available, "ERROR: illegal move (already taken)");

        _moves[x][y] = _state.currentTurn;
        _state.block_recent_move = block.number;
        _moves_counter += 1;

        // Check if the current player just won the game
        if (check_winner(_moves, x, y, _state.currentTurn, _settings)) {
            // append the "winner" move
            emit MoveAppended(address(this), tx.origin, x, y, true);
            _state.status = S.GameStatus.Completed;
            // Unlock funds and write the log
            payable(tx.origin).transfer(2 * _bid);
        } else {
            // append the a regular move
            emit MoveAppended(address(this), tx.origin, x, y, false);
            // Check if this is a tie
            if (_moves_counter == _settings.m * _settings.n) {
                _state.status = S.GameStatus.Exhausted;
                // Return locked funds to both Alice and Bob
                payable(_players[S.CellOwner.Alice]).transfer(_bid);
                payable(_players[S.CellOwner.Bob]).transfer(_bid);
            } else {
                // Switch the player and continue
                if (_state.currentTurn == S.CellOwner.Alice) {
                    _state.currentTurn = S.CellOwner.Bob;
                } else {
                    _state.currentTurn = S.CellOwner.Alice;
                }
            }
        }
    }

    function join() public payable {
        if (_state.status == S.GameStatus.Created) {
            require(_players[S.CellOwner.Alice] == tx.origin, "ERROR: game initiator should join first");
            require(msg.value > 0, "ERROR: bid should be > 0");
            _bid = msg.value;
            _state.status = S.GameStatus.Waiting;
        } else if (_state.status == S.GameStatus.Waiting) {
            require(_players[S.CellOwner.Alice] != tx.origin, "ERROR: trying to join as self opponent");
            require(msg.value == _bid, "ERROR: your deposit doesnt match the game's requirement");
            _players[S.CellOwner.Bob] = tx.origin;
            _state.status = S.GameStatus.Running;
        } else {
            revert("ERROR: you are not allowed to join");
        }
        emit PlayerJoined(address(this), tx.origin);
    }

    function get_current_player() view public returns (address) {
        return _players[_state.currentTurn];
    }

    function get_game_status() view public returns (S.GameStatus) {
        return _state.status;
    }

    function get_move_count() view public returns (uint16) {
        return _moves_counter;
    }

    function get_players() view public returns (address, address) {
        return (_players[S.CellOwner.Alice], _players[S.CellOwner.Bob]);
    }

    function get_winner() view public returns (address) {
        if (_state.status != S.GameStatus.Completed) {
            return address(0x0);
        }
        return this.get_current_player();
    }

    function get_settings() view public returns (uint8, uint8, uint8) {
        return (_settings.m, _settings.n, _settings.k);
    }

    function cancel_game() public {
        require(
            _state.status == S.GameStatus.Created || _state.status == S.GameStatus.Waiting,
            "ERROR: you are not allowed to cancel the game (invalid state)"
        );
        require(
            tx.origin == _players[S.CellOwner.Alice],
            "ERROR: you are not allowed to cancel the game (permission denied)"
        );
        // Here Alice's funds already have been put into contract, so invoke refund
        if (_state.status == S.GameStatus.Waiting) {
            payable(tx.origin).transfer(_bid);
        }
        _state.status = S.GameStatus.Aborted;
        emit GameCancelled(address(this));
    }

    constructor(S.Settings memory settings, S.Cell[] memory gouged) {
        require(
            settings.k <= settings.m &&
            settings.k <= settings.n &&
            settings.m > 0 &&
            settings.n > 0 &&
            settings.k > 0,
            "ERROR: invalid settings"
        );
        // The one, who created the game becomes Alice
        _players[S.CellOwner.Alice] = tx.origin;
        // At this stage Bob is still unknown
        _players[S.CellOwner.Bob] = address(0);
        _state = S.State({
            currentTurn: S.CellOwner.Alice,
            status: S.GameStatus.Created,
            block_game_deployed: block.number,
            block_recent_move: block.number
        });
        _settings = settings;
        for (uint256 counter=0; counter<gouged.length; counter++) {
            _moves[gouged[counter].x][gouged[counter].y] = S.CellOwner.Gouged;
        }
    }
}

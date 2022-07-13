// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./DMNK.sol";

uint8 constant TOO_MANY_BLOCKS = 200;
uint8 constant SQUARE_SIZE = 25;
uint8 constant THRESHOLD = 5;

function moveExists(
    mapping(uint8 => mapping(uint8 => T.Role)) storage moves,
    uint8 x,
    uint8 y
) view returns (bool) {
    return (moves[x][y] == T.Role.Alice || moves[x][y] == T.Role.Bob);
}

function checkWinner(
    mapping(uint8 => mapping(uint8 => T.Role)) storage moves,
    uint8 x,
    uint8 y,
    T.Role turn
) view returns (bool) {
    // Check verticals
    // 0x0
    // 0x0
    // 0x0
    uint8 verticalCounter = 0;
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
        if (moves[x][y + shift] == turn) {
            verticalCounter++;
        } else {
            break;
        }
        if (y + shift == SQUARE_SIZE - 1) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
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
    if (verticalCounter >= THRESHOLD) {
        return true;
    }

    // Check horizontals
    // 000
    // xxx
    // 000
    uint8 horizontalCounter = 0;
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
        if (moves[x + shift][y] == turn) {
            horizontalCounter++;
        } else {
            break;
        }
        if (x + shift == SQUARE_SIZE - 1) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
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
    if (horizontalCounter >= THRESHOLD) {
        return true;
    }

    // Check first diagonal
    // x00
    // 0x0
    // 00x
    uint8 firstDiagonalCounter = 0;
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
        if (moves[x - shift][y + shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x - shift == 0) || (y + shift == SQUARE_SIZE - 1)) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
        if (moves[x + shift][y - shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == SQUARE_SIZE - 1) || (y - shift == 0)) {
            break;
        }
    }
    firstDiagonalCounter--;
    if (firstDiagonalCounter >= THRESHOLD) {
        return true;
    }

    // Check second diagonal
    // 00x
    // 0x0
    // x00
    uint8 secondDiagonalCounter = 0;
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
        if (moves[x + shift][y + shift] == turn) {
            secondDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == SQUARE_SIZE - 1) || (y + shift == SQUARE_SIZE - 1)) {
            break;
        }
    }
    for (uint8 shift = 0; shift <= THRESHOLD; shift++) {
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
    if (secondDiagonalCounter >= THRESHOLD) {
        return true;
    }

    return false;
}

contract GameInstance {
    // Higher level contract
    DMNK private _parent;

    // Players
    mapping(T.Role => T.Participant) private _participants;
    mapping(uint8 => mapping(uint8 => T.Role)) private _moves;

    // Players move
    event Move(address player, uint8 x, uint8 y);

    T.State private _state;

    modifier fromDMNK() {
        require(
            msg.sender == address(_parent),
            "This method is available to the root DMNK contract only."
        );
        _;
    }

    // Get the main address of the current turn
    function getCurrentTurn() external view returns (address) {
        return _participants[_state.currentTurn].addr;
    }

    function getWinner() external view returns (address) {
        if (_state.status == T.GameStatus.Complete) {
            return _participants[_state.currentTurn].addr;
        } else {
            return address(0);
        }
    }

    // Get the main address of the current turn
    function getCell(uint8 x, uint8 y) external view returns (T.Role) {
        return _moves[x][y];
    }

    // Get the participant by one's role
    function getParticipant(T.Role role)
        external
        view
        returns (T.Participant memory)
    {
        return _participants[role];
    }

    // Get the game's status
    function getStatus() external view returns (T.GameStatus) {
        return _state.status;
    }

    // Get the the total value locked
    function getLockedValue() public view returns (uint256) {
        return
            _participants[T.Role.Alice].deposit +
            _participants[T.Role.Bob].deposit;
    }

    function makeMove(uint8 x, uint8 y) external {
        // First check, that the game is actually running
        require(
            _state.status == T.GameStatus.Running,
            "This game is not running."
        );
        // If it is running, check that the caller is elidable to call
        require(
            _participants[_state.currentTurn].addr == msg.sender,
            "This is not your turn, bud."
        );
        // Check that the move is inbounds
        require(
            x < SQUARE_SIZE && y < SQUARE_SIZE && x >= 0 && y >= 0,
            "This move is outside the game board."
        );
        // Check that this move hasnt been done yet
        require(
            !moveExists(_moves, x, y),
            "This move has been played already."
        );

        // The move seems legit, let me store it
        _moves[x][y] = _state.currentTurn;
        _state.lastMoveBlockNum = block.number;
        emit Move(msg.sender, x, y);

        // Check if the current player just won the game
        if (checkWinner(_moves, x, y, _state.currentTurn)) {
            _state.status = T.GameStatus.Complete;
            _parent.complete({
                winner: payable(_participants[_state.currentTurn].addr),
                gain: getLockedValue()
            });
        } else {
            // Switch the player
            if (_state.currentTurn == T.Role.Alice) {
                _state.currentTurn = T.Role.Bob;
            } else {
                _state.currentTurn = T.Role.Alice;
            }
        }
    }

    function joinAsBob(T.Participant memory participant) external fromDMNK {
        _participants[T.Role.Bob] = participant;
        _state.status = T.GameStatus.Running;
        _state.currentTurn = T.Role.Alice;
    }

    // While game is been create and resting in pending stage, one may want
    // to cancel it for whatever reason.
    function cancel() external {
        require(
            _state.status == T.GameStatus.Pending,
            "You can only cancel a pending game."
        );
        require(
            msg.sender == _participants[T.Role.Alice].addr,
            "You are not the Alice, who are you stranger?"
        );
        T.Participant storage alice = _participants[T.Role.Alice];
        _state.status = T.GameStatus.Aborted;

        // Asking the main DMNK contract to remove the game from
        // the running map and release locked funds
        _parent.cancel(msg.sender, alice.deposit);
    }

    constructor(T.Participant memory alice) {
        // Publisher becomes the Alice by default
        _participants[T.Role.Alice] = alice;
        // Store the dummy player for the Bob role
        _participants[T.Role.Bob] = T.Participant({
            addr: address(0),
            range_from: 0,
            range_to: 0,
            deposit: 0
        });
        _state = T.State({
            currentTurn: T.Role.Alice,
            status: T.GameStatus.Pending,
            lastMoveBlockNum: 0
        });
        _parent = DMNK(msg.sender);
    }
}

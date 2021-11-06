// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;


import "./DMNK.sol";


function moveExists(mapping(uint8 => mapping(uint8 => T.Role)) storage moves, uint8 x, uint8 y) 
    view
    returns (bool)
{
    return (moves[x][y] == T.Role.Alice || moves[x][y] == T.Role.Bob);
}


function checkWinner(mapping(uint8 => mapping(uint8 => T.Role)) storage moves, uint8 x, uint8 y, T.Role turn)
    view
    returns (bool)
{
    uint8 th = 5;

    // Check verticals
    uint8 verticalCounter = 1;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x][y+shift] == turn) {
            verticalCounter++;
        } else {
            break;
        }
        if (y + shift == 255) {
            break;
        }
    }
    verticalCounter--;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x][y-shift] == turn) {
            verticalCounter++;
        } else {
            break;
        }
        if (y - shift == 0) {
            break;
        }
    }
    verticalCounter--;
    if (verticalCounter >= th) {
        return true;
    }

    // Check horizontals
    uint8 horizontalCounter = 1;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x+shift][y] == turn) {
            horizontalCounter++;
        } else {
            break;
        }
        if (x + shift == 255) {
            break;
        }
    }
    horizontalCounter--;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x-shift][y] == turn) {
            horizontalCounter++;
        } else {
            break;
        }
        if (x - shift == 0) {
            break;
        }
    }
    horizontalCounter--;
    if (horizontalCounter >= th) {
        return true;
    }

    // Check first diagonal
    // x00
    // 0x0
    // 00x
    uint8 firstDiagonalCounter = 1;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x-shift][y+shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x - shift == 0) || (y + shift == 255)) {
            break;
        }
    }
    firstDiagonalCounter--;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x+shift][y-shift] == turn) {
            firstDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == 255) || (y - shift == 0)) {
            break;
        }
    }
    firstDiagonalCounter--;
    if (firstDiagonalCounter >= th) {
        return true;
    }

    // Check second diagonal
    // 00x 
    // 0x0
    // x00 
    uint8 secondDiagonalCounter = 1;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x+shift][y+shift] == turn) {
            secondDiagonalCounter++;
        } else {
            break;
        }
        if ((x + shift == 255) || (y + shift == 255)) {
            break;
        }
    }
    secondDiagonalCounter--;
    for (uint8 shift=0; shift<=th; shift++) {
        if (moves[x-shift][y-shift] == turn) {
            secondDiagonalCounter++;
        } else {
            break;
        }
        if ((x - shift == 0) || (y - shift == 0)) {
            break;
        }
    }
    secondDiagonalCounter--;
    if (secondDiagonalCounter >= th) {
        return true;
    }

    return false;
}


contract GameInstance {
    // Higher level contract
    DMNK private _parent;

    // Players
    mapping(T.Role => T.Participant) private _participants;
    mapping(uint8 => mapping (uint8 => T.Role)) private _moves;
    T.State private _state;

    modifier fromDMNK {
        require(msg.sender == address(_parent));
        _;
    }

    // Get the main address of the current turn
    function getCurrentTurn() external view returns (address) {
        return _participants[_state.currentTurn].addresses.main;
    }

    // Get the main address of the current turn
    function getCell(uint8 x, uint8 y) external view returns(T.Role) {
        return _moves[x][y];
    }

    // Get the participant by one's role
    function getParticipant(T.Role role) external view returns(T.Participant memory) {
        return _participants[role];
    }

    function makeMove(uint8 x, uint8 y) external {
        // First check, that the game is actually running
        require(
            _state.status == T.GameStatus.Running,
            "This game has not been started yet."
        );
        // If it is running, check that the caller is elidable to call
        require(
            _participants[_state.currentTurn].addresses.operational == msg.sender,
            "This is not your turn, bud."
        );
        // Check that this move hasnt been done yet
        require(
            !moveExists(_moves, x, y), "This move has been done already."
        );

        // Seems legit, let me write down the move
        _moves[x][y] = _state.currentTurn;

        // Check if the current player has just won the game
        if (checkWinner(_moves, x, y, _state.currentTurn)) {
            _state.status = T.GameStatus.Complete;
            _parent.completeGame(
                payable(_participants[_state.currentTurn].addresses.main),
                _participants[T.Role.Alice].deposit + _participants[T.Role.Bob].deposit 
            );
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

    constructor(T.Participant memory alice) {
        // Publisher becomes the Alice by default
        _participants[T.Role.Alice] = alice;
        // Store the dummy player for the Bob role
        _participants[T.Role.Bob] = T.Participant({
            addresses: T.AddressPair({
                main: payable(address(0)),
                operational: address(0)
            }),
            range_from: 0,
            range_to: 0,
            deposit: 0
        });
        _state = T.State({currentTurn: T.Role.Alice, status: T.GameStatus.Pending});
        _parent = DMNK(msg.sender);
    }
}

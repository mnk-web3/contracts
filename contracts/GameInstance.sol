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
    function whosTurnNow() public view returns (address) {
        return _participants[_state.currentTurn].addresses.main;
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
            _participants[_state.currentTurn].addresses.main == msg.sender,
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
                payable(whosTurnNow()),
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

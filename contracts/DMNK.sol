// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;


import "./GameInstance.sol" as GI;
import "./Types.sol" as T;


function deqGame(GI.GameInstance[] storage queue, GI.GameInstance game) {
    for (uint256 counter=0; counter < queue.length; counter++) {
        if (queue[counter] == game) {
            for (uint index = counter; index < queue.length - 1; index++){
                queue[index] = queue[index+1];
            }
            queue.pop();
        }
    }
}


function enqGame(GI.GameInstance[] storage queue, GI.GameInstance game) {
    queue.push(game);
}


function getFirstPendingGame(GI.GameInstance[] storage queue, T.Participant memory participant)
    view
    returns(T.LookupResult memory)
{
    for (uint256 counter=0; counter < queue.length; counter++) {
        GI.GameInstance game = queue[counter];
        T.Participant memory alice = game.getParticipant(T.Role.Alice);
        bool condition = (
            participant.addresses.main != alice.addresses.main &&
            participant.deposit >= alice.range_from &&
            participant.deposit <= alice.range_to &&
            alice.deposit >= participant.range_from &&
            alice.deposit <= participant.range_to
        );
        if (condition) {
            return T.LookupResult({game: address(game), success: true});
        }
    }
    return T.LookupResult({game: address(0), success: false});
}


contract DMNK {

    // DMNK owner
    address payable _minter;

    // GI.GameInstance public _instance;
    GI.GameInstance[] _pendingQueue;
    mapping(address => bool) _runningGames;

    // Events
    event GameCreated(address gameAddress, address alice);
    event GameStarted(address gameAddress, address alice, address bob, address currentTurn);
    event GameFinished(address gameAddress);

    function getQueueLength() view public returns(uint256) {
        return _pendingQueue.length;
    }

    function completeGame(address payable winner, uint256 gain) external {
        require(_runningGames[msg.sender], "Game does not exist");
        delete _runningGames[msg.sender];
        (bool success,) = winner.call{value: gain}("");
        require(success, "Failed to transfer gain");
        emit GameFinished(msg.sender);
    }

    function play(address operational, uint256 range_from, uint256 range_to)
        public
        payable
    {
        require(msg.value <= range_to && msg.value >= range_from);

        T.Participant memory participant = T.Participant(
            {
                addresses: T.AddressPair(payable(msg.sender), operational),
                deposit: msg.value,
                range_from: range_from,
                range_to: range_to
            }
        );
        T.LookupResult memory result = getFirstPendingGame(_pendingQueue, participant);
    
        if (result.success) {
            GI.GameInstance game = GI.GameInstance(result.game);
            game.joinAsBob(participant);
            // Remove the game from waiting queue
            deqGame(_pendingQueue, game);
            _runningGames[address(game)] = true;
            emit GameStarted({
                gameAddress: address(game),
                alice: game.getParticipant(T.Role.Alice).addresses.main,
                bob: game.getParticipant(T.Role.Bob).addresses.main,
                currentTurn: game.getCurrentTurn()
            });
        } else {
            GI.GameInstance game = new GI.GameInstance(participant);
            // Add the game to waiting queue
            enqGame(_pendingQueue, game);
            emit GameCreated(address(game), participant.addresses.main);
        }
    }

    constructor() {
        _minter = payable(msg.sender);
    }
}

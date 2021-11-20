// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;

import "./GameInstance.sol" as GI;
import "./Types.sol" as T;

// Removes the game from the pending queue and seals the resulting hole
function deqGame(GI.GameInstance[] storage queue, GI.GameInstance game) {
    for (uint256 counter = 0; counter < queue.length; counter++) {
        if (queue[counter] == game) {
            for (uint256 index = counter; index < queue.length - 1; index++) {
                queue[index] = queue[index + 1];
            }
            queue.pop();
        }
    }
}

function enqGame(GI.GameInstance[] storage queue, GI.GameInstance game) {
    queue.push(game);
}

function getFirstPendingGame (GI.GameInstance[] storage queue, T.Participant memory participant)
view
returns (T.LookupResult memory)
{
    for (uint256 counter = 0; counter < queue.length; counter++) {
        GI.GameInstance game = queue[counter];
        T.Participant memory alice = game.getParticipant(T.Role.Alice);
        bool condition = (
            participant.addr != alice.addr &&
            participant.deposit >= alice.range_from &&
            participant.deposit <= alice.range_to &&
            alice.deposit >= participant.range_from &&
            alice.deposit <= participant.range_to);
        if (condition) {
            return T.LookupResult({game: address(game), success: true});
        }
    }
    return T.LookupResult({game: address(0), success: false});
}

contract DMNK {
    // DMNK owner
    address payable _minter;

    // stats counters
    uint256 public cancelledCounter;
    uint256 public completedCounter;
    uint256 public runningCounter;
    uint256 public pendingCounter;
    

    // GI.GameInstance public _instance;
    GI.GameInstance[] _pendingQueue;
    mapping(address => bool) _runningGames;

    // Events
    event GameCreated(address gameAddress, address alice);
    event GameStarted(
        address gameAddress,
        address alice,
        address bob,
        address currentTurn
    );
    event GameFinished(address gameAddress, address winnerAddress);
    event GameCanceled(address gameAddress);

    function getQueueLength() public view returns (uint256) {
        return _pendingQueue.length;
    }

    // NOTE: This method can be invoked by the corresponding GameInstance only.
    // initiator: is the alice of the game
    function cancel(address initiator, uint256 deposit) external {
        // msg.sender here is a GameInstance instance
        require(!_runningGames[msg.sender], "Game is running already.");
        (bool successfullInitiatorRefund, ) = payable(initiator).call{value: deposit}("");
        require(successfullInitiatorRefund, "Failed to transfer funds.");
        cancelledCounter += 1;
        pendingCounter -= 1;
        emit GameCanceled(msg.sender);
    }

    // NOTE: This method can be invoked by the corresponding GameInstance only.
    function complete(address winner, uint256 gain) external {
        // msg.sender here is a GameInstance instance
        require(_runningGames[msg.sender], "Game does not exist");
        uint256 goesToHouse = gain / 10;
        uint256 goesToWinner = gain - goesToHouse;
        (bool successWinnerTransfer, ) = payable(winner).call{value: goesToWinner}("");
        (bool successHouseTransfer, ) = _minter.call{value: goesToHouse}("");
        require(
            successWinnerTransfer && successHouseTransfer,
            "Failed to transfer funds."
        );
        delete _runningGames[msg.sender];
        completedCounter += 1;
        runningCounter -= 1;
        emit GameFinished(msg.sender, winner);
    }

    function play(uint256 range_from, uint256 range_to) public payable {
        require(msg.value <= range_to && msg.value >= range_from);

        T.Participant memory participant = T.Participant({
            addr: payable(msg.sender),
            deposit: msg.value,
            range_from: range_from,
            range_to: range_to
        });
        T.LookupResult memory result = getFirstPendingGame(
            _pendingQueue,
            participant
        );

        if (result.success) {
            GI.GameInstance game = GI.GameInstance(result.game);
            game.joinAsBob(participant);
            // Remove the game from waiting queue
            deqGame(_pendingQueue, game);
            _runningGames[address(game)] = true;
            pendingCounter -= 1;
            runningCouner += 1;
            emit GameStarted({
                gameAddress: address(game),
                alice: game.getParticipant(T.Role.Alice).addr,
                bob: game.getParticipant(T.Role.Bob).addr,
                currentTurn: game.getCurrentTurn()
            });
        } else {
            GI.GameInstance game = new GI.GameInstance(participant);
            // Add the game to waiting queue
            enqGame(_pendingQueue, game);
            pendingCounter += 1;
            emit GameCreated(address(game), participant.addr);
        }
    }

    constructor() {
        _minter = payable(msg.sender);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;

enum GameStatus {
    Alice,
    Bob,
    Running,
    Pending
}

struct AddressPair {
    address payable main;
    address operational;
}

struct Move {
    int8 x;
    int8 y;
}

struct GameState {
    Move[] movesAlice;
    Move[] movesBob;
}

struct Participant {
    AddressPair addresses;
    uint256 deposit;
    uint256 range_from;
    uint256 range_to;
}

struct GameInstance {
    Participant alice;
    Participant bob;
    GameStatus status;
}


struct LookupResult {
    uint256 index;
    bool success;
}


struct GamesStats {
    uint256 pending;
    uint256 running;
}


contract DMNK {
    GameInstance[] games;
    address payable minter;

    event GameCreated(uint256 gameId, address alice, address bob);
    event GameStarted(uint256 gameId, address alice, address bob);

    function getGamesStats() view public returns(GamesStats memory) {
        uint256 pendingCounter = 0;
        uint256 runningCounter = 0;
        for (uint256 counter=0; counter < games.length; counter++) {
            if (games[counter].status == GameStatus.Pending) {
                pendingCounter++;
            } else if (games[counter].status == GameStatus.Running) {
                runningCounter++;
            }
        }
        return GamesStats({pending: pendingCounter, running: runningCounter});
    }

    function getFirstPendingGame(uint256 myDeposit, address myAddress, uint256 range_from, uint256 range_to)
        private view
        returns (LookupResult memory) {
        for (uint256 index=0; index < games.length; index++) {
            bool condition = (
                games[index].status == GameStatus.Pending &&
                games[index].alice.addresses.main != myAddress &&
                games[index].alice.deposit >= range_from &&
                games[index].alice.deposit <= range_to &&
                myDeposit >= games[index].alice.range_from && 
                myDeposit <= games[index].alice.range_to
            );
            if (condition) {
                return LookupResult({index: index, success: true});
            }
        }
        return LookupResult({index: 0, success: false});
    }

    function joinGame(address operational, uint256 range_from, uint256 range_to)
        payable public {
        require(
            range_from <= msg.value && msg.value <= range_to,
            "You have to provide at least as much as you ask."
        );
        LookupResult memory maybeGame = getFirstPendingGame(
            {
                range_from: range_from,
                range_to: range_to,
                myAddress: msg.sender,
                myDeposit: msg.value
            }
        );
        if (!maybeGame.success) {
            games.push(
                GameInstance({
                    alice: Participant(
                        {
                            addresses: AddressPair(payable(msg.sender), operational),
                            deposit: msg.value,
                            range_from: range_from,
                            range_to: range_to
                        }
                    ),
                    bob: Participant(
                        {
                            addresses: AddressPair(payable(address(0)), address(0)), 
                            deposit: 0,
                            range_from: 0,
                            range_to: 0
                        }
                    ),
                    status: GameStatus.Pending
                })
            );
            emit GameCreated({gameId: games.length - 1, alice: msg.sender, bob: address(0)});
        }
        else {
            GameInstance storage game = games[maybeGame.index];
            game.bob = Participant(
                {
                    addresses: AddressPair(payable(msg.sender), operational),
                    deposit: msg.value,
                    range_from: range_from,
                    range_to: range_to
                }
            );
            game.status = GameStatus.Running;
            emit GameStarted({gameId: maybeGame.index, alice: game.alice.addresses.main, bob: msg.sender});
        }
    }

    constructor() {
        minter = payable(msg.sender);
    }
}

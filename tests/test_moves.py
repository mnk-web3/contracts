import math
import pytest
import enum
from .conftest import wait_for_transaction, BOBS_PUB


CASES = [
    (
        (
            (0,0),   # Alice
            (10,10),
            (1,0),
            (11,10),
            (2,0),
            (12,10),
            (3,0),
            (13,10),
            (4,0),
        ),
        0
    ),
]

def do_the_move(w3, game, wallet, x, y, nonce):
    wait_for_transaction(
        w3,
        w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                game.functions.makeMove(x, y).buildTransaction(
                    {
                        "from": wallet.address,
                        "chainId": 1666700000,
                        "gas": 2 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": nonce,
                    },
                ),
                wallet.privateKey
            ).rawTransaction
        )
    )

@pytest.mark.parametrize("moves,whoWins", CASES)
def test_moves(moves, whoWins, w3, dmnkContract, gameContract, twoPlayers):
    _, ((_, aliceOp), (_, bobOp)) = twoPlayers
    nonceAlice = w3.eth.getTransactionCount(aliceOp.address)
    nonceBob = w3.eth.getTransactionCount(bobOp.address)
    valueLocked = gameContract.functions.getLockedValue().call()
    bobsBalance = w3.eth.get_balance(BOBS_PUB)

    addressFirstTurn = gameContract.functions.getCurrentTurn().call()

    # assert the game is running now
    assert gameContract.functions.getStatus().call() == 1

    # Main game sequence
    for (index, (x, y)) in enumerate(moves):
        if index % 2 == 0:
            do_the_move(w3, gameContract, aliceOp, x, y, nonceAlice)
            nonceAlice += 1
        else:
            do_the_move(w3, gameContract, bobOp, x, y, nonceBob)
            nonceBob += 1

    # Search for the GameFinished event
    gameCompletedEvent = dmnkContract.events.GameFinished.createFilter(fromBlock="latest")
    eventFound = False
    while not eventFound:
        for event in gameCompletedEvent.get_all_entries():
            if event.args.gameAddress == gameContract.address:
                eventFound = True

    # assert the game is complete now
    assert gameContract.functions.getStatus().call() == 2

    amountGoesToHouse = math.floor(valueLocked/10)
    amountGoesToWinner = valueLocked - amountGoesToHouse
    assert w3.eth.get_balance(BOBS_PUB) == bobsBalance + amountGoesToHouse
    assert True
    
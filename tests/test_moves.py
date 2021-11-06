import pytest
from .conftest import waitForTransaction


CASES = [
    (
        (0,0),
        (10,10),
        (1,0),
        (11,10),
        (2,0),
        (12,10),
        (3,0),
        (13,10),
        (4,0),
        (14,10),
        (5,0),
    ),
]

def doTheMove(w3, game, wallet, x, y, nonce):
    waitForTransaction(
        w3,
        w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                game.functions.makeMove(x, y).buildTransaction(
                    {
                        "from": wallet.address,
                        "chainId": 1666700000,
                        "gas": 7 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": nonce,
                    },
                ),
                wallet.privateKey
            ).rawTransaction
        )
    )

@pytest.mark.parametrize("moves", CASES)
def test_moves(moves, w3, dmnkContract, gameContract, twoPlayers):
    address, ((_, aliceOp), (_, bobOp)) = twoPlayers
    print(address)
    print("Alice", aliceOp.address)
    print("Bob", bobOp.address)

    for (index, (x, y)) in enumerate(moves):
        if index % 2 == 0:
            doTheMove(w3, gameContract, aliceOp, x, y, index)
        else:
            doTheMove(w3, gameContract, bobOp, x, y, index)
    assert True
    
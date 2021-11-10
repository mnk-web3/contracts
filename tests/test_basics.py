import time
from .conftest import wait_for_transaction


def test_matchmaking_parity_match(w3, dmnkContract, prepayedWallets):
    for wallet in prepayedWallets:
        wait_for_transaction(
            w3,
            w3.eth.send_raw_transaction(
                w3.eth.account.sign_transaction(
                    dmnkContract.functions.play(10**15, 10**16).buildTransaction(
                        {
                            "from": wallet.address,
                            "chainId": 1666700000,
                            "gas": 2 * 10 ** 6,
                            "gasPrice": 10 ** 9,
                            "nonce": 0,
                            "value": 2*10**15,
                        },
                    ),
                    wallet.privateKey
                ).rawTransaction
            )
        )
    assert dmnkContract.functions.getQueueLength().call() == 0

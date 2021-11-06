import time
from .conftest import waitForTransaction


def test_matchmaking_parity_match(w3, dmnkContract, prepayedWallets):
    for (main, operational) in prepayedWallets:
        txHash = w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                dmnkContract.functions.play(operational.address, 10**15, 10**16).buildTransaction(
                    {
                        "from": main.address,
                        "chainId": 1666700000,
                        "gas": 2 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": 0,
                        "value": 2*10**15,
                    },
                ),
                main.privateKey).rawTransaction
            )
        waitForTransaction(w3, txHash)
    assert dmnkContract.functions.getQueueLength().call() == 0


def test_matchmaking_logs(w3, dmnkContract, prepayedWallets):
    (aliceMain, aliceOp), (bobMain, bobOp), *_ = prepayedWallets
    # Alice joins the game
    aliceTxHash = w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            dmnkContract.functions.play(aliceOp.address, 10**15, 10**16).buildTransaction(
                {
                    "from": aliceMain.address,
                    "chainId": 1666700000,
                    "gas": 2 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                    "value": 2*10**15,
                },
            ),
            aliceMain.privateKey
        ).rawTransaction
    )
    create_event_filter = dmnkContract.events.GameCreated.createFilter(fromBlock="latest")
    waitForTransaction(w3, aliceTxHash)

    # Now polling for the GameCreated event
    create_event_found = False
    gameAddress = "0x0"
    while not create_event_found:
        for event in create_event_filter.get_all_entries():
            if event.args.alice == aliceMain.address:
                gameAddress = event.args.gameAddress
                create_event_found = True
        time.sleep(0.2)
    assert gameAddress != "0x0"

    # Bob joins the game
    bobTxHash = w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            dmnkContract.functions.play(bobOp.address, 10**15, 10**16).buildTransaction(
                {
                    "from": bobMain.address,
                    "chainId": 1666700000,
                    "gas": 7 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                    "value": 2*10**15,
                },
            ),
            bobMain.privateKey
        ).rawTransaction
    )
    started_event_filter = dmnkContract.events.GameStarted.createFilter(fromBlock="latest")
    waitForTransaction(w3, bobTxHash)

    # Now polling for the GameStarted event
    started_event_found = False
    while not started_event_found:
        for event in started_event_filter.get_all_entries():
            if event.args.alice == aliceMain.address:
                assert event.args.bob == bobMain.address
                assert event.args.gameAddress == gameAddress
                started_event_found = True
        time.sleep(0.2)

    assert dmnkContract.functions.getQueueLength().call() == 0

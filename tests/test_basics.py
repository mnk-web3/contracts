import json
import pytest
import subprocess
from collections import namedtuple
from web3 import Web3
from web3.exceptions import TransactionNotFound
import time


def waitForTransaction(w3, txHash: str, pollTime:float=0.2, retries:int=100) -> None:
    currentlyRetried = 0
    while True:
        try:
            if w3.eth.getTransactionReceipt(txHash).status == 1:
                break
        except TransactionNotFound:
            currentlyRetried += 1
        finally:
            if currentlyRetried > retries:
                raise TransactionNotFound()
        time.sleep(pollTime)


ABIAddress = namedtuple("ABIAddress", "abi address")

# Bobs acc
BOBS_PRIV = "c8c85b769e94fed2e800e05f20dba23e12a77bc9223b85cb04db8b8e4045634b"
BOBS_PUB = "0x53E450514589267b6B83E279Cd67c2C22987ba8B"
NUMBER_OF_PREPAYED_WALLETS = 2


@pytest.fixture(scope="function")
def contractArtifacts():
    subprocess.run(
        ["truffle", "migrate", "--network", "testnet", "--reset", "--skip-dry-run"],
        check=True,
        capture_output=True
    )


@pytest.fixture(scope="function")
def address_abi(contractArtifacts):
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/DMNK.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return ABIAddress(abi, address)


@pytest.fixture(scope="session")
def w3():
    return Web3(Web3.WebsocketProvider("wss://ws.s0.pops.one/"))


@pytest.fixture(scope="function")
def contract(w3, address_abi):
    return w3.eth.contract(address=address_abi.address, abi=address_abi.abi)


@pytest.fixture(scope="function")
def prepayedWallets(w3):
    nonce = w3.eth.get_transaction_count(BOBS_PUB)
    wallets = [(w3.eth.account.create(), w3.eth.account.create()) for _ in range(NUMBER_OF_PREPAYED_WALLETS)]

    # prefil wallets
    for index, (main, _) in enumerate(wallets):
        tx = {
            "chainId": 1666700000,
            "gas": 7 * 10 ** 6,
            "gasPrice": 10 ** 9,
            "nonce": nonce+index,
            "from": BOBS_PUB,
            "to": main.address,
            "value": 5 * 10 ** 17,
        }
        tx_signed = w3.eth.account.sign_transaction(tx, BOBS_PRIV)
        waitForTransaction(w3, w3.eth.send_raw_transaction(tx_signed.rawTransaction))
        print("Wallet %s is prefilled" % main.address)

    return wallets


def test_matchmaking_parity_match(w3, contract, prepayedWallets):
    for (main, operational) in prepayedWallets:
        txHash = w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                contract.functions.play(operational.address, 10**15, 10**16).buildTransaction(
                    {
                        "from": main.address,
                        "chainId": 1666700000,
                        "gas": 2 * 10 ** 7,
                        "gasPrice": 10 ** 9,
                        "nonce": 0,
                        "value": 2*10**15,
                    },
                ),
                main.privateKey).rawTransaction
            )
        waitForTransaction(w3, txHash)
        print(txHash.hex(), "is completed")
    time.sleep(3)
    assert contract.functions.getQueueLength().call() == 0

# def test_matchmaking_parity_match(w3, contract, prepayedWallets):
#     for (main, operational) in prepayedWallets:
#         txHash = w3.eth.send_raw_transaction(
#             w3.eth.account.sign_transaction(
#                 contract.functions.joinGame(operational.address, 10**15, 10**16).buildTransaction(
#                     {
#                         "from": main.address,
#                         "chainId": 1666700000,
#                         "gas": 7 * 10 ** 6,
#                         "gasPrice": 10 ** 9,
#                         "nonce": 0,
#                         "value": 2*10**15,
#                     },
#                 ),
#                 main.privateKey).rawTransaction
#             )
#         waitForTransaction(w3, txHash)
#     (pendingCounter, runningCounter) = contract.functions.getGamesStats().call()

#     assert pendingCounter == 0
#     assert runningCounter == NUMBER_OF_PREPAYED_WALLETS // 2


# def test_matchmaking_parity_price_mismatch_too_low(w3, contract, prepayedWallets):
#     for (main, operational) in prepayedWallets:
#         w3.eth.send_raw_transaction(
#             w3.eth.account.sign_transaction(
#                 contract.functions.joinGame(operational.address, 10**15, 10**16).buildTransaction(
#                     {
#                         "from": main.address,
#                         "chainId": 1666700000,
#                         "gas": 7 * 10 ** 6,
#                         "gasPrice": 10 ** 9,
#                         "nonce": 0,
#                         "value": 10**14,
#                     },
#                 ),
#                 main.privateKey).rawTransaction
#             )
#         time.sleep(3)
#     (pendingCounter, runningCounter) = contract.functions.getGamesStats().call()

#     assert pendingCounter == 0
#     assert runningCounter == 0


# def test_matchmaking_parity_price_mismatch_too_high(w3, contract, prepayedWallets):
#     for (main, operational) in prepayedWallets:
#         w3.eth.send_raw_transaction(
#             w3.eth.account.sign_transaction(
#                 contract.functions.joinGame(operational.address, 10**15, 10**16).buildTransaction(
#                     {
#                         "from": main.address,
#                         "chainId": 1666700000,
#                         "gas": 7 * 10 ** 6,
#                         "gasPrice": 10 ** 9,
#                         "nonce": 0,
#                         "value": 2 * 10**16,
#                     },
#                 ),
#                 main.privateKey).rawTransaction
#             )
#         time.sleep(3)
#     (pendingCounter, runningCounter) = contract.functions.getGamesStats().call()

#     assert pendingCounter == 0
#     assert runningCounter == 0


# def test_matchmaking_logs(w3, contract, prepayedWallets):
#     (aliceMain, aliceOp), (bobMain, bobOp), *_ = prepayedWallets
#     # Alice joins the game
#     aliceTxHash = w3.eth.send_raw_transaction(
#         w3.eth.account.sign_transaction(
#             contract.functions.joinGame(aliceOp.address, 10**15, 10**16).buildTransaction(
#                 {
#                     "from": aliceMain.address,
#                     "chainId": 1666700000,
#                     "gas": 7 * 10 ** 6,
#                     "gasPrice": 10 ** 9,
#                     "nonce": 0,
#                     "value": 2*10**15,
#                 },
#             ),
#             aliceMain.privateKey
#         ).rawTransaction
#     )
#     create_event_filter = contract.events.GameCreated.createFilter(fromBlock="latest")
#     waitForTransaction(w3, aliceTxHash)

#     # Now polling for the GameCreated event
#     create_event_found = False
#     gameIdAsCreated = None
#     while not create_event_found:
#         events = create_event_filter.get_all_entries()
#         for event in events:
#             if event.args.alice == aliceMain.address:
#                 assert event.args.bob == "0x0000000000000000000000000000000000000000"
#                 gameIdAsCreated = event.args.gameId
#                 create_event_found = True
#         time.sleep(0.2)
    
#     # Bob joins the game
#     bobTxHash = w3.eth.send_raw_transaction(
#         w3.eth.account.sign_transaction(
#             contract.functions.joinGame(bobOp.address, 10**15, 10**16).buildTransaction(
#                 {
#                     "from": bobMain.address,
#                     "chainId": 1666700000,
#                     "gas": 7 * 10 ** 6,
#                     "gasPrice": 10 ** 9,
#                     "nonce": 0,
#                     "value": 2*10**15,
#                 },
#             ),
#             bobMain.privateKey
#         ).rawTransaction
#     )
#     started_event_filter = contract.events.GameStarted.createFilter(fromBlock="latest")
#     waitForTransaction(w3, bobTxHash)

#     # Now polling for the GameStarted event
#     started_event_found = False
#     while not started_event_found:
#         events = started_event_filter.get_all_entries()
#         for event in events:
#             if event.args.alice == aliceMain.address:
#                 assert event.args.bob == bobMain.address
#                 assert gameIdAsCreated is not None and event.args.gameId == gameIdAsCreated
#                 started_event_found = True
#         time.sleep(0.2)
    
#     (pendingCounter, runningCounter) = contract.functions.getGamesStats().call()
#     assert pendingCounter == 0
#     assert runningCounter == 1

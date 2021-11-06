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
def dmnkABI(contractArtifacts):
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/DMNK.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return ABIAddress(abi, address)


@pytest.fixture(scope="function")
def gameInstanceABI(contractArtifacts):
    with open("./build/contracts/GameInstance.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return abi


@pytest.fixture(scope="session")
def w3():
    return Web3(Web3.WebsocketProvider("wss://ws.s0.pops.one/"))


@pytest.fixture(scope="function")
def dmnkContract(w3, dmnkABI):
    return w3.eth.contract(address=dmnkABI.address, abi=dmnkABI.abi)


@pytest.fixture(scope="function")
def twoPlayers(w3, dmnkContract, prepayedWallets):
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
    waitForTransaction(w3, aliceTxHash)

    create_event_found = False
    gameAddress = "0x0"
    create_event_filter = dmnkContract.events.GameCreated.createFilter(fromBlock="latest")
    while not create_event_found:
        for event in create_event_filter.get_all_entries():
            if event.args.alice == aliceMain.address:
                gameAddress = event.args.gameAddress
                create_event_found = True
        time.sleep(0.2)

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
    waitForTransaction(w3, bobTxHash)
    return (gameAddress, ((aliceMain, aliceOp), (bobMain, bobOp)))


@pytest.fixture(scope="function")
def prepayedWallets(w3):
    nonce = w3.eth.get_transaction_count(BOBS_PUB)
    wallets = [(w3.eth.account.create(), w3.eth.account.create()) for _ in range(NUMBER_OF_PREPAYED_WALLETS)]

    # prefil wallets
    for index, (main, operational) in enumerate(wallets):
        waitForTransaction(
            w3,
            w3.eth.send_raw_transaction(
                w3.eth.account.sign_transaction(
                    {
                        "chainId": 1666700000,
                        "gas": 7 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": nonce,
                        "from": BOBS_PUB,
                        "to": main.address,
                        "value": 10 ** 17,
                    },
                    BOBS_PRIV
                ).rawTransaction)
        )
        nonce += 1
        waitForTransaction(
            w3,
            w3.eth.send_raw_transaction(
                w3.eth.account.sign_transaction(
                    {
                        "chainId": 1666700000,
                        "gas": 7 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": nonce,
                        "from": BOBS_PUB,
                        "to": operational.address,
                        "value": 10 ** 17,
                    },
                    BOBS_PRIV
                ).rawTransaction)
        )
        nonce += 1
    return wallets


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


def test_moves(w3, dmnkContract, gameInstanceABI, twoPlayers):
    gameAddress, ((aliceMain, aliceOp), (bobMain, bobOp)) = twoPlayers
    gameInstance = w3.eth.contract(address=gameAddress, abi=gameInstanceABI)
    # Alice turn 0
    waitForTransaction(
        w3,
        w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                gameInstance.functions.makeMove(0, 0).buildTransaction(
                    {
                        "from": aliceOp.address,
                        "chainId": 1666700000,
                        "gas": 7 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": 0,
                    },
                ),
                aliceOp.privateKey
            ).rawTransaction
        )
    )
    # Bob turn 0
    waitForTransaction(
        w3,
        w3.eth.send_raw_transaction(
            w3.eth.account.sign_transaction(
                gameInstance.functions.makeMove(20, 20).buildTransaction(
                    {
                        "from": bobOp.address,
                        "chainId": 1666700000,
                        "gas": 7 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": 0,
                    },
                ),
                bobOp.privateKey
            ).rawTransaction
        )
    )
    assert True
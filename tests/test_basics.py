import json
import pytest
import subprocess
from collections import namedtuple
from web3 import Web3
import time


ABIAddress = namedtuple("ABIAddress", "abi address")

# Bobs acc
BOBS_PRIV = "c8c85b769e94fed2e800e05f20dba23e12a77bc9223b85cb04db8b8e4045634b"
BOBS_PUB = "0x53E450514589267b6B83E279Cd67c2C22987ba8B"


@pytest.fixture(scope="session")
def contractArtifacts():
    subprocess.run(
        ["truffle", "migrate", "--network", "testnet", "--reset", "--skip-dry-run"],
        check=True,
        capture_output=True
    )


@pytest.fixture(scope="session")
def address_abi(contractArtifacts):
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/DMNK.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return ABIAddress(abi, address)


@pytest.fixture(scope="session")
def w3():
    return Web3(Web3.WebsocketProvider("wss://ws.s0.pops.one/"))


@pytest.fixture(scope="session")
def contract(w3, address_abi):
    return w3.eth.contract(address=address_abi.address, abi=address_abi.abi)


@pytest.fixture(scope="function")
def prepayedWallets(w3):
    nonce = w3.eth.get_transaction_count(BOBS_PUB)
    wallets = [(w3.eth.account.create(), w3.eth.account.create()) for _ in range(4)]

    # prefil wallets
    for index, (main, operational) in enumerate(wallets):
        tx = {
            "chainId": 1666700000,
            "gas": 7 * 10 ** 6,
            "gasPrice": 10 ** 9,
            "nonce": nonce+index,
            "from": BOBS_PUB,
            "to": main.address,
            "value": 10 ** 16,
        }
        tx_signed = w3.eth.account.sign_transaction(tx, BOBS_PRIV)
        w3.eth.send_raw_transaction(tx_signed.rawTransaction)

    time.sleep(4)

    return wallets


def test_matchmaking_parity(w3, contract, prepayedWallets):
    for index, (main, operational) in enumerate(prepayedWallets):
        raw_tx = w3.eth.account.sign_transaction(
            contract.functions.joinGame(operational.address).buildTransaction(
                {
                    "from": main.address,
                    "chainId": 1666700000,
                    "gas": 7 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                },
            ),
            main.privateKey
        )
        w3.eth.send_raw_transaction(raw_tx.rawTransaction)
        time.sleep(4)
    (index, flag) = contract.functions.getFirstPendingGame(BOBS_PUB).call()
    assert (not flag) & (index == 0)


def test_matchmaking_logs(w3, contract, prepayedWallets):
    (aliceMain, aliceOp), (bobMain, bobOp), *_ = prepayedWallets
    # Alice joins the game
    w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            contract.functions.joinGame(aliceOp.address).buildTransaction(
                {
                    "from": aliceMain.address,
                    "chainId": 1666700000,
                    "gas": 7 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                },
            ),
            aliceMain.privateKey
        ).rawTransaction
    )
    create_event_filter = contract.events.GameCreated.createFilter(fromBlock="latest")
    # Now polling for the GameCreated event
    create_event_found = False
    gameIdAsCreated = None
    while not create_event_found:
        events = create_event_filter.get_all_entries()
        for event in events:
            if event.args.alice == aliceMain.address:
                assert event.args.bob == "0x0000000000000000000000000000000000000000"
                gameIdAsCreated = event.args.gameId
                create_event_found = True
        time.sleep(0.2)
    # Bob joins the game
    w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            contract.functions.joinGame(bobOp.address).buildTransaction(
                {
                    "from": bobMain.address,
                    "chainId": 1666700000,
                    "gas": 7 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                },
            ),
            bobMain.privateKey
        ).rawTransaction
    )
    started_event_filter = contract.events.GameStarted.createFilter(fromBlock="latest")
    started_event_found = False
    while not started_event_found:
        events = started_event_filter.get_all_entries()
        for event in events:
            if event.args.alice == aliceMain.address:
                assert event.args.bob == bobMain.address
                assert gameIdAsCreated is not None and event.args.gameId == gameIdAsCreated
                started_event_found = True
        time.sleep(0.2)

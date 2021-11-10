import json
import time
import subprocess
from collections import namedtuple

import pytest
from web3 import Web3
from web3.exceptions import TransactionNotFound


ABIAddress = namedtuple("ABIAddress", "abi address")

# Bobs acc
BOBS_PRIV = "c07bfdf4819946009c06bfee12f9ef2d37c1a216600961460121f1c085d16316"
BOBS_PUB = Web3.toChecksumAddress("0xda4566317090ba89d8d88f5b5fcdb34d8aab87fd")


NUMBER_OF_PREPAYED_WALLETS = 2


def wait_for_transaction(w3, txHash: str, pollTime: float = 0.2, retries: int = 100) -> None:
    currentlyRetried = 0
    while True:
        try:
            if w3.eth.getTransactionReceipt(txHash.hex()).status == 1:
                break
        except TransactionNotFound:
            currentlyRetried += 1
        finally:
            if currentlyRetried > retries:
                raise TransactionNotFound()
        time.sleep(pollTime)


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
def prepayedWallets(w3):
    nonce = w3.eth.get_transaction_count(BOBS_PUB)
    wallets = [w3.eth.account.create() for _ in range(NUMBER_OF_PREPAYED_WALLETS)]

    # prefil wallets
    for wallet in wallets:
        wait_for_transaction(
            w3,
            w3.eth.send_raw_transaction(
                w3.eth.account.sign_transaction(
                    {
                        "chainId": 1666700000,
                        "gas": 2 * 10 ** 6,
                        "gasPrice": 10 ** 9,
                        "nonce": nonce,
                        "from": BOBS_PUB,
                        "to": wallet.address,
                        "value": 10 ** 17,
                    },
                    BOBS_PRIV
                ).rawTransaction)
        )
        nonce += 1

    return wallets


@pytest.fixture(scope="function")
def twoPlayers(w3, dmnkContract, prepayedWallets):
    alice, bob, *_ = prepayedWallets
    # Alice joins the game
    aliceTxHash = w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            dmnkContract.functions.play(10**15, 10**16).buildTransaction(
                {
                    "from": alice.address,
                    "chainId": 1666700000,
                    "gas": 2 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                    "value": 2 * 10 ** 15,
                },
            ),
            alice.privateKey
        ).rawTransaction
    )
    wait_for_transaction(w3, aliceTxHash)

    create_event_found = False
    gameAddress = "0x0"
    create_event_filter = dmnkContract.events.GameCreated.createFilter(
        fromBlock="latest")
    while not create_event_found:
        for event in create_event_filter.get_all_entries():
            if event.args.alice == alice.address:
                gameAddress = event.args.gameAddress
                create_event_found = True
        time.sleep(0.2)

    # Bob joins the game
    bobTxHash = w3.eth.send_raw_transaction(
        w3.eth.account.sign_transaction(
            dmnkContract.functions.play(10 ** 15, 10 ** 16).buildTransaction(
                {
                    "from": bob.address,
                    "chainId": 1666700000,
                    "gas": 2 * 10 ** 6,
                    "gasPrice": 10 ** 9,
                    "nonce": 0,
                    "value": 2 * 10 ** 15,
                },
            ),
            bob.privateKey
        ).rawTransaction
    )
    wait_for_transaction(w3, bobTxHash)
    return (gameAddress, (alice, bob))


@pytest.fixture(scope="function")
def gameContract(w3, twoPlayers, gameInstanceABI):
    gameAddress, _ = twoPlayers
    return w3.eth.contract(address=gameAddress, abi=gameInstanceABI)

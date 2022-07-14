import json

from dataclasses import dataclass
from typing import Any, Mapping

import pytest

from web3 import Web3
from web3.eth import AsyncEth, Eth


DEPLOYER_PRIVATE = "7ee1a617857facf5948f2c88afdb502cc0c4ff4a90ada4790ebc3f2120fc9695"
DEPLOYER_PUBLIC = Web3.toChecksumAddress("0x51e2f9277D0718a6eC0FBF0f35b4f4Ea5DDFA325")
CHAIN_ID = 1337
GAS_PRICE = 10 ** 11 # 100 GWei
GAS_LIMIT = 10 ** 7


NUMBER_OF_PREPAYED_WALLETS = 2

@dataclass
class ABIAddress:
    abi: Mapping[str, Any]
    address: str


@pytest.fixture
def dmnk_abi_address():
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/DMNK.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return ABIAddress(abi, address)


@pytest.fixture
def game_abi():
    with open("./build/contracts/GameInstance.json") as f:
        return json.dumps(json.load(f)["abi"])



@pytest.fixture
def w3():
    return Web3(
        Web3.AsyncHTTPProvider("http://127.0.0.1:9000"),
        modules={"eth": (AsyncEth,)},
        middlewares=[],
    )


@pytest.fixture(scope="function")
async def started_game(w3, dmnkContract, game_abi, prepayedWallets):
    alice, bob, *_ = prepayedWallets
    # Alice creates the new game
    game_created_logs = dmnkContract.events.GameCreated().processReceipt(
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await dmnkContract.functions.new_game().build_transaction(
                        {
                            "from": alice.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(alice.address),
                            "value": 0,
                        },
                    ),
                    alice.key,
                ).rawTransaction
            )
        )
    )
    game_instance = w3.eth.contract(address=game_created_logs[0]["args"]["game"], abi=game_abi)
    # Alice and Bob join the game, first Alice and then Bob
    for wallet in [alice, bob]:
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await game_instance.functions.join().build_transaction(
                        {
                            "from": wallet.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(wallet.address),
                            "value": 10**18,
                        },
                    ),
                    wallet.key,
                ).rawTransaction
            )
        )
    return alice, bob, game_instance


@pytest.fixture
def dmnkContract(w3, dmnk_abi_address):
    return w3.eth.contract(address=dmnk_abi_address.address, abi=dmnk_abi_address.abi)


@pytest.fixture(scope="function")
async def prepayedWallets(w3):
    nonce = await w3.eth.get_transaction_count(DEPLOYER_PUBLIC)
    wallets = [Eth.account.create() for _ in range(NUMBER_OF_PREPAYED_WALLETS)]
    for index, wallet in enumerate(wallets):
        await w3.eth.send_raw_transaction(
            Eth.account.sign_transaction(
                {
                    "gas": GAS_LIMIT,
                    "gasPrice": GAS_PRICE,
                    "nonce": nonce + index,
                    "to": wallet.address,
                    "from": DEPLOYER_PUBLIC,
                    "value": 10 ** 20,
                    "chainId": CHAIN_ID,
                },
                DEPLOYER_PRIVATE,
            ).rawTransaction
        )
    return wallets

import asyncio
import enum
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
DEFAULT_BID = 10 ** 18


NUMBER_OF_PREPAYED_WALLETS = 3


class GameStatus(enum.IntEnum):
    created = 0
    waiting = 1
    running = 2
    completed = 3
    aborted = 4


async def append_move_and_get_receipt(w3, game_instance, initiator, x, y):
    return (
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await game_instance.functions.append_move(x, y).build_transaction(
                        {
                            "from": initiator.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(initiator.address),
                            "value": 0,
                        },
                    ),
                    initiator.key,
                ).rawTransaction
            )
        )
    )


async def append_move_and_get_logs(w3, main_contract, initiator, x, y):
    return (
        main_contract
            .events
            .MoveAppended()
            .processReceipt(
                await append_move_and_get_receipt(w3, main_contract, initiator, x, y)
            )
    )


async def cancel_game_and_get_receipt(w3, game_instance, initiator):
    return (
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await game_instance.functions.cancel_game().build_transaction(
                        {
                            "from": initiator.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(initiator.address),
                            "value": 0,
                        },
                    ),
                    initiator.key,
                ).rawTransaction
            )
        )
    )


async def create_game_and_get_receipt(w3, main_contract, initiator, m=20, n=20, k=5):
    return (
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await main_contract.functions.new_game(m, n, k).build_transaction(
                        {
                            "from": initiator.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(initiator.address),
                            "value": 0,
                        },
                    ),
                    initiator.key,
                ).rawTransaction
            )
        )
    )


async def create_game_and_get_logs(w3, main_contract, initiator, m=20, n=20, k=5):
    return (
        main_contract
            .events
            .GameCreated()
            .processReceipt(
                await create_game_and_get_receipt(w3, main_contract, initiator, m, n, k)
            )
    )


async def join_and_get_receipt(w3, game_instance, initiator, bid=DEFAULT_BID):
    return (
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await game_instance.functions.join().build_transaction(
                        {
                            "from": initiator.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(initiator.address),
                            "value": bid,
                        },
                    ),
                    initiator.key,
                ).rawTransaction
            )
        )
    )


async def join_and_get_logs(initiator, game_instance, w3, bid=DEFAULT_BID):
    return (
        game_instance
            .events
            .PlayerJoined()
            .processReceipt(
                await join_and_get_receipt(w3, game_instance, initiator, bid)
            )
    )


# Override the pytest-asyncio event_loop fixture to make it session scoped. This is required in order to enable
# async test fixtures with a session scope. More info: https://github.com/pytest-dev/pytest-asyncio/issues/68
@pytest.fixture(scope="session")
def event_loop(request):
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


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
def get_game_created(w3, dmnkContract, game_abi):
    async def inner(initiator, m=20, n=20, k=5):
        # Alice creates the new game
        game_created_logs = await create_game_and_get_logs(w3, dmnkContract, initiator, m, n, k)
        return w3.eth.contract(address=game_created_logs[0]["args"]["game"], abi=game_abi)
    return inner


@pytest.fixture(scope="function")
def get_game_waiting(w3, get_game_created):
    async def inner(initiator, m=20, n=20, k=5, bid=DEFAULT_BID):
        # Alice creates the new game
        game = await get_game_created(initiator=initiator, m=m, n=n, k=k)
        await w3.eth.send_raw_transaction(
            Eth.account.sign_transaction(
                await game
                    .functions
                    .join()
                    .build_transaction(
                        {
                            "from": initiator.address,
                            "chainId": CHAIN_ID,
                            "gas": GAS_LIMIT,
                            "gasPrice": GAS_PRICE,
                            "nonce": await w3.eth.get_transaction_count(initiator.address),
                            "value": bid
                        },
                    ),
                initiator.key,
            ).rawTransaction
        )
        return game
    return inner


@pytest.fixture(scope="function")
async def get_game_running(w3, get_game_waiting):
    async def inner(initiator, follower, m=20, n=20, k=5, bid=DEFAULT_BID):
        game = await get_game_waiting(initiator=initiator, m=m, n=n, k=k, bid=bid)
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await game
                        .functions
                        .join()
                        .build_transaction(
                            {
                                "from": follower.address,
                                "chainId": CHAIN_ID,
                                "gas": GAS_LIMIT,
                                "gasPrice": GAS_PRICE,
                                "nonce": await w3.eth.get_transaction_count(follower.address),
                                "value": bid,
                            },
                        ),
                    follower.key,
                ).rawTransaction
            )
        )
        return game
    return inner


@pytest.fixture
def dmnkContract(w3, dmnk_abi_address):
    return w3.eth.contract(address=dmnk_abi_address.address, abi=dmnk_abi_address.abi)


@pytest.fixture(scope="function")
async def prepayed_wallets(w3):
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

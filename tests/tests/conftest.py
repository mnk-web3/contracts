import asyncio
import enum
import json
import os
from dataclasses import dataclass
from typing import Any, Mapping

import eth_abi
import pytest
from web3 import Web3
from web3.eth import AsyncEth, Eth

DEPLOYER_PRIVATE = os.environ.get("DEPLOYER_PRIV")
DEPLOYER_PUBLIC = Web3.toChecksumAddress(os.environ.get("DEPLOYER_PUB")) # type: ignore
CHAIN_ID = int(os.environ.get("CHAIN_ID"))                               # type: ignore
GAS_PRICE = int(os.environ.get("GASPRICE"))                              # type: ignore
GAS_LIMIT = int(os.environ.get("GASLIMIT"))                              # type: ignore
DEFAULT_BID = 10 ** 17


NUMBER_OF_PREPAYED_WALLETS = 3


class GameStatus(enum.IntEnum):
    created = 0
    waiting = 1
    running = 2
    completed = 3
    aborted = 4
    exhausted = 5


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


async def append_move_and_get_logs(w3, gateway_contract, initiator, x, y):
    return (
        gateway_contract
            .events
            .MoveAppended()
            .processReceipt(
                await append_move_and_get_receipt(w3, gateway_contract, initiator, x, y)
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


async def create_game_and_get_receipt(w3, gateway_contract, initiator, m=20, n=20, k=5, gouged=None):
    gouged = [(item.x, item.y) for item in (list() if gouged is None else gouged)]
    return (
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await gateway_contract.functions.new_game([m, n, k], gouged).build_transaction(
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


async def create_game_and_get_logs(w3, gateway_contract, initiator, m=20, n=20, k=5, gouged=None):
    return (
        gateway_contract
            .events
            .GameCreated()
            .processReceipt(
                await create_game_and_get_receipt(w3, gateway_contract, initiator, m, n, k, gouged=gouged)
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
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@dataclass
class ABIAddress:
    abi: Mapping[str, Any]
    address: str


@pytest.fixture
def gateway_abi_address():
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/Gateway.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    return ABIAddress(abi, address)


@pytest.fixture
def game_abi():
    with open("./build/contracts/GameInstance.json") as f:
        return json.dumps(json.load(f)["abi"])



@pytest.fixture
def w3() -> Web3:
    return Web3(
        Web3.AsyncHTTPProvider(
            "%s:%s" % (os.environ.get("PROVIDER_HOST"), os.environ.get("PROVIDER_PORT"))
        ),
        modules={"eth": (AsyncEth,)},
        middlewares=[],
    )


@pytest.fixture(scope="function")
def get_game_created(w3, gateway_contract, game_abi):
    async def inner(initiator, m=20, n=20, k=5, gouged=None):
        # Alice creates the new game
        game_created_logs = await create_game_and_get_logs(w3, gateway_contract, initiator, m, n, k, gouged=gouged)
        return w3.eth.contract(address=game_created_logs[0]["args"]["game"], abi=game_abi)
    return inner


@pytest.fixture(scope="function")
def get_game_waiting(w3, get_game_created):
    async def inner(initiator, m=20, n=20, k=5, gouged=None, bid=DEFAULT_BID):
        # Alice creates the new game
        game = await get_game_created(initiator=initiator, m=m, n=n, k=k, gouged=gouged)
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
    async def inner(initiator, follower, m=20, n=20, k=5, gouged=None, bid=DEFAULT_BID):
        game = await get_game_waiting(initiator=initiator, m=m, n=n, k=k, gouged=gouged, bid=bid)
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
def gateway_contract(w3, gateway_abi_address):
    return w3.eth.contract(address=gateway_abi_address.address, abi=gateway_abi_address.abi)


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
                    "value": 2 * 10 ** 18,
                    "chainId": CHAIN_ID,
                },
                DEPLOYER_PRIVATE,
            ).rawTransaction
        )
    return wallets

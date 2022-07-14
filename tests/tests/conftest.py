import json
import typing

from dataclasses import dataclass
from typing import Any, Mapping

import pytest_asyncio

from web3 import Web3
from web3.eth import AsyncEth, Eth


DEPLOYER_PRIVATE = "7ee1a617857facf5948f2c88afdb502cc0c4ff4a90ada4790ebc3f2120fc9695"
DEPLOYER_PUBLIC = Web3.toChecksumAddress("0x51e2f9277D0718a6eC0FBF0f35b4f4Ea5DDFA325")
CHAIN_ID = 1337
GAS_PRICE = 10 ** 11 # 100 GWei
GAS_LIMIT = 10 ** 7


NUMBER_OF_PREPAYED_WALLETS = 2


async def create_new_game_and_get_logs(initiator, w3, contract) -> typing.Tuple[typing.Dict[str, typing.Any]]:
    """Calls `DMNK.new_game()` method and returns logs, embeded into the tx receipt itself.
    """
    return contract.events.GameCreated().processReceipt(
        await w3.eth.wait_for_transaction_receipt(
            await w3.eth.send_raw_transaction(
                Eth.account.sign_transaction(
                    await contract.functions.new_game().build_transaction(
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


@dataclass
class ABIAddress:
    abi: Mapping[str, Any]
    address: str


@pytest_asyncio.fixture
def abi_address():
    with open("./build/info.json") as f:
        address = json.load(f)["address"]
    with open("./build/contracts/DMNK.json") as f:
        abi = json.dumps(json.load(f)["abi"])
    yield ABIAddress(abi, address)


@pytest_asyncio.fixture
def w3():
    return Web3(
        Web3.AsyncHTTPProvider("http://127.0.0.1:9000"),
        modules={"eth": (AsyncEth,)},
        middlewares=[],
    )


@pytest_asyncio.fixture
def dmnkContract(w3, abi_address):
    return w3.eth.contract(address=abi_address.address, abi=abi_address.abi)


@pytest_asyncio.fixture
async def prepayedWallets(w3):
    nonce = await w3.eth.get_transaction_count(DEPLOYER_PUBLIC)
    wallets = [Eth.account.create() for _ in range(NUMBER_OF_PREPAYED_WALLETS)]
    for index, wallet in enumerate(wallets):
        await w3.eth.send_raw_transaction(
            Eth.account.sign_transaction(
                {
                    "gas": 10 * 10 ** 6,
                    "gasPrice": 300 * 10 ** 9,
                    "nonce": nonce + index,
                    "to": wallet.address,
                    "from": DEPLOYER_PUBLIC,
                    "value": 10 ** 20,
                    "chainId": 1337,
                },
                DEPLOYER_PRIVATE,
            ).rawTransaction
        )
    return wallets


# @pytest.fixture(scope="function")
# def twoPlayers(w3, dmnkContract, prepayedWallets):
#     alice, bob, *_ = prepayedWallets
#     # Alice joins the game
#     aliceTxHash = w3.eth.send_raw_transaction(
#         w3.eth.account.sign_transaction(
#             dmnkContract.functions.play(10**15, 10**16).buildTransaction(
#                 {
#                     "from": alice.address,
#                     "chainId": 1666700000,
#                     "gas": 2 * 10 ** 6,
#                     "gasPrice": 10 ** 9,
#                     "nonce": 0,
#                     "value": 2 * 10 ** 15,
#                 },
#             ),
#             alice.privateKey
#         ).rawTransaction
#     )
#     wait_for_transaction(w3, aliceTxHash)

#     create_event_found = False
#     gameAddress = "0x0"
#     create_event_filter = dmnkContract.events.GameCreated.createFilter(
#         fromBlock="latest")
#     while not create_event_found:
#         for event in create_event_filter.get_all_entries():
#             if event.args.alice == alice.address:
#                 gameAddress = event.args.gameAddress
#                 create_event_found = True
#         time.sleep(0.2)

#     # Bob joins the game
#     bobTxHash = w3.eth.send_raw_transaction(
#         w3.eth.account.sign_transaction(
#             dmnkContract.functions.play(10 ** 15, 10 ** 16).buildTransaction(
#                 {
#                     "from": bob.address,
#                     "chainId": 1666700000,
#                     "gas": 2 * 10 ** 6,
#                     "gasPrice": 10 ** 9,
#                     "nonce": 0,
#                     "value": 2 * 10 ** 15,
#                 },
#             ),
#             bob.privateKey
#         ).rawTransaction
#     )
#     wait_for_transaction(w3, bobTxHash)
#     return (gameAddress, (alice, bob))


# @pytest.fixture(scope="function")
# def gameContract(w3, twoPlayers, gameInstanceABI):
#     gameAddress, _ = twoPlayers
#     return w3.eth.contract(address=gameAddress, abi=gameInstanceABI)
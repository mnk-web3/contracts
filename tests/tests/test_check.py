import enum

import pytest

from web3.eth import Eth

from .conftest import (
    join_and_get_logs,
    join_and_get_receipt,
    cancel_game_and_get_receipt,
    create_game_and_get_logs,
    create_game_and_get_receipt,
    CHAIN_ID, GAS_LIMIT, GAS_PRICE
)

pytestmark = pytest.mark.asyncio


class GameStatus(enum.IntEnum):
    created = 0
    waiting = 1
    running = 2
    completed = 3
    aborted = 4


async def test_creat_and_join_the_game(w3, dmnkContract, prepayed_wallets, game_abi):
    alice, bob, *_ = prepayed_wallets
    transaction_logs = await create_game_and_get_logs(w3, dmnkContract, alice)
    # Transaction results in a single log entry, added to the chain
    assert len(transaction_logs) == 1
    # This entry contains her address in the "initiator" field
    assert transaction_logs[0]["args"]["initiator"] == alice.address
    # Test some of the resultin game instance properties
    game_instance = w3.eth.contract(address=transaction_logs[0]["args"]["game"], abi=game_abi)
    # Check, that game_instance is known to the DMNK contract
    assert await dmnkContract.functions.verify_game_address(game_instance.address).call()
    # First move is always given to the game initiator
    assert await game_instance.functions.get_current_player().call() == alice.address
    # Check the initial game status
    assert GameStatus(await game_instance.functions.get_game_status().call()) == GameStatus.created
    # Alice joins the game
    alice_joins_logs = await join_and_get_logs(alice, game_instance, w3)
    # There must me only one log entry
    assert len(alice_joins_logs) == 1
    assert alice_joins_logs[0]["args"]["game"] == game_instance.address
    assert alice_joins_logs[0]["args"]["player"] == alice.address
    # Game now should be in "waiting" status
    assert GameStatus(await game_instance.functions.get_game_status().call()) == GameStatus.waiting
    # Bob joins the game
    bob_joins_logs = await join_and_get_logs(bob, game_instance, w3)
    # There must me only one log entry
    assert len(bob_joins_logs) == 1
    assert bob_joins_logs[0]["args"]["game"] == game_instance.address
    assert bob_joins_logs[0]["args"]["player"] == bob.address
    # Game now should be in "running" status
    assert GameStatus(await game_instance.functions.get_game_status().call()) == GameStatus.running
    # Players are Alice and Bob indeed
    assert await game_instance.functions.get_players().call() == [alice.address, bob.address]


@pytest.mark.parametrize(
    "m,n,k",
    [
        (1, 0, 0),
        (0, 1, 0),
        (1, 1, 0),
        (0, 0, 1),
        (10, 10, 11),
        (10, 5, 6),
    ]
)
async def test_cannot_create_these_games(m, n, k, w3, dmnkContract, prepayed_wallets):
    alice, *_ = prepayed_wallets
    receipt = await create_game_and_get_receipt(w3, dmnkContract, alice, m, n, k)
    assert not receipt["status"]


async def test_can_create_game(get_game_created, prepayed_wallets):
    alice, *_ = prepayed_wallets
    game = await get_game_created(alice)
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.created
    assert (
        await game.functions.get_players().call() ==
        [alice.address, "0x0000000000000000000000000000000000000000"]
    )


async def test_can_cancel_created_game(w3, get_game_created, prepayed_wallets):
    alice, *_ = prepayed_wallets
    game = await get_game_created(alice)
    assert (await cancel_game_and_get_receipt(w3, game, alice)).status
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.aborted


async def test_can_cancel_waiting_game(w3, get_game_waiting, prepayed_wallets):
    alice, *_ = prepayed_wallets
    game = await get_game_waiting(alice)
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.waiting
    balance_before_cancellation = await w3.eth.get_balance(alice.address)
    assert (await cancel_game_and_get_receipt(w3, game, alice)).status
    balance_after_cancellation = await w3.eth.get_balance(alice.address)
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.aborted
    # check, that funds are unlocked after game concellation
    assert balance_after_cancellation > balance_before_cancellation


async def test_cannot_cancel_running_game(get_game_running, prepayed_wallets, w3):
    alice, bob, charly, *_ = prepayed_wallets
    game = await get_game_running(alice, bob)
    assert not (await cancel_game_and_get_receipt(w3, game, alice)).status
    assert not (await cancel_game_and_get_receipt(w3, game, bob)).status
    assert not (await cancel_game_and_get_receipt(w3, game, charly)).status


async def test_initiator_inits_game(w3, get_game_created, prepayed_wallets):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_created(alice)
    # Alice should have called JOIN now, not bob
    assert not (await join_and_get_receipt(w3, game, bob))["status"]


async def test_can_init_game(get_game_waiting, prepayed_wallets):
    alice, *_ = prepayed_wallets
    game = await get_game_waiting(alice)
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.waiting
    assert (
        await game.functions.get_players().call() ==
        [alice.address, "0x0000000000000000000000000000000000000000"]
    )


async def test_can_join_game(get_game_running, prepayed_wallets):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_running(alice, bob)
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.running
    assert (
        await game.functions.get_players().call() ==
        [alice.address, bob.address]
    )


async def test_cannot_join_game_with_invalid_bi(w3, get_game_waiting, prepayed_wallets):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_waiting(alice, bid=10**18)
    assert not (await join_and_get_receipt(w3, game, bob, bid=10**17)).status
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.waiting


# After the game have reached it's WAITING state the initiator wont able to call JOIN again
async def test_cannot_play_with_yourself(get_game_waiting, prepayed_wallets, w3):
    alice, *_ = prepayed_wallets
    game = await get_game_waiting(alice)
    assert not (await join_and_get_receipt(w3, game, alice)).status
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.waiting


# After the game have reached it's RUNNING state it is no longer possible to JOIN
async def test_cannot_join_running_game(get_game_running, prepayed_wallets, w3):
    alice, bob, charly, *_ = prepayed_wallets
    game = await get_game_running(alice, bob)
    assert not (await join_and_get_receipt(w3, game, alice)).status
    assert not (await join_and_get_receipt(w3, game, bob)).status
    assert not (await join_and_get_receipt(w3, game, charly)).status

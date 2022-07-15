import enum

import pytest

from web3.eth import Eth

from .conftest import (
    join_and_get_logs, create_game_and_get_logs,
    CHAIN_ID, GAS_LIMIT, GAS_PRICE
)

pytestmark = pytest.mark.asyncio


class GameStatus(enum.IntEnum):
    created = 0
    waiting = 1
    running = 2
    completed = 3
    aborted = 4


async def test_creat_and_join_the_game(w3, dmnkContract, prepayedWallets, game_abi):
    alice, bob, *_ = prepayedWallets
    transaction_logs = await create_game_and_get_logs(alice, dmnkContract, w3)
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


async def test_started_game1(started_game):
    alice, bob, game = started_game
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.running


async def test_started_game0(started_game):
    alice, bob, game = started_game
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.running

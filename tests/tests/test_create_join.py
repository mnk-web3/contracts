import pytest

from .conftest import (DEFAULT_BID, GameStatus, cancel_game_and_get_receipt,
                       create_game_and_get_receipt, join_and_get_receipt)

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize(
    "m,n,k",
    [
        pytest.param(0, 0, 0, id="null board 1"),
        pytest.param(1, 0, 0, id="null board 2"),
        pytest.param(0, 1, 0, id="null board 3"),
        pytest.param(0, 0, 1, id="null board 4"),
        pytest.param(1, 1, 0, id="null k value"),
        pytest.param(10, 10, 11, id="k > m || k > n"),
        pytest.param(10, 5, 6, id="k < n but k > m"),
    ]
)
async def test_cannot_create_these_games(m, n, k, w3, gateway_contract, prepayed_wallets):
    alice, *_ = prepayed_wallets
    receipt = await create_game_and_get_receipt(w3, gateway_contract, alice, m, n, k)
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


async def test_cannot_join_game_with_invalid_bid(w3, get_game_waiting, prepayed_wallets):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_waiting(alice, bid=DEFAULT_BID)
    # This should be rejected as alice's bid != bob's
    assert not (await join_and_get_receipt(w3, game, bob, bid=DEFAULT_BID+100)).status
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

import dataclasses
import enum
import pytest

from .conftest import (
    append_move_and_get_receipt, GameStatus,
)

pytestmark = pytest.mark.asyncio


NULL_ADDRESS = "0x0000000000000000000000000000000000000000"


class WhoWon(enum.IntEnum):
    alice = enum.auto()
    bob = enum.auto()
    noone = enum.auto()


@dataclasses.dataclass
class Move:
    x: int
    y: int
    status: bool = True
    is_winner: bool = False


@dataclasses.dataclass
class GameSettings:
    m: int
    n: int
    k: int


class AliceMove(Move):
    pass


class BobMove(Move):
    pass


async def test_cannot_move_wrong_turn(w3, get_game_running, prepayed_wallets):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_running(alice, bob, 3, 3, 3)
    # This should be rejected, current turn is alice's
    assert not (await append_move_and_get_receipt(w3, game, bob, 0, 0))["status"]
    assert GameStatus(await game.functions.get_game_status().call()) == GameStatus.running


@pytest.mark.parametrize(
    "settings,moves,who_wins",
    [
        pytest.param(
            GameSettings(m=3, n=3, k=3),
            [
                AliceMove(0, 0),
                BobMove(0, 1),
                AliceMove(1, 0),
                BobMove(1, 1),
                AliceMove(2, 0, is_winner=True),
            ],
            WhoWon.alice,
        )
    ]
)
async def test_gameplay(w3, get_game_running, prepayed_wallets, settings, moves, who_wins):
    alice, bob, *_ = prepayed_wallets
    game = await get_game_running(alice, bob, m=settings.m, n=settings.n, k=settings.k)
    for move in moves:
        receipt = (
            await append_move_and_get_receipt(
                w3=w3,
                game_instance=game,
                initiator=alice if isinstance(move, AliceMove) else bob,
                x=move.x,
                y=move.y,
            )
        )
        assert bool(receipt["status"]) == move.status

    match who_wins:
        case WhoWon.alice: winner_address = alice.address
        case WhoWon.bob: winner_address = bob.address
        case WhoWon.noone: winner_address = NULL_ADDRESS

    assert await game.functions.get_winner().call() == winner_address
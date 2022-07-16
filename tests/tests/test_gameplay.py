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


@pytest.mark.parametrize(
    "settings,moves,who_wins",
    [
        pytest.param(
            GameSettings(m=3, n=3, k=3),
            [
                BobMove(0, 0, status=False),  # alice supposed to add here move first
            ],
            WhoWon.noone,
            id="move_wrong_turn",
        ),
        pytest.param(
            GameSettings(m=3, n=3, k=3),
            [
                AliceMove(0, 0),
            ],
            WhoWon.noone,
            id="game_is_still_in_progress",
        ),
        # Field is trivial, so alice wins immediately
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
            ],
            WhoWon.alice,
            id="degenerate_case",
        ),
        # Field is trivial, so alice wins immediately and afterwards she's trying to add another move
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
                AliceMove(0, 0, status=False),  # This move should fail as the game is now Completed
            ],
            WhoWon.alice,
            id="degenerate_case_no_move_after_win_alice",
        ),
        # Field is trivial, so alice wins immediately and afterwards she's trying to add another move
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
                BobMove(0, 0, status=False),  # This move should fail as the game is now Completed
            ],
            WhoWon.alice,
            id="degenerate_case_no_move_after_win_bob",
        ),
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
        # Check the transaction is actully ok
        assert bool(receipt["status"]) == move.status
        # if it is, there must be a bunch of logged info
        if move.status:
            logs = game.events.MoveAppended().processReceipt(receipt)
            assert len(logs) == 1
            assert logs[0]["args"]["is_winner"] == move.is_winner
    
    match who_wins:
        case WhoWon.alice: winner_address = alice.address
        case WhoWon.bob: winner_address = bob.address
        case WhoWon.noone: winner_address = NULL_ADDRESS

    assert await game.functions.get_winner().call() == winner_address
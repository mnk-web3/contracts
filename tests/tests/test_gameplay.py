from __future__ import annotations

import dataclasses
import enum
import typing
from copy import deepcopy
from itertools import cycle, islice, permutations

import pytest

from .conftest import GameStatus, append_move_and_get_receipt

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

    @property
    def short_name(self):
        return "Move"

    def __repr__(self):
        return (
            "%s(%s, %s, s=%s, w=%s)" %
            (self.short_name, self.x, self.y, self.status, self.is_winner)
        )


@dataclasses.dataclass
class GameSettings:
    m: int
    n: int
    k: int


class AliceMove(Move):
    @property
    def short_name(self):
        return "A"


class BobMove(Move):
    @property
    def short_name(self):
        return "B"


def roundrobin(*iterables):
    "roundrobin('ABC', 'D', 'EF') --> A D E B F C"
    # Recipe credited to George Sakkis
    num_active = len(iterables)
    nexts = cycle(iter(it).__next__ for it in iterables)
    while num_active:
        try:
            for next in nexts:
                yield next()
        except StopIteration:
            # Remove the iterator we just exhausted from the cycle.
            num_active -= 1
            nexts = cycle(islice(nexts, num_active))


def permute(settings: GameSettings, moves: list[Move], gouged: list[Move]) -> typing.Generator:
    moves_alice = list(filter(lambda move: isinstance(move, AliceMove), moves))
    moves_bob = list(filter(lambda move: isinstance(move, BobMove), moves))
    for alice_permutation in permutations(moves_alice):
        for bob_permutation in permutations(moves_bob):
            movelist = deepcopy(list(roundrobin(alice_permutation, bob_permutation)))
            movelist[-1].is_winner = True
            yield pytest.param(
                settings,
                movelist,
                gouged,
                WhoWon.alice,
                GameStatus.completed,
                id=repr(movelist)
            )


@pytest.mark.parametrize(
    "settings,moves,gouged,who_wins,status",
    [
        pytest.param(
            GameSettings(m=3, n=3, k=3),
            [
                BobMove(0, 0, status=False),  # alice supposed to add here move first
            ],
            [],
            WhoWon.noone,
            GameStatus.running,
            id="move_wrong_turn",
        ),
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, status=False),  # this cell is gouged, cant place here
            ],
            [
                Move(x=0, y=0),
            ],
            WhoWon.noone,
            GameStatus.running,
            id="move_wrong_turn",
        ),
        pytest.param(
            GameSettings(m=3, n=3, k=3),
            [
                AliceMove(0, 0),
            ],
            [],
            WhoWon.noone,
            GameStatus.running,
            id="game_is_still_in_progress",
        ),
        # Field is trivial, so alice wins immediately
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
            ],
            [],
            WhoWon.alice,
            GameStatus.completed,
            id="degenerate_case",
        ),
        # Field is trivial, so alice wins immediately. Afterwards she's trying to add another move.
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
                AliceMove(0, 0, status=False),  # This move should fail as the game is now Completed
            ],
            [],
            WhoWon.alice,
            GameStatus.completed,
            id="degenerate_case_no_move_after_win_alice",
        ),
        # Field is trivial, so alice wins immediately. Afterwards bob is trying to add another move
        pytest.param(
            GameSettings(m=1, n=1, k=1),
            [
                AliceMove(0, 0, is_winner=True),
                BobMove(0, 0, status=False),  # This move should fail as the game is now Completed
            ],
            [],
            WhoWon.alice,
            GameStatus.completed,
            id="degenerate_case_no_move_after_win_bob",
        ),
        # horizontal
        *permute(
            settings=GameSettings(5, 5, 3),
            moves=[
                AliceMove(0, 0),
                BobMove(0, 1),
                AliceMove(1, 0),
                BobMove(1, 1),
                AliceMove(2, 0),
            ],
            gouged=[],
        ),
        # vertical
        *permute(
            settings=GameSettings(5, 5, 3),
            moves=[
                AliceMove(0, 0),
                BobMove(1, 0),
                AliceMove(0, 1),
                BobMove(1, 1),
                AliceMove(0, 2),
            ],
            gouged=[],
        ),
        *permute(
            settings=GameSettings(5, 5, 3),
            moves=[
                AliceMove(0, 0),
                BobMove(1, 0),
                AliceMove(1, 1),
                BobMove(1, 2),
                AliceMove(2, 2),
            ],
            gouged=[],
        ),
        *permute(
            settings=GameSettings(5, 5, 3),
            moves=[
                AliceMove(0, 2),
                BobMove(1, 2),
                AliceMove(1, 1),
                BobMove(1, 0),
                AliceMove(2, 0),
            ],
            gouged=[],
        ),
    ]
)
async def test_gameplay(
    w3, get_game_running, prepayed_wallets, settings, moves, gouged, who_wins, status
):
    BID = 10 ** 17
    alice, bob, *_ = prepayed_wallets
    game = await get_game_running(
        alice, bob, m=settings.m, n=settings.n, k=settings.k, gouged=gouged, bid=BID
    )

    moves_registered_expected = 0
    for move in moves:
        if move.status:
            moves_registered_expected += 1
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

    assert await game.functions.get_move_count().call() == moves_registered_expected
    assert await game.functions.get_winner().call() == winner_address
    assert GameStatus(await game.functions.get_game_status().call()) == status

    # Now the important part: check whether the FUNDS are SAFU
    game_balance = await w3.eth.get_balance(game.address)
    if winner_address == NULL_ADDRESS:
        # If the game is running, the contract is expected to hold 2 * BID
        assert game_balance == BID * 2
    else:
        # If the game is finished, funds better be unlocked
        assert game_balance == 0

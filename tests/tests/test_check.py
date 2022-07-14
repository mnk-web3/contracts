import pytest

from web3.eth import Eth

from .conftest import create_new_game_and_get_logs


pytestmark = pytest.mark.asyncio


async def test_create_new_game(w3, dmnkContract, prepayedWallets):
    alice, *_ = prepayedWallets
    transaction_logs = await create_new_game_and_get_logs(alice, w3, dmnkContract)
    # Transaction results in a single log entry, added to the chain
    assert len(transaction_logs) == 1
    # This entry contains her address in the "initiator" field
    assert transaction_logs[0]["args"]["initiator"] == alice.address
    # And new game instance address
    assert transaction_logs[0]["args"]["game"]
import pytest

from web3.eth import Eth


pytestmark = pytest.mark.asyncio


async def test_create_new_game(w3, dmnkContract, prepayedWallets):
    alice, *_ = prepayedWallets
    # Alice creates a new game
    txhash = await w3.eth.send_raw_transaction(
        Eth.account.sign_transaction(
            await dmnkContract.functions.new_game().build_transaction(
                {
                    "from": alice.address,
                    "chainId": 1337,
                    "gas": 2 * 10**6,
                    "gasPrice": 10**9,
                    "nonce": await w3.eth.get_transaction_count(alice.address),
                    "value": 0,
                },
            ),
            alice.privateKey,
        ).rawTransaction
    )
    receipt = await w3.eth.wait_for_transaction_receipt(txhash)
    # First, check that transaction succeeded
    assert receipt.status, "Transaction did not succeed"
    # And now, search for the GameCreated event, that being stored on the chain
    game_created_builder = dmnkContract.events.GameCreated.build_filter()
    game_created_builder.args["initiator"].match_single(alice.address)
    async for event in game_created_builder.deploy(w3).get_all_entries():
        print(event)

import pytest


pytestmark = pytest.mark.asyncio


async def test_check(prepayedWallets):
    print(prepayedWallets)
    assert True

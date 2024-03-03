import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine

from dataline.models.base import DBModel


@pytest_asyncio.fixture(scope="session")
async def engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(DBModel.metadata.create_all)

    yield engine
    await engine.dispose()

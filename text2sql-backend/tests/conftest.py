import logging.config
import pathlib
from typing import AsyncGenerator, Generator
from unittest import mock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from alembic.command import upgrade
from alembic.config import Config
from app import App
from dataline.models.base import DBModel
from dataline.repositories.base import AsyncSession, get_session

logging.basicConfig(level=logging.INFO)


@pytest_asyncio.fixture(scope="session")
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    engine = create_async_engine("sqlite+aiosqlite:///test.sqlite3")

    async with engine.begin() as connection:
        await connection.run_sync(DBModel.metadata.drop_all)
        await connection.run_sync(DBModel.metadata.create_all)

    yield engine
    await engine.dispose()

    # Delete database after tests
    pathlib.Path("test.sqlite3").unlink(missing_ok=True)


@pytest_asyncio.fixture
async def session(engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session, session.begin():
        # prevent test from committing anything, only flush
        # only useful in case we move to real DBs not in-mem
        monkeypatch.setattr(session, "commit", mock.AsyncMock(wraps=session.flush))
        yield session
        await session.rollback()


@pytest.fixture(scope="session", autouse=True)
def apply_migrations() -> None:
    config = Config((pathlib.Path(__file__).parent.parent / "alembic.ini").resolve())
    config.set_main_option("sqlalchemy.url", "sqlite+aiosqlite:///test.sqlite3")
    upgrade(config, "head")


app = App()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[TestClient, None]:
    def override_get_session() -> Generator[AsyncSession, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app=app, raise_server_exceptions=True) as client:
        yield client

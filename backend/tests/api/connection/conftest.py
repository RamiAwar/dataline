from typing import AsyncGenerator

import pytest_asyncio
from fastapi.testclient import TestClient

from dataline.config import config
from dataline.models.connection.schema import Connection, TableSchema
from dataline.utils.utils import get_sqlite_dsn


@pytest_asyncio.fixture
async def dvdrental_connection(client: TestClient) -> AsyncGenerator[Connection, None]:
    connection_in = {
        "dsn": get_sqlite_dsn(config.sample_dvdrental_path),
        "name": "Test",
        "is_sample": True,
    }
    response = client.post("/connect", json=connection_in)

    assert response.status_code == 200
    connection = Connection(**response.json()["data"])

    # TODO: Remove after sqlalchemy migration
    # Manual rollback
    yield connection
    client.delete(f"/connection/{str(connection.id)}")


@pytest_asyncio.fixture
async def example_table_schema(client: TestClient, dvdrental_connection: Connection) -> TableSchema:
    response = client.get(f"/connection/{str(dvdrental_connection.id)}/schemas")
    return TableSchema.model_validate(response.json()["data"]["tables"][0])

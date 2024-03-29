import logging

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from dataline.models.connection.schema import Connection, TableSchema

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_create_sample_db_connection(client: TestClient) -> None:
    response = client.post("/create-sample-db")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["database"]
    assert data["dialect"] == "sqlite"
    assert data["is_sample"] is True
    assert data["id"]


@pytest_asyncio.fixture
async def sample_db(client: TestClient) -> Connection:
    response = client.post("/create-sample-db")
    return Connection(**response.json()["data"])


@pytest.mark.asyncio
async def test_get_connections(client: TestClient, sample_db: Connection) -> None:
    response = client.get("/connections")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["connections"]
    assert len(data["connections"]) == 1

    connections = data["connections"]
    assert connections[0] == sample_db.model_dump(mode="json")


@pytest.mark.asyncio
async def test_get_connection(client: TestClient, sample_db: Connection) -> None:
    response = client.get(f"/connection/{str(sample_db.id)}")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["connection"] == sample_db.model_dump(mode="json")


@pytest.mark.asyncio
async def test_connect_db(client: TestClient) -> None:
    connection_in = {
        "dsn": "sqlite:///test.db",
        "name": "Test",
    }
    response = client.post("/connect", json=connection_in)

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["id"]
    assert data["dsn"] == connection_in["dsn"]
    assert data["name"] == connection_in["name"]
    assert data["dialect"] == "sqlite"
    assert data["database"]
    assert data["is_sample"] is False


@pytest.mark.asyncio
async def test_get_table_schemas(client: TestClient, sample_db: Connection) -> None:
    response = client.get(f"/connection/{str(sample_db.id)}/schemas")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["tables"]
    assert len(data["tables"]) > 1

    table_schema = data["tables"][0]
    assert table_schema["id"]
    assert table_schema["connection_id"]
    assert table_schema["name"] is not None
    assert table_schema["description"] is not None

    assert len(table_schema["field_descriptions"]) > 0

    field = table_schema["field_descriptions"][0]
    assert field["id"]
    assert field["schema_id"]
    assert field["name"]
    assert field["type"]
    assert field["description"] is not None
    assert field["is_primary_key"] is not None
    assert field["is_foreign_key"] is not None
    assert field["linked_table"] is not None


@pytest_asyncio.fixture
async def example_table_schema(client: TestClient, sample_db: Connection) -> TableSchema:
    response = client.get(f"/connection/{str(sample_db.id)}/schemas")
    return TableSchema.model_validate(response.json()["data"]["tables"][0])


@pytest.mark.asyncio
async def test_update_table_schema_description(client: TestClient, example_table_schema: TableSchema) -> None:
    update_in = {"description": "New description"}
    response = client.patch(f"/schemas/table/{example_table_schema.id}", json=update_in)

    assert response.status_code == 200

    # Check if the description was updated
    response = client.get(f"/connection/{example_table_schema.connection_id}/schemas")
    data = response.json()["data"]
    table_schema = TableSchema.model_validate(data["tables"][0])
    assert table_schema.description == update_in["description"]


@pytest.mark.asyncio
async def test_update_table_schema_field_description(client: TestClient, example_table_schema: TableSchema) -> None:
    field = example_table_schema.field_descriptions[0]
    update_in = {"description": "New description"}
    response = client.patch(f"/schemas/field/{field.id}", json=update_in)

    assert response.status_code == 200

    # Check if the description was updated
    response = client.get(f"/connection/{example_table_schema.connection_id}/schemas")
    data = response.json()["data"]
    table_schema = TableSchema.model_validate(data["tables"][0])
    field = table_schema.field_descriptions[0]
    assert field.description == update_in["description"]


@pytest.mark.asyncio
@pytest.mark.skip(reason="Do not want to deal with this now")
async def test_delete_connection(client: TestClient, sample_db: Connection) -> None:
    response = client.delete(f"/connection/{str(sample_db.id)}")

    assert response.status_code == 200

    # Check if the connection was deleted
    response = client.get("/connections")
    data = response.json()["data"]
    assert len(data["connections"]) == 0


@pytest.mark.asyncio
async def test_update_connection(client: TestClient, sample_db: Connection) -> None:
    update_in = {
        "dsn": "sqlite:///new.db",
        "name": "New name",
    }
    response = client.patch(f"/connection/{str(sample_db.id)}", json=update_in)

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["connection"]["dsn"] == update_in["dsn"]
    assert data["connection"]["name"] == update_in["name"]

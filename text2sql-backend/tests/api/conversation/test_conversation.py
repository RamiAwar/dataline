import pytest
from fastapi.testclient import TestClient

from dataline.models.connection.schema import Connection
from dataline.models.conversation.schema import ConversationOut


@pytest.mark.asyncio
async def test_create_conversation(client: TestClient, dvdrental_connection: Connection) -> None:
    data = {
        "connection_id": str(dvdrental_connection.id),
        "name": "Test convo",
    }
    response = client.post("/conversation", json=data)
    assert response.status_code == 200

    data = response.json().get("data", {})

    assert "id" in data
    assert "connection_id" in data
    assert "created_at" in data
    assert "name" in data


@pytest.mark.asyncio
async def test_update_conversation_name(client: TestClient, sample_conversation: ConversationOut) -> None:
    data = {
        "name": "New name",
    }
    response = client.patch(f"/conversation/{sample_conversation.id}", json=data)
    assert response.status_code == 200

    # Check that name updated
    result = response.json()["data"]
    assert result["name"] == "New name"
    assert result["id"] == str(sample_conversation.id)
    assert result["connection_id"] == str(sample_conversation.connection_id)
    assert result["created_at"] == sample_conversation.created_at.isoformat()


@pytest.mark.asyncio
async def test_delete_conversation(client: TestClient, sample_conversation: ConversationOut) -> None:
    response = client.delete(f"/conversation/{sample_conversation.id}")
    assert response.status_code == 200

    # Check that conversation deleted
    response = client.get(f"/conversation/{sample_conversation.id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_conversation(client: TestClient, sample_conversation: ConversationOut) -> None:
    response = client.get(f"/conversation/{sample_conversation.id}")
    assert response.status_code == 200

    # Check that conversation returned
    result = response.json()["data"]
    assert result["id"] == str(sample_conversation.id)
    assert result["connection_id"] == str(sample_conversation.connection_id)
    assert result["created_at"] == sample_conversation.created_at.isoformat()
    assert result["name"] == sample_conversation.name


@pytest.mark.asyncio
async def test_get_conversation_with_messages_with_results(
    client: TestClient, sample_conversation: ConversationOut
) -> None:
    response = client.get(f"/conversation/{sample_conversation.id}/messages")


# TODO:
@pytest.mark.skip
@pytest.mark.asyncio
async def test_delete_connection_cascades_conversations() -> None: ...


# TODO:
@pytest.mark.skip
@pytest.mark.asyncio
async def test_delete_conversation_with_messages(
    client: TestClient, sample_conversation_with_messages: ConversationOut
) -> None: ...

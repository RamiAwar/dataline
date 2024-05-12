import pytest_asyncio

from dataline.models.connection.schema import Connection
from dataline.models.conversation.schema import ConversationOut
from dataline.repositories.base import AsyncSession
from dataline.services.conversation import ConversationService


@pytest_asyncio.fixture
async def sample_conversation(session: AsyncSession, dvdrental_connection: Connection) -> ConversationOut:
    data = {
        "connection_id": str(dvdrental_connection.id),
        "name": "Test convo",
    }
    # response = client.post("/conversation", json=data)
    # assert response.status_code == 200

    # return ConversationOut(**response.json()["data"])

    conversation_service = ConversationService()
    conversation = await conversation_service.create_conversation(
        session, connection_id=dvdrental_connection.id, name="Test convo"
    )

import os
from uuid import UUID

import pytest_asyncio
from fastapi.testclient import TestClient

from dataline.models.llm_flow.schema import StorableResultMixin
from dataline.models.message.schema import BaseMessageType, MessageCreate
from dataline.repositories.base import AsyncSession
from dataline.repositories.message import MessageRepository
from dataline.repositories.result import ResultRepository
from tests.evaluation.utils import MessagePair


@pytest_asyncio.fixture
async def user_info(client: TestClient) -> dict[str, str]:
    user_in = {"name": "Farid", "openai_api_key": os.environ["OPENAI_API_KEY"]}

    if langsmith_api_key := os.environ.get("LANGCHAIN_API_KEY", None):
        user_in["langsmith_api_key"] = langsmith_api_key

    if preferred_openai_model := os.environ.get("PREFERRED_OPENAI_MODEL", None):
        user_in["preferred_openai_model"] = preferred_openai_model

    response = client.patch("/settings/info", json=user_in)
    assert response.status_code == 200
    return user_in


async def populate_conversation_history(
    session: AsyncSession,
    history: list[MessagePair],
    conversation_id: UUID,
) -> None:
    msg_repo = MessageRepository()
    result_repo = ResultRepository()

    for message_pair in history:
        await msg_repo.create(
            session,
            MessageCreate(
                content=message_pair.human_message.content,
                role=BaseMessageType.HUMAN.value,
                conversation_id=conversation_id,
            ),
            flush=False,
        )
        stored_ai_message = await msg_repo.create(
            session,
            MessageCreate(
                content=message_pair.ai_message.message.content,
                role=BaseMessageType.AI.value,
                conversation_id=conversation_id,
            ),
            flush=True,
        )
        for result in message_pair.ai_message.results:
            if isinstance(result, StorableResultMixin):
                await result.store_result(session, result_repo, stored_ai_message.id)

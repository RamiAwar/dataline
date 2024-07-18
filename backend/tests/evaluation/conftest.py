import csv
import os
from pathlib import Path
from typing import Callable, Coroutine, Generator, Protocol
from uuid import UUID

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from dataline.models.llm_flow.schema import StorableResultMixin
from dataline.models.message.schema import BaseMessageType, MessageCreate
from dataline.repositories.base import AsyncSession
from dataline.repositories.message import MessageRepository
from dataline.repositories.result import ResultRepository
from tests.evaluation.utils import MessagePair, TestCase


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


PopulateHistoryType = Callable[[list[MessagePair], UUID], Coroutine[None, None, None]]


@pytest.fixture
def populate_conversation_history(
    session: AsyncSession,
) -> PopulateHistoryType:
    msg_repo = MessageRepository()
    result_repo = ResultRepository()

    async def wraps(history: list[MessagePair], conversation_id: UUID) -> None:
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

    return wraps


class ResultRecorder(Protocol):
    def __call__(self, test_case: TestCase) -> None: ...


@pytest.fixture(scope="session")
def result_recorder() -> Generator[ResultRecorder, None, None]:
    results = []

    def add_result(test_case: TestCase) -> None:
        for evaluation, score in zip(test_case.evaluations, test_case.scores):
            results.append(
                {
                    "name": test_case.test_name,
                    "evaluation": evaluation.name,
                    "score": score,
                    "tags": " - ".join(map(lambda x: x.value, evaluation.metadata.tags)),
                }
            )

    yield add_result

    output_file = Path("test_results.csv")
    with output_file.open("w", newline="") as csvfile:
        fieldnames = ["name", "evaluation", "score", "tags"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in results:
            writer.writerow(result)

    print(f"Test results have been written to {output_file}")

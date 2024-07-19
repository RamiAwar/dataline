import csv
import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from dataline.models.conversation.schema import ConversationOut
from dataline.repositories.base import AsyncSession
from tests.evaluation.conftest import populate_conversation_history
from tests.evaluation.test_cases import TEST_CASES

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
async def test_llm(
    client: TestClient,
    session: AsyncSession,
    sample_conversation: ConversationOut,
) -> None:
    rows = []
    for test_case in TEST_CASES:
        nested = session.begin_nested()
        async with nested:
            await populate_conversation_history(session, test_case.message_history, sample_conversation.id)
            rows.extend(test_case.run(client, sample_conversation.id))
            await nested.rollback()

    output_file = Path("test_results.csv")
    with output_file.open("w", newline="") as csvfile:
        fieldnames = ["name", "evaluation", "score", "weight", "time", "tags"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        mapped_rows = map(
            lambda x: {"name": x[0], "evaluation": x[1], "score": x[2], "weight": x[3], "time": x[4], "tags": x[5]},
            rows,
        )
        writer.writerows(mapped_rows)

    print(f"Test results have been written to {output_file}")

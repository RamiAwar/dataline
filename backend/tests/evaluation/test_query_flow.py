import logging

import pytest
from fastapi.testclient import TestClient

from dataline.models.conversation.schema import ConversationOut
from tests.evaluation.conftest import PopulateHistoryType, ResultRecorder
from tests.evaluation.test_cases import TEST_CASES
from tests.evaluation.utils import TestCase

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize("test_case", TEST_CASES)
async def test_llm(
    client: TestClient,
    sample_conversation: ConversationOut,
    test_case: TestCase,
    result_recorder: ResultRecorder,
    populate_conversation_history: PopulateHistoryType,
) -> None:
    await populate_conversation_history(test_case.message_history, sample_conversation.id)
    test_case.run(client, sample_conversation.id)
    result_recorder(test_case)

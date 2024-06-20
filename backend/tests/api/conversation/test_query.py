import logging
import os
from typing import cast

import pytest
import pytest_asyncio
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from openai.resources.models import Models as OpenAIModels

from dataline.models.conversation.schema import ConversationOut
from dataline.models.message.schema import QueryOut
from dataline.models.result.schema import ResultOut
from dataline.models.llm_flow.enums import QueryResultType

logger = logging.getLogger(__name__)


@pytest_asyncio.fixture
@patch.object(OpenAIModels, "list")
async def user_info(mock_openai_model_list: MagicMock, client: TestClient) -> dict[str, str]:
    mock_model = MagicMock()
    mock_model.id = "gpt-3.5-turbo"
    mock_openai_model_list.return_value = [mock_model]
    user_in = {
        "name": "John",
        "openai_api_key": os.environ["OPENAI_API_KEY"],
    }
    client.patch("/settings/info", json=user_in)
    return user_in


def get_query_out_from_stream(lines: list[str]):
    assert len(lines) >= 3
    assert lines[-3] == "event: stored_messages_event"
    assert lines[-2].startswith("data: ")

    return QueryOut.model_validate_json(lines[-2].lstrip("data: "))


def evaluate_ai_message_content(generated_message: str, query: str, additional_eval_steps: list[str] | None = None):
    test_case = LLMTestCase(input=query, actual_output=generated_message)
    correctness_metric = GEval(
        name="Relevance",
        evaluation_steps=[
            "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
            *(additional_eval_steps or []),
        ],
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    )

    correctness_metric.measure(test_case)
    assert correctness_metric.score is not None and correctness_metric.reason is not None
    return correctness_metric.score, correctness_metric.reason


def filter_results(results: list[ResultOut], type: QueryResultType):
    return [result for result in results if result.type == type.value]


@pytest.mark.asyncio
@pytest.mark.expensive
async def test_sample_rows(client: TestClient, sample_conversation: ConversationOut, user_info: dict[str, str]) -> None:
    query = "Show me some sample rows from one of the tables"
    # query = "Show me some sample rows from two of the tables"
    body = {"message_options": {"secure_data": True}}
    with client.stream(
        method="post", url=f"/conversation/{sample_conversation.id}/query", params={"query": query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == query
    ai_message, results = q_out.ai_message.message.content, q_out.ai_message.results
    score, reason = evaluate_ai_message_content(
        ai_message,
        query,
        additional_eval_steps=["The output may mention that it has obtained sample rows but it should not show them."],
    )
    assert score > 0.5, f"{reason=}\n{ai_message=}\n{query=}"
    logger.info(f"{score=}, {reason=}")

    assert len(results) > 0
    expected_results = {
        QueryResultType.SELECTED_TABLES: 1,
        QueryResultType.SQL_QUERY_STRING_RESULT: 1,
        QueryResultType.SQL_QUERY_RUN_RESULT: 1,
        QueryResultType.CHART_GENERATION_RESULT: 0,
    }
    results_map: dict[QueryResultType, list[ResultOut]] = {}
    for result_type, expected_results_count in expected_results.items():
        filtered_results = filter_results(results, result_type)
        assert len(filtered_results) == expected_results_count
        results_map[result_type] = filtered_results

    # SQL query string result
    sql_string_result = results_map[QueryResultType.SQL_QUERY_STRING_RESULT][0]
    generated_sql = cast(str, sql_string_result.content["sql"])
    sql_string_test_case = LLMTestCase(input=query, actual_output=generated_sql)
    sql_correctness_metric = GEval(
        name="Correctness",
        evaluation_steps=[
            "Determine whether the actual output is an sql statement that, if executed, shows some rows from a single table with a few columns"
        ],
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    )

    sql_correctness_metric.measure(sql_string_test_case)
    assert sql_correctness_metric.score is not None and sql_correctness_metric.reason is not None
    assert sql_correctness_metric.score > 0.5, f"{sql_correctness_metric.reason=}\n{sql_string_result=}\n{query=}"
    logger.info(f"{sql_correctness_metric.score=}, {sql_correctness_metric.reason=}")

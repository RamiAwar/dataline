import logging
import os
from typing import Callable, cast

import pytest
import pytest_asyncio
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase
from fastapi.testclient import TestClient

from dataline.models.conversation.schema import ConversationOut
from dataline.models.message.schema import QueryOut
from dataline.models.result.schema import ResultOut
from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import SQLQueryRunResult

logger = logging.getLogger(__name__)


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
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize(
    "query,expected_results",
    [
        (
            "Show me some sample rows from one of the tables",
            {
                QueryResultType.SELECTED_TABLES: lambda x: len(x) == 1,
                QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 1,
                QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 1,
                QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
            },
        ),
        (
            "Show me some sample rows from only two of the tables",
            {
                QueryResultType.SELECTED_TABLES: lambda x: len(x) >= 1,
                QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 2,
                QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 2,
                QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
            },
        ),
    ],
)
async def test_sample_rows(
    client: TestClient,
    sample_conversation: ConversationOut,
    query: str,
    expected_results: dict[QueryResultType, Callable[[list[ResultOut]], bool]],
) -> None:
    """Tests getting sample rows from one table, then from two tables"""
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
    results_map: dict[QueryResultType, list[ResultOut]] = {}
    for result_type, expected_results_check in expected_results.items():
        filtered_results = filter_results(results, result_type)
        assert expected_results_check(filtered_results), f"{result_type=}, {filtered_results=}"
        results_map[result_type] = filtered_results

    # Evaluate SQL query string result(s)
    for sql_string_result in results_map[QueryResultType.SQL_QUERY_STRING_RESULT]:
        generated_sql = cast(str, sql_string_result.content["sql"])
        sql_string_test_case = LLMTestCase(input=query, actual_output=generated_sql)
        sql_correctness_metric = GEval(
            name="Correctness",
            evaluation_steps=[
                (
                    "Determine whether the actual output is an sql statement that, if executed, "
                    "shows some rows from a single table with a few columns"
                )
            ],
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        )

        sql_correctness_metric.measure(sql_string_test_case)
        assert sql_correctness_metric.score is not None and sql_correctness_metric.reason is not None
        assert sql_correctness_metric.score > 0.5, f"{sql_correctness_metric.reason=}\n{sql_string_result=}\n{query=}"
        logger.info(f"{sql_correctness_metric.score=}, {sql_correctness_metric.reason=}")


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize(
    "query,expected_results",
    [
        (
            "What are some example questions I can ask about this data source?",
            {
                QueryResultType.SELECTED_TABLES: lambda x: len(x) <= 2,  # shouldn't exceed 2 for this simple question
                QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 0,
                QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 0,
                QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
            },
        ),
        (
            "What are some interesting tables in this data source?",
            {
                QueryResultType.SELECTED_TABLES: lambda x: len(x) <= 2,
                QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 0,
                QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 0,
                QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
            },
        ),
    ],
)
async def test_explorative(
    client: TestClient,
    sample_conversation: ConversationOut,
    query: str,
    expected_results: dict[QueryResultType, Callable[[list[ResultOut]], bool]],
) -> None:
    """Tests explorative questions"""
    body = {"message_options": {"secure_data": True}}
    with client.stream(
        method="post", url=f"/conversation/{sample_conversation.id}/query", params={"query": query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == query
    ai_message, results = q_out.ai_message.message.content, q_out.ai_message.results
    score, reason = evaluate_ai_message_content(ai_message, query)
    assert score > 0.5, f"{reason=}\n{ai_message=}\n{query=}"
    logger.info(f"{score=}, {reason=}")

    results_map: dict[QueryResultType, list[ResultOut]] = {}
    for result_type, expected_results_check in expected_results.items():
        filtered_results = filter_results(results, result_type)
        assert expected_results_check(filtered_results), f"{result_type=}, {filtered_results=}"
        results_map[result_type] = filtered_results


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
async def test_followup_question(client: TestClient, sample_conversation: ConversationOut) -> None:
    """
    Asks a specific question about a movie, then asks a followup question about the movie without specifying the movie
    name in the second question
    """
    body = {"message_options": {"secure_data": True}}
    first_query = 'Who are the actors in the film "ZORRO ARK"?'  # IAN TANDY - NICK DEGENERES -LISA MONROE
    with client.stream(
        method="post", url=f"/conversation/{sample_conversation.id}/query", params={"query": first_query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == first_query
    ai_message, results = q_out.ai_message.message.content, q_out.ai_message.results
    score, reason = evaluate_ai_message_content(
        ai_message,
        first_query,
        additional_eval_steps=[
            "The output may mention that it has obtained actor names and that they can be viewed, but it should not actually show them.",
            "Vagueness is OK.",
        ],
    )
    assert score > 0.5, f"{reason=}\n{ai_message=}\n{first_query=}"
    logger.info(f"{score=}, {reason=}")

    expected_results = {
        QueryResultType.SELECTED_TABLES: lambda x: len(x) <= 3,
        QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 1,
        QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 1,
        QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
    }
    results_map: dict[QueryResultType, list[ResultOut]] = {}
    for result_type, expected_results_check in expected_results.items():
        filtered_results = filter_results(results, result_type)
        assert expected_results_check(filtered_results), f"{result_type=}, {filtered_results=}"
        results_map[result_type] = filtered_results

    sql_run_result_out = results_map[QueryResultType.SQL_QUERY_RUN_RESULT][0]
    assert sql_run_result_out.linked_id is not None

    sql_run_result = SQLQueryRunResult(
        columns=sql_run_result_out.content.get("columns"),
        rows=sql_run_result_out.content.get("rows"),
        result_id=sql_run_result_out.result_id,
        linked_id=sql_run_result_out.linked_id,
        created_at=sql_run_result_out.created_at,
    )

    assert len(sql_run_result.rows) == 3, f"{sql_run_result.rows=}"
    assert all(col in ["first_name", "last_name"] for col in sql_run_result.columns), f"{sql_run_result.columns=}"
    expected_rows = [["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]]
    assert all(
        row in expected_rows or reversed(row) in expected_rows for row in sql_run_result.rows
    ), f"{sql_run_result.rows=}"

    ######################
    # Follow up question #
    ######################
    second_query = "How much revenue did that movie generate?"  # 214.69
    with client.stream(
        method="post", url=f"/conversation/{sample_conversation.id}/query", params={"query": second_query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == second_query
    ai_message, results = q_out.ai_message.message.content, q_out.ai_message.results
    score, reason = evaluate_ai_message_content(
        ai_message,
        second_query,
        additional_eval_steps=[
            "If the exact revenue is not shown, then the output has done well.",
            "The output may mention that it has calculated the revenue and that it can be viewed in the results.",
            "Vagueness is OK.",
        ],
    )
    assert score > 0.5, f"{reason=}\n{ai_message=}\n{second_query=}"
    logger.info(f"{score=}, {reason=}")

    expected_results = {
        QueryResultType.SELECTED_TABLES: lambda x: len(x) <= 3,
        QueryResultType.SQL_QUERY_STRING_RESULT: lambda x: len(x) == 1,
        QueryResultType.SQL_QUERY_RUN_RESULT: lambda x: len(x) == 1,
        QueryResultType.CHART_GENERATION_RESULT: lambda x: len(x) == 0,
    }
    results_map: dict[QueryResultType, list[ResultOut]] = {}
    for result_type, expected_results_check in expected_results.items():
        filtered_results = filter_results(results, result_type)
        assert expected_results_check(filtered_results), f"{result_type=}, {filtered_results=}"
        results_map[result_type] = filtered_results

    sql_run_result_out = results_map[QueryResultType.SQL_QUERY_RUN_RESULT][0]
    assert sql_run_result_out.linked_id is not None

    sql_run_result = SQLQueryRunResult(
        columns=sql_run_result_out.content.get("columns"),
        rows=sql_run_result_out.content.get("rows"),
        result_id=sql_run_result_out.result_id,
        linked_id=sql_run_result_out.linked_id,
        created_at=sql_run_result_out.created_at,
    )

    assert len(sql_run_result.rows) == 1, f"{sql_run_result.rows=}"
    assert any(
        entry == "214.69" or entry == 214.69 for row in sql_run_result.rows for entry in row
    ), f"{sql_run_result.rows=}"

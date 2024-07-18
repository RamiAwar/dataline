from uuid import UUID

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from fastapi.testclient import TestClient

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.message.schema import QueryOut
from dataline.models.result.schema import ResultOut


def evaluate_message_content(
    generated_message: str,
    query: str,
    eval_steps: list[str],
    raise_if_fail: bool = False,
    eval_params: list[LLMTestCaseParams] | None = None,
) -> GEval:
    """
    Evaluates the content of the generated message against the query.

    Args:
    - generated_message: generated AI message
    - query: human message
    - eval_steps: an explanation of how to evaluate the output
    - raise_if_fail: if True, runs an assertion that the evaluation is successful
    - eval_params: the parameters that are relevant for evaluation
    """
    if eval_params is None:
        eval_params = [LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT]
    test_case = LLMTestCase(input=query, actual_output=generated_message)
    # don't really care about eval name
    correctness_metric = GEval(name="Metric", evaluation_steps=eval_steps, evaluation_params=eval_params)

    correctness_metric.measure(test_case)
    if raise_if_fail:
        assert correctness_metric.is_successful(), "\n".join(
            [
                f"score={correctness_metric.score}",
                f"reason={correctness_metric.reason}",
                f"{query=}",
                f"{generated_message=}",
            ]
        )
    return correctness_metric


def get_results_of_type(result_type: QueryResultType, response: QueryOut) -> list[ResultOut]:
    return [result for result in response.ai_message.results if result.type == result_type.value]


def get_query_out_from_stream(lines: list[str]) -> QueryOut:
    assert len(lines) >= 3
    assert lines[-3] == "event: stored_messages_event"
    assert lines[-2].startswith("data: ")

    return QueryOut.model_validate_json(lines[-2].lstrip("data: "))


def call_query_endpoint(client: TestClient, conversation_id: UUID, query: str) -> QueryOut:
    body = {"message_options": {"secure_data": True}}
    with client.stream(
        method="post", url=f"/conversation/{conversation_id}/query", params={"query": query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == query
    return q_out

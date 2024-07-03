from abc import ABC, abstractmethod
import logging
import operator
import os
from typing import Any, Callable, ClassVar, Self, cast
from uuid import UUID

from pydantic import BaseModel, model_validator
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


def evaluate_message_content(
    generated_message: str,
    query: str,
    eval_steps: list[str],
    raise_if_fail: bool = False,
    metric_name: str = "Relevance",
    eval_params: list[LLMTestCaseParams] = [LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
) -> GEval:
    """
    Args:
    - generated_message: string message from the AI
    - query: human message
    - eval_steps: an explanation of how to evaluate the output
    - raise_if_fail: if True, runs an assertion that the evaluation is successful
    - metric_name: Name of the evaluation metric. I think this affects the score, need to double check
    - eval_params: the parameters that are relevant for evaluation
    """
    test_case = LLMTestCase(input=query, actual_output=generated_message)
    correctness_metric = GEval(name=metric_name, evaluation_steps=eval_steps, evaluation_params=eval_params)

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


EvalName = str


class EvalBlockBase(ABC, BaseModel):
    # https://github.com/pydantic/pydantic/discussions/2410#discussioncomment-408613
    @property
    @abstractmethod
    def name(self) -> EvalName:
        """The name of the test"""

    @abstractmethod
    def evaluate(self, response: QueryOut) -> float:
        raise NotImplementedError


def get_results_of_type(result_type: QueryResultType, response: QueryOut):
    return [result for result in response.ai_message.results if result.type == result_type.value]


class EvalAIText(EvalBlockBase):
    name: ClassVar[str] = "ai_text_evaluation"
    eval_steps: list[str]

    def evaluate(self, response: QueryOut) -> float:
        ai_text = response.ai_message.message.content
        evaluation = evaluate_message_content(ai_text, response.human_message.content, self.eval_steps)
        return evaluation.score or 0.0  # score: float | None is annoying


class Comparator(BaseModel):
    operator: Callable[[int, int], bool]
    number: int

    def compare(self, results_list: list[ResultOut]) -> bool:
        return self.operator(len(results_list), self.number)


class EvalCountResult(EvalBlockBase):
    name: ClassVar[str] = "result_count_evaluation"
    results_evals: dict[QueryResultType, Comparator]

    def evaluate(self, response: QueryOut) -> float:
        total_comparisons = len(self.results_evals) or 1
        checks_passed = 0
        for result_type, comparator in self.results_evals.items():
            filtered_results = get_results_of_type(result_type, response)
            if comparator.compare(filtered_results):
                checks_passed += 1
        return checks_passed * 1.0 / total_comparisons


class EvalSQLString(EvalBlockBase):
    name: ClassVar[str] = "sql_string_evaluation"
    metric_name: str
    eval_steps: list[str]
    eval_params: list[LLMTestCaseParams] = [LLMTestCaseParams.ACTUAL_OUTPUT]

    def evaluate(self, response: QueryOut) -> float:
        sql_string_results = get_results_of_type(QueryResultType.SQL_QUERY_STRING_RESULT, response)
        if len(sql_string_results) == 0:
            return 0.0  # we'd expect there to be an sql string if we use this eval block
        sum_scores = 0.0
        for sql_str_res in sql_string_results:
            generated_sql = cast(str, sql_str_res.content["sql"])
            evaluation = evaluate_message_content(
                generated_sql,
                response.human_message.content,
                self.eval_steps,
                metric_name=self.metric_name,
                eval_params=self.eval_params,
            )
            sum_scores += evaluation.score or 0.0
        return sum_scores / len(sql_string_results)


class EvalSQLRun(EvalBlockBase):
    # TODO: currently assumes we expect one SQLRun
    name: ClassVar[str] = "sql_run_evaluation"
    expected_row_count: int | None = None
    expected_col_names: list[str] | None = None
    expected_row_values: list[list[Any]] | None = None

    @staticmethod
    def result_out_to_sql_run_result(result_out: ResultOut) -> SQLQueryRunResult:
        assert result_out.linked_id is not None
        return SQLQueryRunResult(
            columns=result_out.content.get("columns"),
            rows=result_out.content.get("rows"),
            result_id=result_out.result_id,
            linked_id=result_out.linked_id,
            created_at=result_out.created_at,
        )

    def evaluate(self, response: QueryOut) -> float:
        scores: dict[str, float] = {}
        sql_run_results = get_results_of_type(QueryResultType.SQL_QUERY_RUN_RESULT, response)
        if len(sql_run_results) == 0:
            return 0.0
        sql_run_result_out = sql_run_results[0]
        sql_run_result = self.result_out_to_sql_run_result(sql_run_result_out)

        if self.expected_row_count is not None:
            scores["expected_row_count"] = float(len(sql_run_result.rows) == self.expected_row_count)

        if self.expected_col_names:
            cols_present = len([col in sql_run_result.columns for col in self.expected_col_names])
            scores["expected_col_names"] = cols_present * 1.0 / len(self.expected_col_names)

        if self.expected_row_values:
            rows_present = 0
            for expected_row in self.expected_row_values:
                expected_row_set = set(expected_row)
                for row in sql_run_result.rows:
                    row_set = set(row)
                    if expected_row_set.issubset(row_set):
                        rows_present += 1
                        break
            scores["expected_row_values"] = rows_present * 1.0 / len(self.expected_row_values)

        return sum(val for val in scores.values()) / len(scores)

    @model_validator(mode="after")
    def check_any_evaluation_present(self) -> Self:
        has_evaluation_present = (
            bool(self.expected_col_names) or self.expected_row_count is not None or bool(self.expected_row_values)
        )
        if not has_evaluation_present:
            raise ValueError("Must have at least one of expected_col_names, expected_row_count, expected_row_values")
        return self


class TestCase(BaseModel):
    __test__ = False  # so pytest doesn't collect this as a test
    test_name: str
    query: str
    evaluations: list[EvalBlockBase]

    def run(self, client: TestClient, conversation_id: UUID):
        evaluation_results: list[tuple[str, float]] = []
        response = call_query_endpoint(client, conversation_id, self.query)
        for evaluation in self.evaluations:
            eval_score = evaluation.evaluate(response)
            evaluation_results.append((evaluation.name, eval_score))
        logger.warning(f"Scores for test '{self.test_name}':")
        logger.warning(evaluation_results)
        return evaluation_results


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


def call_query_endpoint(client: TestClient, conversation_id: UUID, query: str) -> QueryOut:
    body = {"message_options": {"secure_data": True}}
    with client.stream(
        method="post", url=f"/conversation/{conversation_id}/query", params={"query": query}, json=body
    ) as response:
        assert response.status_code == 200
        q_out = get_query_out_from_stream(list(response.iter_lines()))

    assert q_out.human_message.content == query
    return q_out


sample_rows_test_case_1 = TestCase(
    test_name="Sample Rows Test 1",
    query="Show me some sample rows from one of the tables",
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                "The output may mention that it has obtained sample rows but it should not show them.",
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.eq, number=1),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
        EvalSQLString(
            metric_name="Correctness",
            eval_steps=[
                (
                    "Determine whether the actual output is an sql statement that, if executed, "
                    "shows some rows from a single table with a few columns"
                )
            ],
        ),
    ],
)

sample_rows_test_case_2 = TestCase(
    test_name="Sample Rows Test 2",
    query="Show me some sample rows from only two of the tables",
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                "The output may mention that it has obtained sample rows but it should not show them.",
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.ge, number=1),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=2),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=2),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
        EvalSQLString(
            metric_name="Correctness",
            eval_steps=[
                (
                    "Determine whether the actual output is an sql statement that, if executed, "
                    "shows some rows from a single table with a few columns"
                )
            ],
        ),
    ],
)


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize("test_cases", [[sample_rows_test_case_1], [sample_rows_test_case_2]])
async def test_sample_rows(client: TestClient, sample_conversation: ConversationOut, test_cases: list[TestCase]):
    """Tests getting sample rows from one table, then from two tables"""
    for test_case in test_cases:
        test_case.run(client, sample_conversation.id)


explorative_test_case_1 = TestCase(
    test_name="Explorative Test 1",
    query="What are some example questions I can ask about this data source?",
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.le, number=2),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=0),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=0),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
    ],
)

explorative_test_case_2 = TestCase(
    test_name="Explorative Test 2",
    query="What are some interesting tables in this data source?",
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.le, number=2),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=0),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=0),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
    ],
)


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize("test_cases", [[explorative_test_case_1], [explorative_test_case_2]])
async def test_explorative(
    client: TestClient, sample_conversation: ConversationOut, test_cases: list[TestCase]
) -> None:
    """Tests explorative questions"""
    for test_case in test_cases:
        test_case.run(client, sample_conversation.id)


followup_question_test_case_part_1 = TestCase(
    test_name="Followup Question Test Part 1",
    query='Who are the actors in the film "ZORRO ARK"?',
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                "The output may mention that it has obtained actor names and that they can be viewed, but it should not actually show them.",
                "Vagueness is OK.",
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.le, number=3),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
        EvalSQLRun(
            expected_row_count=3,
            expected_col_names=["first_name", "last_name"],
            expected_row_values=[["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]],
        ),
    ],
)

followup_question_test_case_part_2 = TestCase(
    test_name="Followup Question Test Part 2",
    query="How much revenue did that movie generate?",
    evaluations=[
        EvalAIText(
            eval_steps=[
                "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                "If the exact revenue is not shown, then the output has done well.",
                "The output may mention that it has calculated the revenue and that it can be viewed in the results.",
                "Vagueness is OK.",
            ]
        ),
        EvalCountResult(
            results_evals={
                QueryResultType.SELECTED_TABLES: Comparator(operator=operator.le, number=3),
                QueryResultType.SQL_QUERY_STRING_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.SQL_QUERY_RUN_RESULT: Comparator(operator=operator.eq, number=1),
                QueryResultType.CHART_GENERATION_RESULT: Comparator(operator=operator.eq, number=0),
            },
        ),
        EvalSQLRun(
            expected_row_count=1,
            expected_row_values=[[214.69]],
        ),
    ],
)


@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize("test_cases", [[followup_question_test_case_part_1, followup_question_test_case_part_2]])
async def test_followup_question(
    client: TestClient, sample_conversation: ConversationOut, test_cases: list[TestCase]
) -> None:
    """
    Asks a specific question about a movie, then asks a followup question about the movie without specifying the movie
    name in the second question
    """
    for test_case in test_cases:
        test_case.run(client, sample_conversation.id)

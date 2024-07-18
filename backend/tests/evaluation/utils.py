from abc import ABC, abstractmethod
from enum import Enum, StrEnum
from typing import Any, Callable, ClassVar, NamedTuple, Self, Sequence, cast
from uuid import UUID

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from fastapi.testclient import TestClient
from pydantic import BaseModel, model_validator

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import ResultType, SQLQueryRunResult
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
    correctness_metric = GEval(
        name="Metric", model="gpt-3.5-turbo", evaluation_steps=eval_steps, evaluation_params=eval_params
    )

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


EvalName = str


class Tag(StrEnum):
    RESPONSE_QUALITY = "Response Quality"
    DATA_RESULTS_ACCURACY = "Data Results Accuracy"
    SQL_QUALITY = "SQL Quality"
    EXPLORATION_ABILITY = "Exploration Ability"
    MULTI_QUESTION_ACCURACY = "Multi-Question Accuracy"
    FOLLOWUP_ABILITY = "Followup Ability"


class TestMetadata(NamedTuple):
    weight: float = 1.0
    tags: Sequence[Tag] = []


class EvalBlockBase(ABC, BaseModel):
    metadata: TestMetadata = TestMetadata()

    # https://github.com/pydantic/pydantic/discussions/2410#discussioncomment-408613
    @property
    @abstractmethod
    def name(self) -> EvalName:
        """The name of the test"""

    @abstractmethod
    def evaluate(self, response: QueryOut) -> float:
        raise NotImplementedError


class EvalAIText(EvalBlockBase):
    name: ClassVar[str] = "ai_text_evaluation"
    eval_steps: list[str]

    def evaluate(self, response: QueryOut) -> float:
        ai_text = response.ai_message.message.content
        evaluation = evaluate_message_content(ai_text, response.human_message.content, self.eval_steps)
        return evaluation.score or 0.0  # score: float | None is annoying


def comparator(operator: Callable[[int, int], bool], number: int) -> Callable[[int], bool]:
    return lambda x: operator(x, number)


class EvalCountResultTuple(NamedTuple):
    comparator: Callable[[int], bool]
    weight: float = 1.0


class EvalCountResult(EvalBlockBase):
    name: ClassVar[str] = "result_count_evaluation"
    results_evals: dict[QueryResultType, EvalCountResultTuple]

    def evaluate(self, response: QueryOut) -> float:
        checks_passed = 0
        total_weights: float = 0.0
        for result_type, result_tuple in self.results_evals.items():
            total_weights += result_tuple.weight
            filtered_results = get_results_of_type(result_type, response)
            if result_tuple.comparator(len(filtered_results)):
                checks_passed += 1
        return checks_passed / total_weights


class EvalSQLString(EvalBlockBase):
    name: ClassVar[str] = "sql_string_evaluation"
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
                eval_params=self.eval_params,
            )
            sum_scores += evaluation.score or 0.0
        return sum_scores / len(sql_string_results)


class EvalSQLRun(EvalBlockBase):
    # TODO: currently assumes we expect one SQLRun
    name: ClassVar[str] = "sql_run_evaluation"
    expected_row_count: int | None = None
    expected_col_names: list[str] | None = None
    expected_row_values: list[list[Any]] | None = None  # type: ignore[misc]

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


class Message(BaseModel):
    content: str


# options: Optional[MessageOptions]  # Kept for when we test msg options


class MessageWithResults(BaseModel):
    message: Message
    results: list[ResultType]


class MessagePair(BaseModel):
    human_message: Message
    ai_message: MessageWithResults


class TestCase(BaseModel):
    __test__ = False  # so pytest doesn't collect this as a test
    test_name: str
    message_history: list[MessagePair] = []
    query: str
    evaluations: list[EvalBlockBase]
    scores: list[float] = []
    total_score: float | None = None

    def run(self, client: TestClient, conversation_id: UUID) -> list[tuple[str, float]]:
        evaluation_results: list[tuple[str, float]] = []
        response = call_query_endpoint(client, conversation_id, self.query)
        for evaluation in self.evaluations:
            eval_score = evaluation.evaluate(response) * evaluation.metadata.weight
            self.scores.append(eval_score)
        total_weights = sum(e.metadata.weight for e in self.evaluations)
        total_score = sum([e[1] for e in evaluation_results]) / total_weights
        self.total_score = total_score
        return evaluation_results

from abc import ABC, abstractmethod
import csv
import logging
import operator
import os
from pathlib import Path
from typing import Any, Callable, ClassVar, NamedTuple, Self, Sequence, cast
from uuid import UUID, uuid4

from pydantic import BaseModel, model_validator
import pytest
import pytest_asyncio
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase
from fastapi.testclient import TestClient

from dataline.models.conversation.schema import ConversationOut
from dataline.models.message.schema import BaseMessageType, MessageCreate, QueryOut
from dataline.models.result.schema import ResultOut
from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import (
    ResultType,
    SQLQueryRunResult,
    SQLQueryStringResult,
    SelectedTablesResult,
    StorableResultMixin,
)
from dataline.repositories.base import AsyncSession
from dataline.repositories.message import MessageRepository
from dataline.repositories.result import ResultRepository

logger = logging.getLogger(__name__)


def evaluate_message_content(
    generated_message: str,
    query: str,
    eval_steps: list[str],
    raise_if_fail: bool = False,
    eval_params: list[LLMTestCaseParams] | None = None,
) -> GEval:
    """
    Args:
    - generated_message: string message from the AI
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


def get_results_of_type(result_type: QueryResultType, response: QueryOut):
    return [result for result in response.ai_message.results if result.type == result_type.value]


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


class TestBlock(NamedTuple):
    eval_block: EvalBlockBase
    weight: float = 1.0
    tags: Sequence[str] = []


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
    history: list[MessagePair] = []
    query: str
    evaluations: list[TestBlock]
    scores: list[float] = []
    total_score: float | None = None

    def run(self, client: TestClient, conversation_id: UUID):
        evaluation_results: list[tuple[str, float]] = []
        response = call_query_endpoint(client, conversation_id, self.query)
        for evaluation in self.evaluations:
            eval_score = evaluation.eval_block.evaluate(response) * evaluation.weight
            self.scores.append(eval_score)
        total_weights = sum(e.weight for e in self.evaluations)
        total_score = sum([e[1] for e in evaluation_results]) / total_weights
        self.total_score = total_score
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


###################################### test simple questions ######################################
### Tests simple questions

simple_question_test_case = TestCase(
    test_name="Simple Question Test",
    query='Who are the actors in the film "ZORRO ARK"?',
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained actor names and that they can be viewed, but it should not actually show them.",
                    "Vagueness is OK.",
                ]
            ),
            tags=["Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.le, number=3)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
        TestBlock(
            EvalSQLRun(
                expected_row_count=3,
                expected_col_names=["first_name", "last_name"],
                expected_row_values=[["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]],
            ),
            tags=["Data Results Accuracy"],
        ),
    ],
)

###################################### testing sample rows ######################################
### Tests getting sample rows from one table, then from two tables

sample_rows_test_case_1 = TestCase(
    test_name="Sample Rows Test 1",
    query="Show me some sample rows from one of the tables",
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained sample rows but it should not show them.",
                ]
            ),
            tags=["Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.eq, number=1)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
        TestBlock(
            EvalSQLString(
                eval_steps=[
                    (
                        "Determine whether the actual output is an sql statement that, if executed, "
                        "shows some rows from a single table with a few columns"
                    )
                ],
            ),
            tags=["SQL Quality"],
        ),
    ],
)

sample_rows_test_case_2 = TestCase(
    test_name="Sample Rows Test 2",
    query="Show me some sample rows from only two of the tables",
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained sample rows but it should not show them.",
                ]
            ),
            tags=["Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.ge, number=1)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=2)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=2)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
        TestBlock(
            EvalSQLString(
                eval_steps=[
                    (
                        "Determine whether the actual output is an sql statement that, if executed, "
                        "shows some rows from a single table with a few columns"
                    )
                ],
            ),
            tags=["SQL Quality"],
        ),
    ],
)

###################################### test explorative questions ######################################
### Tests explorative questions

explorative_test_case_1 = TestCase(
    test_name="Explorative Test 1",
    query="What are some example questions I can ask about this data source?",
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
                ]
            ),
            tags=["Exploration", "Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.le, number=2)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
    ],
)

explorative_test_case_2 = TestCase(
    test_name="Explorative Test 2",
    query="What are some interesting tables in this data source?",
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
                ]
            ),
            tags=["Exploration", "Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.le, number=2)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
    ],
)

###################################### test followup question ######################################
### Asks a specific question about a movie, then asks a followup question about the movie without specifying the movie
### name in the second question

str_result_id = uuid4()

followup_question_test_case = TestCase(
    test_name="Followup Question",
    query="How much revenue did that movie generate?",
    history=[
        MessagePair(
            human_message=Message(content='Who are the actors in the film "ZORRO ARK"?'),
            ai_message=MessageWithResults(
                message=Message(
                    content='The actors in the film "ZORRO ARK" are listed in the results of the query. You can view their first and last names in the data returned. There are three actors associated with this film.'
                ),
                results=[
                    SelectedTablesResult(tables=["film", "actor", "film_actor"], linked_id=str_result_id),
                    SQLQueryStringResult(
                        sql="SELECT actor.first_name, actor.last_name FROM actor JOIN film_actor ON actor.actor_id = film_actor.actor_id JOIN film ON film.film_id = film_actor.film_id WHERE film.title = 'ZORRO ARK'",
                        result_id=str_result_id,
                    ),
                    SQLQueryRunResult(
                        columns=["first_name", "last_name"],
                        rows=[["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]],
                        linked_id=str_result_id,
                    ),
                ],
            ),
        )
    ],
    evaluations=[
        TestBlock(
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "If the exact revenue is not shown, then the output has done well.",
                    "The output may mention that it calculated the revenue and that it can be viewed in the results.",
                    "Vagueness is OK.",
                ]
            ),
            tags=["Response Quality"],
        ),
        TestBlock(
            EvalCountResult(
                results_evals={
                    QueryResultType.SELECTED_TABLES: EvalCountResultTuple(comparator(operator=operator.le, number=3)),
                    QueryResultType.SQL_QUERY_STRING_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.SQL_QUERY_RUN_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=1)
                    ),
                    QueryResultType.CHART_GENERATION_RESULT: EvalCountResultTuple(
                        comparator(operator=operator.eq, number=0)
                    ),
                },
            )
        ),
        TestBlock(
            EvalSQLRun(
                expected_row_count=1,
                expected_row_values=[[214.69]],
            ),
            tags=["Data Results Accuracy", "Multi-Question Accuracy"],
        ),
    ],
)


@pytest.fixture(scope="session")
def result_recorder():
    results = []

    def add_result(test_case: TestCase):
        for evaluation, score in zip(test_case.evaluations, test_case.scores):
            results.append(
                {
                    "name": test_case.test_name,
                    "evaluation": evaluation.eval_block.name,
                    "score": score,
                    "tags": " - ".join(evaluation.tags),
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


@pytest.fixture
def populate_conversation_history(session: AsyncSession):
    msg_repo = MessageRepository()
    result_repo = ResultRepository()

    async def wraps(history: list[MessagePair], conversation_id: UUID):
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


# TODO: Think of message history (look at followup question tests for example)
@pytest.mark.asyncio
@pytest.mark.expensive
@pytest.mark.usefixtures("user_info")  # to have a valid user in the db
@pytest.mark.parametrize(
    "test_case",
    [
        simple_question_test_case,
        sample_rows_test_case_1,
        sample_rows_test_case_2,
        explorative_test_case_1,
        explorative_test_case_2,
        followup_question_test_case,
    ],
)
async def test_llm(
    client: TestClient,
    sample_conversation: ConversationOut,
    test_case: TestCase,
    result_recorder,
    populate_conversation_history,
):
    await populate_conversation_history(test_case.history, sample_conversation.id)
    test_case.run(client, sample_conversation.id)
    result_recorder(test_case)

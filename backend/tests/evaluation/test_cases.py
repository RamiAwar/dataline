import operator
from uuid import uuid4

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.llm_flow.schema import (
    SelectedTablesResult,
    SQLQueryRunResult,
    SQLQueryStringResult,
)
from tests.evaluation.utils import (
    EvalAIText,
    EvalCountResult,
    EvalCountResultTuple,
    EvalSQLRun,
    EvalSQLString,
    Message,
    MessagePair,
    MessageWithResults,
    Tag,
    TestCase,
    TestMetadata,
    comparator,
)

PRESET_UUID = uuid4()

TEST_CASES = [
    TestCase(
        test_name="Simple Question Test",
        query='Who are the actors in the film "ZORRO ARK"?',
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained actor names and that they can be viewed, but it should not actually show them.",
                    "Vagueness is OK.",
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY]),
            ),
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
            ),
            EvalSQLRun(
                expected_row_count=3,
                expected_col_names=["first_name", "last_name"],
                expected_row_values=[["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]],
                metadata=TestMetadata(tags=[Tag.DATA_RESULTS_ACCURACY]),
            ),
        ],
    ),
    # Tests getting sample rows from one table, then from two tables
    TestCase(
        test_name="Sample Rows Test 1",
        query="Show me some sample rows from one of the tables",
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained sample rows but it should not show them or any data.",
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY]),
            ),
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
            ),
            EvalSQLString(
                eval_steps=[
                    (
                        "Determine whether the actual output is an sql statement that, if executed, "
                        "shows some rows from a single table with a few columns"
                    )
                ],
                metadata=TestMetadata(tags=[Tag.SQL_QUALITY]),
            ),
        ],
    ),
    TestCase(
        test_name="Sample Rows Test 2",
        query="Show me some sample rows from only two of the tables",
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "The output may mention that it has obtained sample rows but it should not show them.",
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY]),
            ),
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
            ),
            EvalSQLString(
                eval_steps=[
                    (
                        "Determine whether the actual output is an sql statement that, if executed, "
                        "shows some rows from a single table with a few columns"
                    )
                ],
                metadata=TestMetadata(tags=[Tag.SQL_QUALITY]),
            ),
        ],
    ),
    # Tests explorative questions
    TestCase(
        test_name="Explorative Test 1",
        query="What are some example questions I can ask about this data source?",
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY, Tag.EXPLORATION_ABILITY]),
            ),
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
            ),
        ],
    ),
    TestCase(
        test_name="Explorative Test 2",
        query="What are some interesting tables in this data source?",
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful."
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY, Tag.EXPLORATION_ABILITY]),
            ),
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
            ),
        ],
    ),
    # Testing followups
    # Asks a specific question about a movie, then asks a followup question about the movie without specifying the movie
    # name in the second question
    TestCase(
        test_name="Followup Question",
        query="How much revenue did that movie generate?",
        message_history=[
            MessagePair(
                human_message=Message(content='Who are the actors in the film "ZORRO ARK"?'),
                ai_message=MessageWithResults(
                    message=Message(
                        content=(
                            "The actors in the film 'ZORRO ARK' are listed in the results of the query."
                            "You can view their first and last names in the data returned. There are three actors associated with this film."
                        ),
                    ),
                    results=[
                        SelectedTablesResult(tables=["film", "actor", "film_actor"], linked_id=PRESET_UUID),
                        SQLQueryStringResult(
                            sql="""
                        SELECT actor.first_name, actor.last_name
                        FROM actor
                        JOIN film_actor ON actor.actor_id = film_actor.actor_id
                        JOIN film ON film.film_id = film_actor.film_id
                        WHERE film.title = 'ZORRO ARK'""",
                            result_id=PRESET_UUID,
                        ),
                        SQLQueryRunResult(
                            columns=["first_name", "last_name"],
                            rows=[["IAN", "TANDY"], ["NICK", "DEGENERES"], ["LISA", "MONROE"]],
                            linked_id=PRESET_UUID,
                        ),
                    ],
                ),
            )
        ],
        evaluations=[
            EvalAIText(
                eval_steps=[
                    "Determine whether the actual output is relevant to the input, while staying friendly and helpful.",
                    "If the exact revenue is not shown, then the output has done well.",
                    "The output may mention that it calculated the revenue and that it can be viewed in the results.",
                    "Vagueness is OK.",
                ],
                metadata=TestMetadata(tags=[Tag.RESPONSE_QUALITY]),
            ),
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
            ),
            EvalSQLRun(
                expected_row_count=1,
                expected_row_values=[[214.69]],
                metadata=TestMetadata(tags=[Tag.DATA_RESULTS_ACCURACY, Tag.FOLLOWUP_ABILITY]),
            ),
        ],
    ),
]

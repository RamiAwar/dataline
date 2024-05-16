import json
import logging
from typing import Any, TypedDict

from sqlalchemy import create_engine, inspect

from dataline import db
from dataline.context_builder import CustomSQLContextContainerBuilder
from dataline.errors import GenerationError, RelatedTablesNotFoundError
from dataline.models.connection.schema import Connection
from dataline.old_models import SQLQueryResult, UnsavedResult
from dataline.query_manager import SQLQueryManager
from dataline.sql_wrapper import CustomSQLDatabase

logger = logging.getLogger(__name__)


class SQLResults(TypedDict):
    result: list[dict[str, Any]]
    columns: list[str]


class TempQueryService:
    def __init__(self, connection: Connection) -> None:
        self.session = connection
        self.engine = create_engine(connection.dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)

    def run_sql(self, sql: str):
        results = self.sql_db.run_sql(sql)
        if results and len(results) > 1:
            return results[1]

        raise Exception("Uknown error running sql, got no results: ", results)


class QueryService:
    def __init__(
        self,
        connection: Connection,
        openai_api_key: str,
        model_name: str,
        temperature: float = 0.0,
    ) -> None:
        self.session = connection
        self.engine = create_engine(connection.dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)
        self.context_builder = CustomSQLContextContainerBuilder(
            connection, self.sql_db, openai_api_key=openai_api_key, model=model_name
        )
        self.query_manager = SQLQueryManager(
            dsn=connection.dsn, openai_api_key=openai_api_key, model=model_name, temperature=temperature
        )

    async def get_related_tables(self, query: str, message_history: list[dict] = []) -> tuple[str, list[str]]:
        # Fetch table context
        context_str, table_names = await self.context_builder.get_relevant_table_context(
            query_str=query,
            store_context_str=True,
            message_history=message_history,
        )

        # If no table schemas found for context, raise error
        if context_str.strip() == "":
            raise RelatedTablesNotFoundError

        return context_str, table_names

    async def query(self, query: str, conversation_id: str) -> SQLQueryResult:
        # Query with table context
        message_history = db.get_message_history_with_selected_tables_with_sql(conversation_id)

        # Fetch table context
        context_str, table_names = await self.get_related_tables(query, message_history)

        # Add user message to message history
        db.add_message_to_conversation(conversation_id, content=query, role="user", selected_tables=table_names)

        generated_json = "".join(
            self.query_manager.query(query, table_context=context_str, message_history=message_history)
        )
        data = json.loads(generated_json)
        result = SQLQueryResult(**data, selected_tables=table_names)

        if result.sql:
            # Validate SQL
            valid, error = self.sql_db.validate_sql(result.sql)
            if not valid:
                logger.debug("\n\n------------------\n\n")
                logger.debug("Reasking...")
                logger.debug("\n\n------------------\n\n")
                # Reask with error
                generated_json = "".join(self.query_manager.reask(query, result.sql, context_str, error))
                data = json.loads(generated_json)

                # TODO: Add invalid SQL status to result type so it can be communicated to frontend  # noqa
                # Return all generated data + selected tables
                return SQLQueryResult(**data, selected_tables=table_names)

        return result

    def run_sql(self, sql: str):
        results = self.sql_db.run_sql(sql)
        if results and len(results) > 1:
            return results[1]

        raise Exception("Uknown error running sql, got no results: ", results)


def results_from_query_response(query_response: SQLQueryResult) -> list[UnsavedResult]:
    results = []
    if query_response.success:
        if query_response.text:
            results.append(UnsavedResult(type="text", content=query_response.text))

        if query_response.sql:
            results.append(UnsavedResult(type="sql", content=query_response.sql))

        if query_response.selected_tables:
            results.append(
                # Serialize selected_tables into string to save in db
                UnsavedResult(
                    type="selected_tables",
                    content=",".join(query_response.selected_tables),
                )
            )

        if query_response.chart_request:
            # TODO: DO STUFF
            pass
    else:
        raise GenerationError

    return results

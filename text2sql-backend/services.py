import json
from typing import Any, Dict, List, TypedDict

from sqlalchemy import create_engine, inspect

import db
from context_builder import CustomSQLContextContainerBuilder
from errors import GenerationError, RelatedTablesNotFoundError
from models import SQLQueryResult, UnsavedResult
from query_manager import SQLQueryManager
from sql_wrapper import CustomSQLDatabase


class SQLResults(TypedDict):
    result: List[Dict[str, Any]]
    columns: List[str]


class QueryService:
    def __init__(
        self,
        dsn: str,
        model_name: str = "gpt-3.5-turbo",
        temperature: int = 0.0,
    ):
        self.engine = create_engine(dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)
        self.context_builder = CustomSQLContextContainerBuilder(self.sql_db)

        self.query_manager = SQLQueryManager(
            dsn=dsn, model=model_name, temperature=temperature
        )

    def get_related_tables(self, query: str):
        # Fetch table context
        context_str = self.context_builder.query_index_for_context(
            query_str=query,
            store_context_str=True,
        )

        # If no table schemas found for context, raise error
        if context_str.strip() == "":
            raise RelatedTablesNotFoundError

        return context_str

    def query(self, query: str, conversation_id: str) -> List[UnsavedResult]:
        # Fetch table context
        context_str = self.get_related_tables(query)

        # Query with table context
        message_history = db.get_message_history_with_sql(conversation_id)

        generated_json = "".join(
            self.query_manager.query(
                query, table_context=context_str, message_history=message_history
            )
        )
        print("GENERATED JSON:\n", generated_json)
        data = json.loads(generated_json)
        result = SQLQueryResult(**data)

        if result.sql:
            # Validate SQL
            valid, error = self.sql_db.validate_sql(result.sql)
            if not valid:
                print("Reasking...")
                # Reask with error
                generated_json = "".join(
                    self.query_manager.reask(query, result.sql, context_str, error)
                )
                data = json.loads(generated_json)

                # TODO: Add invalid SQL status to result type so it can be communicated to frontend
                return SQLQueryResult(**data)

        return result

    def results_from_query_response(
        self, query_response: SQLQueryResult
    ) -> List[UnsavedResult]:
        results = []
        if query_response.success:
            if query_response.text:
                results.append(UnsavedResult(type="text", content=query_response.text))

            if query_response.sql:
                results.append(UnsavedResult(type="sql", content=query_response.sql))

            if query_response.chart_request:
                # TODO: DO STUFF
                pass
        else:
            raise GenerationError

        return results

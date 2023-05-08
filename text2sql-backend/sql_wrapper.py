"""SQL wrapper around SQLDatabase in langchain."""

import logging
from contextvars import ContextVar
from typing import Dict, Tuple

from llama_index.langchain_helpers.sql_wrapper import SQLDatabase
from sqlalchemy import text

logger = logging.getLogger(__name__)

request_limit = ContextVar[int]("request_limit")
request_execute = ContextVar[bool]("request_execute")


class CustomSQLDatabase(SQLDatabase):
    """Custom SQL Database wrapper"""

    def run_sql(self, command: str) -> Tuple[str, Dict]:
        """Execute a SQL statement and return a string representing the results.

        If the statement returns rows, the results are returned.
        If the statement returns no rows, an empty object is returned.
        """
        if not command:
            return {}, {}

        limit = request_limit.get()
        execute = request_execute.get()

        if not execute:
            return {}, {}

        with self._engine.connect() as connection:
            connection = connection.execution_options(
                isolation_level="SERIALIZABLE",
                postgresql_readonly=True,
                postgresql_deferrable=True,
            )

            if command.strip().endswith(";"):
                command = command.strip()[:-1]

            # Add limit clause
            if "LIMIT" not in command:
                # Don't add limit if it's already there from query
                command = f"{command} LIMIT {limit};"

            q = text(command)

            with connection.begin():
                cursor = connection.execute(q)

                if cursor.returns_rows:
                    result = cursor.fetchall()
                    return result, {"result": result, "columns": list(cursor.keys())}
        return {}, {}

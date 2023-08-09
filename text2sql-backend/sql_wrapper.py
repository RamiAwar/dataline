"""SQL wrapper around SQLDatabase in langchain."""

import logging
from collections import defaultdict
from contextvars import ContextVar
from typing import Dict, Iterable, Tuple

from llama_index.langchain_helpers.sql_wrapper import SQLDatabase
from rapidfuzz import fuzz
from sqlalchemy import text

logger = logging.getLogger(__name__)

request_limit = ContextVar[int]("request_limit")
request_execute = ContextVar[bool]("request_execute")


class CustomSQLDatabase(SQLDatabase):
    """Custom SQL Database wrapper"""

    def get_table_names(self) -> Iterable[str]:
        """Get names of tables available."""
        return self.get_usable_table_names()

    def get_closest_table_name(self, table_name):
        """Get the closest table name to the given table name."""
        table_names = self.get_usable_table_names()
        if table_name in table_names:
            return table_name
        else:
            closest = max(table_names, key=lambda x: fuzz.ratio(x, table_name))
            closest_ratio = fuzz.ratio(closest, table_name)
            if closest_ratio < 80:
                return None
            return closest

    def get_simple_schema(self) -> Dict[str, Dict[str, str]]:
        schema = {}
        for table in self.get_usable_table_names():
            schema[table] = {}
            for column in self.get_table_columns(table):
                schema[table][column["name"]] = {"type": column["type"]}

            # Get foreign keys
            for fk in self._inspector.get_foreign_keys(table):
                schema[table][fk["constrained_columns"][0]]["foreign_key"] = {
                    "table": fk["referred_table"],
                    "column": fk["referred_columns"][0],
                }

        # Create a nicely formatted schema for each table
        for table, columns in schema.items():
            formatted_schema = []
            formatted_schema.append(f"Table: {table}\n")
            for column, column_info in columns.items():
                formatted_schema.append(f"Column: {column}")
                for info, value in column_info.items():
                    formatted_schema.append(f"        {info}: {value}")
            schema[table] = "\n".join(formatted_schema)

        return schema

    def get_schema_foreign_keys(self) -> Dict[str, Dict[str, str]]:
        schema = {}

        # Loop through the tables
        for table in self.get_usable_table_names():
            schema[table] = defaultdict(dict)

            # Get foreign keys
            for fk in self._inspector.get_foreign_keys(table):
                schema[table][fk["constrained_columns"][0]]["foreign_key"] = {
                    "table": fk["referred_table"],
                    "column": fk["referred_columns"][0],
                }

        # Create a nicely formatted schema for each table
        for table, columns in schema.items():
            formatted_schema = []
            formatted_schema.append(f"Table: {table}\n")
            for column, column_info in columns.items():
                formatted_schema.append(f"     Column: {column}")
                for info, value in column_info.items():
                    formatted_schema.append(f"        {info}: {value}")
            schema[table] = "\n".join(formatted_schema)

        return schema

    def run_sql(self, command: str) -> Tuple[Dict, Dict]:
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

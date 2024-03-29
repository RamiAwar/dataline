"""SQL wrapper around SQLDatabase in langchain."""

import logging
from collections import defaultdict
from contextvars import ContextVar
from typing import Any, Iterable, Literal

from llama_index import SQLDatabase
from rapidfuzz import fuzz
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

from dataline.models.connection.schema import TableSchema

logger = logging.getLogger(__name__)

request_limit = ContextVar[int]("request_limit")
request_execute = ContextVar[bool]("request_execute")


class CustomSQLDatabase(SQLDatabase):
    """Custom SQL Database wrapper"""

    def get_table_names(self) -> Iterable[str]:
        """Get names of tables available."""
        return self.get_usable_table_names()

    def get_closest_table_name(self, table_name) -> Any | str | None:
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

    def get_simple_schema(self) -> dict[str, dict[str, str]]:
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

    def get_schema_foreign_keys(self) -> dict[str, dict[str, str]]:
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

    def get_schema_with_user_descriptions(self, descriptions: list[TableSchema]) -> dict[str, dict[str, str]]:
        # Create dict of descriptions
        descriptions_dict: dict[str, TableSchema] = {}
        for description in descriptions:
            descriptions_dict[description.name] = description

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

            # Add descriptions
            if table in descriptions_dict:
                for field in descriptions_dict[table].field_descriptions:
                    if field.description:
                        schema[table][field.name]["description"] = field.description

        # Create a nicely formatted schema for each table
        for table, columns in schema.items():
            formatted_schema = []
            table_description = descriptions_dict[table].description if table in descriptions_dict else ""
            formatted_schema.append(f"Table: {table} : {table_description}\n")
            for column, column_info in columns.items():
                formatted_schema.append(f"Column: {column}")
                for info, value in column_info.items():
                    formatted_schema.append(f"        {info}: {value}")

            schema[table] = "\n".join(formatted_schema)

        return schema

    def run_sql(self, command: str) -> tuple[dict, dict]:
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

    def validate_sql(self, sql_query) -> tuple[Literal[True], None] | tuple[Literal[False], str]:
        try:
            # Execute the EXPLAIN statement (without fetching results)
            conn = self._engine.raw_connection()
            cursor = conn.cursor()

            # Prepare an EXPLAIN statement with the SQL query
            explain_stmt = f"EXPLAIN {sql_query}"

            # Execute the EXPLAIN statement (without fetching results)
            cursor.execute(explain_stmt)

            # If no exceptions were raised, the SQL is valid
            return True, None

        except ProgrammingError as e:
            # Handle any exceptions raised during validation and return the error message
            return False, str(e)
        except Exception as e:
            return False, str(e)
        finally:
            if conn:
                conn.close()

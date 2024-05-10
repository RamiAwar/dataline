"""SQL wrapper around SQLDatabase in langchain."""

import logging
from collections import defaultdict
from contextvars import ContextVar
from typing import Any, Iterable, List, Literal, Optional

from rapidfuzz import fuzz
from sqlalchemy import Engine, MetaData, inspect, text
from sqlalchemy.exc import ProgrammingError

from dataline.models.connection.schema import TableSchema

logger = logging.getLogger(__name__)

request_limit = ContextVar[int]("request_limit")
request_execute = ContextVar[bool]("request_execute")


class CustomSQLDatabase:
    def __init__(
        self,
        engine: Engine,
        schema: Optional[str] = None,
        metadata: Optional[MetaData] = None,
        ignore_tables: Optional[List[str]] = None,
        include_tables: Optional[List[str]] = None,
        sample_rows_in_table_info: int = 3,
        indexes_in_table_info: bool = False,
        custom_table_info: Optional[dict] = None,
        view_support: bool = False,
        max_string_length: int = 300,
        lazy_table_reflection: bool = False,
    ):
        """Create engine from database URI."""
        self._engine = engine
        self._schema = schema
        if include_tables and ignore_tables:
            raise ValueError("Cannot specify both include_tables and ignore_tables")

        self._inspector = inspect(self._engine)

        # including view support by adding the views as well as tables to the all
        # tables list if view_support is True
        self._all_tables = set(
            self._inspector.get_table_names(schema=schema)
            + (self._inspector.get_view_names(schema=schema) if view_support else [])
        )

        self._include_tables = set(include_tables) if include_tables else set()
        if self._include_tables:
            missing_tables = self._include_tables - self._all_tables
            if missing_tables:
                raise ValueError(f"include_tables {missing_tables} not found in database")
        self._ignore_tables = set(ignore_tables) if ignore_tables else set()
        if self._ignore_tables:
            missing_tables = self._ignore_tables - self._all_tables
            if missing_tables:
                raise ValueError(f"ignore_tables {missing_tables} not found in database")
        usable_tables = self.get_usable_table_names()
        self._usable_tables = set(usable_tables) if usable_tables else self._all_tables

        if not isinstance(sample_rows_in_table_info, int):
            raise TypeError("sample_rows_in_table_info must be an integer")

        self._sample_rows_in_table_info = sample_rows_in_table_info
        self._indexes_in_table_info = indexes_in_table_info

        self._custom_table_info = custom_table_info
        if self._custom_table_info:
            if not isinstance(self._custom_table_info, dict):
                raise TypeError(
                    "table_info must be a dictionary with table names as keys and the " "desired table info as values"
                )
            # only keep the tables that are also present in the database
            intersection = set(self._custom_table_info).intersection(self._all_tables)
            self._custom_table_info = dict(
                (table, self._custom_table_info[table]) for table in self._custom_table_info if table in intersection
            )

        self._max_string_length = max_string_length
        self._view_support = view_support

        self._metadata = metadata or MetaData()
        if not lazy_table_reflection:
            # including view support if view_support = true
            self._metadata.reflect(
                views=view_support,
                bind=self._engine,
                only=list(self._usable_tables),
                schema=self._schema,
            )

    """Custom SQL Database wrapper"""

    def get_usable_table_names(self) -> Iterable[str]:
        """Get names of tables available."""
        if self._include_tables:
            return sorted(self._include_tables)
        return sorted(self._all_tables - self._ignore_tables)

    def get_table_names(self) -> Iterable[str]:
        """Get names of tables available."""
        return self.get_usable_table_names()

    def get_table_columns(self, table_name: str) -> list[Any]:  # type: ignore
        return self._inspector.get_columns(table_name)

    def get_closest_table_name(self, table_name: str) -> Any | str | None:  # type: ignore[misc]
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

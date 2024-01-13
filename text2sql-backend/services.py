import json
import logging
from sqlite3 import Connection
from typing import Any, TypedDict

from sqlalchemy import MetaData, create_engine, inspect

import db
from context_builder import CustomSQLContextContainerBuilder
from errors import GenerationError, RelatedTablesNotFoundError
from models import Connection, SQLQueryResult, TableField, UnsavedResult
from query_manager import SQLQueryManager
from sql_wrapper import CustomSQLDatabase

logger = logging.getLogger(__name__)


class SQLResults(TypedDict):
    result: list[dict[str, Any]]
    columns: list[str]


class SchemaService:
    @classmethod
    def extract_tables(
        cls, conn: Connection, connection_id: str
    ) -> dict[str, dict[str, TableField]]:
        # Get DSN from connection
        connection = db.get_connection(conn, connection_id)
        engine = create_engine(connection.dsn)
        metadata = MetaData()
        metadata.reflect(bind=engine)

        tables = {}

        for table_name, table in metadata.tables.items():
            fields = {}
            pk_field_name = table.primary_key.name
            foreign_keys = {fk.name: fk for fk in table.foreign_keys}

            for column in table.c:
                field_name, field_type = column.name, type(column.type).__name__
                if field_name == pk_field_name:
                    fields[field_name] = TableField(
                        name=field_name, type=field_type, is_primary_key=True
                    )
                else:
                    if field_name in foreign_keys:
                        fk = foreign_keys[field_name].column
                        fields[field_name] = TableField(
                            name=field_name,
                            type=field_type,
                            is_foreign_key=True,
                            linked_table=f"{fk.table.name}.{fk.name}",
                        )
                    else:
                        fields[field_name] = TableField(
                            name=field_name, type=field_type
                        )

            tables[table_name] = list(fields.values())

        return tables

    @classmethod
    def create_or_update_tables(cls, conn: Connection, connection_id: str):
        exists = db.exists_schema_table(connection_id)
        if exists:
            raise Exception("Update not implemented yet")

        tables = cls.extract_tables(conn, connection_id)
        for table_name, fields in tables.items():
            cls._create_or_update_table_schema(conn, connection_id, table_name, fields)

    @classmethod
    def _create_or_update_table_schema(
        cls,
        conn: Connection,
        connection_id: str,
        table_name: str,
        fields: list[TableField],
    ):
        """Creates a schema from scratch with empty descriptions or adds missing
        fields to one that already exists."""
        # TODO: Delete removed fields as well
        # Check if schema exists for this connection
        exists = db.exists_schema_table(connection_id)
        if not exists:
            # Create new schema table
            table_id = db.create_schema_table(conn, connection_id, table_name)

            # Create schema fields
            for field in fields:
                db.create_schema_field(
                    conn=conn,
                    table_id=table_id,
                    field_name=field.name,
                    field_type=field.type,
                    field_description="",
                    is_primary_key=field.is_primary_key,
                    is_foreign_key=field.is_foreign_key,
                    foreign_table=field.linked_table,
                )


class QueryService:
    def __init__(
        self,
        connection: Connection,
        model_name: str = "gpt-4",
        temperature: int = 0.0,
    ):
        self.sesion = connection
        self.engine = create_engine(connection.dsn)
        self.insp = inspect(self.engine)
        self.table_names = self.insp.get_table_names()
        self.sql_db = CustomSQLDatabase(self.engine, include_tables=self.table_names)
        self.context_builder = CustomSQLContextContainerBuilder(connection, self.sql_db)
        self.query_manager = SQLQueryManager(
            dsn=connection.dsn, model=model_name, temperature=temperature
        )

    def get_related_tables(self, query: str, message_history: list[dict] = []):
        # Fetch table context
        context_str, table_names = self.context_builder.get_relevant_table_context(
            query_str=query,
            store_context_str=True,
            message_history=message_history,
        )

        # If no table schemas found for context, raise error
        if context_str.strip() == "":
            raise RelatedTablesNotFoundError

        return context_str, table_names

    def query(self, query: str, conversation_id: str) -> SQLQueryResult:
        # Query with table context
        message_history = db.get_message_history_with_selected_tables_with_sql(
            conversation_id
        )

        # Fetch table context
        context_str, table_names = self.get_related_tables(query, message_history)

        # Add user message to message history
        db.add_message_to_conversation(
            conversation_id, content=query, role="user", selected_tables=table_names
        )

        generated_json = "".join(
            self.query_manager.query(
                query, table_context=context_str, message_history=message_history
            )
        )
        print("GENERATED JSON:\n", generated_json)
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
                generated_json = "".join(
                    self.query_manager.reask(query, result.sql, context_str, error)
                )
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

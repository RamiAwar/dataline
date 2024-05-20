import sqlite3
from sqlite3.dbapi2 import Connection as SQLiteConnection
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import event
from sqlalchemy.engine import Engine

from dataline.config import config as dataline_config
from dataline.models.connection.schema import (
    ConnectionOut,
)
from dataline.repositories.base import NotFoundError


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:  # type: ignore[misc]
    if type(dbapi_connection) is sqlite3.Connection:  # play well with other DB backends
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Old way of using database - this is a single connection, hard to manage transactions
# conn = sqlite3.connect(dataline_config.sqlite_path, check_same_thread=False)
# conn.execute("PRAGMA foreign_keys = ON")


class DatabaseManager:
    def __init__(self, db_file: str = dataline_config.sqlite_path) -> None:
        self.db_file = db_file
        self.connection: Optional[SQLiteConnection] = None

    def __enter__(self) -> SQLiteConnection:
        self.connection = sqlite3.connect(self.db_file)
        self.connection.execute("PRAGMA foreign_keys = ON")
        return self.connection

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> None:  # type:ignore[misc]
        if self.connection:
            self.connection.close()


def get_connection(conn: SQLiteConnection, connection_id: UUID) -> ConnectionOut:
    connection = conn.execute(
        "SELECT id, name, dsn, database, dialect, is_sample FROM connections WHERE id = ?",
        (str(connection_id),),
    ).fetchone()
    if not connection:
        raise NotFoundError("Connection not found")

    return ConnectionOut(
        id=connection[0],
        name=connection[1],
        dsn=connection[2],
        database=connection[3],
        dialect=connection[4],
        is_sample=connection[5],
    )


# def get_table_schemas_with_descriptions(connection_id: UUID) -> List[TableSchema]:
#     # Select all table schemas for a connection and then join with schema_descriptions to get the field descriptions
#     descriptions = conn.execute(
#         """
#     SELECT
#         schema_tables.id,
#         schema_tables.connection_id,
#         schema_tables.name,
#         schema_tables.description,
#         schema_fields.id,
#         schema_fields.name,
#         schema_fields.type,
#         schema_fields.description,
#         schema_fields.is_primary_key,
#         schema_fields.is_foreign_key,
#         schema_fields.foreign_table
#     FROM schema_tables
#     INNER JOIN schema_fields ON schema_tables.id = schema_fields.table_id
#     WHERE schema_tables.connection_id = ?""",
#         (str(connection_id),),
#     ).fetchall()

#     # Join all the field descriptions for each table into a list of table schemas
#     schemas: dict[str, list[str]] = {}
#     for description in descriptions:
#         if description[0] not in schemas:
#             schemas[description[0]] = []
#         schemas[description[0]].append(description)

#     # Return a list of TableSchema objects
#     return [
#         TableSchema(
#             connection_id=str(connection_id),
#             id=table[0][0],
#             name=table[0][2],
#             description=table[0][3],
#             field_descriptions=[
#                 TableSchemaField(
#                     id=field[4],
#                     schema_id=field[0],
#                     name=field[5],
#                     type=field[6],
#                     description=field[7],
#                     # Pydantic will handle below boolean conversions
#                     is_primary_key=field[8],  # type: ignore
#                     is_foreign_key=field[9],  # type: ignore
#                     linked_table=field[10],
#                 )
#                 for field in table
#             ],
#         )
#         for table in schemas.values()
#     ]


def toggle_save_query(result_id: str, conn: sqlite3.Connection) -> bool:
    # check if result_id exists in saved_queries
    exists = conn.execute("SELECT * FROM saved_queries WHERE result_id = ?", (result_id,)).fetchone()

    if exists:
        conn.execute("DELETE FROM saved_queries WHERE result_id = ?", (result_id,))
        conn.commit()
        return False
    else:
        conn.execute("INSERT INTO saved_queries (result_id) VALUES (?)", (result_id,))
        conn.commit()
        return True


# Add message with results to conversation
# def add_message_to_conversation(
#     conversation_id: str,
#     content: str,
#     role: str,
#     results: list[Result | UnsavedResult] = [],
#     selected_tables: list[str] = [],
# ) -> MessageWithResults:
#     # Basic validation
#     if results and role != "assistant":
#         raise ValueError("Only assistant messages can have results")

#     # Create message object
#     created_at = datetime.now()
#     message_id = conn.execute(
#         "INSERT INTO messages (content, role, created_at, conversation_id, selected_tables) VALUES (?, ?, ?, ?, ?)",
#         (content, role, created_at, conversation_id, ",".join(selected_tables)),
#     ).lastrowid

#     if message_id is None:
#         raise ValueError("Message could not be created")

#     # Create result objects and update message_results many2many
#     for result in results:
#         # Insert result type and content
#         result_id = conn.execute(
#             "INSERT INTO results (content, type, created_at) VALUES (?, ?, ?)",
#             (result.content, result.type, created_at),
#         ).lastrowid

#         # Insert message_id and result_id into message_results table
#         conn.execute(
#             "INSERT INTO message_results (message_id, result_id) VALUES (?, ?)",
#             (message_id, result_id),
#         )

#     conn.commit()
#     return MessageWithResults(
#         content=content,
#         role=role,
#         results=results,
#         message_id=message_id,
#         created_at=created_at,
#     )


# def get_message_history_with_selected_tables_with_sql(  # type: ignore[misc]
#     conversation_id: str,
# ) -> list[dict[str, Any]]:
#     """Returns the message history of a conversation with selected tables as a list"""
#     messages = conn.execute(
#         """SELECT messages.content, messages.role, messages.created_at, results.content, messages.selected_tables
#     FROM messages
#     INNER JOIN message_results ON messages.id = message_results.message_id
#     INNER JOIN results ON message_results.result_id = results.id
#     WHERE messages.conversation_id = ?
#     AND results.type = 'sql'
#     ORDER BY messages.created_at ASC
#     """,
#         (conversation_id,),
#     )

#     return [
#         {
#             "role": message[1],
#             "content": "Selected tables: " + message[4] + "\n" + message[0] + "\nSQL: " + message[3],
#         }
#         for message in messages
#     ]


def update_result_content(conn: SQLiteConnection, result_id: str, content: str) -> bool:
    """Update the content of a result"""
    conn.execute(
        "UPDATE results SET content = ? WHERE id = ?",
        (content, result_id),
    )
    return True

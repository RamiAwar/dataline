import sqlite3
from datetime import datetime
from sqlite3 import Cursor
from sqlite3.dbapi2 import Connection as SQLiteConnection
from typing import Any, List, Literal, Optional
from uuid import uuid4

from dataline.config import config as dataline_config
from dataline.repositories.base import NotFoundError, NotUniqueError
from models import (
    Connection,
    Conversation,
    ConversationWithMessagesWithResults,
    MessageWithResults,
    Result,
    TableSchema,
    TableSchemaField,
    UnsavedResult,
)

# Old way of using database - this is a single connection, hard to manage transactions
conn = sqlite3.connect(dataline_config.sqlite_path, check_same_thread=False)


class DatabaseManager:
    def __init__(self, db_file: str = dataline_config.sqlite_path) -> None:
        self.db_file = db_file
        self.connection: Optional[SQLiteConnection] = None

    def __enter__(self) -> SQLiteConnection:
        self.connection = sqlite3.connect(self.db_file)
        return self.connection

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> None:  # type:ignore[misc]
        if self.connection:
            self.connection.close()


def create_connection(
    conn: SQLiteConnection,
    dsn: str,
    database: str,
    name: str = "",
    dialect: str = "",
) -> str:
    # Check if connection_id or dsn already exist
    connection_id = str(uuid4())

    conn.execute(
        "INSERT INTO connections (id, dsn, database, name, dialect) VALUES (?, ?, ?, ?, ?)",
        (connection_id, dsn, database, name, dialect),
    )
    return connection_id


def get_connection(conn: SQLiteConnection, connection_id: str) -> Connection:
    connection = conn.execute(
        "SELECT id, name, dsn, database, dialect FROM connections WHERE id = ?",
        (connection_id,),
    ).fetchone()
    if not connection:
        raise NotFoundError("Connection not found")

    return Connection(
        id=connection[0],
        name=connection[1],
        dsn=connection[2],
        database=connection[3],
        dialect=connection[4],
    )


def update_connection(connection_id: str, name: str, dsn: str, database: str, dialect: str) -> bool:
    conn.execute(
        "UPDATE connections SET name = ?, dsn = ?, database = ?, dialect = ? WHERE id = ?",
        (name, dsn, database, dialect, connection_id),
    )
    conn.commit()
    return True


def get_connection_from_dsn(dsn: str) -> Connection:
    data = conn.execute("SELECT id, name, dsn, database, dialect FROM connections WHERE dsn = ?", (dsn,)).fetchone()
    if not data:
        raise NotFoundError("Connection not found")

    return Connection(
        id=data[0],
        name=data[1],
        dsn=data[2],
        database=data[3],
        dialect=data[4],
    )


def get_connections() -> List[Connection]:
    return [
        Connection(id=x[0], name=x[1], dsn=x[2], database=x[3], dialect=x[4])
        for x in conn.execute("SELECT id, name, dsn, database, dialect FROM connections").fetchall()
    ]


def exists_schema_table(connection_id: str) -> bool:
    result = conn.execute("SELECT * FROM schema_tables WHERE connection_id = ?", (connection_id,)).fetchone()

    if result:
        return True
    return False


def create_schema_table(conn: SQLiteConnection, connection_id: str, table_name: str) -> str:
    """Creates a table schema for a connection"""
    # Check if table already exists
    if conn.execute(
        "SELECT * FROM schema_tables WHERE connection_id = ? AND name = ?",
        (connection_id, table_name),
    ).fetchone():
        raise NotUniqueError("Table already exists")

    # Insert table with UUID for ID
    table_id = uuid4().hex
    conn.execute(
        "INSERT INTO schema_tables (id, connection_id, name, description) VALUES (?, ?, ?, ?)",
        (table_id, connection_id, table_name, ""),
    )
    return table_id


def create_schema_field(
    conn: SQLiteConnection,
    table_id: str,
    field_name: str,
    field_type: str,
    field_description: str = "",
    is_primary_key: bool = False,
    is_foreign_key: bool = False,
    foreign_table: str = "",
) -> str:
    """Creates a field schema for a table"""
    # Check if field already exists
    if conn.execute(
        "SELECT * FROM schema_fields WHERE table_id = ? AND name = ?",
        (table_id, field_name),
    ).fetchone():
        raise NotUniqueError("Field already exists")

    # Insert field and return ID of row
    field_id = uuid4().hex
    conn.execute(
        """
        INSERT INTO schema_fields (
            id,
            table_id,
            name,
            type,
            description,
            is_primary_key,
            is_foreign_key,
            foreign_table
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            field_id,
            table_id,
            field_name,
            field_type,
            field_description,
            is_primary_key,
            is_foreign_key,
            foreign_table,
        ),
    )

    return field_id


def get_table_schemas_with_descriptions(connection_id: str) -> List[TableSchema]:
    # Select all table schemas for a connection and then join with schema_descriptions to get the field descriptions
    descriptions = conn.execute(
        """
    SELECT
        schema_tables.id,
        schema_tables.connection_id,
        schema_tables.name,
        schema_tables.description,
        schema_fields.id,
        schema_fields.name,
        schema_fields.type,
        schema_fields.description,
        schema_fields.is_primary_key,
        schema_fields.is_foreign_key,
        schema_fields.foreign_table
    FROM schema_tables
    INNER JOIN schema_fields ON schema_tables.id = schema_fields.table_id
    WHERE schema_tables.connection_id = ?""",
        (connection_id,),
    ).fetchall()

    # Join all the field descriptions for each table into a list of table schemas
    schemas: dict[str, list[str]] = {}
    for description in descriptions:
        if description[0] not in schemas:
            schemas[description[0]] = []
        schemas[description[0]].append(description)

    # Return a list of TableSchema objects
    return [
        TableSchema(
            connection_id=connection_id,
            id=table[0][0],
            name=table[0][2],
            description=table[0][3],
            field_descriptions=[
                TableSchemaField(
                    id=field[4],
                    schema_id=field[0],
                    name=field[5],
                    type=field[6],
                    description=field[7],
                    # Pydantic will handle below boolean conversions
                    is_primary_key=field[8],  # type: ignore
                    is_foreign_key=field[9],  # type: ignore
                    linked_table=field[10],
                )
                for field in table
            ],
        )
        for table in schemas.values()
    ]


# def get_schema_table(table_id: str):
#     schema_table = conn.execute(
#         """SELECT id, name, description FROM schema_tables WHERE id = ?""", (table_id,)
#     ).fetchone()

#     return TableSchema(id=schema_table[0])


def update_schema_table_description(conn: sqlite3.Connection, table_id: str, description: str) -> Cursor:
    return conn.execute(
        """UPDATE schema_tables SET description = ? WHERE id = ?""",
        (description, table_id),
    )


def update_schema_table_field_description(conn: sqlite3.Connection, field_id: str, description: str) -> Cursor:
    # Check
    return conn.execute(
        """UPDATE schema_fields SET description = ? WHERE id = ?""",
        (description, field_id),
    )


# Conversation logic
def get_conversation(conversation_id: str) -> Conversation:
    conversation = conn.execute(
        "SELECT id, connection_id, name, created_at FROM conversations WHERE id = ?",
        (conversation_id,),
    ).fetchone()

    if conversation is None:
        raise NotFoundError("Conversation does not exist")

    return Conversation(
        conversation_id=str(conversation[0]),
        connection_id=conversation[1],
        name=conversation[2],
        created_at=conversation[3],
    )


def get_conversations() -> list[Conversation]:
    conversations = conn.execute("SELECT id, connection_id, name, created_at FROM conversations").fetchall()
    return [
        Conversation(
            conversation_id=conversation[0],
            connection_id=conversation[1],
            name=conversation[2],
            created_at=conversation[3],
        )
        for conversation in conversations
    ]


def get_conversations_with_messages_with_results() -> list[ConversationWithMessagesWithResults]:
    conversations = conn.execute(
        "SELECT id, connection_id, name, created_at FROM conversations ORDER BY created_at DESC"
    ).fetchall()

    conversations_with_messages_with_results = []
    for conversation in conversations:
        conversation_id = conversation[0]
        connection_id = conversation[1]
        name = conversation[2]

        messages = conn.execute(
            """
        SELECT messages.id, content, role, created_at
        FROM messages
        INNER JOIN conversation_messages ON messages.id = conversation_messages.message_id
        WHERE conversation_messages.conversation_id = ?
        ORDER BY messages.created_at ASC""",
            (conversation_id,),
        ).fetchall()

        messages_with_results = []
        for message in messages:
            message_id = message[0]
            content = message[1]
            role = message[2]
            created_at = message[3]
            results = conn.execute(
                """SELECT results.id, content, type, created_at,
                CASE
                    WHEN
                    saved_queries.result_id IS NULL THEN 0
                    ELSE 1
                END AS is_saved FROM results
                INNER JOIN message_results ON results.id = message_results.result_id
                LEFT JOIN saved_queries ON results.id = saved_queries.result_id
                WHERE message_results.message_id = ?""",
                (message_id,),
            ).fetchall()
            results = [
                Result(
                    result_id=result[0],
                    content=result[1],
                    type=result[2],
                    created_at=result[3],
                    is_saved=result[4],
                )
                for result in results
            ]
            messages_with_results.append(
                MessageWithResults(
                    message_id=message_id,
                    content=content,
                    role=role,
                    results=results,
                    created_at=created_at,
                )
            )
        conversations_with_messages_with_results.append(
            ConversationWithMessagesWithResults(
                conversation_id=str(conversation_id),
                created_at=conversation[3],
                connection_id=connection_id,
                name=name,
                messages=messages_with_results,
            )
        )
    return conversations_with_messages_with_results


def delete_conversation(conversation_id: str) -> None:
    """Delete conversation, all associated messages, and all their results"""
    conn.execute(
        "DELETE FROM message_results WHERE message_id IN (SELECT message_id FROM conversation_messages WHERE conversation_id = ?)",
        (conversation_id,),
    )
    conn.execute(
        "DELETE FROM messages WHERE id IN (SELECT message_id FROM conversation_messages WHERE conversation_id = ?)",
        (conversation_id,),
    )
    conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.execute(
        "DELETE FROM conversation_messages WHERE conversation_id = ?",
        (conversation_id,),
    )
    conn.commit()


# Create empty converstaion
def create_conversation(connection_id: str, name: str) -> int:
    """Creates an empty conversation and returns its id"""
    created_at = datetime.now()
    conversation_id = conn.execute(
        "INSERT INTO conversations (connection_id, name, created_at) VALUES (?, ?, ?)",
        (connection_id, name, created_at),
    ).lastrowid

    if conversation_id is None:
        raise ValueError("Conversation could not be created")

    return conversation_id


def update_conversation(conversation_id: str, name: str) -> Literal[True]:
    conn.execute(
        "UPDATE conversations SET name = ? WHERE id = ?",
        (name, conversation_id),
    )
    conn.commit()
    return True


def toggle_save_query(result_id: str) -> bool:
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
def add_message_to_conversation(
    conversation_id: str,
    content: str,
    role: str,
    results: list[Result | UnsavedResult] = [],
    selected_tables: list[str] = [],
) -> MessageWithResults:
    # Basic validation
    if results and role != "assistant":
        raise ValueError("Only assistant messages can have results")

    # Create message object
    created_at = datetime.now()
    message_id = conn.execute(
        "INSERT INTO messages (content, role, created_at, selected_tables) VALUES (?, ?, ?, ?)",
        (content, role, created_at, ",".join(selected_tables)),
    ).lastrowid

    if message_id is None:
        raise ValueError("Message could not be created")

    # Create result objects and update message_results many2many
    for result in results:
        # Insert result type and content
        result_id = conn.execute(
            "INSERT INTO results (content, type, created_at) VALUES (?, ?, ?)",
            (result.content, result.type, created_at),
        ).lastrowid

        # Insert message_id and result_id into message_results table
        conn.execute(
            "INSERT INTO message_results (message_id, result_id) VALUES (?, ?)",
            (message_id, result_id),
        )

    # Insert message_id and conversation_id into conversation_messages table
    conn.execute(
        "INSERT INTO conversation_messages (conversation_id, message_id) VALUES (?, ?)",
        (
            conversation_id,
            message_id,
        ),
    )
    conn.commit()
    return MessageWithResults(
        content=content,
        role=role,
        results=results,
        message_id=message_id,
        created_at=created_at,
    )


def get_messages_with_results(conversation_id: str) -> list[MessageWithResults]:
    # Get all message_ids for conversation
    message_ids = conn.execute(
        """SELECT cm.message_id
        FROM conversation_messages cm
        JOIN messages m ON m.id=cm.message_id
        WHERE conversation_id = ?
        ORDER BY m.created_at ASC""",
        (conversation_id,),
    ).fetchall()

    # Get all results for each message_id
    messages = []
    for message_id in message_ids:
        message_id = message_id[0]
        message = conn.execute(
            "SELECT content, role, created_at FROM messages WHERE id = ?",
            (message_id,),
        ).fetchone()
        results = conn.execute(
            """SELECT results.id, content, type, created_at,
            CASE
                WHEN saved_queries.result_id IS NULL
                THEN 0 ELSE 1
            END AS is_saved
            FROM results
            LEFT JOIN saved_queries ON results.id = saved_queries.result_id
            WHERE results.id IN (
                SELECT result_id FROM message_results WHERE message_id = ?
            )""",
            (message_id,),
        ).fetchall()
        messages.append(
            MessageWithResults(
                content=message[0],
                results=[
                    Result(
                        result_id=result[0],
                        content=result[1],
                        type=result[2],
                        created_at=result[3],
                        is_saved=result[4],
                    )
                    for result in results
                ],
                role=message[1],
                created_at=message[2],
                message_id=message_id,
            )
        )

    return messages


def get_message_history(conversation_id: str) -> list[dict[str, Any]]:
    """Returns the message history of a conversation in OpenAI API format"""
    messages = conn.execute(
        """SELECT content, role, created_at
        FROM messages
        INNER JOIN conversation_messages ON messages.id = conversation_messages.message_id
        WHERE conversation_messages.conversation_id = ?
        ORDER BY messages.created_at ASC
        """,
        (conversation_id,),
    )

    return [{"role": message[1], "content": message[0]} for message in messages]


def get_message_history_with_selected_tables_with_sql(
    conversation_id: str,
) -> list[dict[str, Any]]:
    """Returns the message history of a conversation with selected tables as a list"""
    messages = conn.execute(
        """SELECT messages.content, messages.role, messages.created_at, results.content, messages.selected_tables
    FROM messages
    INNER JOIN conversation_messages ON messages.id = conversation_messages.message_id
    INNER JOIN message_results ON messages.id = message_results.message_id
    INNER JOIN results ON message_results.result_id = results.id
    WHERE conversation_messages.conversation_id = ?
    AND results.type = 'sql'
    ORDER BY messages.created_at ASC
    """,
        (conversation_id,),
    )

    return [
        {
            "role": message[1],
            "content": "Selected tables: " + message[4] + "\n" + message[0] + "\nSQL: " + message[3],
        }
        for message in messages
    ]


def get_message_history_with_sql(conversation_id: str) -> list[dict[str, Any]]:
    """Returns the message history of a conversation with the SQL result encoded inside content in OpenAI API format"""
    messages_with_sql = conn.execute(
        """SELECT messages.content, messages.role, messages.created_at, results.content
    FROM messages
    INNER JOIN conversation_messages ON messages.id = conversation_messages.message_id
    INNER JOIN message_results ON messages.id = message_results.message_id
    INNER JOIN results ON message_results.result_id = results.id
    WHERE conversation_messages.conversation_id = ?
    AND results.type = 'sql'
    ORDER BY messages.created_at ASC
    """,
        (conversation_id,),
    )

    return [{"role": message[1], "content": message[0] + "\nSQL: " + message[3]} for message in messages_with_sql]


def create_result(result: UnsavedResult) -> Result:
    """Create a result and return it"""
    created_at = datetime.now()
    result_id = conn.execute(
        "INSERT INTO results (content, type, created_at) VALUES (?, ?, ?)",
        (result.content, result.type, created_at),
    ).lastrowid

    if result_id is None:
        raise ValueError("Result could not be created")

    return Result(
        result_id=result_id,
        content=result.content,
        type=result.type,
        created_at=created_at,
    )


def update_result_content(conn: SQLiteConnection, result_id: str, content: str) -> bool:
    """Update the content of a result"""
    conn.execute(
        "UPDATE results SET content = ? WHERE id = ?",
        (content, result_id),
    )
    return True

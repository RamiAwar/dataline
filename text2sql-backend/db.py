import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from errors import DuplicateError
from models import (
    Conversation,
    ConversationWithMessagesWithResults,
    MessageWithResults,
    Result,
    Session,
    UnsavedResult,
)

conn = sqlite3.connect("db.sqlite3", check_same_thread=False)


# SESSIONS: Create table to store session_id and dsn with unique constraint on session_id and dsn and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS sessions (session_id text PRIMARY KEY, dsn text UNIQUE NOT NULL, database text NOT NULL, name text, dialect text, UNIQUE (session_id, dsn))"""
)

# SCHEMA FILES: Create table to store session_id and index_file with unique constraint on session_id and index_file and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS schema_indexes (session_id text PRIMARY KEY, index_file text UNIQUE NOT NULL)"""
)


# MESSAGES: Create table to store messages with text, role, and session_id
conn.execute(
    """CREATE TABLE IF NOT EXISTS messages (message_id integer PRIMARY KEY AUTOINCREMENT, content text NOT NULL, role text NOT NULL, created_at text)"""
)

# RESULTS: Create table to store results with a result text field with a reference to a session
conn.execute(
    """CREATE TABLE IF NOT EXISTS results (result_id integer PRIMARY KEY AUTOINCREMENT, content text NOT NULL, type text NOT NULL, created_at text)"""
)

# MESSAGE_RESULTS: Create many to many table to store message with multiple results
conn.execute(
    """CREATE TABLE IF NOT EXISTS message_results (message_id integer NOT NULL, result_id integer NOT NULL, FOREIGN KEY(message_id) REFERENCES messages(message_id), FOREIGN KEY(result_id) REFERENCES results(result_id))"""
)

# CONVERSATIONS: Create table to store conversations with a reference to a session, and many results, and a datetime field
conn.execute(
    """CREATE TABLE IF NOT EXISTS conversations (conversation_id integer PRIMARY KEY AUTOINCREMENT, session_id text NOT NULL, name text NOT NULL, created_at text, FOREIGN KEY(session_id) REFERENCES sessions(session_id))"""
)

# CONVERSATION_MESSAGES: Create many to many table to store conversation with multiple messages with order
conn.execute(
    """CREATE TABLE IF NOT EXISTS conversation_messages (conversation_id integer NOT NULL, message_id integer NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id), FOREIGN KEY(message_id) REFERENCES messages(message_id))"""
)

# TODO: Add source to results (so we can regenerate it) ex. db, file, etc.


def insert_session(
    session_id: str, dsn: str, database: str, name: str = "", dialect: str = ""
):
    # Check if session_id or dsn already exist
    if conn.execute(
        "SELECT * FROM sessions WHERE session_id = ? OR dsn = ?", (session_id, dsn)
    ).fetchone():
        raise DuplicateError("session_id or dsn already exists")
    conn.execute(
        "INSERT INTO sessions VALUES (?, ?, ?, ?, ?)",
        (session_id, dsn, database, name, dialect),
    )
    conn.commit()


def get_session(session_id: str):
    return conn.execute(
        "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
    ).fetchone()


def get_session_from_dsn(dsn: str):
    return conn.execute("SELECT * FROM sessions WHERE dsn = ?", (dsn,)).fetchone()


def get_sessions():
    return [
        Session(session_id=x[0], name=x[1], dsn=x[2], database=x[3], dialect=x[4])
        for x in conn.execute(
            "SELECT session_id, name, dsn, database, dialect FROM sessions"
        ).fetchall()
    ]


def session_is_indexed(session_id):
    return conn.execute(
        "SELECT * FROM schema_indexes WHERE session_id = ?", (session_id,)
    ).fetchone()


def insert_schema_index(session_id, index_file):
    conn.execute("INSERT INTO schema_indexes VALUES (?, ?)", (session_id, index_file))
    conn.commit()


def get_schema_index(session_id):
    return conn.execute(
        "SELECT index_file FROM schema_indexes WHERE session_id = ?", (session_id,)
    ).fetchone()[0]


# Conversation logic
def get_conversation(conversation_id: str) -> Conversation:
    conversation = conn.execute(
        "SELECT conversation_id, session_id, name, created_at FROM conversations WHERE conversation_id = ?",
        (conversation_id,),
    ).fetchone()
    return Conversation(
        conversation_id=conversation[0],
        session_id=conversation[1],
        name=conversation[2],
        created_at=conversation[3],
    )


def get_conversations():
    conversations = conn.execute(
        "SELECT conversation_id, session_id, name, created_at FROM conversations"
    ).fetchall()
    return [
        Conversation(
            conversation_id=conversation[0],
            session_id=conversation[1],
            name=conversation[2],
            created_at=conversation[3],
        )
        for conversation in conversations
    ]


def get_conversations_with_messages_with_results() -> (
    List[ConversationWithMessagesWithResults]
):
    conversations = conn.execute(
        "SELECT conversation_id, session_id, name, created_at FROM conversations ORDER BY created_at DESC"
    ).fetchall()

    conversations_with_messages_with_results = []
    for conversation in conversations:
        conversation_id = conversation[0]
        session_id = conversation[1]
        name = conversation[2]

        messages = conn.execute(
            """
        SELECT messages.message_id, content, role, created_at
        FROM messages
        INNER JOIN conversation_messages ON messages.message_id = conversation_messages.message_id
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
                "SELECT results.result_id, content, type, created_at FROM results INNER JOIN message_results ON results.result_id = message_results.result_id WHERE message_results.message_id = ?",
                (message_id,),
            ).fetchall()
            results = [
                Result(
                    result_id=result[0],
                    content=result[1],
                    type=result[2],
                    created_at=result[3],
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
                conversation_id=conversation_id,
                created_at=conversation[3],
                session_id=session_id,
                name=name,
                messages=messages_with_results,
            )
        )
    return conversations_with_messages_with_results


def delete_conversation(conversation_id: str):
    """Delete conversation, all associated messages, and all their results"""
    conn.execute(
        "DELETE FROM message_results WHERE message_id IN (SELECT message_id FROM conversation_messages WHERE conversation_id = ?)",
        (conversation_id,),
    )
    conn.execute(
        "DELETE FROM messages WHERE message_id IN (SELECT message_id FROM conversation_messages WHERE conversation_id = ?)",
        (conversation_id,),
    )
    conn.execute(
        "DELETE FROM conversations WHERE conversation_id = ?", (conversation_id,)
    )
    conn.execute(
        "DELETE FROM conversation_messages WHERE conversation_id = ?",
        (conversation_id,),
    )
    conn.commit()


# Create empty converstaion
def create_conversation(session_id: str, name: str) -> int:
    """Creates an empty conversation and returns its id"""
    created_at = datetime.now()
    conversation_id = conn.execute(
        "INSERT INTO conversations (session_id, name, created_at) VALUES (?, ?, ?)",
        (session_id, name, created_at),
    ).lastrowid
    conn.commit()
    return conversation_id


# Add message with results to conversation
def add_message_to_conversation(
    conversation_id: str, content: str, role: str, results: Optional[List[Result]] = []
):
    # Basic validation
    if results and role != "assistant":
        raise ValueError("Only assistant messages can have results")

    # Create message object
    created_at = datetime.now()
    message_id = conn.execute(
        "INSERT INTO messages (content, role, created_at) VALUES (?, ?, ?)",
        (content, role, created_at),
    ).lastrowid

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


def get_messages_with_results(conversation_id: str) -> List[MessageWithResults]:
    # Get all message_ids for conversation
    message_ids = conn.execute(
        "SELECT cm.message_id FROM conversation_messages cm JOIN messages m ON m.message_id=cm.message_id WHERE conversation_id = ? ORDER BY m.created_at ASC",
        (conversation_id,),
    ).fetchall()

    # Get all results for each message_id
    messages = []
    for message_id in message_ids:
        message_id = message_id[0]
        message = conn.execute(
            "SELECT content, role, created_at FROM messages WHERE message_id = ?",
            (message_id,),
        ).fetchone()
        results = conn.execute(
            "SELECT result_id, content, type, created_at FROM results WHERE result_id IN (SELECT result_id FROM message_results WHERE message_id = ?)",
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
                    )
                    for result in results
                ],
                role=message[1],
                created_at=message[2],
                message_id=message_id,
                conversation_id=conversation_id,
            )
        )

    return messages


def get_message_history(conversation_id: str) -> List[Dict[str, Any]]:
    """Returns the message history of a conversation in OpenAI API format"""
    messages = conn.execute(
        "SELECT content, role, created_at FROM messages INNER JOIN conversation_messages ON messages.message_id = conversation_messages.message_id WHERE conversation_messages.conversation_id = ? ORDER BY messages.created_at ASC",
        (conversation_id,),
    )

    return [{"role": message[1], "content": message[0]} for message in messages]


def create_result(result: UnsavedResult) -> Result:
    """Create a result and return it"""
    created_at = datetime.now()
    result_id = conn.execute(
        "INSERT INTO results (content, type, created_at) VALUES (?, ?, ?)",
        (result.content, result.type, created_at),
    ).lastrowid
    conn.commit()
    return Result(
        result_id=result_id,
        content=result.content,
        type=result.type,
        created_at=created_at,
    )

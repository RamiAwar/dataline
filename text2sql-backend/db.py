import sqlite3
from typing import Any, Dict, List

from errors import DuplicateError
from models import (
    Conversation,
    ConversationWithMessagesWithResults,
    MessageWithResults,
    Result,
)

conn = sqlite3.connect("db.sqlite3")


# Create table to store session_id and dsn with unique constraint on session_id and dsn and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS sessions (session_id text PRIMARY KEY, dsn text UNIQUE NOT NULL)"""
)

# Create table to store session_id and index_file with unique constraint on session_id and index_file and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS schema_indexes (session_id text PRIMARY KEY, index_file text UNIQUE NOT NULL)"""
)


# MESSAGES: Create table to store messages with text, role, and session_id
conn.execute(
    """CREATE TABLE IF NOT EXISTS messages (message_id integer PRIMARY KEY AUTOINCREMENT, content text NOT NULL, role text NOT NULL)"""
)

# RESULTS: Create table to store results with a result text field with a reference to a session
conn.execute(
    """CREATE TABLE IF NOT EXISTS results (result_id integer PRIMARY KEY AUTOINCREMENT, content text NOT NULL, type text NOT NULL)"""
)

# MESSAGE_RESULTS: Create many to many table to store message with multiple results
conn.execute(
    """CREATE TABLE IF NOT EXISTS message_results (message_id integer NOT NULL, result_id integer NOT NULL, FOREIGN KEY(message_id) REFERENCES messages(message_id), FOREIGN KEY(result_id) REFERENCES results(result_id))"""
)

# CONVERSATIONS: Create table to store conversations with a reference to a session, and many results
conn.execute(
    """CREATE TABLE IF NOT EXISTS conversations (conversation_id integer PRIMARY KEY AUTOINCREMENT, session_id text NOT NULL, name text NOT NULL, FOREIGN KEY(session_id) REFERENCES sessions(session_id))"""
)

# CONVERSATION_MESSAGES: Create many to many table to store conversation with multiple messages with order
conn.execute(
    """CREATE TABLE IF NOT EXISTS conversation_messages (y integer NOT NULL, message_id integer NOT NULL, message_order integer NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id), FOREIGN KEY(message_id) REFERENCES messages(message_id))"""
)

# TODO: Add source to results (so we can regenerate it) ex. db, file, etc.


def insert_session(session_id, dsn):
    # Check if session_id or dsn already exist
    if conn.execute(
        "SELECT * FROM sessions WHERE session_id = ? OR dsn = ?", (session_id, dsn)
    ).fetchone():
        raise DuplicateError("session_id or dsn already exists")
    conn.execute("INSERT INTO sessions VALUES (?, ?)", (session_id, dsn))
    conn.commit()


def get_session(session_id: str):
    return conn.execute(
        "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
    ).fetchone()


def get_session_from_dsn(dsn: str):
    return conn.execute("SELECT * FROM sessions WHERE dsn = ?", (dsn,)).fetchone()


def get_sessions():
    return conn.execute("SELECT * FROM sessions").fetchall()


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
        "SELECT conversation_id, session_id, name FROM conversations WHERE conversation_id = ?",
        (conversation_id,),
    ).fetchone()
    return Conversation(
        conversation_id=conversation[0],
        session_id=conversation[1],
        name=conversation[2],
    )


def get_conversations():
    conversations = conn.execute(
        "SELECT conversation_id, session_id, name FROM conversations"
    ).fetchall()
    return [
        Conversation(
            conversation_id=conversation[0],
            session_id=conversation[1],
            name=conversation[2],
        )
        for conversation in conversations
    ]


def get_conversations_with_messages_with_results() -> (
    List[ConversationWithMessagesWithResults]
):
    conversations = conn.execute(
        "SELECT conversation_id, session_id, name FROM conversations"
    ).fetchall()

    conversations_with_messages_with_results = []
    for conversation in conversations:
        conversation_id = conversation[0]
        session_id = conversation[1]
        name = conversation[2]
        messages = conn.execute(
            """
        SELECT messages.message_id, content, role
        FROM messages
        INNER JOIN conversation_messages ON messages.message_id = conversation_messages.message_id
        WHERE conversation_messages.conversation_id = ?
        ORDER BY conversation_messages.message_order ASC""",
            (conversation_id,),
        ).fetchall()

        messages_with_results = []
        for message in messages:
            message_id = message[0]
            content = message[1]
            role = message[2]
            results = conn.execute(
                "SELECT result_id, content, type FROM results INNER JOIN message_results ON results.result_id = message_results.result_id WHERE message_results.message_id = ?",
                (message_id,),
            ).fetchall()
            results = [
                Result(result_id=result[0], content=result[1], type=result[2])
                for result in results
            ]
            messages_with_results.append(
                MessageWithResults(
                    message_id=message_id,
                    content=content,
                    role=role,
                    results=results,
                )
            )
        conversations_with_messages_with_results.append(
            ConversationWithMessagesWithResults(
                conversation_id=conversation_id,
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
    conversation_id = conn.execute(
        "INSERT INTO conversations (session_id, name) VALUES (?, ?)",
        (session_id, name),
    ).lastrowid
    conn.commit()
    return conversation_id


# Add message with results to conversation
def add_message_to_conversation(
    conversation_id: str, content: str, role: str, results: List[Result]
):
    # Basic validation
    if results and role != "assistant":
        raise ValueError("Only assistant messages can have results")

    # Create message object
    message_id = conn.execute(
        "INSERT INTO messages (content, role) VALUES (?, ?)", (content, role)
    ).lastrowid

    # Create result objects and update message_results many2many
    for result in results:
        # Insert result type and content
        result_id = conn.execute(
            "INSERT INTO results (content, type) VALUES (?, ?)",
            (result.content, result.type),
        ).lastrowid

        # Insert message_id and result_id into message_results table
        conn.execute(
            "INSERT INTO message_results (message_id, result_id) VALUES (?, ?)",
            (message_id, result_id),
        )

    # Get last message order from conversation
    last_message_order = conn.execute(
        "SELECT message_order FROM conversation_messages WHERE conversation_id = ? ORDER BY message_order DESC LIMIT 1",
        (conversation_id,),
    ).fetchone()

    # Insert message_id and conversation_id into conversation_messages table
    conn.execute(
        "INSERT INTO conversation_messages (conversation_id, message_id, message_order) VALUES (?, ?, ?)",
        (
            conversation_id,
            message_id,
            last_message_order[0] + 1 if last_message_order else 0,
        ),
    )


def get_messages_with_results(conversation_id: str) -> List[MessageWithResults]:
    # Get all message_ids for conversation
    message_ids = conn.execute(
        "SELECT message_id FROM conversation_messages WHERE conversation_id = ? ORDER BY message_order ASC",
        (conversation_id,),
    ).fetchall()

    # Get all results for each message_id
    messages = []
    for message_id in message_ids:
        message = conn.execute(
            "SELECT content, role FROM messages WHERE message_id = ?",
            (message_id[0],),
        ).fetchone()
        results = conn.execute(
            "SELECT * FROM results WHERE result_id IN (SELECT result_id FROM message_results WHERE message_id = ?)",
            (message_id[0],),
        ).fetchall()
        messages.append(
            MessageWithResults(
                content=message[0],
                results=results,
                role=message[1],
                message_id=message_id,
                conversation_id=conversation_id,
            )
        )

    return messages


def get_message_history(conversation_id: str) -> List[Dict[str, Any]]:
    """Returns the message history of a conversation in OpenAI API format"""
    messages = conn.execute(
        "SELECT content, role FROM messages INNER JOIN conversation_messages ON messages.message_id = conversation_messages.message_id WHERE conversation_messages.conversation_id = ? ORDER BY conversation_messages.message_order ASC",
        (conversation_id,),
    )

    return [{"role": message[1], "content": message[0]} for message in messages]

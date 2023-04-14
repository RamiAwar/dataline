import sqlite3

from errors import DuplicateError

conn = sqlite3.connect("db.sqlite3")


# Create table to store session_id and dsn with unique constraint on session_id and dsn and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS sessions (session_id text PRIMARY KEY, dsn text UNIQUE NOT NULL)"""
)

# Create table to store session_id and index_file with unique constraint on session_id and index_file and not null
conn.execute(
    """CREATE TABLE IF NOT EXISTS schema_indexes (session_id text PRIMARY KEY, index_file text UNIQUE NOT NULL)"""
)


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

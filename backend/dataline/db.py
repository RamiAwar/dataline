import sqlite3
from sqlite3.dbapi2 import Connection as SQLiteConnection
from typing import Any, Optional

from sqlalchemy import event
from sqlalchemy.engine import Engine

from dataline.config import config as dataline_config


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:  # type: ignore[misc]
    if type(dbapi_connection) is sqlite3.Connection:  # play well with other DB backends
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


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

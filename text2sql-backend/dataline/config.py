from pathlib import Path

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    # SQLite database will be mounted in the configuration directory
    # This is where all DataLine data is stored
    # Current dir / db.sqlite3
    sqlite_path: str = str(Path(__file__).parent / "db.sqlite3")
    sqlite_echo: bool = False

    sample_postgres_path: str = str(Path(__file__).parent / "samples" / "postgres" / "dvd_rental.sqlite3")


config = Config()

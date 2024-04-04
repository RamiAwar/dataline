from pathlib import Path

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    # SQLite database will be mounted in the configuration directory
    # This is where all DataLine data is stored
    # Current dir / db.sqlite3
    sqlite_path: str = str(Path(__file__).parent / "db.sqlite3")
    sqlite_echo: bool = False

    # This is where all uploaded files are stored (ex. uploaded sqlite DBs)
    data_directory: str = str(Path(__file__).parent / "data")

    sample_dvdrental_path: str = str(Path(__file__).parent / "samples" / "dvd_rental.sqlite3")
    sample_netflix_path: str = str(Path(__file__).parent / "samples" / "netflix.sqlite3")
    sample_titanic_path: str = str(Path(__file__).parent / "samples" / "titanic.sqlite3")


config = Config()

from pathlib import Path
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Config(BaseSettings):
    # SQLite database will be mounted in the configuration directory
    # This is where all DataLine data is stored
    # Current dir / configuration / db.sqlite3
    sqlite_path: str = str(Path(__file__).parent / "configuration" / "db.sqlite3")
    sqlite_dsn: str | None = None
    sqlite_echo: bool = False

    @model_validator(mode="after")
    def update_dsn(self) -> Self:
        self.sqlite_dsn = f"sqlite+aiosqlite:///{self.sqlite_path}"
        return self


config = Config()

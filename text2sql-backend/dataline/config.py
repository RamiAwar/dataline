from pydantic_settings import BaseSettings


class Config(BaseSettings):
    sqlite_dsn: str = "sqlite+aiosqlite:///./db.sqlite3"
    sqlite_echo: bool = False


config = Config()

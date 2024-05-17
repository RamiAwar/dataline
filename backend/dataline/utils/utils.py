import base64
import random

from fastapi import UploadFile


def get_sqlite_dsn_async(path: str) -> str:
    return f"sqlite+aiosqlite:///{path}"


def get_sqlite_dsn(path: str) -> str:
    return f"sqlite:///{path}"


def is_valid_sqlite_file(file: UploadFile) -> bool:
    # Check header for "SQLite format" by reading first few bytes
    # https://www.sqlite.org/fileformat2.html#the_database_header
    header = file.file.read(16)
    file.file.seek(0)  # Never forget to seek :D
    if header != b"SQLite format 3\000":
        return False
    return True


def generate_short_uuid() -> str:
    # Unique enough given the purpose of storing limited data files
    # Make sure only alphanumeric characters are used
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    sample = random.sample(chars, 8)
    return base64.b64encode("".join(sample).encode()).decode()[:8]

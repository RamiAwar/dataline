import base64
import logging
import random
from typing import AsyncGenerator

from fastapi import UploadFile
from sqlalchemy.exc import ProgrammingError

from dataline.errors import UserFacingError, ValidationError
from dataline.models.llm_flow.enums import QueryStreamingEventType

logger = logging.getLogger(__name__)


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


def stream_event_str(event: str, data: str) -> str:
    # https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format
    event_str = f"event: {event}"
    data_str = f"data: {data}"

    return f"{event_str}\n{data_str}\n\n"


async def generate_with_errors(generator: AsyncGenerator[str, None]) -> AsyncGenerator[str, None]:
    try:
        async for chunk in generator:
            yield chunk
    except UserFacingError as e:
        logger.exception("Error in conversation query generator")
        yield stream_event_str(QueryStreamingEventType.ERROR.value, str(e))


def forward_connection_errors(error: Exception) -> None:
    if isinstance(error, ProgrammingError):
        if "Must specify the full search path starting from database" in str(error):
            raise ValidationError(
                (
                    "Invalid DSN. Please specify the full search path starting from the database"
                    "ex. 'SNOWFLAKE_SAMPLE_DATA/TPCH_SF1'"
                )
            )

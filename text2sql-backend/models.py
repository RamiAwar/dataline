from datetime import datetime
from typing import Any, List, Literal, Tuple, Union

from pydantic import Field
from pydantic.dataclasses import dataclass

ResultType = Union[Literal["sql"], Literal["code"], Literal["text"], Literal["error"]]


@dataclass
class Result:
    result_id: int
    type: ResultType
    content: str
    created_at: datetime


@dataclass
class UnsavedResult:
    type: ResultType
    content: str


@dataclass
class DataResult:
    type: Literal["data"]
    content: List[Any]


@dataclass
class MessageWithResults:
    content: str
    role: str
    results: list[Union[Result, UnsavedResult]]
    message_id: int
    created_at: datetime


@dataclass
class Conversation:
    conversation_id: str
    session_id: str
    name: str
    created_at: datetime


@dataclass
class Session:
    name: str
    database: str
    session_id: str
    dsn: str
    dialect: str


class ConversationWithMessagesWithResults(Conversation):
    messages: list[MessageWithResults]


@dataclass
class SQLQueryResult:
    success: bool = Field(default=False)
    text: str = Field(default="")
    sql: str = Field(default="")
    chart_request: bool = Field(default=False)

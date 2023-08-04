from datetime import datetime
from typing import Any, Literal, Union

from pydantic import BaseModel, Field
from pydantic.dataclasses import dataclass

ResultType = Union[
    Literal["sql"], Literal["code"], Literal["text"], Literal["error"], Literal["data"]
]


@dataclass
class Result:
    result_id: int
    type: ResultType
    content: str
    created_at: datetime


@dataclass
class UnsavedResult:
    type: ResultType
    content: Any


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


class UpdateConversationRequest(BaseModel):
    name: str

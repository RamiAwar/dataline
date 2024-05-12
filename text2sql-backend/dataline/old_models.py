from datetime import datetime
from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar, Union

from pydantic import BaseModel, Field
from pydantic.dataclasses import dataclass

ResultType = Union[
    Literal["sql"],
    Literal["code"],
    Literal["text"],
    Literal["error"],
    Literal["data"],
    Literal["selected_tables"],
]


class StatusType(Enum):
    ok = "ok"
    error = "error"


T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    data: Optional[T] = None


class SuccessListResponse(BaseModel, Generic[T]):
    data: Optional[list[T]] = None


@dataclass
class Result:
    result_id: int
    type: ResultType
    content: str
    created_at: datetime
    is_saved: bool = False


@dataclass
class UnsavedResult:
    type: ResultType
    content: str


@dataclass
class DataResult:
    type: ResultType
    content: Any  # type: ignore[misc]


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
    connection_id: str
    name: str
    created_at: datetime


@dataclass
class ConversationWithMessagesWithResults(Conversation):
    messages: list[MessageWithResults]


@dataclass
class SQLQueryResult:
    success: bool = Field(default=False)
    text: str = Field(default="")
    sql: str = Field(default="")
    chart_request: bool = Field(default=False)
    selected_tables: list[str] = Field(default_factory=list)

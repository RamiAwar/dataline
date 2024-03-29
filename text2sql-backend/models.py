import re
from datetime import datetime
from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar, Union

from pydantic import BaseModel, Field, field_validator
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


class ApiResponse(BaseModel, Generic[T]):
    status: Literal[StatusType.ok, StatusType.error]
    data: Union[Optional[T], str]


class SuccessResponse(ApiResponse[T], Generic[T]):
    status: Literal[StatusType.ok] = StatusType.ok
    data: Optional[T] = None


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
    connection_id: str
    name: str
    created_at: datetime


class TableField(BaseModel):
    name: str
    type: str
    is_primary_key: bool = False
    is_foreign_key: bool = False
    linked_table: str = ""


class TableFieldCreate(BaseModel):
    table_id: str
    field_name: str
    field_type: str
    field_description: str = ""
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_table: str = ""


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


class UpdateConversationRequest(BaseModel):
    name: str


class UpdateConnectionRequest(BaseModel):
    name: str
    dsn: str


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Define a regular expression to match the DSN format
        dsn_regex = r"^[\w\+]+:\/\/[\w-]+:\w+@[\w.-]+[:\d]*\/\w+$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value

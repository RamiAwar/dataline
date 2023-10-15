from datetime import datetime
from typing import Any, Literal, Optional, Union

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
    content: str | list[str]  # To allow for selected tables list


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


class TableSchemaField(BaseModel):
    id: str
    schema_id: str
    name: str
    type: str
    description: str
    is_primary_key: Optional[bool]
    is_foreign_key: Optional[bool]
    linked_table: Optional[str]


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


class TableSchema(BaseModel):
    id: str
    session_id: str
    name: str
    description: str
    field_descriptions: list[TableSchemaField]


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


class UpdateSessionRequest(BaseModel):
    name: str
    dsn: str

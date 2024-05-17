from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResultCreate(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    content: str
    type: str
    message_id: UUID


class ResultUpdate(BaseModel):
    content: str


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    columns: list[str]
    rows: list[list[str]]


class ResultOut(BaseModel):  # type: ignore[misc]
    model_config = ConfigDict(from_attributes=True)

    content: Any  # type: ignore[misc]
    type: str

    result_id: UUID | None = None

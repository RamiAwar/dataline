from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResultCreate(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    content: str
    type: str
    message_id: UUID

    # Used for linking results together ex. chart -> query
    linked_id: UUID | None = None


class ResultUpdate(BaseModel):
    created_at: datetime | None = None
    content: str | None = None
    linked_id: UUID | None = None


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    columns: list[str]
    rows: list[list[str]]


class ResultOut(BaseModel):  # type: ignore[misc]
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime | None = None

    content: Any  # type: ignore[misc]
    type: str

    result_id: UUID | None = None
    linked_id: UUID | None = None


class ChartRefreshOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    chartjs_json: str

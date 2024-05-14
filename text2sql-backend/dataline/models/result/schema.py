from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ResultCreate(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    content: str
    type: str
    message_id: UUID


class ResultUpdate(BaseModel):
    content: str

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class BaseMessageType(Enum):
    AI = "ai"
    HUMAN = "human"
    SYSTEM = "system"


class MessageCreate(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    content: str
    role: str
    conversation_id: UUID


class MessageUpdate(BaseModel):
    content: str
    role: str
    conversation_id: UUID

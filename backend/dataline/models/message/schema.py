from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from dataline.models.result.schema import ResultOut


class BaseMessageType(Enum):
    AI = "ai"
    HUMAN = "human"
    SYSTEM = "system"


class MessageOptions(BaseModel):
    secure_data: bool = True


class MessageCreate(BaseModel):
    created_at: datetime = Field(default_factory=datetime.now)

    content: str
    role: str
    conversation_id: UUID

    options: Optional[MessageOptions] = None


class MessageUpdate(BaseModel):
    content: str
    role: str
    conversation_id: UUID


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    role: Literal["ai"] | Literal["human"]
    created_at: datetime

    options: Optional[MessageOptions]


class MessageWithResultsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: MessageOut
    results: list[ResultOut]


class QueryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    human_message: MessageOut
    ai_message: MessageWithResultsOut

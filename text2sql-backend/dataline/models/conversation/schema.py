from datetime import datetime
from typing import Any, Self, Sequence
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from dataline.models.conversation.model import ConversationModel
from dataline.models.llm_flow.schema import ResultType
from dataline.old_models import ConversationWithMessagesWithResults


class ConversationsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    conversations: list[ConversationWithMessagesWithResults]


class CreateConversationIn(BaseModel):
    connection_id: UUID
    name: str


class ConversationOut(BaseModel):
    conversation_id: UUID
    connection_id: UUID
    name: str
    created_at: datetime

    @classmethod
    def from_model(cls, conversation: ConversationModel) -> Self:
        return cls(
            conversation_id=conversation.id,
            connection_id=conversation.connection_id,
            name=conversation.name,
            created_at=conversation.created_at,
        )


class UpdateConversationRequest(BaseModel):
    name: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    role: str
    created_at: datetime


class ResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content: str
    type: str


class QueryOut(BaseModel):
    message: MessageOut
    results: list[ResultOut]

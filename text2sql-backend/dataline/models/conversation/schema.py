from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from dataline.models.conversation.model import ConversationModel
from dataline.old_models import ConversationWithMessagesWithResults


class ConversationsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    conversations: list[ConversationWithMessagesWithResults]


class CreateConversationIn(BaseModel):
    connection_id: UUID
    name: str


class CreateConversationOut(BaseModel):
    conversation_id: int

    @classmethod
    def from_model(cls, conversation: ConversationModel) -> Self:
        return cls(conversation_id=conversation.id)


class ConversationOut(BaseModel):
    conversation_id: int
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

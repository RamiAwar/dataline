from datetime import datetime
from typing import Literal, Self
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


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    connection_id: UUID
    name: str
    created_at: datetime


class UpdateConversationRequest(BaseModel):
    name: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    role: Literal["ai"] | Literal["human"]
    created_at: datetime


class ResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content: str
    type: str


class QueryOut(BaseModel):
    message: MessageOut
    results: list[ResultOut]


class MessageWithResultsOut(MessageOut):
    model_config = ConfigDict(from_attributes=True)

    results: list[ResultOut]


class ConversationWithMessagesWithResultsOut(ConversationOut):
    model_config = ConfigDict(from_attributes=True)

    messages: list[MessageWithResultsOut]

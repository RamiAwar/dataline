from datetime import datetime
from typing import Type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload

from dataline.models.conversation.model import ConversationModel
from dataline.models.message.model import MessageModel
from dataline.repositories.base import AsyncSession, BaseRepository


class ConversationCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    connection_id: UUID
    name: str
    created_at: datetime = Field(default_factory=datetime.now)


class ConversationUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    connection_id: UUID | None = None
    name: str | None = None


class ConversationRepository(BaseRepository[ConversationModel, ConversationCreate, ConversationUpdate]):
    @property
    def model(self) -> Type[ConversationModel]:
        return ConversationModel

    async def get_with_messages_with_results(self, session: AsyncSession, conversation_id: UUID) -> ConversationModel:
        query = (
            select(self.model)
            .filter_by(id=conversation_id)
            .options(selectinload(ConversationModel.messages), selectinload(MessageModel.results))
        )

        return await self.get(session, query)

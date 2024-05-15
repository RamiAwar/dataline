from datetime import datetime
from typing import Sequence, Type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import joinedload

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

    async def list_with_messages_with_results(self, session: AsyncSession) -> Sequence[ConversationModel]:
        query = select(ConversationModel).options(
            joinedload(ConversationModel.messages).joinedload(MessageModel.results)
        )
        return await self.list_unique(session, query)

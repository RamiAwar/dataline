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

    async def get_by_id(self, session: AsyncSession, record_id: int) -> ConversationModel:
        query = select(self.model).filter_by(id=record_id)
        return await self.get(session, query)

    async def delete_by_id(self, session: AsyncSession, record_id: int) -> None:
        query = delete(self.model).filter_by(id=record_id)
        await self.delete_one(session, query)

    async def update_by_id(self, session: AsyncSession, record_id: int, data: ConversationUpdate) -> ConversationModel:
        query = (
            update(self.model)
            .filter_by(id=record_id)
            .values(**data.model_dump(exclude_defaults=True))
            .returning(self.model)
        )
        return await self.update_one(session, query)

    async def get_with_messages_with_results(self, session: AsyncSession, conversation_id: int) -> ConversationModel:
        query = (
            select(self.model)
            .filter_by(id=conversation_id)
            .options(selectinload(ConversationModel.messages), selectinload(MessageModel.results))
        )

        return await self.get(session, query)

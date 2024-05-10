from uuid import UUID

from fastapi import Depends

from dataline.models.conversation.schema import ConversationOut
from dataline.repositories.base import AsyncSession
from dataline.repositories.conversation import (
    ConversationCreate,
    ConversationRepository,
    ConversationUpdate,
)


class ConversationService:
    conversation_repo: ConversationRepository

    def __init__(self, conversation_repo: ConversationRepository = Depends()) -> None:
        self.conversation_repo = conversation_repo

    async def create_conversation(
        self,
        session: AsyncSession,
        connection_id: UUID,
        name: str,
    ) -> ConversationOut:
        conversation = await self.conversation_repo.create(
            session, ConversationCreate(connection_id=connection_id, name=name)
        )
        return ConversationOut.from_model(conversation)

    async def get_conversation(self, session: AsyncSession, conversation_id: int) -> ConversationOut:
        conversation = await self.conversation_repo.get_by_id(session, conversation_id)
        return ConversationOut.from_model(conversation)

    # TODO: Implement after implementing messages and results repos
    # async def list_conversations_with_messages_with_results(self, session: AsyncSession) -> list[ConversationOut]:
    #     conversations = await self.conversation_repo.list_all(session)

    #     conversations_with_messages_with_results = []
    #     for conversation in conversations:
    #         messages = await self.message_repo.list_messages_by_conversation(session, conversation.id)

    #         messages_with_results = []
    #         for message in messages:
    #             ...

    async def delete_conversation(self, session: AsyncSession, conversation_id: int) -> None:
        await self.conversation_repo.delete_by_id(session, record_id=conversation_id)

    async def update_conversation_name(self, session: AsyncSession, conversation_id: int, name: str) -> ConversationOut:
        conversation = await self.conversation_repo.update_by_id(
            session, conversation_id, ConversationUpdate(name=name)
        )
        return ConversationOut.from_model(conversation)

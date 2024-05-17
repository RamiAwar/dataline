from uuid import UUID

from fastapi import Depends

from dataline.models.conversation.schema import (
    ConversationOut,
    ConversationWithMessagesWithResultsOut,
)
from dataline.models.llm_flow.schema import (
    QueryOptions,
    RenderableResultMixin,
    StorableResultMixin,
)
from dataline.models.message.schema import (
    BaseMessageType,
    MessageCreate,
    MessageOptions,
    MessageOut,
    MessageWithResultsOut,
)
from dataline.repositories.base import AsyncSession
from dataline.repositories.conversation import (
    ConversationCreate,
    ConversationRepository,
    ConversationUpdate,
)
from dataline.repositories.message import MessageRepository
from dataline.repositories.result import ResultRepository
from dataline.services.connection import ConnectionService
from dataline.services.llm_flow.graph import QueryGraphService
from dataline.services.settings import SettingsService


class ConversationService:
    conversation_repo: ConversationRepository
    message_repo: MessageRepository
    result_repo: ResultRepository
    connection_service: ConnectionService
    settings_service: SettingsService

    def __init__(
        self,
        conversation_repo: ConversationRepository = Depends(ConversationRepository),
        message_repo: MessageRepository = Depends(MessageRepository),
        result_repo: ResultRepository = Depends(ResultRepository),
        connection_service: ConnectionService = Depends(ConnectionService),
        settings_service: SettingsService = Depends(SettingsService),
    ) -> None:
        self.conversation_repo = conversation_repo
        self.message_repo = message_repo
        self.result_repo = result_repo
        self.connection_service = connection_service
        self.settings_service = settings_service

    async def create_conversation(
        self,
        session: AsyncSession,
        connection_id: UUID,
        name: str,
    ) -> ConversationOut:
        conversation = await self.conversation_repo.create(
            session, ConversationCreate(connection_id=connection_id, name=name)
        )
        return ConversationOut.model_validate(conversation)

    async def get_conversation(self, session: AsyncSession, conversation_id: UUID) -> ConversationOut:
        conversation = await self.conversation_repo.get_by_uuid(session, conversation_id)
        return ConversationOut.model_validate(conversation)

    async def get_conversation_with_messages(
        self, session: AsyncSession, conversation_id: UUID
    ) -> ConversationWithMessagesWithResultsOut:
        conversation = await self.conversation_repo.get_with_messages_with_results(session, conversation_id)
        return ConversationWithMessagesWithResultsOut.from_conversation(conversation)

    async def get_conversations(self, session: AsyncSession) -> list[ConversationWithMessagesWithResultsOut]:
        conversations = await self.conversation_repo.list_with_messages_with_results(session)
        return [
            ConversationWithMessagesWithResultsOut.from_conversation(conversation) for conversation in conversations
        ]

    async def delete_conversation(self, session: AsyncSession, conversation_id: UUID) -> None:
        await self.conversation_repo.delete_by_uuid(session, record_id=conversation_id)

    async def update_conversation_name(
        self, session: AsyncSession, conversation_id: UUID, name: str
    ) -> ConversationOut:
        conversation = await self.conversation_repo.update_by_uuid(
            session, conversation_id, ConversationUpdate(name=name)
        )
        return ConversationOut.model_validate(conversation)

    async def query(
        self,
        session: AsyncSession,
        conversation_id: UUID,
        query: str,
        secure_data: bool = True,
    ) -> MessageWithResultsOut:
        # Get conversation, connection, user settings
        conversation = await self.get_conversation(session, conversation_id=conversation_id)
        connection = await self.connection_service.get_connection(session, connection_id=conversation.connection_id)
        user_with_model_details = await self.settings_service.get_model_details(session)

        # Create query graph
        query_graph = QueryGraphService(
            dsn=connection.dsn,
        )

        # Store human message and final AI message without flushing
        await self.message_repo.create(
            session,
            MessageCreate(
                role=BaseMessageType.HUMAN.value,
                content=query,
                conversation_id=conversation_id,
                options=MessageOptions(secure_data=secure_data),
            ),
            flush=False,
        )

        # Perform query and execute graph
        messages, results = query_graph.query(
            query=query,
            options=QueryOptions(
                secure_data=secure_data,
                openai_api_key=user_with_model_details.openai_api_key.get_secret_value(),  # type: ignore
                model_name=user_with_model_details.preferred_openai_model,
            ),
            history=[],
        )

        # Find first AI message from the back
        last_ai_message = None
        for message in reversed(messages):
            if message.type == BaseMessageType.AI.value:
                last_ai_message = message
                break

        # Store final AI message in history
        if not last_ai_message:
            raise Exception("No AI message found in conversation")

        stored_ai_message = await self.message_repo.create(
            session,
            MessageCreate(
                role=BaseMessageType.AI.value,
                content=str(last_ai_message.content),
                conversation_id=conversation_id,
                options=MessageOptions(secure_data=secure_data),
            ),
            flush=True,
        )

        # Store results and final message in database
        for result in results:
            if isinstance(result, StorableResultMixin):
                await result.store_result(session, self.result_repo, stored_ai_message.id)

        # Render renderable results
        serialized_results = [
            result.serialize_result() for result in results if isinstance(result, RenderableResultMixin)
        ]

        return MessageWithResultsOut(
            message=MessageOut.model_validate(stored_ai_message),
            results=serialized_results,
        )

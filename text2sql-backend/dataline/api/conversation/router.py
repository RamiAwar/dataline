import logging
from uuid import UUID

from fastapi import APIRouter, Depends

from dataline.models.conversation.schema import (
    ConversationOut,
    ConversationWithMessagesWithResultsOut,
    CreateConversationIn,
    QueryOut,
    UpdateConversationRequest,
)
from dataline.old_models import SuccessListResponse, SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.conversation import ConversationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/conversations")
async def conversations(
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessListResponse[ConversationWithMessagesWithResultsOut]:
    conversations = await conversation_service.get_conversations(session)
    return SuccessListResponse(
        data=conversations,
    )


@router.post("/conversation")
async def create_conversation(
    conversation_in: CreateConversationIn,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.create_conversation(
        session, connection_id=conversation_in.connection_id, name=conversation_in.name
    )
    return SuccessResponse(
        data=conversation,
    )


@router.patch("/conversation/{conversation_id}")
async def update_conversation(
    conversation_id: UUID,
    conversation_in: UpdateConversationRequest,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.update_conversation_name(
        session, conversation_id=conversation_id, name=conversation_in.name
    )
    return SuccessResponse(data=conversation)


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> None:
    return await conversation_service.delete_conversation(session, conversation_id)


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ConversationOut]:
    conversation = await conversation_service.get_conversation(session, conversation_id=conversation_id)
    return SuccessResponse(data=conversation)


@router.get("/conversation/{conversation_id}/query")
async def query(
    conversation_id: UUID,
    query: str,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(),
) -> QueryOut:
    return await conversation_service.query(session, conversation_id, query)

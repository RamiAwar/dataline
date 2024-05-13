from fastapi import APIRouter, Depends
from pydantic import BaseModel

from dataline import db
from dataline.old_models import MessageWithResults, SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.services.conversation import ConversationService

router = APIRouter(tags=["conversation"])


class ListMessageOut(BaseModel):
    messages: list[MessageWithResults]


@router.get("/conversation/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    session: AsyncSession = Depends(get_session),
    conversation_service: ConversationService = Depends(ConversationService),
) -> SuccessResponse[ListMessageOut]:
    conversation = await conversation_service.get_conversation(session, conversation_id=conversation_id)

    messages = db.get_messages_with_results(str(conversation.conversation_id))
    return SuccessResponse(data=ListMessageOut(messages=messages))

from sqlalchemy import ForeignKey
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel
from dataline.models.message import MessageModel
from dataline.models.conversation import ConversationModel


class ConversationMessageModel(DBModel):
    __tablename__ = "conversation_messages"
    message_id: Mapped[int] = mapped_column(ForeignKey(MessageModel.id), primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey(ConversationModel.id), primary_key=True)

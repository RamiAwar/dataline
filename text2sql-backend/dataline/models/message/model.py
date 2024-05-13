from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.conversation.model import ConversationModel

if TYPE_CHECKING:
    from dataline.models.result.model import ResultModel


class MessageModel(DBModel, UUIDMixin, kw_only=True):
    __tablename__ = "messages"
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    role: Mapped[str] = mapped_column("role", String, nullable=False)
    created_at: Mapped[str | None] = mapped_column("created_at", String)
    conversation_id: Mapped[int] = mapped_column(ForeignKey(ConversationModel.id, ondelete="CASCADE"))
    selected_tables: Mapped[str] = mapped_column("selected_tables", String, nullable=False, default="")

    # Relationships
    conversation: Mapped[ConversationModel] = relationship("ConversationModel", back_populates="messages")
    results: Mapped[list["ResultModel"]] = relationship("ResultModel", back_populates="message")

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.conversation.model import ConversationModel
from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from dataline.models.result.model import ResultModel


class MessageModel(DBModel, UUIDMixin, kw_only=True):  # type: ignore[misc]
    __tablename__ = "messages"
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    role: Mapped[str] = mapped_column("role", String, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column("created_at", String)
    conversation_id: Mapped[UUID] = mapped_column(ForeignKey(ConversationModel.id, ondelete="CASCADE"))
    options: Mapped[dict[str, Any] | None] = mapped_column("options", JSON, nullable=True)  # type: ignore[misc]

    # Relationships
    conversation: Mapped[ConversationModel] = relationship("ConversationModel", back_populates="messages")
    results: Mapped[list["ResultModel"]] = relationship("ResultModel", back_populates="message")

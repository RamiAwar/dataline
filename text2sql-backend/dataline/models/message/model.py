from sqlalchemy import ForeignKey, String, Integer, Text
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel
from dataline.models.conversation import ConversationModel


class MessageModel(DBModel):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column("id", Integer, primary_key=True, init=False)
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    role: Mapped[str] = mapped_column("role", String, nullable=False)
    created_at: Mapped[str | None] = mapped_column("created_at", String)
    conversation_id: Mapped[int] = mapped_column(ForeignKey(ConversationModel.id, ondelete="CASCADE"))
    selected_tables: Mapped[str] = mapped_column("selected_tables", String, nullable=False, default="")

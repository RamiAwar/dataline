from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.message.model import MessageModel


class ResultModel(DBModel, UUIDMixin, kw_only=True):
    __tablename__ = "results"
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    type: Mapped[str] = mapped_column("type", String, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column("created_at", String)
    message_id: Mapped[UUID] = mapped_column(ForeignKey(MessageModel.id, ondelete="CASCADE"))

    # Relationships
    message: Mapped["MessageModel"] = relationship("MessageModel", back_populates="results")

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.connection.model import ConnectionModel

if TYPE_CHECKING:
    from dataline.models.message.model import MessageModel


class ConversationModel(DBModel, UUIDMixin, kw_only=True):
    __tablename__ = "conversations"
    connection_id: Mapped[UUID] = mapped_column(ForeignKey(ConnectionModel.id, ondelete="CASCADE"))
    name: Mapped[str] = mapped_column("name", String, nullable=False)
    created_at: Mapped[datetime] = mapped_column("created_at", String)

    # Relationships
    messages: Mapped[list["MessageModel"]] = relationship("MessageModel", back_populates="conversation")
    connection: Mapped["ConnectionModel"] = relationship("ConnectionModel", back_populates="conversations")

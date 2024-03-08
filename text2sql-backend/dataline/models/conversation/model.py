from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel
from dataline.models.connection import ConnectionModel


class ConversationModel(DBModel):
    __tablename__ = "conversations"
    id: Mapped[int] = mapped_column("id", Integer, primary_key=True, init=False)
    connection_id: Mapped[UUID] = mapped_column(ForeignKey(ConnectionModel.id))
    name: Mapped[str] = mapped_column("name", String, nullable=False)
    created_at: Mapped[str | None] = mapped_column("created_at", String)

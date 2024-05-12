from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from dataline.models.base import DBModel

if TYPE_CHECKING:
    from dataline.models.message.model import MessageModel


class ResultModel(DBModel, kw_only=True):
    __tablename__ = "results"
    id: Mapped[int] = mapped_column("id", Integer, primary_key=True, init=False)
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    type: Mapped[str] = mapped_column("type", String, nullable=False)
    created_at: Mapped[str | None] = mapped_column("created_at", String)

    # Relationships
    message: Mapped["MessageModel"] = relationship("MessageModel", back_populates="results")

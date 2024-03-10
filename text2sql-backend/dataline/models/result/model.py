from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel


class ResultModel(DBModel):
    __tablename__ = "results"
    id: Mapped[int] = mapped_column("id", Integer, primary_key=True, init=False)
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    type: Mapped[str] = mapped_column("type", String, nullable=False)
    created_at: Mapped[str | None] = mapped_column("created_at", String)

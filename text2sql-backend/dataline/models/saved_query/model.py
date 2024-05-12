from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from dataline.models.base import DBModel
from dataline.models.result.model import ResultModel


class SavedQueryModel(DBModel):
    __tablename__ = "saved_queries"
    result_id: Mapped[int] = mapped_column(ForeignKey(ResultModel.id, ondelete="CASCADE"), primary_key=True)
    name: Mapped[str | None] = mapped_column("name", String)
    description: Mapped[str | None] = mapped_column("description", Text)

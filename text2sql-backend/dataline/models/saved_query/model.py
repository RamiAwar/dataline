from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.result.model import ResultModel


class SavedQueryModel(DBModel, UUIDMixin):
    __tablename__ = "saved_queries"
    result_id: Mapped[int] = mapped_column(ForeignKey(ResultModel.id, ondelete="CASCADE"))
    name: Mapped[str | None] = mapped_column("name", String)
    description: Mapped[str | None] = mapped_column("description", Text)

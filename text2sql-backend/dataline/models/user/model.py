from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel, UUIDMixin


class UserModel(DBModel, UUIDMixin):
    __tablename__ = "user"
    name: Mapped[str | None] = mapped_column("name", String(100), nullable=True)
    openai_api_key: Mapped[str | None] = mapped_column("openai_api_key", String, nullable=True)

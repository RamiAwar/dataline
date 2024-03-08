from sqlalchemy import String
from sqlalchemy.orm import mapped_column

from dataline.models.base import DBModel


class UserModel(DBModel):
    __tablename__ = "user"
    name = mapped_column("name", String(100), nullable=True)
    openai_api_key = mapped_column("openai_api_key", String, nullable=True)

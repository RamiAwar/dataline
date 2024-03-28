from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from dataline.models.base import DBModel, UUIDMixin


class ConnectionModel(DBModel, UUIDMixin):
    __tablename__ = "connections"
    dsn: Mapped[str] = mapped_column("dsn", String, nullable=False, unique=True)
    database: Mapped[str] = mapped_column("database", String, nullable=False)
    name: Mapped[str | None] = mapped_column("name", String)
    dialect: Mapped[str | None] = mapped_column("dialect", String)
    is_sample: Mapped[bool] = mapped_column("is_sample", Boolean, nullable=False, default=False, server_default="false")

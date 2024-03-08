from uuid import UUID

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.connection import ConnectionModel


class SchemaTableModel(DBModel, UUIDMixin):
    __tablename__ = "schema_tables"
    connection_id: Mapped[UUID] = mapped_column(ForeignKey(ConnectionModel.id))
    name: Mapped[str] = mapped_column("name", String, nullable=False)
    description: Mapped[str] = mapped_column("description", Text, nullable=False)

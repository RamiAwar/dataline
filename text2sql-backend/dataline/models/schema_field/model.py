from uuid import UUID

from sqlalchemy import String, ForeignKey, Boolean, Text
from sqlalchemy.orm import mapped_column, Mapped

from dataline.models.base import DBModel, UUIDMixin
from dataline.models.schema_table import SchemaTableModel


class SchemaFieldModel(DBModel, UUIDMixin):
    __tablename__ = "schema_fields"
    table_id: Mapped[UUID] = mapped_column(ForeignKey(SchemaTableModel.id))
    name: Mapped[str] = mapped_column("name", String, nullable=False)
    type: Mapped[str] = mapped_column("type", String, nullable=False)
    description: Mapped[str] = mapped_column("description", Text, nullable=False)
    is_primary_key: Mapped[bool] = mapped_column("is_primary_key", Boolean, default=0, nullable=False)
    is_foreign_key: Mapped[bool] = mapped_column("is_foreign_key", Boolean, default=0, nullable=False)
    foreign_table: Mapped[str] = mapped_column("foreign_table", String, default="", nullable=False)

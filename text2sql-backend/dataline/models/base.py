import uuid
from uuid import UUID

from sqlalchemy import MetaData, Uuid as DB_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column


class DBModel(MappedAsDataclass, DeclarativeBase, init=False, kw_only=True):
    __abstract__ = True
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_`%(constraint_name)s`",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class UUIDMixin:
    # Generate UUID in python
    id: Mapped[UUID] = mapped_column("id", DB_UUID, primary_key=True, default=uuid.uuid4, init=False)

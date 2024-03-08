import uuid
from uuid import UUID

from sqlalchemy import Uuid as DB_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column


class DBModel(MappedAsDataclass, DeclarativeBase, init=False, kw_only=True):
    __abstract__ = True


class UUIDMixin:
    # Generate UUID in python
    id: Mapped[UUID] = mapped_column("id", DB_UUID, primary_key=True, default=uuid.uuid4, init=False)

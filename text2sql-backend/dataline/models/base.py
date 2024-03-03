import uuid
from uuid import UUID

from sqlalchemy import UUID as DB_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column


class DBModel(MappedAsDataclass, DeclarativeBase, init=False, kw_only=True):
    __abstract__ = True

    # Generate UUID in python
    id: Mapped[UUID] = mapped_column(
        "id", DB_UUID, primary_key=True, default=lambda: uuid.uuid4(), init=False
    )

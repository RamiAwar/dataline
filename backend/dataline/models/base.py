import uuid
from uuid import UUID

from sqlalchemy import MetaData
from sqlalchemy import Uuid as DB_UUID
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


class CustomUUIDType(DB_UUID):  # type: ignore
    # Do not ask. SQLite is a pain.
    def bind_processor(self, dialect):  # type: ignore
        character_based_uuid = not dialect.supports_native_uuid or not self.native_uuid

        if character_based_uuid:
            if self.as_uuid:

                def process(value):  # type: ignore
                    if value is not None:
                        value = str(value)
                    return value

                return process
            else:

                def process(value):  # type: ignore
                    if value is not None:
                        value = value.replace("-", "")
                    return value

                return process
        else:
            return None


class UUIDMixin(MappedAsDataclass, init=False, kw_only=True):
    id: Mapped[UUID] = mapped_column("id", CustomUUIDType, primary_key=True, insert_default=uuid.uuid4, init=False)

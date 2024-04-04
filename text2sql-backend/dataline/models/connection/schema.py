import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConnectionUpdateIn(BaseModel):
    name: str | None = None
    dsn: str | None = None
    database: str | None = None
    dialect: str | None = None
    is_sample: bool | None = None


class Connection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    dsn: str
    database: str
    dialect: str
    is_sample: bool


class ConnectionOut(Connection):
    model_config = ConfigDict(from_attributes=True)


class ConnectionIn(BaseModel):
    dsn: str = Field(min_length=3)
    name: str

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        # Define a regular expression to match the DSN format
        dsn_regex = r"^[\w\+]+:\/\/[\w-]+:\w+@[\w.-]+[:\d]*\/\w+$"

        if not re.match(dsn_regex, value):
            raise ValueError(
                'Invalid DSN format. The expected format is "driver://username:password@host:port/database".'
            )

        return value


class GetConnectionOut(BaseModel):
    connection: ConnectionOut


class GetConnectionListOut(BaseModel):
    connections: list[ConnectionOut]


class TableSchemaField(BaseModel):
    id: str
    schema_id: str
    name: str
    type: str
    description: str
    is_primary_key: Optional[bool]
    is_foreign_key: Optional[bool]
    linked_table: Optional[str]


class TableSchema(BaseModel):
    id: str
    connection_id: str
    name: str
    description: str
    field_descriptions: list[TableSchemaField]


class TableSchemasOut(BaseModel):
    tables: list[TableSchema]


class SampleOut(BaseModel):
    title: str
    file: str
    link: str

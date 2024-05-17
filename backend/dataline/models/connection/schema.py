import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


def validate_dsn(value: str) -> str:
    # Regular expression pattern for matching DSNs
    # Try sqlite first
    sqlite_pattern = r"^sqlite://(/.+?)(:(.+))?$"
    if re.match(sqlite_pattern, value):
        return value

    dsn_pattern = (
        r"^(?P<driver>[\w+]+):\/\/(?:(?P<username>\w+):(?P<password>\w+)@)?(?P<host>[\w\.-]+)"
        r"(?::(?P<port>\d+))?(?:\/(?P<database>[\w\.-]+))?$"
    )
    match = re.match(dsn_pattern, value)
    if match:
        # Extracting components from the DSN
        driver = match.group("driver")
        host = match.group("host")
        database = match.group("database")

        # Validating components (You can customize the validation rules as per your requirements)
        if not driver:
            raise ValueError("Missing driver in DSN")

        if not host:
            raise ValueError("Host missing from DSN")

        if not database:
            raise ValueError("DSN must specify a database name")
    else:
        # DSN doesn't match the expected pattern
        raise ValueError("Invalid DSN format")

    # Simpler way to connect to postgres even though officially deprecated
    # This mirrors psql which is a very common way to connect to postgres
    if value.startswith("postgres") and not value.startswith("postgresql"):
        # Only replace first occurrence
        value = value.replace("postgres", "postgresql", 1)

    return value


class ConnectRequest(BaseModel):
    dsn: str = Field(min_length=3)
    name: str
    is_sample: bool = False

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        return validate_dsn(value)


class ConnectionUpdateIn(BaseModel):
    name: Optional[str] = None
    dsn: Optional[str] = None

    @field_validator("dsn")
    def validate_dsn_format(cls, value: str) -> str:
        return validate_dsn(value)

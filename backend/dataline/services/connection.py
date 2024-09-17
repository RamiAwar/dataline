import logging
import os
import sqlite3
import tempfile
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

import pandas as pd
import pyreadstat
from fastapi import Depends, UploadFile
from sqlalchemy.exc import OperationalError

from dataline.config import config
from dataline.errors import ValidationError
from dataline.models.connection.model import ConnectionModel
from dataline.models.connection.schema import (
    ConnecitonSchemaTable,
    ConnectionOptions,
    ConnectionOut,
    ConnectionSchema,
    ConnectionUpdateIn,
)
from dataline.repositories.base import AsyncSession, NotFoundError, NotUniqueError
from dataline.repositories.connection import (
    ConnectionCreate,
    ConnectionRepository,
    ConnectionType,
    ConnectionUpdate,
)
from dataline.services.file_parsers.excel_parser import ExcelParserService
from dataline.services.llm_flow.utils import DatalineSQLDatabase as SQLDatabase
from dataline.utils.utils import (
    forward_connection_errors,
    generate_short_uuid,
    get_sqlite_dsn,
)

logger = logging.getLogger(__name__)


class ConnectionService:
    connection_repo: ConnectionRepository

    def __init__(self, connection_repo: ConnectionRepository = Depends(ConnectionRepository)) -> None:
        self.connection_repo = connection_repo

    async def get_connection(self, session: AsyncSession, connection_id: UUID) -> ConnectionOut:
        connection = await self.connection_repo.get_by_uuid(session, connection_id)
        return ConnectionOut.model_validate(connection)

    async def get_connection_from_dsn(self, session: AsyncSession, dsn: str) -> ConnectionOut:
        connection = await self.connection_repo.get_by_dsn(session, dsn=dsn)
        return ConnectionOut.model_validate(connection)

    async def get_connections(self, session: AsyncSession) -> list[ConnectionOut]:
        connections = await self.connection_repo.list_all(session)
        return [ConnectionOut.model_validate(connection) for connection in connections]

    async def delete_connection(self, session: AsyncSession, connection_id: UUID) -> None:
        await self.connection_repo.delete_by_uuid(session, connection_id)

    async def get_db_from_dsn(self, dsn: str) -> SQLDatabase:
        # Check if connection can be established before saving it
        try:
            db = SQLDatabase.from_uri(dsn)
            database = db._engine.url.database

            if not database:
                raise ValidationError("Invalid DSN. Database name is missing, append '/DBNAME'.")

            return db

        except OperationalError as exc:
            # Try again replacing localhost with host.docker.internal to connect with DBs running in docker
            if "localhost" in dsn:
                dsn = dsn.replace("localhost", "host.docker.internal")
                try:
                    db = SQLDatabase.from_uri(dsn)
                    database = db._engine.url.database

                    if not database:
                        raise ValidationError("Invalid DSN. Database name is missing, append '/DBNAME'.")

                    return db
                except OperationalError as e:
                    logger.error(e)
                    raise ValidationError("Failed to connect to database, please check your DSN.")
                except Exception as e:
                    forward_connection_errors(e)

            logger.error(exc)
            raise ValidationError("Failed to connect to database, please check your DSN.")

        except Exception as e:
            forward_connection_errors(e)
            logger.error(e)
            raise ValidationError("Failed to connect to database, please check your DSN.")

    async def check_dsn_already_exists(self, session: AsyncSession, dsn: str) -> None:
        try:
            existing_connection = await self.connection_repo.get_by_dsn(session, dsn=dsn)
            if existing_connection:
                raise NotUniqueError("Connection already exists.")
        except NotFoundError:
            pass

    async def check_dsn_already_exists_or_none(self, session: AsyncSession, dsn: str) -> ConnectionModel | None:
        try:
            return await self.connection_repo.get_by_dsn(session, dsn=dsn)
        except NotFoundError:
            return None

    async def update_connection(
        self, session: AsyncSession, connection_uuid: UUID, data: ConnectionUpdateIn
    ) -> ConnectionOut:
        update = ConnectionUpdate()
        if data.dsn:
            current_connection = await self.get_connection(session, connection_uuid)
            # Check if connection already exists and is different from the current one
            existing_connection = await self.check_dsn_already_exists_or_none(session, data.dsn)
            if existing_connection is not None and existing_connection.id != connection_uuid:
                raise NotUniqueError("Connection DSN already exists.")

            # Check if connection can be established before saving it
            db = await self.get_db_from_dsn(data.dsn)
            update.dsn = str(db._engine.url.render_as_string(hide_password=False))
            update.database = db._engine.url.database
            update.dialect = db.dialect
            old_options = (
                ConnectionOptions.model_validate(current_connection.options) if current_connection.options else None
            )
            update.options = self.merge_options(old_options, db)
        elif data.options:
            # only modify options if dsn hasn't changed
            update.options = data.options

        if data.name:
            update.name = data.name

        updated_connection = await self.connection_repo.update_by_uuid(session, connection_uuid, update)
        return ConnectionOut.model_validate(updated_connection)

    async def create_connection(
        self,
        session: AsyncSession,
        dsn: str,
        name: str,
        connection_type: str | None = None,
        is_sample: bool = False,
    ) -> ConnectionOut:
        # Check if connection can be established before saving it
        db = await self.get_db_from_dsn(dsn)
        # get potentially modified dsn (eg. if localhost was replaced with host.docker.internal)
        dsn = str(db._engine.url.render_as_string(hide_password=False))
        if not connection_type:
            connection_type = db.dialect

        # Check if connection already exists
        await self.check_dsn_already_exists(session, dsn)
        connection_schemas: list[ConnectionSchema] = [
            ConnectionSchema(
                name=schema,
                tables=[ConnecitonSchemaTable(name=table, enabled=True) for table in tables],
                enabled=True,
            )
            for schema, tables in db._all_tables_per_schema.items()
        ]
        connection = await self.connection_repo.create(
            session,
            ConnectionCreate(
                dsn=dsn,
                database=db._engine.url.database,
                name=name,
                dialect=db.dialect,
                type=connection_type,
                is_sample=is_sample,
                options=ConnectionOptions(schemas=connection_schemas),
            ),
        )
        return ConnectionOut.model_validate(connection)

    async def create_sqlite_connection(
        self, session: AsyncSession, file: BinaryIO, name: str, is_sample: bool = False
    ) -> ConnectionOut:
        generated_name = generate_short_uuid() + ".sqlite"
        file_path = Path(config.data_directory) / generated_name
        with file_path.open("wb") as f:
            f.write(file.read())

        # Create connection with the locally copied file
        dsn = get_sqlite_dsn(str(file_path.absolute()))
        return await self.create_connection(session, dsn=dsn, name=name, is_sample=is_sample)

    async def create_csv_connection(self, session: AsyncSession, file: UploadFile, name: str) -> ConnectionOut:
        generated_name = generate_short_uuid() + ".sqlite"
        file_path = Path(config.data_directory) / generated_name

        # Connect to the SQLite database (it will be created if it doesn't exist)
        conn = sqlite3.connect(file_path)
        # Load CSV file into a Pandas dataframe directly from the URL
        data_df = pd.read_csv(file.file)
        # Write the dataframe to the SQLite database
        table_name = name.lower().replace(" ", "_")
        data_df.to_sql(table_name, conn, if_exists="replace", index=False)
        # Commit and close connection to new SQLite database
        conn.commit()
        conn.close()

        # Create connection with the locally copied file
        dsn = get_sqlite_dsn(str(file_path.absolute()))
        return await self.create_connection(
            session, dsn=dsn, name=name, connection_type=ConnectionType.csv.value, is_sample=False
        )

    async def create_excel_connection(self, session: AsyncSession, file: UploadFile, name: str) -> ConnectionOut:
        generated_name = generate_short_uuid() + ".sqlite"
        file_path = Path(config.data_directory) / generated_name

        # Connect to the SQLite database and input data (it will be created if it doesn't exist)
        conn = sqlite3.connect(file_path)
        ExcelParserService.to_sqlite_offline_secure(file.file, conn, name)
        conn.commit()
        conn.close()

        # Create connection with the locally copied file
        dsn = get_sqlite_dsn(str(file_path.absolute()))
        return await self.create_connection(
            session, dsn=dsn, name=name, connection_type=ConnectionType.excel.value, is_sample=False
        )

    async def create_sas7bdat_connection(self, session: AsyncSession, file: UploadFile, name: str) -> ConnectionOut:
        generated_name = generate_short_uuid() + ".sqlite"
        file_path = Path(config.data_directory) / generated_name

        # Connect to the SQLite database (it will be created if it doesn't exist)
        conn = sqlite3.connect(file_path)

        # Create a temporary file to store the uploaded content
        with tempfile.NamedTemporaryFile(delete=False, suffix=".sas7bdat") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        try:
            # Load sas7bdat file into a Pandas dataframe from the temporary file
            data_df, meta = pyreadstat.read_sas7bdat(temp_file_path)

            new_column_names = {}

            # Loop through the column names and their labels
            for col, label in meta.column_names_to_labels.items():
                if label:
                    # If a label exists, use it as the new column name
                    new_column_names[col] = label
                else:
                    # If no label exists, keep the original column name
                    new_column_names[col] = col
            # Rename the columns in the DataFrame
            data_df.rename(columns=new_column_names, inplace=True)

            # Write the dataframe to the SQLite database
            table_name = name.lower().replace(" ", "_")
            data_df.to_sql(table_name, conn, if_exists="replace", index=False)

            # Commit and close connection to new SQLite database
            conn.commit()
            conn.close()

            # Create connection with the locally copied file
            dsn = get_sqlite_dsn(str(file_path.absolute()))
            return await self.create_connection(
                session, dsn=dsn, name=name, connection_type=ConnectionType.sas.value, is_sample=False
            )
        finally:
            # Clean up the temporary file
            os.unlink(temp_file_path)

    def merge_options(self, old_options: ConnectionOptions | None, db: SQLDatabase) -> ConnectionOptions:
        if old_options is None:
            # No options in the db, create new ConnectionOptions with everything enabled
            new_schemas = [
                ConnectionSchema(
                    name=schema,
                    tables=[ConnecitonSchemaTable(name=table, enabled=True) for table in tables],
                    enabled=True,
                )
                for schema, tables in db._all_tables_per_schema.items()
            ]
        else:
            # "schema_name": enabled
            existing_schemas: dict[str, bool] = {schema.name: schema.enabled for schema in old_options.schemas}
            # ("schema_name", "table_name"): enabled
            schema_table_enabled_map: dict[tuple[str, str], bool] = {
                (schema.name, table.name): table.enabled for schema in old_options.schemas for table in schema.tables
            }

            new_schemas = [
                ConnectionSchema(
                    name=schema_name,
                    tables=[
                        ConnecitonSchemaTable(
                            name=table, enabled=schema_table_enabled_map.get((schema_name, table), False)
                        )
                        for table in tables
                    ],
                    enabled=existing_schemas.get(schema_name, False),
                )
                for schema_name, tables in db._all_tables_per_schema.items()
            ]

        # sort schemas and tables by name
        new_schemas.sort(key=lambda x: x.name)
        for schema in new_schemas:
            schema.tables.sort(key=lambda x: x.name)

        return ConnectionOptions(schemas=new_schemas)

    async def refresh_connection_schema(self, session: AsyncSession, connection_id: UUID) -> ConnectionOut:
        """
        Refresh the schema of a connection. Flow of the function:
        1. Get the latest schema information from the database (using DatalineSQLDatabase)
        2.a. If ConnectionOptions is null in the db,  create new ConnectionOptions with everything enabled
        2.b. Otherwise, fetch stored ConnectionOptions from the database and merge with new schema information
        3. Sort schemas and tables by name
        4. Update the connection with new options
        """
        connection = await self.connection_repo.get_by_uuid(session, connection_id)

        # Get the latest schema information
        db = await self.get_db_from_dsn(connection.dsn)

        old_options = ConnectionOptions.model_validate(connection.options) if connection.options else None
        new_options = self.merge_options(old_options, db)

        # Update the connection with new options
        updated_connection = await self.connection_repo.update_by_uuid(
            session, connection_id, ConnectionUpdate(options=new_options)
        )

        return ConnectionOut.model_validate(updated_connection)

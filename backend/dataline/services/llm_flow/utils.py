from typing import Any, Iterable, Self, cast

from langchain_community.utilities.sql_database import SQLDatabase
from sqlalchemy import URL, Engine, MetaData, create_engine, inspect, text
from sqlalchemy.engine import CursorResult
from sqlalchemy.schema import CreateTable
from sqlalchemy.types import NullType


class DatalineSQLDatabase(SQLDatabase):

    def __init__(
        self,
        engine: Engine,
        schema: str | None = None,
        metadata: MetaData | None = None,
        ignore_tables: list[str] | None = None,
        include_tables: list[str] | None = None,
        sample_rows_in_table_info: int = 3,
        indexes_in_table_info: bool = False,
        custom_table_info: dict | None = None,
        view_support: bool = True,  # default False in base class
        max_string_length: int = 300,
        lazy_table_reflection: bool = False,
    ):
        if engine.dialect.name == "mssql":
            lazy_table_reflection = True  # so that we do our own reflection with multiple schemas
        super().__init__(
            engine,
            schema,
            metadata,
            ignore_tables,
            include_tables,
            sample_rows_in_table_info,
            indexes_in_table_info,
            custom_table_info,
            view_support,
            max_string_length,
            lazy_table_reflection,
        )
        if self.dialect == "mssql":
            inspector = inspect(self._engine)
            schemas = inspector.get_schema_names()
            for curr_schema in schemas:
                relevant_tables = [
                    table.split(".")[1] for table in self._usable_tables if table.split(".")[0] == curr_schema
                ]
                if relevant_tables:
                    self._metadata.reflect(
                        views=view_support, bind=self._engine, only=relevant_tables, schema=curr_schema
                    )

    def custom_run_sql(self, query: str):
        if self.dialect == "mssql":
            with self._engine.begin() as connection:
                command = text(query)
                result = connection.execute(command)
                rows = result.fetchall()
                columns = list(result.keys())
                return columns, rows

        result = cast(CursorResult[Any], super().run(query, "cursor", include_columns=True))  # type: ignore[misc]
        rows = result.fetchall()
        columns = list(result.keys())
        return columns, rows

    @classmethod
    def from_uri(cls, database_uri: str | URL, engine_args: dict | None = None, **kwargs: Any) -> Self:
        """Construct a SQLAlchemy engine from URI."""
        _engine_args = engine_args or {}
        return cls(create_engine(database_uri, **_engine_args), **kwargs)

    def get_usable_table_names(self) -> Iterable[str]:
        if self.dialect == "mssql":
            return self.get_mssql_table_names()
        return super().get_usable_table_names()

    def get_mssql_table_names(self) -> Iterable[str]:
        inspector = inspect(self._engine)
        schemas = inspector.get_schema_names()
        db_tables: list[str] = []
        for schema in schemas:
            for table_name in inspector.get_table_names(schema=schema):
                db_tables.append(f"{schema}.{table_name}")
        return db_tables

    def get_table_info(self, table_names: list[str] | None = None) -> str:
        if self.dialect == "mssql":
            return self.get_table_info_mssql(table_names)
        return super().get_table_info(table_names)

    def get_table_info_mssql(self, table_names: list[str] | None = None) -> str:
        all_table_names = self.get_usable_table_names()
        if table_names is not None:
            missing_tables = set(table_names).difference(all_table_names)
            if missing_tables:
                raise ValueError(f"table_names {missing_tables} not found in database")
            all_table_names = table_names

        # Get MSSQL format schema.table
        metadata_table_names = [f"{tbl.schema}.{tbl.name}" for tbl in self._metadata.sorted_tables]
        to_reflect = set(all_table_names) - set(metadata_table_names)
        if to_reflect:
            self._metadata.reflect(
                views=self._view_support,
                bind=self._engine,
                only=list(to_reflect),
                schema=self._schema,
            )

        # Get MSSQL format schema.table
        meta_tables = [
            tbl for tbl in self._metadata.sorted_tables if f"{tbl.schema}.{tbl.name}" in set(all_table_names)
        ]

        tables = []
        for table in meta_tables:
            if self._custom_table_info and table.name in self._custom_table_info:
                tables.append(self._custom_table_info[table.name])
                continue

            # Ignore JSON datatyped columns
            for k, v in table.columns.items():  # AttributeError: items in sqlalchemy v1
                if isinstance(v.type, NullType):
                    table._columns.remove(v)

            # add create table command
            create_table = str(CreateTable(table).compile(self._engine))
            table_info = f"{create_table.rstrip()}"
            has_extra_info = self._indexes_in_table_info or self._sample_rows_in_table_info
            if has_extra_info:
                table_info += "\n\n/*"
            if self._indexes_in_table_info:
                table_info += f"\n{self._get_table_indexes(table)}\n"
            if self._sample_rows_in_table_info:
                table_info += f"\n{self._get_sample_rows(table)}\n"
            if has_extra_info:
                table_info += "*/"
            tables.append(table_info)
        tables.sort()
        final_str = "\n\n".join(tables)
        return final_str

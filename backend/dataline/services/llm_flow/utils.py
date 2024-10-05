from typing import Any, Generator, Protocol, Self, Sequence, cast

from langchain_community.utilities.sql_database import SQLDatabase
from sqlalchemy import Engine, MetaData, Row, create_engine, inspect, text
from sqlalchemy.engine import CursorResult
from sqlalchemy.schema import CreateTable

from dataline.models.connection.schema import ConnectionOptions


class ConnectionProtocol(Protocol):
    dsn: str
    options: ConnectionOptions | None


class DatalineSQLDatabase(SQLDatabase):
    """SQLAlchemy wrapper around a database."""

    def __init__(
        self,
        engine: Engine,
        schemas: list[str] | None = None,
        metadata: MetaData | None = None,
        ignore_tables: list[str] | None = None,
        include_tables: list[str] | None = None,
        sample_rows_in_table_info: int = 3,
        indexes_in_table_info: bool = False,
        custom_table_info: dict | None = None,
        view_support: bool = True,
        max_string_length: int = 300,
    ):
        """Create engine from database URI."""
        self._engine = engine
        self._schema = None  # need to keep this as it is used inside super()._execute method
        if schemas is None:
            inspector = inspect(self._engine)
            self._schemas = inspector.get_schema_names()
        else:
            self._schemas = schemas
        if include_tables and ignore_tables:
            raise ValueError("Cannot specify both include_tables and ignore_tables")

        self._inspector = inspect(self._engine)
        # including view support by adding the views as well as tables to the all
        # tables list if view_support is True
        self._all_tables_per_schema: dict[str, set[str]] = {}
        for schema in self._schemas:
            self._all_tables_per_schema[schema] = set(
                self._inspector.get_table_names(schema=schema)
                + (self._inspector.get_view_names(schema=schema) if view_support else [])
            )
        self._all_tables = set(f"{k}.{name}" for k, names in self._all_tables_per_schema.items() for name in names)

        self._include_tables = set(include_tables) if include_tables else set()
        if self._include_tables:
            missing_tables = self._include_tables - self._all_tables
            if missing_tables:
                raise ValueError(f"include_tables {missing_tables} not found in database")
        self._ignore_tables = set(ignore_tables) if ignore_tables else set()
        if self._ignore_tables:
            missing_tables = self._ignore_tables - self._all_tables
            if missing_tables:
                raise ValueError(f"ignore_tables {missing_tables} not found in database")
        usable_tables = self.get_usable_table_names()
        self._usable_tables = set(usable_tables) if usable_tables else self._all_tables

        if not isinstance(sample_rows_in_table_info, int):
            raise TypeError("sample_rows_in_table_info must be an integer")

        self._sample_rows_in_table_info = sample_rows_in_table_info
        self._indexes_in_table_info = indexes_in_table_info

        self._custom_table_info = custom_table_info
        if self._custom_table_info:
            if not isinstance(self._custom_table_info, dict):
                raise TypeError(
                    "table_info must be a dictionary with table names as keys and the " "desired table info as values"
                )
            # only keep the tables that are also present in the database
            intersection = set(self._custom_table_info).intersection(self._all_tables)
            self._custom_table_info = dict(
                (table, self._custom_table_info[table]) for table in self._custom_table_info if table in intersection
            )

        self._max_string_length = max_string_length

        self._metadata = metadata or MetaData()
        # including view support if view_support = true

        for schema in self._schemas:
            self._metadata.reflect(
                views=view_support,
                bind=self._engine,
                only=[table.split(".")[-1] for table in self._usable_tables if table.startswith(f"{schema}.")],
                schema=schema,
            )

        # # Add id to tables metadata
        # for t in self._metadata.sorted_tables:
        #     t.id = f"{t.schema}.{t.name}"

    # def from_uri(cls, database_uri: str | URL, engine_args: dict | None = None, **kwargs: Any) -> Self:
    @classmethod
    def from_uri(
        cls, database_uri: str, schemas: list[str] | None = None, engine_args: dict | None = None, **kwargs: Any
    ) -> Self:
        """Construct a SQLAlchemy engine from URI."""
        _engine_args = engine_args or {}
        engine = create_engine(database_uri, **_engine_args)
        return cls(engine, schemas=schemas, **kwargs)

    def custom_run_sql_stream(self, query: str) -> Generator[Sequence[Row[Any]], Any, None]:
        # https://docs.sqlalchemy.org/en/20/core/connections.html#streaming-with-a-fixed-buffer-via-yield-per
        yield_per = 1000
        if self.dialect == "mssql":
            with self._engine.begin() as connection:
                command = text(query)
                with connection.execution_options(yield_per=yield_per).execute(command) as result:
                    columns = list(result.keys())
                    yield columns
                    for partition in result.partitions():
                        for row in partition:
                            yield row

        result = cast(
            CursorResult[Any],
            super().run(query, "cursor", include_columns=True, execution_options={"yield_per": yield_per}),
        )  # type: ignore[misc]
        columns = list(result.keys())
        yield columns
        for partition in result.partitions():
            for row in partition:
                yield row

    def custom_run_sql(self, query: str) -> tuple[list[Any], Sequence[Row[Any]]]:
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
    def from_dataline_connection(
        cls, connection: ConnectionProtocol, engine_args: dict | None = None, **kwargs: Any
    ) -> Self:
        """Construct a SQLAlchemy engine from Dataline connection."""
        if connection.options:
            enabled_schemas = [schema for schema in connection.options.schemas if schema.enabled]
            schemas_str = [schema.name for schema in enabled_schemas]
            include_tables = [
                f"{schema.name}.{table.name}" for schema in enabled_schemas for table in schema.tables if table.enabled
            ]
        else:
            schemas_str = None
            include_tables = None
        return cls.from_uri(
            database_uri=connection.dsn,
            schemas=schemas_str,
            engine_args=engine_args,
            include_tables=include_tables,
            **kwargs,
        )

    def get_table_info(self, table_names: list[str] | None = None) -> str:
        """Get information about specified tables.

        Follows best practices as specified in: Rajkumar et al, 2022
        (https://arxiv.org/abs/2204.00498)

        If `sample_rows_in_table_info`, the specified number of sample rows will be
        appended to each table description. This can increase performance as
        demonstrated in the paper.
        """
        all_table_names = self.get_usable_table_names()
        if table_names is not None:
            missing_tables = set(table_names).difference(all_table_names)
            if missing_tables:
                raise ValueError(f"table_names {missing_tables} not found in database")
            all_table_names = table_names

        meta_tables = [
            tbl
            for tbl in self._metadata.sorted_tables
            if f"{tbl.schema}.{tbl.name}" in set(all_table_names)
            and not (self.dialect == "sqlite" and tbl.name.startswith("sqlite_"))
        ]

        tables = []
        for table in meta_tables:
            if self._custom_table_info and table.name in self._custom_table_info:
                tables.append(self._custom_table_info[table.name])
                continue

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
        final_str = "\n\n".join(tables)
        return final_str

import abc
import operator
from typing import Annotated, Any, List, Optional, Sequence, Type, TypedDict, cast

from langchain_community.utilities.sql_database import SQLDatabase
from langchain_core.callbacks import CallbackManagerForToolRun
from langchain_core.messages import BaseMessage, ToolMessage
from langchain_core.pydantic_v1 import BaseModel
from langchain_core.pydantic_v1 import BaseModel as BaseModelV1
from langchain_core.pydantic_v1 import Field
from langchain_core.tools import BaseTool, BaseToolkit
from langgraph.prebuilt import ToolExecutor
from sqlalchemy import Result

from dataline.models.llm_flow.schema import (
    QueryOptions,
    QueryResultSchema,
    SelectedTablesResult,
    SQLQueryRunResult,
    SQLQueryStringResult,
)


class QueryGraphStateUpdate(TypedDict):
    messages: Sequence[BaseMessage]
    results: Sequence[QueryResultSchema]


def truncate_word(content: Any, *, length: int, suffix: str = "...") -> str:  # type: ignore[misc]
    """
    Truncate a string to a certain number of words, based on the max string
    length.
    """

    if not isinstance(content, str) or length <= 0:
        return content

    if len(content) <= length:
        return content

    return content[: length - len(suffix)].rsplit(" ", 1)[0] + suffix


class SQLToolNames:
    """Class for storing the names of the SQL tools."""

    INFO_SQL_DATABASE = "sql_db_schema"
    EXECUTE_SQL_QUERY = "sql_db_query"
    LIST_SQL_TABLES = "list_sql_tables"
    QUERY_SQL_CORRECTOR = "sql_db_query_corrector"


class BaseSQLDatabaseTool(BaseModel):
    """Base tool for interacting with a SQL database."""

    # TODO: Customize SQLDatabase class to add our improvements
    db: SQLDatabase = Field(exclude=True)

    class Config(BaseTool.Config):
        pass


class StateUpdaterTool(BaseTool, abc.ABC):  # type: ignore[misc]
    """A tool that updates the state of the query graph."""

    @abc.abstractmethod
    def get_response(  # type: ignore[misc]
        self,
        state: "QueryGraphState",
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:
        """Get the response from the tool and update the state."""
        raise NotImplementedError


class _InfoSQLDatabaseToolInput(BaseModel):
    table_names: str = Field(
        ...,
        description=(
            "A comma-separated list of the table names for which to return the schema. "
            "Example input: 'table1, table2, table3'"
            "Try to pass in all the tables in one go to avoid multiple calls to this tool."
        ),
    )


class InfoSQLDatabaseTool(BaseSQLDatabaseTool, StateUpdaterTool):
    """Tool for getting metadata about tables in a SQL database."""

    name: str = SQLToolNames.INFO_SQL_DATABASE
    description: str = "Get the schema and sample rows for the specified SQL tables."

    table_names: Optional[list[str]] = None

    # Pydantic model to validate input to the tool
    args_schema: Type[BaseModel] = _InfoSQLDatabaseToolInput

    def _run(
        self,
        table_names: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Get the schema for tables in a comma-separated list."""
        self.table_names = None  # Reset internal state in case it remains from tool calls
        cleaned_names = [table_name.strip() for table_name in table_names.split(",")]
        available_names = self.db.get_usable_table_names()

        # Check if the table names are valid
        wrong_tables = []
        for name in cleaned_names:
            if name not in available_names:
                wrong_tables.append(name)

        if wrong_tables:
            return f"""ERROR: Tables {wrong_tables} that you selected do not exist in the database.
            Available tables are the following, please select from them ONLY: "{'", "'.join(available_names)}"."""

        self.table_names = [t.strip() for t in table_names.split(",")]
        return self.db.get_table_info_no_throw(self.table_names)

    def get_response(  # type: ignore[misc]
        self,
        state: "QueryGraphState",
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:
        messages: list[BaseMessage] = []
        results: list[QueryResultSchema] = []

        # We call the tool_executor and get back a response
        response = self.run(args)
        # We use the response to create a FunctionMessage
        tool_message = ToolMessage(content=str(response), name=self.name, tool_call_id=call_id)
        messages.append(tool_message)

        # Add selected tables result if successful
        if self.table_names:
            results.append(SelectedTablesResult(tables=self.table_names))

        return {
            "messages": messages,
            "results": results,
        }


class _QuerySQLDataBaseToolInput(BaseModel):
    query: str = Field(..., description="A detailed and correct SQL query.")


class QuerySQLDataBaseTool(BaseSQLDatabaseTool, StateUpdaterTool):
    """Tool for querying a SQL database."""

    name: str = SQLToolNames.EXECUTE_SQL_QUERY
    description: str = """
    Execute a SQL query against the database and get back the result.
    If the query is not correct, an error message will be returned.
    If an error is returned, rewrite the query, check the query, and try again.
    """
    args_schema: Type[BaseModel] = _QuerySQLDataBaseToolInput

    def _run(
        self,
        query: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> SQLQueryRunResult:
        """Execute the query, return the results or an error message."""
        result = cast(Result[Any], self.db.run(query, fetch="cursor", include_columns=True))  # type: ignore[misc]
        truncated_results = []
        for row in result.fetchall():
            # truncate each column, then convert the row to a tuple
            truncated_row = tuple(truncate_word(column, length=self.db._max_string_length) for column in row)
            truncated_results.append(truncated_row)

        columns = list(result.keys())
        return SQLQueryRunResult.model_construct(columns=columns, rows=truncated_results)

    def get_response(  # type: ignore[misc]
        self,
        state: "QueryGraphState",
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:  # type: ignore[misc]
        messages = []
        results: list[QueryResultSchema] = []

        # Add SQL query to results
        results.append(SQLQueryStringResult(sql=args["query"]))

        # Add query run result to results
        response: SQLQueryRunResult = self.run(args)
        response.is_secure = state.options.secure_data  # return whether or not generated securely
        results.append(response)

        # Create ToolMessages
        if not state.options.secure_data:
            # If not secure, just put results in tool message
            tool_message = ToolMessage(content=str(response), name=self.name, tool_call_id=call_id)
            messages.append(tool_message)
        else:
            # If secure, need to hide the actual data
            # Get data description from results
            if response.columns and response.rows:
                data_types = [type(cell).__name__ for cell in response.rows[0]]
                data_description = (
                    "Returned data description:\n"
                    f"Columns:{response.columns}\n"
                    f"First row: {data_types}\n"
                    f"Number of rows: {len(response.rows)}"
                )
            elif len(response.rows) == 1:
                data_types = [type(cell).__name__ for cell in response.rows[0]]
                data_description = f"Returned data description:\nOnly one row: {data_types}"
            else:
                data_description = "No data returned"

            tool_message = ToolMessage(
                content="Query executed successfully - here is the returned data description. "
                "I cannot view the data for security reasons but the user should be able to see the results!\n"
                f"{data_description}",
                name=self.name,
                tool_call_id=call_id,
            )
            messages.append(tool_message)

        return {
            "messages": messages,
            "results": results,
        }


class _ListSQLTablesToolInput(BaseModel):
    tool_input: str = Field("", description="An empty string")


class ListSQLTablesTool(BaseSQLDatabaseTool, BaseTool):
    """Tool for getting tables names."""

    name: str = SQLToolNames.LIST_SQL_TABLES
    description: str = "Input is an empty string, output is a comma-separated list of tables in the database."
    args_schema: Type[BaseModel] = _ListSQLTablesToolInput

    def _run(  # type: ignore
        self,
        tool_input: str = "",
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> list[str]:
        """Get a comma-separated list of table names."""
        return list(self.db.get_usable_table_names())


class SQLDatabaseToolkit(BaseToolkit):
    """Toolkit for interacting with SQL databases."""

    db: SQLDatabase = Field(exclude=True)

    @property
    def dialect(self) -> str:
        """Return string representation of SQL dialect to use."""
        return self.db.dialect

    class Config:
        """Configuration for this pydantic object."""

        arbitrary_types_allowed = True

    def get_tools(self, allow_execution: bool = True) -> List[BaseTool]:
        """Get the tools in the toolkit."""
        list_sql_database_tool = ListSQLTablesTool(db=self.db)
        info_sql_database_tool_description = (
            "Input to this tool is a comma-separated list of tables, output is the "
            "schema and sample rows for those tables. "
            "Be sure that the tables actually exist by calling "
            f"{list_sql_database_tool.name} first! "
            "Example Input: table1, table2, table3"
        )
        info_sql_database_tool = InfoSQLDatabaseTool(db=self.db, description=info_sql_database_tool_description)
        query_sql_database_tool_description = (
            "Input to this tool is a detailed and correct SQL query, output is a "
            "result from the database. If the query is not correct, an error message "
            "will be returned. If an error is returned, rewrite the query, check the "
            "query, and try again. If you encounter an issue with Unknown column "
            f"'xxxx' in 'field list', use {info_sql_database_tool.name} "
            "to query the correct table fields."
        )
        query_sql_database_tool = QuerySQLDataBaseTool(db=self.db, description=query_sql_database_tool_description)

        tools = [
            info_sql_database_tool,
            list_sql_database_tool,
        ]

        if allow_execution:
            tools.append(query_sql_database_tool)

        return tools

    def get_context(self) -> dict[str, Any]:  # type: ignore[misc]
        """Return db context that you may want in agent prompt."""
        return self.db.get_context()


class QueryGraphState(BaseModelV1):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    results: Annotated[Sequence[QueryResultSchema], operator.add]
    options: QueryOptions
    sql_toolkit: SQLDatabaseToolkit
    tool_executor: ToolExecutor

    class Config:
        arbitrary_types_allowed = True


def state_update(
    messages: Sequence[BaseMessage] = [], results: Sequence[QueryResultSchema] = []
) -> QueryGraphStateUpdate:
    return {"messages": messages, "results": results}

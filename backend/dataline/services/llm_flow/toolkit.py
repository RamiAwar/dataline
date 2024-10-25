import abc
import json
import operator
from typing import (
    Annotated,
    Any,
    Iterable,
    List,
    Optional,
    Sequence,
    Type,
    TypedDict,
    cast,
)

from fastapi.encoders import jsonable_encoder
from langchain_core.callbacks import CallbackManagerForToolRun
from langchain_core.messages import BaseMessage, ToolMessage
from langchain_core.tools import BaseTool, BaseToolkit
from langgraph.prebuilt import ToolExecutor
from pydantic import BaseModel, Field, SkipValidation

from dataline.models.llm_flow.schema import (
    ChartGenerationResult,
    QueryOptions,
    QueryResultSchema,
    QueryRunData,
    SelectedTablesResult,
    SQLQueryRunResult,
    SQLQueryStringResult,
)
from dataline.services.llm_flow.llm_calls.chart_generator import (
    TEMPLATES,
    ChartType,
    GeneratedChart,
    generate_chart_prompt,
)
from dataline.services.llm_flow.llm_calls.mirascope_utils import (
    OpenAIClientOptions,
    call,
)
from dataline.services.llm_flow.utils import DatalineSQLDatabase as SQLDatabase


class QueryGraphStateUpdate(TypedDict):
    messages: Sequence[BaseMessage]
    results: Sequence[QueryResultSchema]


class RunException(Exception):
    message: str

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ChartValidationRunException(RunException): ...


class TableNotFoundException(RunException): ...


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


def execute_sql_query(
    db: SQLDatabase, query: str, for_chart: bool = False, chart_type: Optional[ChartType] = None
) -> QueryRunData:
    """Execute the SQL query and return the results or an error message."""
    columns, rows = db.custom_run_sql(query)
    truncated_rows = []
    for row in rows:
        # truncate each column, then convert the row to a tuple
        truncated_row = tuple(truncate_word(column, length=db._max_string_length) for column in row)
        truncated_rows.append(truncated_row)

    if for_chart:
        if chart_type in [ChartType.bar, ChartType.line, ChartType.doughnut, ChartType.scatter]:
            # These chart types take in single dimensional data for labels and values
            # Validate that each row has only 1 element
            if not truncated_rows:
                raise RunException("No data returned from the query.")

            row = truncated_rows[0]
            if len(row) != 2:
                raise ChartValidationRunException(
                    f"Validation of results output format failed. You chose {len(row)} columns in the select statement."
                    f"You selected: {columns}\n"
                    "Please select only two of them for the chart X and Y axes (labels and values respectively)."
                )
        else:
            raise RunException(f"Chart type {chart_type} is not supported.")

    return QueryRunData(columns=columns, rows=truncated_rows)


def query_run_result_to_chart_json(chart_json: str, chart_type: ChartType, query_run_data: QueryRunData) -> str:
    """
    Insert query run result data into the chartjs JSON.
    This assumes that the query run data is properly validated for charting purposes!

    Args:
        chart_json: The chartjs JSON string (can be a template or already populated)
        chart_type: The type of chart to generate (used to format the chartjs JSON)
        query_run_result: The result of the SQL query execution.
    """
    if chart_type in [ChartType.bar, ChartType.line, ChartType.doughnut, ChartType.scatter]:
        # Insert the flattened query result data into the chartjs JSON
        flattened_labels = [row[0] for row in query_run_data.rows]
        flattened_values = [row[1] for row in query_run_data.rows]

        formatted_json = json.loads(chart_json)
        formatted_json["data"]["labels"] = flattened_labels
        formatted_json["data"]["datasets"][0]["data"] = flattened_values
        formatted_json_compatible = jsonable_encoder(formatted_json)
        return json.dumps(formatted_json_compatible)
    else:
        raise NotImplementedError(f"Chart type {chart_type} is not supported.")


class ToolNames:
    """Class for storing the names of the SQL tools."""

    INFO_SQL_DATABASE = "sql_db_schema"
    EXECUTE_SQL_QUERY = "sql_db_query"
    LIST_SQL_TABLES = "list_sql_tables"
    QUERY_SQL_CORRECTOR = "sql_db_query_corrector"
    GENERATE_CHART = "generate_chart"


class BaseSQLDatabaseTool(BaseTool):
    """Base tool for interacting with a SQL database."""

    db: Annotated[SQLDatabase, SkipValidation] = Field(exclude=True)

    class Config:
        arbitrary_types_allowed = True


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
            "This is very important: Pass in all the tables in one tool call."
        ),
    )


class InfoSQLDatabaseTool(BaseSQLDatabaseTool, StateUpdaterTool):
    """Tool for getting metadata about tables in a SQL database."""

    name: str = ToolNames.INFO_SQL_DATABASE
    description: str = "Get the schema and sample rows for the specified SQL tables."

    table_names: Optional[list[str]] = None

    # Pydantic model to validate input to the tool
    args_schema: Type[BaseModel] = _InfoSQLDatabaseToolInput

    def _validate_sanitize_table_names(self, table_names: str, available_names: Iterable[str]) -> set[str]:
        """Validate table names and return valid and invalid tables."""
        cleaned_names = [table_name.strip() for table_name in table_names.split(",")]
        available_names_tables_only = {name.split(".")[-1]: name for name in available_names}

        valid_tables = set()
        wrong_tables = []

        for name in cleaned_names:
            if name in available_names:
                valid_tables.add(name)
            elif name in available_names_tables_only:
                valid_tables.add(available_names_tables_only[name])
            else:
                wrong_tables.append(name)

        if wrong_tables:
            raise TableNotFoundException(
                f"""ERROR: Tables {wrong_tables} that you selected do not exist in the database.
            Available tables are the following, please select from them ONLY: "{'", "'.join(available_names)}"."""
            )

        return valid_tables

    def _run(
        self,
        table_names: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Get the schema for tables in a comma-separated list."""
        self.table_names = None  # Reset internal state in case it remains from tool calls

        available_names = self.db.get_usable_table_names()
        valid_tables = self._validate_sanitize_table_names(table_names, available_names)

        self.table_names = list(valid_tables)
        return self.db.get_table_info_no_throw(self.table_names)

    def get_response(  # type: ignore[misc]
        self,
        state: "QueryGraphState",
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:
        messages: list[BaseMessage] = []
        results: list[QueryResultSchema] = []

        try:
            # We call the tool_executor and get back a response
            response = self.run(args)
        except TableNotFoundException as e:
            tool_message = ToolMessage(content=str(e.message), name=self.name, tool_call_id=call_id)
            messages.append(tool_message)
            return state_update(messages=messages)

        # We use the response to create a ToolMessage
        tool_message = ToolMessage(content=str(response), name=self.name, tool_call_id=call_id)
        messages.append(tool_message)

        # Add selected tables result if successful
        if self.table_names:
            results.append(SelectedTablesResult(tables=self.table_names))

        return state_update(messages=messages, results=results)


class _QuerySQLDataBaseToolInput(BaseModel):
    query: str = Field(
        ...,
        description="A detailed and correct SQL query. If for charting, return only two columns: labels and values in that order!",
    )
    for_chart: bool = Field(
        ...,
        description=(
            "Whether the query is going to be later used for generating a chart."
            "If it is true, make sure to return ONLY TWO columns in the SQL: (label, value)."
        ),
    )
    chart_type: Optional[ChartType] = Field(
        default=None, description="If for chart is true, specify the type of chart to generate."
    )


class QuerySQLDataBaseTool(BaseSQLDatabaseTool, StateUpdaterTool):
    """Tool for querying a SQL database."""

    name: str = ToolNames.EXECUTE_SQL_QUERY
    description: str = """
    Execute a SQL query against the database and get back the result.
    If the query is not correct, an error message will be returned.
    If an error is returned, rewrite the query, check the query, and try again.
    """
    args_schema: Type[BaseModel] = _QuerySQLDataBaseToolInput

    def _run(
        self,
        query: str,
        for_chart: bool = False,
        chart_type: Optional[ChartType] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> tuple[QueryRunData, bool]:  # type: ignore[misc]
        """Execute the query, return the results or an error message."""
        return execute_sql_query(self.db, query, for_chart, chart_type), for_chart

    def get_response(  # type: ignore[misc]
        self,
        state: "QueryGraphState",
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:  # type: ignore[misc]
        messages = []
        results: list[QueryResultSchema] = []

        # Add SQL query to results
        query_string_result = SQLQueryStringResult(sql=args["query"], for_chart=args["for_chart"])
        results.append(query_string_result)

        # Attempt to link previous selected tables result to this query (backlinking, weird IK)
        last_selected_tables_result = None
        for result in reversed(state.results):
            if isinstance(result, SelectedTablesResult):
                last_selected_tables_result = result
                break

        if last_selected_tables_result:
            last_selected_tables_result.linked_id = query_string_result.ephemeral_id

        # Add query run result to results
        try:
            query_run_data, for_chart = cast(tuple[QueryRunData, bool], self.run(args))
            response = SQLQueryRunResult(
                columns=query_run_data.columns,
                rows=query_run_data.rows,
                for_chart=for_chart,
                linked_id=query_string_result.ephemeral_id,
            )
            response.is_secure = state.options.secure_data  # return whether or not generated securely
            results.append(response)

        # If errors occur, don't want to send bad results
        # TODO: Might be good to send SQL result with error status?
        # That would help users debug things and know how to correct their query
        # Imagine an SQL query result with a warning symbol that gets overwritten if corrected
        except ChartValidationRunException as e:
            tool_message = ToolMessage(content=f"ERROR: {e.message}", name=self.name, tool_call_id=call_id)
            messages.append(tool_message)
            return state_update(messages=messages)
        except RunException as e:
            tool_message = ToolMessage(content=f"ERROR: {e.message}", name=self.name, tool_call_id=call_id)
            messages.append(tool_message)
            return state_update(messages=messages)
        except Exception as e:
            tool_message = ToolMessage(content=f"ERROR: {str(e)}", name=self.name, tool_call_id=call_id)
            messages.append(tool_message)
            return state_update(messages=messages)

        # Create ToolMessages
        if not state.options.secure_data:
            # If not secure, just put results in tool message
            # Limit number of rows sent in message to 10 (avoid token overflow)
            truncated_rows = response.rows[:10]
            content = (
                "Returned data:\n"
                f"Columns: {str(response.columns)}\n"
                f"Truncated rows: {str(truncated_rows)}\n"
                f"Number of rows: {len(response.rows)}\n"
            )
        else:
            # If secure, need to hide the actual data
            # Get data description from results
            if response.columns and response.rows:
                data_types = [type(cell).__name__ for cell in response.rows[0]]
                data_description = (
                    "Returned data description:\n"
                    f"Columns:{response.columns}\n"
                    f"First row: {data_types}\n"
                    f"Number of rows: {len(response.rows)}\n"
                )
            elif len(response.rows) == 1:
                data_types = [type(cell).__name__ for cell in response.rows[0]]
                data_description = f"Returned data description:\nOnly one row: {data_types}\n"
            else:
                data_description = "No data returned\n"
            content = (
                "Query executed successfully - here is the returned data description. "
                "I cannot view the data for security reasons but the user should be able to see the results!\n"
                f"{data_description}"
            )

        content += (
            "Given this data, analyze it and consider regenerating the query. "
            "Think about things like: If the user wanted buckets, do the buckets make sense "
            "given the length of results? Or should I suggest different bucket ranges? "
            "Think critically about what the user might want to see.\n"
        )

        if args["for_chart"]:
            content += "If the results look good, you should now generate a chart."
        tool_message = ToolMessage(content=content, name=self.name, tool_call_id=call_id)
        messages.append(tool_message)

        return {
            "messages": messages,
            "results": results,
        }


class _ListSQLTablesToolInput(BaseModel):
    tool_input: str = Field("", description="An empty string")


class ListSQLTablesTool(BaseSQLDatabaseTool, BaseTool):
    """Tool for getting tables names."""

    name: str = ToolNames.LIST_SQL_TABLES
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
            "schema and sample rows for those tables."
            "Be sure that the tables actually exist by calling "
            f"{list_sql_database_tool.name} first! "
            "Example Input: table1, table2, table3"
        )
        info_sql_database_tool = InfoSQLDatabaseTool(db=self.db, description=info_sql_database_tool_description)
        query_sql_database_tool_description = (
            f"NEVER run this without running the {info_sql_database_tool.name} tool first."
            "Input to this tool is a detailed and correct SQL query, output is a "
            "result from the database."
            "If the query is not correct, an error message "
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


class QueryGraphState(BaseModel):
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


class _ChartGeneratorToolInput(BaseModel):
    chart_type: ChartType
    request: str = Field(..., description="Some text describing what the chart is and to generate it.")


class ChartGeneratorTool(StateUpdaterTool):
    """Tool for generating a chart from a query result."""

    name: str = ToolNames.GENERATE_CHART
    description: str = (
        "Generate a chart from the query result."
        "Use this only after executing SQL since we need data to add into the chart."
        "If the chart is not based on SQL query generated data, then don't use this tool."
    )
    args_schema: Type[BaseModel] = _ChartGeneratorToolInput

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        pass

    def get_response(  # type: ignore[misc]
        self,
        state: QueryGraphState,
        args: dict[str, Any],
        call_id: str,
    ) -> QueryGraphStateUpdate:
        messages: list[BaseMessage] = []
        results: list[QueryResultSchema] = []

        chart_type = ChartType[args["chart_type"]]

        generated_chart = call(
            "gpt-3.5-turbo",
            response_model=GeneratedChart,
            prompt_fn=generate_chart_prompt,
            client_options=OpenAIClientOptions(
                api_key=state.options.openai_api_key.get_secret_value(),
                base_url=state.options.openai_base_url,
            ),
        )(
            chart_type=ChartType[args["chart_type"]],
            request=args["request"],
            chartjs_template=TEMPLATES[chart_type],
        )

        # Find the last data result
        last_data_result = None
        for result in reversed(state.results):
            if isinstance(result, SQLQueryRunResult) and result.for_chart:
                last_data_result = result
                break

        if last_data_result is None:
            tool_message = ToolMessage(
                content="ERROR: No data result was found prior to generating"
                "the chart, failed to populate the chart."
                "Only use this tool after using the SQL query executor tool!",
                name=self.name,
                tool_call_id=call_id,
            )
            messages.append(tool_message)
            return state_update(messages=messages)

        try:
            chart_json = query_run_result_to_chart_json(
                chart_json=generated_chart.chartjs_json,
                chart_type=chart_type,
                query_run_data=last_data_result,
            )

            # Link to same SQL query string result as the run result does
            result = ChartGenerationResult(
                chartjs_json=chart_json, chart_type=chart_type.value, linked_id=last_data_result.linked_id
            )
            results.append(result)

            msg = "Chart generation was successful!"
            if state.options.secure_data:
                msg += (
                    "I cannot view the results for security reasons, but the user is able to."
                    "For this reason I can't do any further analysis on the chart or results. The user could run queries in 'insecure mode'"
                    "if they'd like me to help further"
                )

            tool_message = ToolMessage(
                content=msg,
                name=self.name,
                tool_call_id=call_id,
            )
            messages.append(tool_message)
        except json.JSONDecodeError as e:
            message = ToolMessage(
                content=f"ERROR: Failed to decode chart json. Plese try regenerating the chart: {e.msg}",
                name=self.name,
                tool_call_id=call_id,
            )
            messages.append(message)

        return {
            "messages": messages,
            "results": results,
        }

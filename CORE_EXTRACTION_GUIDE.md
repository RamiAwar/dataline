# Core Library Extraction: Step-by-Step Guide

## Goal

Extract the core NL-to-SQL functionality into a standalone `dataline-core` package that can be used without the web server.

**Timeline**: 2-3 weeks
**Complexity**: Medium
**Impact**: High - enables library usage, sets up clean architecture

## What We're Doing

```
BEFORE:
┌────────────────────────────────────┐
│   Monolithic Dataline              │
│                                    │
│   FastAPI ────┐                    │
│               ├──► LangGraph       │
│   SQLAlchemy ─┘    SQL Tools       │
│   Models ──────────────────┐       │
│   Auth ─────────────────────┼──►   │
│                             │       │
└─────────────────────────────┴───────┘
        Everything coupled


AFTER:
┌──────────────────────────────┐
│  dataline-core (Library)     │
│                              │
│  • QueryEngine               │
│  • LangGraph workflow        │
│  • SQL tools                 │
│  • Schema inspector          │
│  • Chart renderers           │
│                              │
│  NO web, NO persistence!     │
└───────────┬──────────────────┘
            │
            │ used by
            ▼
┌───────────────────────────────┐
│  dataline-server (Web App)   │
│                               │
│  • FastAPI endpoints          │
│  • SQLAlchemy models          │
│  • Persistence layer          │
│  • Auth & sessions            │
│  • UI serving                 │
│                               │
│  Thin wrapper around core!    │
└───────────────────────────────┘
```

## Phase 1: Set Up Core Package (Days 1-2)

### Step 1.1: Create Package Structure

```bash
# Create new package alongside backend
cd /home/user/dataline
mkdir -p dataline-core/dataline/core
cd dataline-core

# Create package files
touch dataline/__init__.py
touch dataline/core/__init__.py
touch dataline/core/engine.py
touch dataline/core/models.py
touch dataline/core/exceptions.py

# Create subdirectories
mkdir -p dataline/core/graph
mkdir -p dataline/core/tools
mkdir -p dataline/core/schema
mkdir -p dataline/core/charts

touch dataline/core/graph/__init__.py
touch dataline/core/tools/__init__.py
touch dataline/core/schema/__init__.py
touch dataline/core/charts/__init__.py

# Create examples and tests
mkdir -p examples
mkdir -p tests

# Create package config
touch pyproject.toml
touch README.md
```

### Step 1.2: Create pyproject.toml

```toml
# dataline-core/pyproject.toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "dataline-core"
version = "0.1.0"
description = "Minimal NL-to-SQL query engine using LLMs"
readme = "README.md"
requires-python = ">=3.10"
authors = [
    {name = "Your Name", email = "you@example.com"}
]
keywords = ["sql", "nlp", "llm", "database", "query"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
]

dependencies = [
    "langchain>=0.3.0,<0.4.0",
    "langgraph>=0.2.0,<0.3.0",
    "langchain-openai>=0.2.0,<0.3.0",
    "sqlalchemy>=2.0.0,<3.0.0",
    "pydantic>=2.0.0,<3.0.0",
    "aiosqlite>=0.19.0",  # For async SQLite
]

[project.optional-dependencies]
# Database dialects
postgres = ["psycopg2-binary>=2.9.0"]
mysql = ["pymysql>=1.0.0"]
snowflake = ["snowflake-sqlalchemy>=1.5.0"]

# Chart renderers (future)
plotly = ["plotly>=5.0.0"]
matplotlib = ["matplotlib>=3.7.0"]

# Development
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "black>=23.0.0",
    "mypy>=1.5.0",
    "ruff>=0.0.290",
]

# All extras
all = [
    "psycopg2-binary>=2.9.0",
    "pymysql>=1.0.0",
    "snowflake-sqlalchemy>=1.5.0",
    "plotly>=5.0.0",
    "matplotlib>=3.7.0",
]

[project.urls]
Homepage = "https://github.com/yourusername/dataline"
Repository = "https://github.com/yourusername/dataline"
Documentation = "https://dataline.readthedocs.io"

[tool.setuptools.packages.find]
where = ["."]
include = ["dataline*"]

[tool.black]
line-length = 100
target-version = ['py310']

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### Step 1.3: Create Basic README

```markdown
# Dataline Core

Minimal, reusable NL-to-SQL query engine using LLMs.

## Installation

```bash
pip install dataline-core

# With PostgreSQL support
pip install dataline-core[postgres]

# With all extras
pip install dataline-core[all]
```

## Quick Start

```python
from dataline.core import QueryEngine
from sqlalchemy import create_engine

# Your database connection
engine = create_engine("postgresql://user:pass@localhost/db")

# Initialize query engine
query_engine = QueryEngine(llm_api_key="sk-...")

# Execute natural language query
result = await query_engine.execute(
    connection=engine,
    query="Show me top 10 customers by revenue"
)

print(result.sql)
print(result.rows)
```

## Features

- ✅ Natural language to SQL conversion
- ✅ LLM-powered query generation (OpenAI, custom endpoints)
- ✅ Tool-based iteration until satisfactory result
- ✅ Schema introspection and metadata
- ✅ Streaming query execution
- ✅ Secure data mode (no actual data sent to LLM)
- ✅ Pluggable chart generation (Chart.js, Plotly)

## Non-Features

This is a **library**, not a web application. It does NOT include:

- ❌ Web server / HTTP endpoints
- ❌ Database for storing conversations
- ❌ User authentication
- ❌ Connection management UI
- ❌ Persistence layer

For a complete web application, see [dataline-server](../backend).

## Documentation

See [examples/](examples/) for usage examples.
```

## Phase 2: Extract Core Models (Day 3)

### Step 2.1: Create Data Models

```python
# dataline-core/dataline/core/models.py
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

@dataclass
class QueryOptions:
    """Options for query execution"""

    # Security
    secure_data: bool = False  # Don't send actual data to LLM

    # Limits
    max_rows: int = 10
    max_iterations: int = 3

    # Schema filtering
    visible_schemas: Optional[List[str]] = None
    hidden_tables: Optional[List[str]] = None

    # LLM config
    temperature: float = 0.0
    model: Optional[str] = None  # Override default model

    # Chart options
    auto_chart: bool = False
    chart_renderer: str = "chartjs"
    chart_type: Optional[str] = None  # "bar", "line", "pie"


@dataclass
class ColumnInfo:
    """Information about a result column"""
    name: str
    type: str
    nullable: bool = True


@dataclass
class QueryResult:
    """Result of query execution"""

    # Query and execution
    sql: str
    execution_time_ms: int

    # Data
    rows: List[Dict[str, Any]]
    row_count: int
    columns: List[ColumnInfo]

    # Metadata
    dialect: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Optional chart
    chart: Optional['ChartConfig'] = None


class EventType(str, Enum):
    """Types of events emitted during streaming"""
    TOOL_CALL = "tool_call"
    SQL_GENERATED = "sql_generated"
    QUERY_EXECUTING = "query_executing"
    QUERY_EXECUTED = "query_executed"
    ITERATION = "iteration"
    ERROR = "error"
    COMPLETE = "complete"


@dataclass
class QueryEvent:
    """Event emitted during streaming execution"""
    type: EventType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ChartConfig:
    """Chart configuration (renderer-specific)"""
    renderer: str  # "chartjs", "plotly", etc.
    chart_type: str  # "bar", "line", "pie"
    config: Dict[str, Any]  # Renderer-specific JSON
```

### Step 2.2: Create Exceptions

```python
# dataline-core/dataline/core/exceptions.py

class DatalineError(Exception):
    """Base exception for Dataline core"""
    pass


class QueryExecutionError(DatalineError):
    """Error executing SQL query"""
    pass


class SchemaInspectionError(DatalineError):
    """Error inspecting database schema"""
    pass


class ChartGenerationError(DatalineError):
    """Error generating chart"""
    pass


class InvalidOptionsError(DatalineError):
    """Invalid query options provided"""
    pass
```

## Phase 3: Extract Graph Workflow (Days 4-5)

### Step 3.1: Copy and Adapt LangGraph Code

```python
# dataline-core/dataline/core/graph/state.py
from typing import Sequence, Annotated
from langchain_core.messages import BaseMessage
from dataline.core.models import QueryOptions, QueryResult
import operator

class QueryState(TypedDict):
    """State for query processing graph"""

    # Messages in conversation
    messages: Annotated[Sequence[BaseMessage], operator.add]

    # Query being processed
    query: str

    # Options
    options: QueryOptions

    # Results accumulated
    results: Annotated[List[QueryResult], operator.add]
```

```python
# dataline-core/dataline/core/graph/workflow.py
from typing import AsyncIterator, Any
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from sqlalchemy.engine import Engine

from dataline.core.graph.state import QueryState
from dataline.core.graph.nodes import CallModelNode, CallToolNode
from dataline.core.tools import create_sql_toolkit
from dataline.core.schema import SchemaInspector
from dataline.core.models import QueryOptions, QueryResult, QueryEvent, EventType

class QueryWorkflow:
    """
    LangGraph-based query workflow.

    This is the core of Dataline - converts NL to SQL using LLM + tools.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-3.5-turbo",
        base_url: Optional[str] = None
    ):
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            base_url=base_url,
            temperature=0
        )

    def _build_graph(
        self,
        connection: Engine,
        options: QueryOptions
    ) -> CompiledGraph:
        """Build the LangGraph workflow"""

        # Get schema information
        inspector = SchemaInspector(connection)
        schema_context = inspector.get_schema_context(
            visible_schemas=options.visible_schemas,
            hidden_tables=options.hidden_tables
        )

        # Create SQL toolkit
        toolkit = create_sql_toolkit(
            connection=connection,
            secure_data=options.secure_data,
            max_rows=options.max_rows,
            schema_context=schema_context
        )

        # Build graph
        workflow = StateGraph(QueryState)

        # Add nodes
        workflow.add_node(
            "call_model",
            CallModelNode(llm=self.llm, tools=toolkit.get_tools())
        )
        workflow.add_node(
            "call_tool",
            CallToolNode(tools=toolkit.get_tools())
        )

        # Define flow
        workflow.set_entry_point("call_model")

        workflow.add_conditional_edges(
            "call_model",
            self._should_continue,
            {
                "continue": "call_tool",
                "end": END
            }
        )

        workflow.add_edge("call_tool", "call_model")

        return workflow.compile()

    def _should_continue(self, state: QueryState) -> str:
        """Decide whether to continue iteration"""
        messages = state["messages"]
        last_message = messages[-1]

        # If LLM wants to call tools, continue
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "continue"

        return "end"

    async def run(
        self,
        connection: Engine,
        query: str,
        message_history: List[Dict[str, str]],
        options: QueryOptions
    ) -> QueryResult:
        """
        Run the workflow and return final result.

        Args:
            connection: SQLAlchemy engine
            query: Natural language query
            message_history: Previous conversation messages
            options: Query options

        Returns:
            QueryResult with SQL, data, and metadata
        """

        graph = self._build_graph(connection, options)

        # Convert message history to LangChain messages
        messages = self._format_messages(query, message_history)

        # Initialize state
        state = QueryState(
            messages=messages,
            query=query,
            options=options,
            results=[]
        )

        # Run graph
        final_state = await graph.ainvoke(state)

        # Extract and return result
        return self._extract_result(final_state, connection)

    async def run_stream(
        self,
        connection: Engine,
        query: str,
        message_history: List[Dict[str, str]],
        options: QueryOptions
    ) -> AsyncIterator[QueryEvent]:
        """
        Stream workflow events.

        Yields:
            QueryEvent objects as workflow progresses
        """

        graph = self._build_graph(connection, options)

        messages = self._format_messages(query, message_history)

        state = QueryState(
            messages=messages,
            query=query,
            options=options,
            results=[]
        )

        # Stream graph execution
        async for event in graph.astream(state):
            # Convert graph event to QueryEvent
            query_event = self._convert_event(event)
            if query_event:
                yield query_event

    def _format_messages(
        self,
        query: str,
        message_history: List[Dict[str, str]]
    ) -> List[BaseMessage]:
        """Convert message history to LangChain format"""
        # Implementation here
        pass

    def _extract_result(
        self,
        final_state: QueryState,
        connection: Engine
    ) -> QueryResult:
        """Extract QueryResult from final graph state"""
        # Implementation here
        pass

    def _convert_event(self, graph_event: Any) -> Optional[QueryEvent]:
        """Convert graph event to QueryEvent"""
        # Implementation here
        pass
```

**Note**: Copy the actual implementation from `backend/dataline/services/llm_flow/` and adapt to remove web/persistence dependencies.

### Step 3.2: Extract SQL Tools

```python
# dataline-core/dataline/core/tools/__init__.py
from typing import List
from langchain.tools import BaseTool
from sqlalchemy.engine import Engine

from dataline.core.tools.list_tables import ListTablesTool
from dataline.core.tools.describe_table import DescribeTableTool
from dataline.core.tools.execute_query import ExecuteQueryTool

class SQLToolkit:
    """Collection of SQL tools for LangGraph"""

    def __init__(
        self,
        connection: Engine,
        secure_data: bool,
        max_rows: int,
        schema_context: Dict[str, Any]
    ):
        self.connection = connection
        self.secure_data = secure_data
        self.max_rows = max_rows
        self.schema_context = schema_context

    def get_tools(self) -> List[BaseTool]:
        """Get all SQL tools"""
        return [
            ListTablesTool(schema_context=self.schema_context),
            DescribeTableTool(
                connection=self.connection,
                schema_context=self.schema_context
            ),
            ExecuteQueryTool(
                connection=self.connection,
                secure_data=self.secure_data,
                max_rows=self.max_rows
            ),
        ]


def create_sql_toolkit(
    connection: Engine,
    secure_data: bool,
    max_rows: int,
    schema_context: Dict[str, Any]
) -> SQLToolkit:
    """Factory function to create SQL toolkit"""
    return SQLToolkit(
        connection=connection,
        secure_data=secure_data,
        max_rows=max_rows,
        schema_context=schema_context
    )
```

Copy tool implementations from `backend/dataline/services/llm_flow/toolkit.py` and adapt to be standalone.

## Phase 4: Extract Schema Inspector (Day 6)

```python
# dataline-core/dataline/core/schema/inspector.py
from typing import List, Dict, Any, Optional
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from dataline.core.exceptions import SchemaInspectionError

class SchemaInspector:
    """
    Inspect database schema.

    Provides schema information to LLM for query generation.
    """

    def __init__(self, connection: Engine):
        self.connection = connection
        self.inspector = inspect(connection)

    def get_schema_context(
        self,
        visible_schemas: Optional[List[str]] = None,
        hidden_tables: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get schema context for LLM.

        Args:
            visible_schemas: Only include these schemas (None = all)
            hidden_tables: Exclude these tables

        Returns:
            Dict with schema information
        """
        try:
            schemas = self._get_schemas()

            # Filter schemas
            if visible_schemas:
                schemas = [s for s in schemas if s in visible_schemas]

            # Get tables for each schema
            tables_by_schema = {}
            for schema in schemas:
                tables = self._get_tables(schema)

                # Filter out hidden tables
                if hidden_tables:
                    tables = [t for t in tables if t not in hidden_tables]

                tables_by_schema[schema] = tables

            # Get column information
            columns_info = {}
            for schema, tables in tables_by_schema.items():
                for table in tables:
                    columns = self._get_columns(schema, table)
                    columns_info[f"{schema}.{table}"] = columns

            return {
                "schemas": list(tables_by_schema.keys()),
                "tables": tables_by_schema,
                "columns": columns_info,
                "dialect": self.connection.dialect.name,
            }

        except Exception as e:
            raise SchemaInspectionError(f"Failed to inspect schema: {e}")

    def _get_schemas(self) -> List[str]:
        """Get list of schema names"""
        # SQLAlchemy doesn't have universal schema listing
        # Use dialect-specific queries
        dialect = self.connection.dialect.name

        if dialect == "postgresql":
            return self._get_postgres_schemas()
        elif dialect == "mysql":
            return self._get_mysql_schemas()
        elif dialect == "sqlite":
            return ["main"]  # SQLite has single schema
        else:
            # Generic: just use default schema
            return [self.connection.dialect.default_schema_name or "public"]

    def _get_postgres_schemas(self) -> List[str]:
        """Get PostgreSQL schemas"""
        query = """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
        """
        with self.connection.connect() as conn:
            result = conn.execute(text(query))
            return [row[0] for row in result]

    # Similar for other dialects...

    def _get_tables(self, schema: str) -> List[str]:
        """Get table names for schema"""
        return self.inspector.get_table_names(schema=schema)

    def _get_columns(self, schema: str, table: str) -> List[Dict[str, Any]]:
        """Get column information for table"""
        columns = self.inspector.get_columns(table, schema=schema)
        return [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
            }
            for col in columns
        ]
```

## Phase 5: Create QueryEngine (Day 7)

```python
# dataline-core/dataline/core/engine.py
from typing import Optional, List, Dict, Any, AsyncIterator
from sqlalchemy.engine import Engine

from dataline.core.models import (
    QueryOptions,
    QueryResult,
    QueryEvent,
    ChartConfig
)
from dataline.core.graph.workflow import QueryWorkflow
from dataline.core.charts import get_chart_renderer
from dataline.core.exceptions import InvalidOptionsError

class QueryEngine:
    """
    Core query engine - converts NL to SQL using LLMs.

    This is the main entry point for the Dataline core library.

    Example:
        ```python
        engine = QueryEngine(llm_api_key="sk-...")

        result = await engine.execute(
            connection=my_db_connection,
            query="Show top customers"
        )
        ```
    """

    def __init__(
        self,
        llm_api_key: str,
        model: str = "gpt-3.5-turbo",
        llm_base_url: Optional[str] = None,
    ):
        """
        Initialize query engine.

        Args:
            llm_api_key: OpenAI API key (or compatible endpoint)
            model: Model name (default: gpt-3.5-turbo)
            llm_base_url: Custom LLM endpoint URL (optional)
        """
        self.llm_api_key = llm_api_key
        self.model = model
        self.llm_base_url = llm_base_url

        self.workflow = QueryWorkflow(
            api_key=llm_api_key,
            model=model,
            base_url=llm_base_url
        )

    async def execute(
        self,
        connection: Engine,
        query: str,
        message_history: Optional[List[Dict[str, str]]] = None,
        options: Optional[QueryOptions] = None,
    ) -> QueryResult:
        """
        Execute natural language query.

        Args:
            connection: SQLAlchemy engine (user provides!)
            query: Natural language query
            message_history: Previous conversation (user manages!)
            options: Query options

        Returns:
            QueryResult with SQL, data, and metadata

        Raises:
            QueryExecutionError: If query fails
            InvalidOptionsError: If options are invalid
        """
        options = options or QueryOptions()
        message_history = message_history or []

        # Validate options
        self._validate_options(options)

        # Run workflow
        result = await self.workflow.run(
            connection=connection,
            query=query,
            message_history=message_history,
            options=options
        )

        # Auto-generate chart if requested
        if options.auto_chart and result.rows:
            try:
                chart = await self.generate_chart(
                    result=result,
                    chart_type=options.chart_type or "bar",
                    renderer=options.chart_renderer
                )
                result.chart = chart
            except Exception as e:
                # Don't fail if chart generation fails
                result.metadata["chart_error"] = str(e)

        return result

    async def execute_stream(
        self,
        connection: Engine,
        query: str,
        message_history: Optional[List[Dict[str, str]]] = None,
        options: Optional[QueryOptions] = None,
    ) -> AsyncIterator[QueryEvent]:
        """
        Stream query execution events.

        Args:
            connection: SQLAlchemy engine
            query: Natural language query
            message_history: Previous conversation
            options: Query options

        Yields:
            QueryEvent objects as query progresses
        """
        options = options or QueryOptions()
        message_history = message_history or []

        self._validate_options(options)

        async for event in self.workflow.run_stream(
            connection=connection,
            query=query,
            message_history=message_history,
            options=options
        ):
            yield event

    async def generate_chart(
        self,
        result: QueryResult,
        chart_type: str,
        renderer: str = "chartjs",
        options: Optional[Dict[str, Any]] = None,
    ) -> ChartConfig:
        """
        Generate chart from query result.

        Args:
            result: QueryResult from execute()
            chart_type: "bar", "line", "pie", etc.
            renderer: "chartjs", "plotly", "matplotlib"
            options: Renderer-specific options

        Returns:
            ChartConfig with renderer-specific format
        """
        chart_renderer = get_chart_renderer(renderer)

        return await chart_renderer.generate(
            result=result,
            chart_type=chart_type,
            llm_api_key=self.llm_api_key,
            llm_model=self.model,
            options=options or {}
        )

    def _validate_options(self, options: QueryOptions):
        """Validate query options"""
        if options.max_rows < 1:
            raise InvalidOptionsError("max_rows must be >= 1")

        if options.max_iterations < 1:
            raise InvalidOptionsError("max_iterations must be >= 1")

        if options.temperature < 0 or options.temperature > 2:
            raise InvalidOptionsError("temperature must be between 0 and 2")
```

## Phase 6: Make Charts Pluggable (Days 8-9)

```python
# dataline-core/dataline/core/charts/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from dataline.core.models import QueryResult, ChartConfig

class ChartRenderer(ABC):
    """Base class for chart renderers"""

    @abstractmethod
    async def generate(
        self,
        result: QueryResult,
        chart_type: str,
        llm_api_key: str,
        llm_model: str,
        options: Dict[str, Any]
    ) -> ChartConfig:
        """
        Generate chart configuration from query result.

        Args:
            result: Query result with data
            chart_type: Type of chart to generate
            llm_api_key: LLM API key for generation
            llm_model: LLM model to use
            options: Renderer-specific options

        Returns:
            ChartConfig with renderer-specific format
        """
        pass

    @abstractmethod
    def supports_chart_type(self, chart_type: str) -> bool:
        """Check if this renderer supports the chart type"""
        pass


# dataline-core/dataline/core/charts/chartjs.py
from dataline.core.charts.base import ChartRenderer
from dataline.core.models import ChartConfig
# Copy chart generation logic from backend/dataline/services/llm_flow/toolkit.py

class ChartJSRenderer(ChartRenderer):
    """Chart.js renderer using LLM"""

    async def generate(self, result, chart_type, llm_api_key, llm_model, options):
        # Use Mirascope or LangChain to generate Chart.js config
        # This is existing logic, just extracted
        pass

    def supports_chart_type(self, chart_type: str) -> bool:
        return chart_type in ["bar", "line", "pie", "doughnut", "scatter", "radar"]


# dataline-core/dataline/core/charts/__init__.py
from dataline.core.charts.base import ChartRenderer
from dataline.core.charts.chartjs import ChartJSRenderer

# Registry of renderers
_RENDERERS: Dict[str, ChartRenderer] = {
    "chartjs": ChartJSRenderer(),
}

def get_chart_renderer(name: str) -> ChartRenderer:
    """Get chart renderer by name"""
    if name not in _RENDERERS:
        raise ValueError(
            f"Unknown chart renderer: {name}. "
            f"Available: {list(_RENDERERS.keys())}"
        )
    return _RENDERERS[name]

def register_chart_renderer(name: str, renderer: ChartRenderer):
    """Register custom chart renderer"""
    _RENDERERS[name] = renderer
```

## Phase 7: Create Examples (Day 10)

```python
# dataline-core/examples/basic_usage.py
"""
Basic usage example for Dataline Core.

Shows how to use the QueryEngine to execute natural language queries
without any web server or persistence.
"""

import asyncio
from dataline.core import QueryEngine
from sqlalchemy import create_engine

async def main():
    # User manages their own database connection
    engine = create_engine("sqlite:///chinook.db")

    # Initialize query engine
    query_engine = QueryEngine(
        llm_api_key="sk-...",  # Replace with your API key
        model="gpt-3.5-turbo"
    )

    # Execute query
    print("Executing query...")
    result = await query_engine.execute(
        connection=engine,
        query="Show me the top 5 albums by number of tracks"
    )

    # Print results
    print(f"\nGenerated SQL:\n{result.sql}\n")
    print(f"Found {result.row_count} rows:")
    for row in result.rows:
        print(row)

    print(f"\nExecution time: {result.execution_time_ms}ms")

if __name__ == "__main__":
    asyncio.run(main())


# dataline-core/examples/with_streaming.py
"""
Streaming example - see query execution in real-time.
"""

import asyncio
from dataline.core import QueryEngine
from dataline.core.models import EventType
from sqlalchemy import create_engine

async def main():
    engine = create_engine("sqlite:///chinook.db")
    query_engine = QueryEngine(llm_api_key="sk-...")

    print("Executing query with streaming...")

    async for event in query_engine.execute_stream(
        connection=engine,
        query="What are the top selling tracks?"
    ):
        if event.type == EventType.TOOL_CALL:
            print(f"🔧 Calling tool: {event.data['tool_name']}")

        elif event.type == EventType.SQL_GENERATED:
            print(f"📝 SQL: {event.data['sql']}")

        elif event.type == EventType.QUERY_EXECUTED:
            print(f"✅ Got {event.data['row_count']} rows")

        elif event.type == EventType.COMPLETE:
            print("✨ Complete!")
            result = event.data['result']
            for row in result.rows[:5]:
                print(row)

if __name__ == "__main__":
    asyncio.run(main())


# dataline-core/examples/conversation.py
"""
Conversation example - user manages message history.
"""

import asyncio
from dataline.core import QueryEngine
from sqlalchemy import create_engine

async def main():
    engine = create_engine("sqlite:///chinook.db")
    query_engine = QueryEngine(llm_api_key="sk-...")

    # User manages conversation history
    conversation = []

    # First query
    print("Q1: Show me revenue by genre")
    result1 = await query_engine.execute(
        connection=engine,
        query="Show me revenue by genre",
        message_history=conversation
    )

    # Update history (user's responsibility!)
    conversation.append({
        "role": "user",
        "content": "Show me revenue by genre"
    })
    conversation.append({
        "role": "assistant",
        "content": f"SQL: {result1.sql}"
    })

    print(f"Got {result1.row_count} rows\n")

    # Follow-up query with context
    print("Q2: Now show just the top 3")
    result2 = await query_engine.execute(
        connection=engine,
        query="Now show just the top 3",
        message_history=conversation
    )

    print(f"SQL: {result2.sql}")
    for row in result2.rows:
        print(row)

if __name__ == "__main__":
    asyncio.run(main())
```

## Phase 8: Test Core Library (Days 11-12)

```python
# dataline-core/tests/test_engine.py
import pytest
from sqlalchemy import create_engine
from dataline.core import QueryEngine
from dataline.core.models import QueryOptions

@pytest.fixture
def test_engine():
    """Create test SQLite database"""
    engine = create_engine("sqlite:///:memory:")
    # Set up test schema
    with engine.connect() as conn:
        conn.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY,
                name TEXT,
                revenue DECIMAL
            )
        """)
        conn.execute("""
            INSERT INTO customers VALUES
            (1, 'Alice', 1000),
            (2, 'Bob', 2000),
            (3, 'Charlie', 1500)
        """)
        conn.commit()
    return engine

@pytest.mark.asyncio
async def test_basic_query(test_engine):
    """Test basic query execution"""
    query_engine = QueryEngine(
        llm_api_key=os.getenv("OPENAI_API_KEY")
    )

    result = await query_engine.execute(
        connection=test_engine,
        query="Show all customers ordered by revenue"
    )

    assert result.row_count == 3
    assert "revenue" in result.sql.lower()
    assert "order by" in result.sql.lower()

@pytest.mark.asyncio
async def test_with_options(test_engine):
    """Test with query options"""
    query_engine = QueryEngine(llm_api_key=os.getenv("OPENAI_API_KEY"))

    result = await query_engine.execute(
        connection=test_engine,
        query="Show top customer",
        options=QueryOptions(
            max_rows=1,
            secure_data=True
        )
    )

    assert result.row_count <= 1
```

## Phase 9: Refactor Web Server (Days 13-14)

### Step 9.1: Add Core as Dependency

```toml
# backend/pyproject.toml
[project]
dependencies = [
    "dataline-core>=0.1.0",  # Add this!
    "fastapi>=0.105.0",
    # ... other web-specific dependencies
]
```

### Step 9.2: Refactor Services

```python
# backend/dataline/services/conversation.py (AFTER)
from dataline.core import QueryEngine
from dataline.core.models import QueryOptions

class ConversationService:
    """Web service - thin wrapper around core library"""

    def __init__(
        self,
        query_engine: QueryEngine,  # Injected!
        conversation_repo: ConversationRepository,
        # ... other web-specific dependencies
    ):
        self.query_engine = query_engine
        self.conversation_repo = conversation_repo

    async def execute_query(
        self,
        conversation_id: str,
        query: str,
        options: Dict[str, Any]
    ):
        """Execute query - delegates to core library"""

        # Load conversation (web responsibility)
        conversation = await self.conversation_repo.find_by_id(conversation_id)

        # Get connection (web responsibility)
        connection = await self._get_connection(conversation.connection_id)

        # Get history (web responsibility)
        message_history = await self._get_message_history(conversation_id)

        # Call core library (does the real work!)
        result = await self.query_engine.execute(
            connection=connection,
            query=query,
            message_history=message_history,
            options=QueryOptions(**options)
        )

        # Save result (web responsibility)
        await self._save_result(conversation_id, result)

        return result
```

**Key changes:**
- Remove LangGraph code (now in core)
- Remove SQL tools (now in core)
- Service becomes thin wrapper
- Focuses on web concerns (persistence, auth)

## Timeline Summary

| Week | Days | Phase | Deliverable |
|------|------|-------|-------------|
| 1 | 1-2 | Setup | Package structure, pyproject.toml |
| 1 | 3 | Models | Data models, exceptions |
| 1 | 4-5 | Graph | LangGraph workflow extracted |
| 2 | 6 | Schema | Schema inspector |
| 2 | 7 | Engine | QueryEngine class |
| 2 | 8-9 | Charts | Pluggable chart renderers |
| 2 | 10 | Examples | Usage examples |
| 3 | 11-12 | Testing | Core library tests |
| 3 | 13-14 | Refactor | Web server uses core |

**Total: 2-3 weeks**

## Success Criteria

After extraction:

✅ Core library works standalone (no web dependencies)
✅ Can execute queries from scripts/notebooks
✅ Can execute queries with conversation history
✅ Chart rendering is pluggable
✅ Web server still works (backward compatible)
✅ Web server code is simpler (delegates to core)
✅ Published to PyPI
✅ Has usage examples

## Next Steps After Extraction

1. **Publish to PyPI** - make available to users
2. **Document core API** - usage guide, API reference
3. **Add more chart renderers** - Plotly, Matplotlib
4. **Build SDK on top** - Python/Go/TypeScript SDKs that use core
5. **Build CLI on top** - CLI tool that uses core
6. **Refine web server** - focus on web-specific features

This extraction is the **foundation** for API-first architecture!

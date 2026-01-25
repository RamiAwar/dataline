# Dataline Core Library: Minimal, Reusable NL-to-SQL Engine

## Philosophy

**Core Dataline should be a minimal, focused library that does ONE thing well:**
> Convert natural language queries to SQL using LLMs, with tool-based iteration until the result is satisfactory.

Everything else (web server, persistence, auth, UI) is optional and built ON TOP of this core.

## What the Core Library Does

### In Scope (Minimal Core)
1. ✅ Natural language → SQL conversion using LLM
2. ✅ LangGraph-based tool execution and iteration
3. ✅ Schema introspection from any connection
4. ✅ Query execution with result formatting
5. ✅ Chart generation (pluggable - Chart.js, Plotly, etc.)
6. ✅ Streaming results and tool calls
7. ✅ Secure data mode (metadata only, no actual data to LLM)

### Out of Scope (Let Users Handle)
1. ❌ Connection management and storage
2. ❌ Conversation persistence
3. ❌ User authentication
4. ❌ Web server / HTTP endpoints
5. ❌ Database migrations
6. ❌ UI components

## Proposed Core API

### Minimal Usage

```python
from dataline.core import QueryEngine
from sqlalchemy import create_engine

# User manages their own connection
engine = create_engine("postgresql://user:pass@localhost/db")

# Initialize query engine with LLM config
query_engine = QueryEngine(
    llm_api_key="sk-...",
    model="gpt-4",
)

# Execute natural language query
result = await query_engine.execute(
    connection=engine,
    query="Show me top 10 customers by revenue this year",
)

# Access results
print(f"SQL: {result.sql}")
print(f"Rows: {result.row_count}")
print(f"Data: {result.rows}")

# Generate chart (optional, pluggable)
chart = await query_engine.generate_chart(
    result=result,
    chart_type="bar",
    renderer="chartjs"  # or "plotly", "matplotlib"
)
print(chart.config)  # Chart.js JSON config
```

### With Message History (User Manages)

```python
# User tracks conversation history themselves
conversation_history = []

# First query
result1 = await query_engine.execute(
    connection=engine,
    query="Show me revenue by month",
    message_history=conversation_history
)

# Update history (user's responsibility)
conversation_history.append({
    "role": "user",
    "content": "Show me revenue by month"
})
conversation_history.append({
    "role": "assistant",
    "content": result1.sql,
    "metadata": {"rows": result1.row_count}
})

# Follow-up query with context
result2 = await query_engine.execute(
    connection=engine,
    query="Now break it down by product category",
    message_history=conversation_history
)
```

### With Streaming (Typed Events)

```python
from dataline.core.events import *

# Stream tool calls and results - fully typed!
async for event in query_engine.execute_stream(
    connection=engine,
    query="Show customer lifetime value distribution",
):
    # Pattern matching (Python 3.10+)
    match event:
        case ToolCallEvent(tool_name=name, arguments=args):
            print(f"Calling tool: {name}")
            print(f"Args: {args}")

        case SQLGeneratedEvent(sql=sql, reasoning=why):
            print(f"SQL: {sql}")
            print(f"Reasoning: {why}")

        case QueryExecutedEvent(row_count=count, rows=data):
            print(f"Rows: {count}")
            print(f"Data: {data[:5]}")  # First 5 rows

        case IterationEvent(iteration=i, reason=reason):
            print(f"Iterating ({i})... {reason}")

        case CompleteEvent(result=result):
            print("Done!")
            return result

# Or isinstance checks (Python 3.9+)
async for event in query_engine.execute_stream(...):
    if isinstance(event, SQLGeneratedEvent):
        print(f"SQL: {event.sql}")  # Fully typed!
    elif isinstance(event, CompleteEvent):
        return event.result
```

### With Options

```python
result = await query_engine.execute(
    connection=engine,
    query="Show sensitive customer data",
    options={
        # Security: don't send actual data to LLM
        "secure_data": True,

        # Limit results
        "max_rows": 100,

        # Schema filtering
        "visible_schemas": ["public", "analytics"],
        "hidden_tables": ["internal_metrics"],

        # LLM config
        "temperature": 0,
        "max_iterations": 3,

        # Chart preferences
        "auto_chart": True,
        "chart_renderer": "chartjs",
    }
)
```

## Core Library Architecture

```
dataline-core/
├── dataline/
│   ├── __init__.py
│   ├── engine.py              # Main QueryEngine class
│   ├── graph/                 # LangGraph query processing
│   │   ├── __init__.py
│   │   ├── state.py           # Graph state definition
│   │   ├── nodes.py           # Tool execution nodes
│   │   └── workflow.py        # Graph workflow definition
│   ├── tools/                 # SQL tools
│   │   ├── __init__.py
│   │   ├── list_tables.py
│   │   ├── describe_table.py
│   │   └── execute_query.py
│   ├── schema/                # Schema introspection
│   │   ├── __init__.py
│   │   └── inspector.py
│   ├── charts/                # Pluggable chart generation
│   │   ├── __init__.py
│   │   ├── base.py            # ChartRenderer interface
│   │   ├── chartjs.py         # Chart.js renderer
│   │   ├── plotly.py          # Plotly renderer (future)
│   │   └── matplotlib.py      # Matplotlib renderer (future)
│   ├── models.py              # Data models (Result, Event, etc.)
│   └── exceptions.py          # Core exceptions
├── tests/
├── examples/
│   ├── basic_usage.py
│   ├── with_streaming.py
│   ├── conversation_example.py
│   └── custom_chart_renderer.py
├── pyproject.toml
└── README.md
```

## Core Components

### 1. QueryEngine (Main Entry Point)

```python
# dataline/engine.py
from typing import Optional, List, Dict, Any, AsyncIterator
from sqlalchemy.engine import Engine
from dataline.graph.workflow import QueryWorkflow
from dataline.models import QueryResult, QueryEvent, QueryOptions

class QueryEngine:
    """
    Core query engine - converts NL to SQL using LLM.

    No persistence, no web server, no auth - just pure query logic.
    """

    def __init__(
        self,
        llm_api_key: str,
        model: str = "gpt-3.5-turbo",
        llm_base_url: Optional[str] = None,
    ):
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
        Execute natural language query and return final result.

        This is a convenience method that consumes the event stream
        and returns only the final result. Use execute_stream() if you
        need to handle events.

        Args:
            connection: SQLAlchemy engine (user manages this!)
            query: Natural language query
            message_history: Previous conversation (user manages this!)
            options: Query options (secure_data, max_rows, etc.)

        Returns:
            QueryResult with SQL, data, metadata
        """
        options = options or QueryOptions()

        # Consume the stream and return final result
        async for event in self.execute_stream(
            connection=connection,
            query=query,
            message_history=message_history,
            options=options
        ):
            if isinstance(event, CompleteEvent):
                return event.result

        raise RuntimeError("Query stream ended without CompleteEvent")

    async def execute_stream(
        self,
        connection: Engine,
        query: str,
        message_history: Optional[List[Dict[str, str]]] = None,
        options: Optional[QueryOptions] = None,
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream typed query execution events.

        Yields:
            Typed event objects (ToolCallEvent, SQLGeneratedEvent, etc.)

        Example:
            async for event in engine.execute_stream(...):
                match event:
                    case SQLGeneratedEvent(sql=sql):
                        print(sql)
                    case CompleteEvent(result=result):
                        return result
        """
        options = options or QueryOptions()

        async for event in self.workflow.run_stream(
            connection=connection,
            query=query,
            message_history=message_history or [],
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
        Generate chart configuration from query result.

        Args:
            result: QueryResult from execute()
            chart_type: "bar", "line", "pie", etc.
            renderer: "chartjs", "plotly", "matplotlib"
            options: Renderer-specific options

        Returns:
            ChartConfig with renderer-specific format
        """
        from dataline.charts import get_renderer

        chart_renderer = get_renderer(renderer)
        return await chart_renderer.generate(
            result=result,
            chart_type=chart_type,
            options=options or {}
        )
```

### 2. Data Models

```python
# dataline/models.py
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

@dataclass
class QueryOptions:
    """Options for query execution"""
    secure_data: bool = False
    max_rows: int = 10
    visible_schemas: Optional[List[str]] = None
    hidden_tables: Optional[List[str]] = None
    temperature: float = 0
    max_iterations: int = 3
    auto_chart: bool = False
    chart_renderer: str = "chartjs"

@dataclass
class QueryResult:
    """Result of query execution"""
    sql: str
    rows: List[Dict[str, Any]]
    row_count: int
    columns: List[str]
    execution_time_ms: int
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Optional chart if auto_chart=True
    chart: Optional['ChartConfig'] = None

@dataclass
class QueryEvent(ABC):
    """Base class for all streaming events"""
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ToolCallEvent(QueryEvent):
    """LLM is calling a tool"""
    tool_name: str
    arguments: Dict[str, Any]

@dataclass
class SQLGeneratedEvent(QueryEvent):
    """SQL query has been generated"""
    sql: str
    reasoning: str

@dataclass
class QueryExecutedEvent(QueryEvent):
    """SQL executed successfully"""
    sql: str
    row_count: int
    execution_time_ms: int
    rows: List[Dict[str, Any]]

@dataclass
class IterationEvent(QueryEvent):
    """LLM is iterating to improve result"""
    iteration: int
    reason: str

@dataclass
class CompleteEvent(QueryEvent):
    """Query execution complete"""
    result: QueryResult

# Type alias for all events
StreamEvent = Union[
    ToolCallEvent,
    SQLGeneratedEvent,
    QueryExecutedEvent,
    IterationEvent,
    CompleteEvent
]

@dataclass
class ChartConfig:
    """Chart configuration (renderer-specific)"""
    renderer: str  # "chartjs", "plotly", etc.
    config: Dict[str, Any]  # Renderer-specific JSON config
```

### 3. Pluggable Chart Renderers

```python
# dataline/charts/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from dataline.models import QueryResult, ChartConfig

class ChartRenderer(ABC):
    """Base class for chart renderers"""

    @abstractmethod
    async def generate(
        self,
        result: QueryResult,
        chart_type: str,
        options: Dict[str, Any]
    ) -> ChartConfig:
        """Generate chart configuration from query result"""
        pass

    @abstractmethod
    def supports_chart_type(self, chart_type: str) -> bool:
        """Check if this renderer supports the chart type"""
        pass

# dataline/charts/chartjs.py
class ChartJSRenderer(ChartRenderer):
    """Chart.js renderer"""

    async def generate(
        self,
        result: QueryResult,
        chart_type: str,
        options: Dict[str, Any]
    ) -> ChartConfig:
        """Generate Chart.js configuration"""

        # Use LLM to generate Chart.js config (current approach)
        # Or use rule-based generation for common cases

        config = await self._generate_chartjs_config(
            result=result,
            chart_type=chart_type,
            options=options
        )

        return ChartConfig(
            renderer="chartjs",
            config=config
        )

    def supports_chart_type(self, chart_type: str) -> bool:
        return chart_type in ["bar", "line", "pie", "scatter", "radar"]

# dataline/charts/plotly.py (future)
class PlotlyRenderer(ChartRenderer):
    """Plotly renderer for more interactive charts"""

    async def generate(self, result, chart_type, options):
        # Generate Plotly figure spec
        pass

# dataline/charts/__init__.py
_RENDERERS = {
    "chartjs": ChartJSRenderer(),
    "plotly": PlotlyRenderer(),
}

def get_renderer(name: str) -> ChartRenderer:
    """Get chart renderer by name"""
    if name not in _RENDERERS:
        raise ValueError(f"Unknown renderer: {name}")
    return _RENDERERS[name]

def register_renderer(name: str, renderer: ChartRenderer):
    """Register custom chart renderer"""
    _RENDERERS[name] = renderer
```

### 4. Graph Workflow (Refactored)

```python
# dataline/graph/workflow.py
from typing import AsyncIterator
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from dataline.graph.state import QueryState
from dataline.graph.nodes import CallModelNode, CallToolNode
from dataline.tools import create_sql_toolkit
from dataline.schema import SchemaInspector

class QueryWorkflow:
    """LangGraph-based query workflow - isolated from web/persistence"""

    def __init__(self, api_key: str, model: str, base_url: str = None):
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            base_url=base_url,
            temperature=0
        )

    def _build_graph(self, connection, options):
        """Build LangGraph workflow"""

        # Get schema info
        inspector = SchemaInspector(connection)
        schema_info = inspector.get_visible_schema(
            visible_schemas=options.visible_schemas,
            hidden_tables=options.hidden_tables
        )

        # Create SQL toolkit
        toolkit = create_sql_toolkit(
            connection=connection,
            secure_data=options.secure_data,
            max_rows=options.max_rows
        )

        # Build graph
        workflow = StateGraph(QueryState)

        # Add nodes
        workflow.add_node("call_model", CallModelNode(self.llm, toolkit))
        workflow.add_node("call_tool", CallToolNode(toolkit))

        # Add edges
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

    async def run(self, connection, query, message_history, options):
        """Run workflow and return final result"""

        graph = self._build_graph(connection, options)

        # Initialize state
        state = QueryState(
            messages=self._format_messages(query, message_history),
            query=query,
            options=options
        )

        # Run graph
        final_state = await graph.ainvoke(state)

        # Extract result
        return self._extract_result(final_state)

    async def run_stream(self, connection, query, message_history, options):
        """Stream workflow events"""

        graph = self._build_graph(connection, options)

        state = QueryState(
            messages=self._format_messages(query, message_history),
            query=query,
            options=options
        )

        async for event in graph.astream(state):
            yield self._convert_to_query_event(event)
```

## Package Distribution

### PyPI Package

```toml
# pyproject.toml
[project]
name = "dataline-core"
version = "0.1.0"
description = "Minimal NL-to-SQL engine using LLMs"
authors = [{name = "Your Name", email = "you@example.com"}]
requires-python = ">=3.10"
dependencies = [
    "langchain>=0.3.0",
    "langgraph>=0.2.0",
    "langchain-openai>=0.2.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
# Chart renderers
chartjs = []  # No extra deps, LLM generates JSON
plotly = ["plotly>=5.0.0"]
matplotlib = ["matplotlib>=3.7.0"]

# Database dialects
postgres = ["psycopg2-binary>=2.9.0"]
mysql = ["pymysql>=1.0.0"]
snowflake = ["snowflake-sqlalchemy>=1.5.0"]

# All extras
all = [
    "plotly>=5.0.0",
    "matplotlib>=3.7.0",
    "psycopg2-binary>=2.9.0",
    "pymysql>=1.0.0",
    "snowflake-sqlalchemy>=1.5.0",
]
```

### Installation

```bash
# Minimal install (Chart.js only)
pip install dataline-core

# With Plotly support
pip install dataline-core[plotly]

# With all chart renderers and databases
pip install dataline-core[all]

# For development
pip install -e ".[all,dev]"
```

## How the Web Server Uses the Core

The current web server becomes a **thin wrapper** around the core library:

```python
# backend/dataline/api/conversation/router.py (simplified)
from fastapi import APIRouter, Depends
from dataline.core import QueryEngine
from dataline.services.connection import get_connection_engine

router = APIRouter()

@router.post("/conversation/{id}/query")
async def execute_query(
    conversation_id: str,
    request: QueryRequest,
    engine: QueryEngine = Depends(get_query_engine),
):
    """Web endpoint - just wraps core library"""

    # Load conversation from DB (web server's responsibility)
    conversation = await load_conversation(conversation_id)

    # Get connection (web server manages this)
    connection = await get_connection_engine(conversation.connection_id)

    # Get message history (web server manages this)
    message_history = await get_message_history(conversation_id)

    # Call core library (does the real work!)
    async for event in engine.execute_stream(
        connection=connection,
        query=request.query,
        message_history=message_history,
        options=request.options
    ):
        # Convert to SSE and stream to client
        yield f"data: {json.dumps(event)}\n\n"

        # Save to DB (web server's responsibility)
        if event.type == "complete":
            await save_result(conversation_id, event.result)
```

## Use Cases Enabled

### 1. Standalone Scripts

```python
# scripts/analyze_database.py
from dataline.core import QueryEngine
from sqlalchemy import create_engine

engine = create_engine("postgresql://localhost/mydb")
query_engine = QueryEngine(llm_api_key="sk-...")

# No web server needed!
result = await query_engine.execute(
    connection=engine,
    query="Show me the top issues this week"
)

print(result.sql)
print(result.rows)
```

### 2. Jupyter Notebooks

```python
# analysis.ipynb
from dataline.core import QueryEngine
import pandas as pd

query_engine = QueryEngine(llm_api_key="sk-...")

# Interactive analysis
result = await query_engine.execute(
    connection=my_db_connection,
    query="What's the customer churn rate by cohort?"
)

# Convert to pandas
df = pd.DataFrame(result.rows)
df.plot()
```

### 3. Custom Applications

```python
# my_app/analytics.py
from dataline.core import QueryEngine

class AnalyticsService:
    """Custom app using Dataline core"""

    def __init__(self, db_url: str, llm_key: str):
        self.engine = create_engine(db_url)
        self.query_engine = QueryEngine(llm_api_key=llm_key)
        # Store conversations in Redis, MongoDB, whatever!
        self.conversation_store = MyCustomStore()

    async def ask_question(self, user_id: str, question: str):
        # Load history from YOUR storage
        history = await self.conversation_store.get_history(user_id)

        # Use core library
        result = await self.query_engine.execute(
            connection=self.engine,
            query=question,
            message_history=history
        )

        # Save to YOUR storage
        await self.conversation_store.append(user_id, question, result)

        return result
```

### 4. CLI Tool

```python
# dataline-cli
import asyncio
import click
from dataline.core import QueryEngine
from sqlalchemy import create_engine

@click.command()
@click.option("--dsn", required=True)
@click.option("--query", required=True)
@click.option("--api-key", envvar="OPENAI_API_KEY")
def query(dsn, query, api_key):
    """Execute NL query from command line"""

    engine = create_engine(dsn)
    query_engine = QueryEngine(llm_api_key=api_key)

    result = asyncio.run(query_engine.execute(
        connection=engine,
        query=query
    ))

    click.echo(f"SQL: {result.sql}")
    click.echo(f"Rows: {result.row_count}")
    for row in result.rows:
        click.echo(row)

if __name__ == "__main__":
    query()
```

## Migration Path

### Phase 1: Extract Core (Week 1-2)

1. **Create `dataline-core` package** (new directory)
   - Move LangGraph workflow to `dataline/graph/`
   - Move SQL tools to `dataline/tools/`
   - Create `QueryEngine` class
   - Remove all persistence/web dependencies

2. **Make chart rendering pluggable**
   - Create `ChartRenderer` interface
   - Implement `ChartJSRenderer`
   - Add renderer registry

3. **Test core standalone**
   - Write examples using core directly
   - Test with different databases
   - Test with/without message history

### Phase 2: Refactor Web Server (Week 3-4)

1. **Install core as dependency**
   ```toml
   # backend/pyproject.toml
   dependencies = [
       "dataline-core>=0.1.0",
       "fastapi",
       # ... other web-specific deps
   ]
   ```

2. **Refactor services to use core**
   - Remove duplicated LangGraph code
   - Services become thin wrappers
   - Keep persistence, auth, HTTP logic

3. **Test backward compatibility**
   - All existing APIs still work
   - UI works unchanged
   - No breaking changes

### Phase 3: Publish & Document (Week 5)

1. **Publish to PyPI**
   ```bash
   cd dataline-core
   python -m build
   twine upload dist/*
   ```

2. **Write documentation**
   - Core library README
   - Usage examples
   - API reference
   - Migration guide

3. **Update main README**
   - Explain core vs. web server
   - Show both usage patterns

## Benefits

### For Users
✅ **Use without web server** - just install core library
✅ **Integrate into their apps** - their storage, their auth
✅ **Jupyter notebooks** - interactive analysis
✅ **Scripts and automation** - no UI needed
✅ **Custom UIs** - build their own on top

### For Dataline Project
✅ **Simpler core** - one responsibility (NL→SQL)
✅ **Easier to test** - no web/DB dependencies
✅ **More users** - library users + web users
✅ **Better architecture** - clean separation
✅ **Extensible** - custom chart renderers, custom tools

### For Clean Architecture
✅ **Domain logic extracted** - core library IS the domain
✅ **Framework independent** - no FastAPI in core
✅ **Testable** - pure Python, no mocking needed
✅ **Reusable** - multiple applications can use it
✅ **Simple** - focused on one thing

## Next Steps

1. **Review this proposal** - does this match your vision?
2. **Create `dataline-core` directory** - new package structure
3. **Extract QueryEngine** - move LangGraph code
4. **Make charts pluggable** - ChartRenderer interface
5. **Test standalone** - write examples
6. **Publish to PyPI** - make it available
7. **Refactor web server** - use core as dependency

This is a **much simpler, more focused first step** that delivers immediate value and sets up clean architecture naturally!

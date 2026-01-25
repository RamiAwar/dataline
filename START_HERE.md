# Start Here: Dataline Core Library Extraction

## What We're Building

**A minimal, reusable Python library** that does ONE thing:
> Convert natural language queries to SQL using LLMs

Everything else (web server, persistence, auth) is optional and built on top.

## Why This Approach?

Instead of a 13-week full architectural transformation, we're starting with:
- ✅ **2-3 weeks** to extract core library
- ✅ **Immediately usable** in scripts, notebooks, apps
- ✅ **Sets up clean architecture naturally**
- ✅ **Lower risk, simpler scope**

The core library IS your domain layer. The web server becomes a thin wrapper.

## Core Library Design

### What's In Scope

```python
from dataline.core import QueryEngine

# User manages connection
engine = create_engine("postgresql://...")

# Initialize query engine
query_engine = QueryEngine(llm_api_key="sk-...")

# Execute query (no web server needed!)
result = await query_engine.execute(
    connection=engine,
    query="Show top customers by revenue"
)

print(result.sql)
print(result.rows)
```

**Features:**
- ✅ Natural language → SQL conversion
- ✅ LangGraph-based tool execution
- ✅ Schema introspection
- ✅ Query execution with streaming
- ✅ Secure data mode (no data to LLM)
- ✅ Pluggable chart generation (Chart.js, Plotly, etc.)
- ✅ Typed events (no Dict[str, Any])

### What's Out of Scope

Users manage these:
- ❌ Connection storage
- ❌ Conversation persistence
- ❌ Message history
- ❌ User authentication
- ❌ Web server

## Key Design Decisions

### 1. Users Manage State

```python
# User manages connection
my_connection = create_engine(dsn)

# User manages conversation history
my_history = [
    {"role": "user", "content": "Show revenue"},
    {"role": "assistant", "content": "SELECT ..."}
]

# Just pass to core
result = await engine.execute(
    connection=my_connection,
    query="Now by product",
    message_history=my_history
)
```

### 2. Charts Are Pluggable

```python
from dataline.core.charts import register_chart_renderer

# Chart.js (built-in)
chart = await engine.generate_chart(
    result=result,
    chart_type="bar",
    renderer="chartjs"
)

# Plotly (future)
chart = await engine.generate_chart(
    result=result,
    chart_type="bar",
    renderer="plotly"
)

# Custom renderer
class MyRenderer(ChartRenderer):
    async def generate(self, result, chart_type, options):
        # Your logic
        pass

register_chart_renderer("custom", MyRenderer())
```

### 3. Typed Events (No Callbacks)

```python
from dataline.core.events import *

# Stream with pattern matching (Python 3.10+)
async for event in engine.execute_stream(connection=db, query="..."):
    match event:
        case SQLGeneratedEvent(sql=sql, reasoning=why):
            print(f"SQL: {sql}")
            print(f"Why: {why}")

        case QueryExecutedEvent(row_count=count, execution_time_ms=ms):
            print(f"✅ {count} rows in {ms}ms")

        case CompleteEvent(result=result):
            return result

# Or isinstance (Python 3.9+)
async for event in engine.execute_stream(...):
    if isinstance(event, SQLGeneratedEvent):
        print(event.sql)  # Fully typed!
```

**Why typed events?**
- ✅ Full type safety
- ✅ IDE autocomplete
- ✅ Pattern matching (clean syntax)
- ✅ Can't typo field names
- ✅ Simple - no callbacks to learn

## Implementation Plan

### Week 1: Foundation
- **Day 1-2**: Set up `dataline-core` package structure
- **Day 3**: Extract data models (QueryOptions, QueryResult, typed events)
- **Day 4-5**: Extract LangGraph workflow from backend

### Week 2: Core Components
- **Day 6**: Extract schema inspector
- **Day 7**: Create QueryEngine class
- **Day 8-9**: Make charts pluggable (ChartRenderer interface)
- **Day 10**: Write usage examples

### Week 3: Integration
- **Day 11-12**: Test core library standalone
- **Day 13-14**: Refactor web server to use core

See [CORE_EXTRACTION_GUIDE.md](./CORE_EXTRACTION_GUIDE.md) for detailed day-by-day tasks.

## File Organization

```
dataline-core/
├── dataline/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── engine.py           # QueryEngine
│   │   ├── models.py           # QueryOptions, QueryResult
│   │   ├── events.py           # Typed events
│   │   ├── exceptions.py       # Core exceptions
│   │   ├── graph/              # LangGraph workflow
│   │   │   ├── workflow.py
│   │   │   ├── state.py
│   │   │   └── nodes.py
│   │   ├── tools/              # SQL tools
│   │   │   ├── list_tables.py
│   │   │   ├── describe_table.py
│   │   │   └── execute_query.py
│   │   ├── schema/             # Schema inspector
│   │   │   └── inspector.py
│   │   └── charts/             # Pluggable renderers
│   │       ├── base.py
│   │       └── chartjs.py
├── examples/
│   ├── basic_usage.py
│   ├── with_streaming.py
│   └── conversation.py
├── tests/
├── pyproject.toml
└── README.md
```

## Use Cases Enabled

### 1. Standalone Scripts
```python
from dataline.core import QueryEngine
from sqlalchemy import create_engine

engine = create_engine("postgresql://localhost/mydb")
query_engine = QueryEngine(llm_api_key="sk-...")

result = await query_engine.execute(
    connection=engine,
    query="Top issues this week"
)
```

### 2. Jupyter Notebooks
```python
query_engine = QueryEngine(llm_api_key="sk-...")

result = await query_engine.execute(
    connection=my_db,
    query="Customer churn by cohort?"
)

df = pd.DataFrame(result.rows)
df.plot()
```

### 3. Custom Applications
```python
class MyAnalyticsApp:
    def __init__(self, db_url, llm_key):
        self.engine = create_engine(db_url)
        self.query_engine = QueryEngine(llm_api_key=llm_key)
        self.storage = Redis()  # Your storage!

    async def ask(self, user_id, question):
        history = await self.storage.get_history(user_id)
        result = await self.query_engine.execute(
            connection=self.engine,
            query=question,
            message_history=history
        )
        await self.storage.save(user_id, result)
        return result
```

### 4. Web Server (Thin Wrapper)
```python
# backend/dataline/services/conversation.py
class ConversationService:
    def __init__(self, query_engine: QueryEngine, ...):
        self.query_engine = query_engine

    async def execute_query(self, conversation_id, query):
        # Load from DB (web responsibility)
        conversation = await self.repo.find(conversation_id)
        connection = await self.get_connection(...)
        history = await self.get_history(...)

        # Call core (does real work!)
        result = await self.query_engine.execute(
            connection=connection,
            query=query,
            message_history=history
        )

        # Save to DB (web responsibility)
        await self.save_result(result)
        return result
```

## Next Steps

### Right Now
1. **Review this document** - make sure you're aligned
2. **Review [CORE_LIBRARY_PROPOSAL.md](./CORE_LIBRARY_PROPOSAL.md)** - full design
3. **Review [CORE_EXTRACTION_GUIDE.md](./CORE_EXTRACTION_GUIDE.md)** - implementation plan

### This Week
1. Create `dataline-core/` directory structure
2. Set up `pyproject.toml`
3. Extract data models
4. Start moving LangGraph code

### Week 2-3
Follow the day-by-day guide in CORE_EXTRACTION_GUIDE.md

## Documentation Index

Here's what each document covers:

### Core Library (Start Here)
- **START_HERE.md** (this file) - Overview and quick start
- **CORE_LIBRARY_PROPOSAL.md** - Complete API design and examples
- **CORE_EXTRACTION_GUIDE.md** - Day-by-day implementation plan
- **STREAMING_API_DESIGN.md** - Why typed events, not callbacks

### Full Architecture (Long-term Vision)
- **ARCHITECTURE_PROPOSAL.md** - Clean architecture design
- **IMPLEMENTATION_ROADMAP.md** - 13-week transformation plan
- **ARCHITECTURE_CODE_EXAMPLES.md** - Code comparisons
- **WHY_USE_CASES_NOT_REST.md** - Use cases vs REST-centric
- **README_ARCHITECTURE.md** - Architecture overview
- **NEXT_STEPS.md** - Decision guide

## Why This is Better Than Full Transformation

| Aspect | Full Architecture (13 weeks) | Core Library (2-3 weeks) |
|--------|------------------------------|--------------------------|
| **Scope** | Everything at once | Just core logic |
| **Timeline** | 3+ months | 2-3 weeks |
| **Risk** | High - big changes | Low - incremental |
| **Value** | Delayed | Immediate |
| **Usability** | After transformation | Day 1 |
| **Clean Architecture** | Explicit layers | Emerges naturally |

## Success Criteria

After extraction, you should have:
- ✅ Core library works standalone
- ✅ Can execute queries from scripts
- ✅ Charts are pluggable
- ✅ Events are typed
- ✅ Web server still works
- ✅ Web server code is simpler
- ✅ Published to PyPI

## The Big Picture

```
TODAY:
┌─────────────────────────────┐
│   Monolithic Dataline       │
│   Everything coupled        │
└─────────────────────────────┘

AFTER EXTRACTION:
┌───────────────────────────┐
│  dataline-core (Library)  │
│  • QueryEngine            │
│  • LangGraph workflow     │
│  • SQL tools              │
│  • Pluggable charts       │
└─────────────┬─────────────┘
              │ used by
              ▼
┌───────────────────────────┐
│  dataline-server (Web)    │
│  • FastAPI thin wrapper   │
│  • Persistence            │
│  • Auth                   │
│  • UI serving             │
└───────────────────────────┘
```

**Core library = Your domain logic**
**Web server = Interface adapter**

This is clean architecture without explicitly trying to build clean architecture!

## Ready to Start?

1. ✅ Review the design (you've done this)
2. ✅ Make sure you like the API
3. → Create `dataline-core/` directory
4. → Follow CORE_EXTRACTION_GUIDE.md

Let's build a clean, reusable core library! 🚀

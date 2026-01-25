# Streaming API Design: Typed Events vs Callbacks

## Problem with Current Approach

### Current Design (Not Great)

```python
# dataline/core/models.py
class EventType(str, Enum):
    TOOL_CALL = "tool_call"
    SQL_GENERATED = "sql_generated"
    QUERY_EXECUTED = "query_executed"

@dataclass
class QueryEvent:
    type: EventType
    timestamp: datetime
    data: Dict[str, Any]  # ❌ Untyped! No IDE help, no validation

# Usage - ugly if/elif chains
async for event in query_engine.execute_stream(...):
    if event.type == EventType.TOOL_CALL:
        # Have to remember what's in data
        print(f"Tool: {event.data['tool_name']}")  # ❌ Could typo the key
        print(f"Args: {event.data['arguments']}")

    elif event.type == EventType.SQL_GENERATED:
        print(f"SQL: {event.data['sql']}")

    elif event.type == EventType.QUERY_EXECUTED:
        print(f"Rows: {event.data['row_count']}")  # ❌ What if key changes?
```

**Problems:**
- ❌ No type safety - `event.data` is `Dict[str, Any]`
- ❌ Long if/elif chains
- ❌ Can typo event type strings
- ❌ Can typo dictionary keys
- ❌ IDE can't autocomplete fields
- ❌ No validation - could access wrong fields
- ❌ Hard to discover what events exist

---

## Solution 1: Typed Event Classes (Recommended)

### Design

Use **discriminated union** of typed event classes. Python 3.10+ supports pattern matching!

```python
# dataline/core/events.py
from dataclasses import dataclass
from typing import Union, List, Dict, Any
from datetime import datetime
from abc import ABC

@dataclass
class QueryEvent(ABC):
    """Base class for all query events"""
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ToolCallEvent(QueryEvent):
    """Event: LLM is calling a tool"""
    tool_name: str
    arguments: Dict[str, Any]


@dataclass
class SQLGeneratedEvent(QueryEvent):
    """Event: SQL query has been generated"""
    sql: str
    reasoning: str  # Why this SQL was chosen


@dataclass
class QueryExecutingEvent(QueryEvent):
    """Event: About to execute SQL"""
    sql: str


@dataclass
class QueryExecutedEvent(QueryEvent):
    """Event: SQL query executed successfully"""
    sql: str
    row_count: int
    execution_time_ms: int
    columns: List[str]


@dataclass
class PartialResultEvent(QueryEvent):
    """Event: First N rows available (for streaming large results)"""
    rows: List[Dict[str, Any]]
    is_final: bool


@dataclass
class IterationEvent(QueryEvent):
    """Event: LLM is iterating (didn't get satisfactory result)"""
    iteration: int
    reason: str


@dataclass
class ErrorEvent(QueryEvent):
    """Event: Error occurred"""
    error_type: str
    message: str
    recoverable: bool


@dataclass
class CompleteEvent(QueryEvent):
    """Event: Query execution complete"""
    result: 'QueryResult'


# Type alias for all possible events
StreamEvent = Union[
    ToolCallEvent,
    SQLGeneratedEvent,
    QueryExecutingEvent,
    QueryExecutedEvent,
    PartialResultEvent,
    IterationEvent,
    ErrorEvent,
    CompleteEvent
]
```

### Usage: Pattern Matching (Python 3.10+)

```python
async for event in query_engine.execute_stream(...):
    match event:
        case ToolCallEvent(tool_name=name, arguments=args):
            print(f"🔧 Calling {name} with {args}")

        case SQLGeneratedEvent(sql=sql, reasoning=why):
            print(f"📝 SQL: {sql}")
            print(f"   Why: {why}")

        case QueryExecutedEvent(row_count=count, execution_time_ms=ms):
            print(f"✅ Got {count} rows in {ms}ms")

        case IterationEvent(iteration=i, reason=reason):
            print(f"🔄 Iteration {i}: {reason}")

        case ErrorEvent(message=msg, recoverable=can_recover):
            if can_recover:
                print(f"⚠️  Warning: {msg}")
            else:
                print(f"❌ Error: {msg}")

        case CompleteEvent(result=result):
            print(f"✨ Complete! {result.row_count} rows")
            return result
```

**Benefits:**
- ✅ **Fully typed** - IDE autocompletes all fields
- ✅ **Type checking** - mypy catches errors
- ✅ **Clean syntax** - pattern matching is elegant
- ✅ **Discoverable** - IDE shows all event types
- ✅ **Can't typo fields** - compiler error if wrong field
- ✅ **Self-documenting** - event classes show what fields exist

### Usage: Traditional if/isinstance (Python 3.9+)

For older Python or preference:

```python
async for event in query_engine.execute_stream(...):
    if isinstance(event, ToolCallEvent):
        # event.tool_name is typed! IDE knows the fields
        print(f"🔧 Calling {event.tool_name}")

    elif isinstance(event, SQLGeneratedEvent):
        print(f"📝 SQL: {event.sql}")

    elif isinstance(event, QueryExecutedEvent):
        print(f"✅ Got {event.row_count} rows in {event.execution_time_ms}ms")

    elif isinstance(event, CompleteEvent):
        print(f"✨ Complete!")
        return event.result
```

Still fully typed, just more verbose.

---

## Solution 2: Callback-Based API

### Design

Pass callbacks for each event type you care about.

```python
# dataline/core/callbacks.py
from typing import Protocol, Optional
from dataline.core.events import *

class QueryCallbacks(Protocol):
    """Protocol defining all possible callbacks"""

    def on_tool_call(self, event: ToolCallEvent) -> None:
        """Called when LLM calls a tool"""
        pass

    def on_sql_generated(self, event: SQLGeneratedEvent) -> None:
        """Called when SQL is generated"""
        pass

    def on_query_executing(self, event: QueryExecutingEvent) -> None:
        """Called before executing SQL"""
        pass

    def on_query_executed(self, event: QueryExecutedEvent) -> None:
        """Called after SQL executes successfully"""
        pass

    def on_iteration(self, event: IterationEvent) -> None:
        """Called when LLM iterates"""
        pass

    def on_error(self, event: ErrorEvent) -> None:
        """Called on error"""
        pass

    def on_complete(self, event: CompleteEvent) -> None:
        """Called when query completes"""
        pass


# Or use individual callbacks
@dataclass
class StreamCallbacks:
    """Optional callbacks for streaming events"""
    on_tool_call: Optional[Callable[[ToolCallEvent], None]] = None
    on_sql_generated: Optional[Callable[[SQLGeneratedEvent], None]] = None
    on_query_executing: Optional[Callable[[QueryExecutingEvent], None]] = None
    on_query_executed: Optional[Callable[[QueryExecutedEvent], None]] = None
    on_iteration: Optional[Callable[[IterationEvent], None]] = None
    on_error: Optional[Callable[[ErrorEvent], None]] = None
    on_complete: Optional[Callable[[CompleteEvent], None]] = None
```

### Usage: Callback-Based

```python
# Option 1: Define callback functions
def handle_sql(event: SQLGeneratedEvent):
    print(f"SQL: {event.sql}")

def handle_result(event: QueryExecutedEvent):
    print(f"Got {event.row_count} rows")

# Execute with callbacks
result = await query_engine.execute(
    connection=engine,
    query="Show top customers",
    callbacks=StreamCallbacks(
        on_sql_generated=handle_sql,
        on_query_executed=handle_result
    )
)

# Option 2: Inline lambdas
result = await query_engine.execute(
    connection=engine,
    query="Show top customers",
    callbacks=StreamCallbacks(
        on_sql_generated=lambda e: print(f"SQL: {e.sql}"),
        on_query_executed=lambda e: print(f"{e.row_count} rows"),
    )
)

# Option 3: Class-based callbacks
class MyCallbacks:
    def on_sql_generated(self, event: SQLGeneratedEvent):
        self.save_sql_to_file(event.sql)

    def on_query_executed(self, event: QueryExecutedEvent):
        self.log_metrics(event.execution_time_ms)

result = await query_engine.execute(
    connection=engine,
    query="Show top customers",
    callbacks=MyCallbacks()
)
```

**Benefits:**
- ✅ **No if/elif chains** - just define handlers you care about
- ✅ **Clean separation** - each handler is isolated
- ✅ **Still typed** - events are typed classes
- ✅ **Easier to compose** - can mix and match callbacks

**Drawbacks:**
- ❌ **Less flexible** - can't easily share state between handlers
- ❌ **No async** - callbacks must be synchronous (or we need async callbacks)
- ❌ **Return value** - harder to get final result

---

## Solution 3: Hybrid Approach (Best of Both Worlds)

### Design

**Support BOTH patterns** - let users choose what they prefer!

```python
# dataline/core/engine.py
class QueryEngine:

    # Pattern 1: Stream events (for full control)
    async def execute_stream(
        self,
        connection: Engine,
        query: str,
        options: Optional[QueryOptions] = None,
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream typed events.

        Use this when you need full control over event handling.

        Example:
            async for event in engine.execute_stream(...):
                match event:
                    case SQLGeneratedEvent(sql=sql):
                        print(sql)
                    case CompleteEvent(result=result):
                        return result
        """
        async for event in self.workflow.run_stream(...):
            yield event

    # Pattern 2: Execute with callbacks (for simple cases)
    async def execute(
        self,
        connection: Engine,
        query: str,
        options: Optional[QueryOptions] = None,
        callbacks: Optional[StreamCallbacks] = None,
    ) -> QueryResult:
        """
        Execute query with optional callbacks.

        Use this when you want simple event handling.

        Example:
            result = await engine.execute(
                ...,
                callbacks=StreamCallbacks(
                    on_sql_generated=lambda e: print(e.sql)
                )
            )
        """
        async for event in self.execute_stream(connection, query, options):
            # Dispatch to callbacks
            if callbacks:
                if isinstance(event, ToolCallEvent) and callbacks.on_tool_call:
                    callbacks.on_tool_call(event)
                elif isinstance(event, SQLGeneratedEvent) and callbacks.on_sql_generated:
                    callbacks.on_sql_generated(event)
                elif isinstance(event, QueryExecutedEvent) and callbacks.on_query_executed:
                    callbacks.on_query_executed(event)
                # ... etc

            # Return final result
            if isinstance(event, CompleteEvent):
                return event.result

        raise RuntimeError("Query stream ended without CompleteEvent")
```

### Usage: Choose Your Style

```python
# Style 1: Full control with streaming (advanced users)
async for event in query_engine.execute_stream(connection=engine, query="..."):
    match event:
        case SQLGeneratedEvent(sql=sql):
            await save_to_audit_log(sql)
        case QueryExecutedEvent(row_count=count):
            await update_metrics(count)
        case CompleteEvent(result=result):
            await cache_result(result)
            return result

# Style 2: Simple callbacks (basic users)
result = await query_engine.execute(
    connection=engine,
    query="...",
    callbacks=StreamCallbacks(
        on_sql_generated=lambda e: print(f"SQL: {e.sql}")
    )
)

# Style 3: No events, just get result (simplest)
result = await query_engine.execute(
    connection=engine,
    query="..."
)
# No events, just returns final result
```

---

## Solution 4: Event Handler Registry (Most Flexible)

### Design

Register handlers dynamically - good for plugins/extensions.

```python
# dataline/core/event_handler.py
from typing import Callable, Dict, List, Type
from dataline.core.events import QueryEvent, StreamEvent

class EventHandler:
    """Registry for event handlers"""

    def __init__(self):
        self._handlers: Dict[Type[QueryEvent], List[Callable]] = {}

    def on(self, event_type: Type[StreamEvent]):
        """Decorator to register handler for event type"""
        def decorator(func: Callable[[event_type], None]):
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            self._handlers[event_type].append(func)
            return func
        return decorator

    def register(self, event_type: Type[StreamEvent], handler: Callable):
        """Register handler for event type"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def dispatch(self, event: StreamEvent):
        """Dispatch event to all registered handlers"""
        event_type = type(event)
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)


# dataline/core/engine.py
class QueryEngine:
    async def execute_with_handler(
        self,
        connection: Engine,
        query: str,
        handler: EventHandler,
        options: Optional[QueryOptions] = None,
    ) -> QueryResult:
        """Execute with event handler"""
        async for event in self.execute_stream(connection, query, options):
            await handler.dispatch(event)

            if isinstance(event, CompleteEvent):
                return event.result
```

### Usage: Decorator Style

```python
handler = EventHandler()

# Register handlers with decorators
@handler.on(SQLGeneratedEvent)
def log_sql(event: SQLGeneratedEvent):
    logger.info(f"Generated SQL: {event.sql}")

@handler.on(QueryExecutedEvent)
async def track_metrics(event: QueryExecutedEvent):
    await metrics.record(
        "query.execution_time",
        event.execution_time_ms
    )

@handler.on(ErrorEvent)
def alert_on_error(event: ErrorEvent):
    if not event.recoverable:
        send_alert(event.message)

# Execute with handler
result = await query_engine.execute_with_handler(
    connection=engine,
    query="Show top customers",
    handler=handler
)
```

**Benefits:**
- ✅ **Most flexible** - can register multiple handlers per event
- ✅ **Good for plugins** - plugins can register their own handlers
- ✅ **Supports async** - handlers can be async or sync
- ✅ **Clean syntax** - decorator style is elegant

---

## Comparison Matrix

| Approach | Type Safety | Ease of Use | Flexibility | Async Support | Best For |
|----------|-------------|-------------|-------------|---------------|----------|
| **Typed Events + Pattern Matching** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Advanced users, full control |
| **Typed Events + isinstance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Python 3.9 compatibility |
| **Callback-Based** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ (needs async version) | Simple use cases |
| **Hybrid (Both)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | **RECOMMENDED** |
| **Event Handler Registry** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Plugin systems |

---

## Recommendation: Hybrid Approach

**Implement Solution 3 (Hybrid)** - support both streaming and callbacks.

### Why?

1. **Typed events** (Solution 1) give us:
   - Full type safety
   - IDE autocomplete
   - Pattern matching support
   - Flexibility

2. **Callbacks** (Solution 2) give us:
   - Simple API for basic cases
   - No if/elif chains
   - Familiar pattern

3. **Both together** let users choose their preferred style:
   - Advanced users use streaming
   - Simple users use callbacks
   - Both are fully typed

### Implementation Plan

```python
# 1. Define typed event classes
dataline/core/events.py
- ToolCallEvent
- SQLGeneratedEvent
- QueryExecutedEvent
- CompleteEvent
- etc.

# 2. Define callback interface
dataline/core/callbacks.py
- StreamCallbacks dataclass
- Optional callback for each event type

# 3. Update QueryEngine
dataline/core/engine.py
- execute_stream() returns AsyncIterator[StreamEvent]
- execute() accepts optional callbacks parameter
- execute() internally uses execute_stream() and dispatches to callbacks

# 4. Update workflow to emit typed events
dataline/core/graph/workflow.py
- Emit typed events instead of generic dicts
```

### Example API

```python
from dataline.core import QueryEngine
from dataline.core.events import *
from dataline.core.callbacks import StreamCallbacks

engine = QueryEngine(llm_api_key="...")

# Style 1: Advanced - full control
async for event in engine.execute_stream(connection=db, query="..."):
    match event:
        case SQLGeneratedEvent(sql=sql):
            audit_log.save(sql)
        case CompleteEvent(result=result):
            return result

# Style 2: Simple - callbacks
result = await engine.execute(
    connection=db,
    query="...",
    callbacks=StreamCallbacks(
        on_sql_generated=lambda e: print(e.sql),
        on_query_executed=lambda e: print(f"{e.row_count} rows")
    )
)

# Style 3: Simplest - no events
result = await engine.execute(connection=db, query="...")
```

---

## Migration from Current Design

### Before (Current)

```python
@dataclass
class QueryEvent:
    type: str
    data: Dict[str, Any]

async for event in engine.execute_stream(...):
    if event.type == "sql_generated":
        print(event.data["sql"])
```

### After (Proposed)

```python
# Old code breaks - this is a breaking change
# But we can provide adapter:

def legacy_event_adapter(typed_event: StreamEvent) -> Dict[str, Any]:
    """Convert typed event to legacy format"""
    if isinstance(typed_event, SQLGeneratedEvent):
        return {"type": "sql_generated", "data": {"sql": typed_event.sql}}
    # ... etc

# Or just require users to update (better!)
async for event in engine.execute_stream(...):
    if isinstance(event, SQLGeneratedEvent):
        print(event.sql)  # Typed!
```

---

## Real-World Examples

### Example 1: Progress Tracking

```python
from dataline.core.events import *

# Track progress with callbacks
class ProgressTracker:
    def __init__(self):
        self.steps_completed = 0
        self.total_steps = 5

    def on_tool_call(self, event: ToolCallEvent):
        self.steps_completed += 1
        print(f"Progress: {self.steps_completed}/{self.total_steps}")

    def on_sql_generated(self, event: SQLGeneratedEvent):
        self.steps_completed += 1
        print(f"Progress: {self.steps_completed}/{self.total_steps}")

tracker = ProgressTracker()
result = await engine.execute(
    connection=db,
    query="...",
    callbacks=tracker  # Can pass object with methods!
)
```

### Example 2: Audit Logging

```python
# Log all SQL to audit trail
class AuditLogger:
    async def on_sql_generated(self, event: SQLGeneratedEvent):
        await audit_db.insert({
            "sql": event.sql,
            "reasoning": event.reasoning,
            "timestamp": event.timestamp,
            "user_id": current_user_id
        })

result = await engine.execute(
    connection=db,
    query="...",
    callbacks=AuditLogger()
)
```

### Example 3: Real-time UI Updates

```python
# Stream to WebSocket
async def stream_to_websocket():
    async for event in engine.execute_stream(connection=db, query="..."):
        match event:
            case SQLGeneratedEvent(sql=sql):
                await websocket.send_json({
                    "type": "sql",
                    "sql": sql
                })
            case QueryExecutedEvent(row_count=count):
                await websocket.send_json({
                    "type": "result",
                    "count": count
                })
            case CompleteEvent(result=result):
                await websocket.send_json({
                    "type": "complete",
                    "data": result.rows
                })
                return
```

---

## Conclusion

**Recommendation: Hybrid Approach with Typed Events**

1. ✅ Define typed event classes (ToolCallEvent, SQLGeneratedEvent, etc.)
2. ✅ Support streaming with `execute_stream() -> AsyncIterator[StreamEvent]`
3. ✅ Support callbacks with `execute(..., callbacks=StreamCallbacks(...))`
4. ✅ Use pattern matching (Python 3.10+) or isinstance (Python 3.9)
5. ✅ Full type safety everywhere

**Benefits:**
- Users choose their preferred style
- Fully typed - no Dict[str, Any]
- IDE autocomplete works
- No long if/elif chains
- Flexible and extensible

**Next Steps:**
1. Define event classes in `dataline/core/events.py`
2. Define callbacks in `dataline/core/callbacks.py`
3. Update QueryEngine to support both patterns
4. Update workflow to emit typed events
5. Write examples for both usage patterns

# Dataline API-First Architecture Proposal

## Executive Summary

This document proposes a comprehensive architectural transformation of Dataline from a monolithic UI-coupled application into an API-first platform following clean architecture principles. The goal is to enable multiple client implementations (Web UI, Go SDK, Python SDK, CLI) while maintaining all current functionality and setting the foundation for enterprise adoption.

## Current State Analysis

### Strengths
- Well-structured service layer with clear separation of concerns
- Repository pattern for data access
- FastAPI with async/await throughout
- Pydantic schemas provide strong API contracts
- LangGraph-based query orchestration is modular

### Limitations
- **Tight coupling**: Frontend directly calls backend endpoints with custom schemas
- **No versioning**: API endpoints lack version namespacing
- **Mixed concerns**: Backend serves both API and SPA assets
- **Custom protocols**: SSE streaming is implementation-specific
- **Auth limitations**: Only HTTP Basic authentication
- **No SDK**: No programmatic access layer for developers
- **Single deployment**: Cannot run API and UI independently

## Proposed Architecture: Clean Architecture with API-First

### 1. Architectural Layers

Following Clean Architecture (Uncle Bob), we organize the system in concentric layers with **dependencies pointing inward**. The Domain layer is the center, and REST is just one of many possible interface adapters.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL LAYER                                   │
│                                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Web UI    │  │  Python SDK │  │   Go SDK    │  │  Mobile App │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                           │
└───────────────────────────────┬───────────────────────────────────────┬─┘
                                │                                         │
┌───────────────────────────────▼─────────────────────────────────────────▼─┐
│                    INTERFACE ADAPTERS LAYER                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   REST API   │  │   GraphQL    │  │     CLI      │  │  gRPC API    │  │
│  │     (v1)     │  │   (Future)   │  │              │  │  (Future)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │                  │          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                    │                                        │
│  ┌──────────────────────────────────▼─────────────────────────────────┐   │
│  │  Presenters/Controllers: Convert interface format ↔ use cases      │   │
│  │  - REST Routers (FastAPI)                                           │   │
│  │  - CLI Commands (Click/Typer)                                       │   │
│  │  - GraphQL Resolvers (Strawberry)                                   │   │
│  └──────────────────────────────────┬─────────────────────────────────┘   │
│                                      │                                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        APPLICATION LAYER                                    │
│                          (USE CASES - This is the CENTER)                   │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ CreateConnection │  │ ExecuteNLQuery   │  │ ListConnections  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ UpdateConnection │  │ ExportToCSV      │  │ RefreshSchema    │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  • Use cases orchestrate domain entities                                    │
│  • Use cases depend ONLY on domain layer                                    │
│  • Use cases are interface-agnostic (don't know about HTTP, CLI, etc.)     │
│                                                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         DOMAIN LAYER (CORE)                                 │
│                    (Pure business logic - zero dependencies)                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │  ENTITIES (Business objects with behavior)                  │            │
│  │  - Connection (validate DSN, test connection, manage schema)│            │
│  │  - Conversation (add messages, maintain context)            │            │
│  │  - QueryResult (validate for charts, export to CSV)         │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │  VALUE OBJECTS (Immutable values)                           │            │
│  │  - ConnectionId, ConversationId, QueryText, ChartConfig     │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │  REPOSITORY INTERFACES (Ports - abstractions only)          │            │
│  │  - ConnectionRepository, ConversationRepository             │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │  DOMAIN SERVICES (Pure business logic)                      │            │
│  │  - LLMService, QueryExecutor, ConnectionValidator           │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                                     │
│                    (Implementations of domain interfaces)                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  Repository Implementations (SQLAlchemy, MongoDB, etc.)       │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  Domain Service Implementations                               │          │
│  │  - LangGraphLLMService (uses LangChain/LangGraph)             │          │
│  │  - SQLAlchemyQueryExecutor                                    │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  External Services                                             │          │
│  │  - Database (PostgreSQL, SQLite)                              │          │
│  │  - OpenAI API                                                 │          │
│  │  - Redis (caching, rate limiting)                             │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

DEPENDENCY RULE: Arrows point INWARD
- Outer layers depend on inner layers
- Inner layers know NOTHING about outer layers
- Domain has ZERO dependencies
- Infrastructure implements domain interfaces
- Interface adapters (REST, CLI, GraphQL) all call same use cases
```

**Key Principle**: REST API is NOT the center. It's just one way to expose the use cases. You could add GraphQL, gRPC, WebSocket, or any other interface without touching the core business logic.

### 2. Why Use Cases are Central, Not REST

**Critical Design Decision**: The application layer (use cases) is the center of the system, NOT the REST API.

#### Benefits of Use-Case-Centric Design

**1. Multiple Interfaces Share Same Logic**

All interfaces call the same use cases:

```python
# Single use case implementation
class ExecuteNaturalLanguageQuery:
    async def execute(self, request):
        # Core business logic here
        # This code is reused by ALL interfaces
        pass

# Interface 1: REST API
@router.post("/api/v1/conversations/{id}/query")
async def query_via_rest(...):
    result = await use_case.execute(request)
    return JSONResponse(result)

# Interface 2: CLI
@cli.command("query")
def query_via_cli(...):
    result = asyncio.run(use_case.execute(request))
    print_table(result)

# Interface 3: GraphQL
@strawberry.mutation
async def query_via_graphql(...):
    result = await use_case.execute(request)
    return to_graphql(result)

# Interface 4: gRPC
async def Query(self, request, context):
    result = await use_case.execute(request)
    return to_proto(result)

# Interface 5: Message Queue
async def handle_query_message(message):
    result = await use_case.execute(request)
    await publish_result(result)
```

**2. Easy to Add New Interfaces**

Want to add GraphQL? Just create a new adapter that calls existing use cases. No changes to business logic.

```python
# Add GraphQL without touching core logic
api/graphql/
├── schema.py          # GraphQL schema definitions
├── resolvers.py       # Call existing use cases
└── server.py          # GraphQL server setup

# GraphQL resolver just translates GraphQL → Use Case → GraphQL
@strawberry.type
class Query:
    @strawberry.field
    async def connections(self, info: Info) -> List[Connection]:
        # Reuse existing use case!
        use_case = info.context.get_list_connections_use_case()
        connections = await use_case.execute()
        return [to_graphql(c) for c in connections]
```

**3. Business Logic is Testable**

Use cases have zero HTTP dependencies, making them easy to test:

```python
# Test use case without HTTP, database, or external services
async def test_execute_query():
    # Mock dependencies (repositories, services)
    mock_repo = AsyncMock()
    mock_llm = AsyncMock()

    # Create use case with mocks
    use_case = ExecuteNaturalLanguageQuery(
        conversation_repo=mock_repo,
        llm_service=mock_llm
    )

    # Test business logic directly
    result = await use_case.execute(request)

    # Assert business rules
    assert result.is_valid()
    assert mock_llm.called_with_correct_params()
```

**4. Interface-Agnostic Business Rules**

Business rules don't depend on HTTP status codes, CLI exit codes, or GraphQL errors:

```python
# ❌ WRONG: Business logic coupled to HTTP
class ConnectionService:
    async def create_connection(self, data):
        if not data.dsn:
            raise HTTPException(400, "DSN required")  # HTTP leaking in!
        # Now can't use this from CLI without HTTPException

# ✅ CORRECT: Business logic independent of interface
class CreateConnection:
    async def execute(self, request):
        if not request.dsn:
            raise InvalidConnectionError("DSN required")  # Domain exception
        # Can be caught and translated by any interface:
        # - REST → HTTP 400
        # - CLI → exit code 1
        # - GraphQL → validation error
```

**5. Framework Independence**

Want to switch from FastAPI to Flask? Or add gRPC? Easy - just change the interface adapter:

```python
# Current: FastAPI adapter
api/rest/fastapi/routers/connections.py

# Add: gRPC adapter (same use cases!)
api/grpc/services/connection_service.py

# Add: Flask adapter (same use cases!)
api/rest/flask/routes/connections.py
```

#### Example: Multiple Interfaces for Same Feature

Here's how "Create Connection" works through different interfaces:

```python
# CORE: Use case (single implementation)
application/use_cases/connection/create_connection.py
class CreateConnection:
    async def execute(self, request: CreateConnectionRequest):
        # Validate, create entity, test, save
        # This code runs for ALL interfaces
        pass

# INTERFACE 1: REST API
api/v1/routers/connections.py
@router.post("/connections")
async def create_via_rest(request: CreateConnectionHTTPRequest):
    use_case = get_create_connection_use_case()
    result = await use_case.execute(request.to_use_case_request())
    return JSONResponse(status_code=201, content=to_json(result))

# INTERFACE 2: CLI
cli/commands/connection.py
@click.command("create-connection")
@click.option("--name")
@click.option("--dsn")
def create_via_cli(name: str, dsn: str):
    use_case = get_create_connection_use_case()
    result = asyncio.run(use_case.execute(
        CreateConnectionRequest(name=name, dsn=dsn)
    ))
    click.echo(f"✓ Created: {result.connection.name}")

# INTERFACE 3: Python SDK (user code)
from dataline import DatalineClient
client = DatalineClient(api_key="...")
connection = client.connections.create(name="DB", dsn="postgresql://...")

# INTERFACE 4: Go SDK (user code)
import "github.com/dataline/dataline-go"
client := dataline.NewClient(apiKey)
conn, _ := client.Connections.Create(ctx, &dataline.CreateConnectionRequest{
    Name: "DB",
    DSN:  "postgresql://...",
})

# INTERFACE 5: GraphQL (future)
mutation {
  createConnection(input: {name: "DB", dsn: "postgresql://..."}) {
    id
    name
  }
}

# All five interfaces call the SAME use case underneath!
```

This architecture ensures that:
- ✅ Business logic is written once, used everywhere
- ✅ New interfaces are easy to add
- ✅ Testing doesn't require HTTP mocking
- ✅ You can switch frameworks without rewriting logic
- ✅ Each interface can have its own authentication, rate limiting, etc.

---

### 3. Domain Layer (Core Business Logic)

The innermost layer contains pure business logic with zero external dependencies.

#### Domain Entities

```python
# domain/entities/connection.py
@dataclass
class Connection:
    """Core connection entity - framework agnostic"""
    id: ConnectionId
    name: str
    dialect: DatabaseDialect
    configuration: ConnectionConfig
    schema_visibility: SchemaVisibility
    created_at: datetime

    def validate_dsn(self) -> ValidationResult:
        """Business rule: DSN must be valid for dialect"""

    def is_accessible(self) -> bool:
        """Business rule: Connection must be testable"""

# domain/entities/conversation.py
@dataclass
class Conversation:
    """Represents a query session"""
    id: ConversationId
    connection_id: ConnectionId
    name: str
    messages: List[Message]
    created_at: datetime

    def add_message(self, message: Message) -> None:
        """Business rule: Messages form a valid conversation"""

    def can_query(self) -> bool:
        """Business rule: Must have valid connection to query"""

# domain/entities/query_result.py
@dataclass
class QueryResult:
    """Query execution result"""
    id: ResultId
    query_text: str
    rows: List[Dict[str, Any]]
    metadata: QueryMetadata
    execution_time_ms: int

    def to_chart(self, chart_type: ChartType) -> Chart:
        """Business rule: Chart generation from data"""
```

#### Value Objects

```python
# domain/value_objects/
- ConnectionId (UUID wrapper)
- ConversationId (UUID wrapper)
- DatabaseDialect (enum with validation)
- QueryText (SQL string with validation)
- ChartConfiguration (immutable chart config)
```

#### Repository Interfaces (Ports)

```python
# domain/repositories/connection_repository.py
class ConnectionRepository(Protocol):
    """Port: Abstract repository interface"""

    async def save(self, connection: Connection) -> None: ...
    async def find_by_id(self, id: ConnectionId) -> Optional[Connection]: ...
    async def find_all(self) -> List[Connection]: ...
    async def delete(self, id: ConnectionId) -> None: ...

# domain/repositories/conversation_repository.py
class ConversationRepository(Protocol):
    async def save(self, conversation: Conversation) -> None: ...
    async def find_by_id(self, id: ConversationId) -> Optional[Conversation]: ...
    async def find_by_connection(self, connection_id: ConnectionId) -> List[Conversation]: ...
```

#### Domain Services

```python
# domain/services/query_executor.py
class QueryExecutor(Protocol):
    """Port: Abstract query execution"""

    async def execute(
        self,
        connection: Connection,
        query: QueryText,
        options: QueryOptions
    ) -> QueryResult: ...

# domain/services/llm_service.py
class LLMService(Protocol):
    """Port: Abstract LLM integration"""

    async def natural_language_to_sql(
        self,
        prompt: str,
        schema_context: SchemaContext,
        options: LLMOptions
    ) -> QueryText: ...

    async def generate_chart(
        self,
        result: QueryResult,
        request: ChartRequest
    ) -> ChartConfiguration: ...
```

### 4. Application Layer (Use Cases)

Orchestrates domain objects to fulfill business requirements.

#### Use Cases

```python
# application/use_cases/query/execute_natural_language_query.py
class ExecuteNaturalLanguageQuery:
    """Use case: Convert NL to SQL and execute"""

    def __init__(
        self,
        conversation_repo: ConversationRepository,
        connection_repo: ConnectionRepository,
        llm_service: LLMService,
        query_executor: QueryExecutor,
        event_bus: EventBus
    ):
        self.conversation_repo = conversation_repo
        self.connection_repo = connection_repo
        self.llm_service = llm_service
        self.query_executor = query_executor
        self.event_bus = event_bus

    async def execute(
        self,
        request: ExecuteNLQueryRequest
    ) -> AsyncIterator[QueryEvent]:
        """
        1. Load conversation and connection
        2. Get schema context
        3. Stream LLM processing
        4. Execute generated SQL
        5. Store results
        6. Emit events
        """
        conversation = await self.conversation_repo.find_by_id(request.conversation_id)
        connection = await self.connection_repo.find_by_id(conversation.connection_id)

        # Business logic orchestration
        schema_context = self._build_schema_context(connection)

        async for event in self.llm_service.natural_language_to_sql(
            prompt=request.query,
            schema_context=schema_context,
            options=request.llm_options
        ):
            yield event

        # Execute SQL
        result = await self.query_executor.execute(
            connection=connection,
            query=event.query,
            options=request.query_options
        )

        # Store and emit
        conversation.add_result(result)
        await self.conversation_repo.save(conversation)

        await self.event_bus.publish(QueryExecutedEvent(result))
        yield QueryCompletedEvent(result)

# application/use_cases/connection/create_connection.py
class CreateConnection:
    def __init__(
        self,
        connection_repo: ConnectionRepository,
        validator: ConnectionValidator
    ):
        self.connection_repo = connection_repo
        self.validator = validator

    async def execute(self, request: CreateConnectionRequest) -> Connection:
        # Validate DSN
        validation = await self.validator.validate(request.dsn, request.dialect)
        if not validation.is_valid:
            raise InvalidConnectionError(validation.errors)

        # Create entity
        connection = Connection(
            id=ConnectionId.generate(),
            name=request.name,
            dialect=request.dialect,
            configuration=ConnectionConfig.from_dsn(request.dsn),
            schema_visibility=SchemaVisibility.all_visible(),
            created_at=datetime.utcnow()
        )

        # Test connection
        if not connection.is_accessible():
            raise ConnectionTestFailedError()

        # Persist
        await self.connection_repo.save(connection)

        return connection

# Other use cases:
- application/use_cases/connection/
  - list_connections.py
  - update_connection.py
  - delete_connection.py
  - test_connection.py
  - refresh_schema.py

- application/use_cases/conversation/
  - create_conversation.py
  - list_conversations.py
  - delete_conversation.py
  - generate_conversation_title.py

- application/use_cases/query/
  - execute_sql_directly.py
  - export_results_to_csv.py
  - refresh_chart_data.py
  - update_query_text.py
```

#### Command/Query Separation (CQRS)

```python
# application/commands/
- CreateConnectionCommand
- UpdateConnectionCommand
- DeleteConnectionCommand
- ExecuteNLQueryCommand

# application/queries/
- GetConnectionQuery
- ListConnectionsQuery
- GetConversationQuery
- ListConversationsQuery

# application/handlers/
- CommandHandler (base class)
- QueryHandler (base class)
```

#### DTOs (Data Transfer Objects)

```python
# application/dto/
- ConnectionDTO
- ConversationDTO
- QueryResultDTO
- MessageDTO

# These are pure data structures for transferring data between layers
# Not to be confused with domain entities
```

### 5. Interface Adapters Layer

Adapts external interfaces to application layer.

#### REST API (FastAPI)

```python
# api/v1/
# Version 1 of the API - immutable once released

# api/v1/routers/connections.py
router = APIRouter(prefix="/api/v1/connections", tags=["connections"])

@router.post("/", response_model=ConnectionResponse, status_code=201)
async def create_connection(
    request: CreateConnectionRequest,
    use_case: CreateConnection = Depends(get_create_connection_use_case)
) -> ConnectionResponse:
    """Create a new database connection"""
    connection = await use_case.execute(request)
    return ConnectionPresenter.to_response(connection)

@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(
    use_case: ListConnections = Depends(get_list_connections_use_case)
) -> List[ConnectionResponse]:
    """List all connections"""
    connections = await use_case.execute()
    return [ConnectionPresenter.to_response(c) for c in connections]

@router.get("/{connection_id}", response_model=ConnectionDetailResponse)
async def get_connection(
    connection_id: UUID,
    use_case: GetConnection = Depends(get_connection_use_case)
) -> ConnectionDetailResponse:
    """Get connection details including schema"""
    connection = await use_case.execute(GetConnectionQuery(connection_id))
    return ConnectionPresenter.to_detail_response(connection)

# api/v1/routers/conversations.py
router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])

@router.post("/{conversation_id}/query", response_model=StreamingQueryResponse)
async def execute_query(
    conversation_id: UUID,
    request: ExecuteNLQueryRequest,
    use_case: ExecuteNaturalLanguageQuery = Depends(...)
):
    """Execute natural language query with streaming"""
    return EventSourceResponse(
        use_case.execute_stream(request)
    )

# api/v1/routers/results.py
# api/v1/routers/settings.py
# api/v1/routers/health.py
```

#### API Response Formats (Standardized)

```python
# api/v1/schemas/responses.py
class APIResponse(BaseModel, Generic[T]):
    """Standard API response envelope"""
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    metadata: Optional[ResponseMetadata] = None

class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    dialect: str
    database: Optional[str]
    created_at: datetime

class ConnectionDetailResponse(ConnectionResponse):
    tables: List[TableSchema]
    schema_visibility: SchemaVisibilityDTO

class QueryResultResponse(BaseModel):
    id: UUID
    query: str
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: int
    columns: List[ColumnInfo]

class StreamEvent(BaseModel):
    """SSE event format"""
    event: str  # "result_added", "message_stored", "error"
    data: Dict[str, Any]
    timestamp: datetime
```

#### Repository Implementations

```python
# infrastructure/persistence/sqlalchemy/
- connection_repository_impl.py
- conversation_repository_impl.py
- result_repository_impl.py

# Maps domain entities to SQLAlchemy models and vice versa
class SQLAlchemyConnectionRepository(ConnectionRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, connection: Connection) -> None:
        model = self._to_model(connection)
        self.session.add(model)
        await self.session.flush()

    async def find_by_id(self, id: ConnectionId) -> Optional[Connection]:
        stmt = select(ConnectionModel).where(ConnectionModel.id == id.value)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    def _to_entity(self, model: ConnectionModel) -> Connection:
        """Map ORM model to domain entity"""

    def _to_model(self, entity: Connection) -> ConnectionModel:
        """Map domain entity to ORM model"""
```

#### LLM Service Implementation

```python
# infrastructure/llm/langgraph_service.py
class LangGraphLLMService(LLMService):
    """Adapter for LangGraph/LangChain to LLMService port"""

    def __init__(self, config: LLMConfig):
        self.graph_service = QueryGraphService(config)

    async def natural_language_to_sql(
        self,
        prompt: str,
        schema_context: SchemaContext,
        options: LLMOptions
    ) -> AsyncIterator[LLMEvent]:
        # Translate domain concepts to LangGraph state
        state = self._build_graph_state(prompt, schema_context, options)

        async for event in self.graph_service.stream(state):
            yield self._translate_event(event)
```

### 6. External Layer

#### SDK Clients

**Python SDK:**
```python
# dataline-sdk-python/dataline/client.py
class DatalineClient:
    """Official Python SDK for Dataline API"""

    def __init__(
        self,
        api_url: str,
        api_key: str,
        timeout: int = 30
    ):
        self.api = APIClient(api_url, api_key, timeout)
        self.connections = ConnectionsAPI(self.api)
        self.conversations = ConversationsAPI(self.api)
        self.queries = QueriesAPI(self.api)

# Usage:
client = DatalineClient(
    api_url="https://api.dataline.app",
    api_key=os.getenv("DATALINE_API_KEY")
)

# Create connection
connection = client.connections.create(
    name="My Database",
    dsn="postgresql://user:pass@localhost/db"
)

# Create conversation
conversation = client.conversations.create(
    connection_id=connection.id,
    name="Analysis Session"
)

# Execute query with streaming
async for event in client.queries.execute_natural_language(
    conversation_id=conversation.id,
    query="Show me top 10 customers by revenue"
):
    if event.type == "result_added":
        print(event.data)
    elif event.type == "completed":
        print(f"Query took {event.execution_time_ms}ms")

# Export to CSV
csv_data = client.queries.export_csv(result_id=result.id)
```

**Go SDK:**
```go
// dataline-sdk-go/dataline/client.go
package dataline

type Client struct {
    apiURL     string
    httpClient *http.Client
    apiKey     string
}

func NewClient(apiURL, apiKey string) *Client {
    return &Client{
        apiURL: apiURL,
        apiKey: apiKey,
        httpClient: &http.Client{Timeout: 30 * time.Second},
    }
}

// Usage:
client := dataline.NewClient(
    "https://api.dataline.app",
    os.Getenv("DATALINE_API_KEY"),
)

// Create connection
connection, err := client.Connections.Create(ctx, &dataline.CreateConnectionRequest{
    Name: "My Database",
    DSN:  "postgresql://user:pass@localhost/db",
})

// Stream query results
stream, err := client.Queries.ExecuteNaturalLanguage(ctx, &dataline.QueryRequest{
    ConversationID: conversation.ID,
    Query:          "Show me top 10 customers by revenue",
})

for stream.Next() {
    event := stream.Event()
    switch event.Type {
    case "result_added":
        fmt.Printf("Result: %+v\n", event.Data)
    case "completed":
        fmt.Printf("Completed in %dms\n", event.ExecutionTimeMS)
    }
}
```

**CLI Tool:**
```bash
# dataline-cli
$ dataline connect create \
    --name "Production DB" \
    --dsn "postgresql://..." \
    --output json

$ dataline conversation create \
    --connection-id abc123 \
    --name "Q1 Analysis"

$ dataline query \
    --conversation-id xyz789 \
    --query "Show revenue trends for last quarter" \
    --stream

$ dataline export csv \
    --result-id result123 \
    --output revenue.csv
```

### 7. Project Structure

```
dataline/
├── domain/                          # Domain Layer (Core)
│   ├── entities/
│   │   ├── connection.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   ├── query_result.py
│   │   └── user.py
│   ├── value_objects/
│   │   ├── connection_id.py
│   │   ├── conversation_id.py
│   │   ├── database_dialect.py
│   │   ├── query_text.py
│   │   └── chart_configuration.py
│   ├── repositories/                # Repository interfaces (ports)
│   │   ├── connection_repository.py
│   │   ├── conversation_repository.py
│   │   └── result_repository.py
│   ├── services/                    # Domain service interfaces (ports)
│   │   ├── llm_service.py
│   │   ├── query_executor.py
│   │   └── schema_inspector.py
│   ├── exceptions/
│   │   ├── domain_exception.py
│   │   ├── connection_errors.py
│   │   └── query_errors.py
│   └── events/
│       ├── connection_created.py
│       ├── query_executed.py
│       └── conversation_updated.py
│
├── application/                     # Application Layer (Use Cases)
│   ├── use_cases/
│   │   ├── connection/
│   │   │   ├── create_connection.py
│   │   │   ├── list_connections.py
│   │   │   ├── update_connection.py
│   │   │   ├── delete_connection.py
│   │   │   ├── test_connection.py
│   │   │   └── refresh_schema.py
│   │   ├── conversation/
│   │   │   ├── create_conversation.py
│   │   │   ├── list_conversations.py
│   │   │   ├── delete_conversation.py
│   │   │   └── generate_title.py
│   │   └── query/
│   │       ├── execute_natural_language_query.py
│   │       ├── execute_sql_directly.py
│   │       ├── export_results_to_csv.py
│   │       ├── refresh_chart_data.py
│   │       └── update_query_text.py
│   ├── dto/                         # Data Transfer Objects
│   │   ├── connection_dto.py
│   │   ├── conversation_dto.py
│   │   ├── query_result_dto.py
│   │   └── message_dto.py
│   ├── commands/                    # CQRS Commands
│   │   ├── create_connection_command.py
│   │   ├── execute_nl_query_command.py
│   │   └── ...
│   ├── queries/                     # CQRS Queries
│   │   ├── get_connection_query.py
│   │   ├── list_connections_query.py
│   │   └── ...
│   └── services/                    # Application services
│       ├── event_bus.py
│       └── validation_service.py
│
├── infrastructure/                  # Infrastructure Layer (Adapters)
│   ├── persistence/
│   │   ├── sqlalchemy/
│   │   │   ├── models.py            # SQLAlchemy ORM models
│   │   │   ├── connection_repository_impl.py
│   │   │   ├── conversation_repository_impl.py
│   │   │   └── unit_of_work.py
│   │   ├── migrations/              # Alembic migrations
│   │   └── database.py
│   ├── llm/
│   │   ├── langgraph_service.py     # LangGraph implementation
│   │   ├── openai_service.py        # Direct OpenAI implementation
│   │   └── query_graph/
│   │       ├── graph.py
│   │       ├── nodes.py
│   │       └── toolkit.py
│   ├── query_execution/
│   │   ├── sqlalchemy_executor.py   # Query executor implementation
│   │   └── schema_inspector_impl.py
│   ├── auth/
│   │   ├── api_key_provider.py
│   │   ├── jwt_provider.py
│   │   └── basic_auth_provider.py
│   └── config/
│       ├── settings.py
│       └── dependency_injection.py
│
├── api/                             # API Interface Adapter
│   ├── v1/
│   │   ├── routers/
│   │   │   ├── connections.py
│   │   │   ├── conversations.py
│   │   │   ├── queries.py
│   │   │   ├── results.py
│   │   │   ├── settings.py
│   │   │   └── health.py
│   │   ├── schemas/
│   │   │   ├── requests.py
│   │   │   ├── responses.py
│   │   │   └── events.py
│   │   ├── dependencies.py          # FastAPI dependencies
│   │   ├── middleware.py
│   │   └── presenters.py            # Convert entities to API responses
│   ├── main.py                      # FastAPI app initialization
│   ├── error_handlers.py
│   └── versioning.py
│
├── sdk/                             # Official SDKs (monorepo)
│   ├── python/
│   │   ├── dataline/
│   │   │   ├── client.py
│   │   │   ├── connections.py
│   │   │   ├── conversations.py
│   │   │   ├── queries.py
│   │   │   ├── models.py
│   │   │   └── exceptions.py
│   │   ├── tests/
│   │   ├── setup.py
│   │   └── README.md
│   ├── go/
│   │   ├── dataline/
│   │   │   ├── client.go
│   │   │   ├── connections.go
│   │   │   ├── conversations.go
│   │   │   ├── queries.go
│   │   │   └── models.go
│   │   ├── go.mod
│   │   └── README.md
│   └── typescript/
│       ├── src/
│       │   ├── client.ts
│       │   ├── connections.ts
│       │   ├── conversations.ts
│       │   └── queries.ts
│       ├── package.json
│       └── README.md
│
├── ui/                              # Web UI Client (separate project)
│   ├── src/
│   │   ├── api/                     # Uses TypeScript SDK
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── package.json
│   └── README.md
│
├── cli/                             # CLI Tool
│   ├── cmd/
│   │   ├── root.go
│   │   ├── connect.go
│   │   ├── conversation.go
│   │   └── query.go
│   ├── main.go
│   └── README.md
│
├── tests/
│   ├── unit/                        # Domain & application tests
│   ├── integration/                 # API integration tests
│   └── e2e/                         # End-to-end tests
│
├── docs/
│   ├── api/                         # OpenAPI specs
│   │   └── openapi.yaml
│   ├── architecture/
│   │   ├── adr/                     # Architecture Decision Records
│   │   └── diagrams/
│   └── guides/
│       ├── getting-started.md
│       ├── sdk-usage.md
│       └── deployment.md
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.ui
│   └── docker-compose.yml
│
├── alembic/                         # Database migrations
├── pyproject.toml
└── README.md
```

### 8. Authentication & Authorization

#### API Key Authentication
```python
# infrastructure/auth/api_key_provider.py
class APIKeyProvider:
    async def validate_api_key(self, key: str) -> Optional[User]:
        # Check key validity and return user

# API usage:
# Header: Authorization: Bearer <api_key>

# Users generate keys in settings:
POST /api/v1/auth/api-keys
{
  "name": "Production Key",
  "scopes": ["connections:read", "queries:execute"]
}

Response:
{
  "api_key": "dl_live_abc123...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Multi-tenant Support (Future)
```python
# domain/entities/organization.py
@dataclass
class Organization:
    id: OrganizationId
    name: str
    members: List[Member]

# Each connection/conversation belongs to an organization
# API keys are scoped to organization
```

### 9. OpenAPI-First Development

```yaml
# docs/api/openapi.yaml
openapi: 3.1.0
info:
  title: Dataline API
  version: 1.0.0
  description: |
    Natural language to SQL API with multi-database support and LLM integration.

    ## Authentication
    Use API keys in Authorization header: `Bearer dl_live_xxx`

    ## Rate Limiting
    - Free tier: 100 requests/hour
    - Pro tier: 10,000 requests/hour

servers:
  - url: https://api.dataline.app/v1
    description: Production
  - url: http://localhost:8000/api/v1
    description: Local development

paths:
  /connections:
    post:
      summary: Create database connection
      tags: [Connections]
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateConnectionRequest'
      responses:
        '201':
          description: Connection created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConnectionResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /conversations/{conversationId}/query:
    post:
      summary: Execute natural language query
      tags: [Queries]
      parameters:
        - name: conversationId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExecuteQueryRequest'
      responses:
        '200':
          description: Query results (streaming)
          content:
            text/event-stream:
              schema:
                $ref: '#/components/schemas/StreamEvent'

components:
  securitySchemes:
    ApiKeyAuth:
      type: http
      scheme: bearer
      bearerFormat: API_KEY

  schemas:
    CreateConnectionRequest:
      type: object
      required: [name, dsn]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
        dsn:
          type: string
          format: uri
          example: "postgresql://user:pass@localhost:5432/mydb"

    ConnectionResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        dialect:
          type: string
          enum: [postgresql, mysql, snowflake, sqlite, mssql]
        created_at:
          type: string
          format: date-time
```

### 10. Migration Strategy

#### Phase 1: Foundation (Weeks 1-2)
1. Create new directory structure following clean architecture
2. Extract domain entities from current models
3. Define repository interfaces (ports)
4. Define use case interfaces
5. Keep current implementation running

#### Phase 2: Application Layer (Weeks 3-4)
1. Implement use cases one by one
2. Start with read-only use cases (ListConnections, GetConversation)
3. Add command use cases (CreateConnection, ExecuteQuery)
4. Write comprehensive unit tests for use cases

#### Phase 3: API v1 (Weeks 5-6)
1. Create `/api/v1/` routers using new use cases
2. Implement presenters to convert domain entities to API responses
3. Keep old routes working in parallel
4. Add API versioning middleware

#### Phase 4: Repository Implementations (Week 7)
1. Implement repository adapters for SQLAlchemy
2. Use mappers to convert between ORM models and domain entities
3. Introduce Unit of Work pattern

#### Phase 5: SDK Development (Weeks 8-10)
1. Generate OpenAPI spec from FastAPI
2. Build Python SDK
3. Build Go SDK
4. Build TypeScript SDK
5. Publish to package repositories

#### Phase 6: UI Refactor (Weeks 11-12)
1. Update UI to use TypeScript SDK instead of direct API calls
2. Remove tight coupling
3. Deploy UI as separate service

#### Phase 7: Documentation & Launch (Week 13)
1. Complete API documentation
2. Write SDK guides
3. Create migration guide for existing users
4. Deprecate old API routes
5. Announce API-first architecture

### 11. Key Benefits

#### For API Users
- **Clean, versioned API**: `/api/v1/` with stability guarantees
- **Multiple SDKs**: Python, Go, TypeScript with idiomatic interfaces
- **OpenAPI spec**: Auto-generated clients in any language
- **Streaming support**: Real-time query execution feedback
- **Comprehensive docs**: Examples, guides, tutorials

#### For Developers
- **Testability**: Domain layer has zero external dependencies
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations (different LLM providers, databases)
- **Evolution**: Can change UI/API without touching business logic
- **Onboarding**: New developers understand structure immediately

#### For Business
- **Multi-channel**: API, Web UI, CLI, SDKs from same core
- **Enterprise-ready**: API keys, rate limiting, multi-tenancy support
- **Monetization**: Usage-based pricing via API
- **Ecosystem**: Third-party integrations and extensions
- **Scalability**: Independent scaling of API and UI

### 12. Example: End-to-End Flow

```python
# Industry team integrating Dataline into their Go application

package main

import (
    "context"
    "fmt"
    "github.com/dataline/dataline-go"
)

func main() {
    // Initialize client
    client := dataline.NewClient(
        "https://api.dataline.app",
        os.Getenv("DATALINE_API_KEY"),
    )

    // Create connection to their production database
    conn, _ := client.Connections.Create(ctx, &dataline.CreateConnectionRequest{
        Name: "Production Postgres",
        DSN:  os.Getenv("DATABASE_URL"),
    })

    // Create conversation
    conv, _ := client.Conversations.Create(ctx, &dataline.CreateConversationRequest{
        ConnectionID: conn.ID,
        Name:         "Weekly Revenue Report",
    })

    // Execute natural language query
    stream, _ := client.Queries.ExecuteNaturalLanguage(ctx, &dataline.QueryRequest{
        ConversationID: conv.ID,
        Query:          "Show me revenue by product category for last 7 days",
        LLMOptions: &dataline.LLMOptions{
            Model:      "gpt-4",
            SecureData: true, // Don't send actual data to LLM
        },
    })

    // Process streaming results
    for stream.Next() {
        event := stream.Event()

        switch event.Type {
        case "result_added":
            result := event.Data.(dataline.QueryResult)
            fmt.Printf("Query: %s\n", result.Query)
            fmt.Printf("Rows: %d\n", result.RowCount)

            // Use the data in their application
            for _, row := range result.Rows {
                processRevenue(row["category"], row["revenue"])
            }

        case "error":
            log.Printf("Query error: %v", event.Data)
        }
    }

    // Export to CSV for reporting
    csv, _ := client.Queries.ExportCSV(ctx, result.ID)
    os.WriteFile("weekly_report.csv", csv, 0644)
}
```

This team:
- Never touched the Dataline UI
- Integrated natural language querying into their code
- Used their preferred language (Go)
- Maintained full control over their data
- Got enterprise-grade query generation with any LLM

### 13. Comparison: Before vs After

| Aspect | Current (UI-Coupled) | Proposed (API-First) |
|--------|---------------------|----------------------|
| **Architecture** | Monolithic with mixed concerns | Clean Architecture with layers |
| **API** | Unversioned, UI-specific endpoints | Versioned, documented REST API |
| **Clients** | Web UI only | Web UI, Python SDK, Go SDK, CLI |
| **Business Logic** | Spread across services/API | Centralized in use cases |
| **Testing** | Coupled to FastAPI/SQLAlchemy | Domain tests with zero dependencies |
| **Auth** | HTTP Basic only | API keys, JWT, multi-tenant ready |
| **Integration** | Manual API calls with undocumented endpoints | Official SDKs with types |
| **Documentation** | Minimal | OpenAPI spec, guides, examples |
| **Deployment** | Single service | Independent API/UI services |
| **Extensibility** | Requires modifying core | Plugin architecture via interfaces |

### 14. Open Questions for Discussion

1. **Migration timeline**: Should we aim for big-bang or gradual migration?
2. **Backward compatibility**: How long should we support old API routes?
3. **Multi-tenancy**: Implement now or defer to Phase 2?
4. **Licensing**: Open-source core with enterprise features?
5. **SDK languages**: Start with Python/Go/TypeScript or add more?
6. **Deployment**: Docker-only or support other platforms?
7. **Database**: Continue with SQLite default or require PostgreSQL?

### 15. Success Metrics

- **API adoption**: 100+ external integrations within 6 months
- **SDK downloads**: 1,000+ monthly downloads per SDK
- **API stability**: 99.9% uptime SLA
- **Documentation**: <5 minute time-to-first-query
- **Performance**: <2s p95 query latency
- **Developer experience**: 4.5+ star rating on GitHub

---

## Conclusion

This architectural transformation positions Dataline as an **API-first natural language query platform** that industry teams can integrate into their existing workflows. By following clean architecture principles, we ensure:

- **Separation of concerns** across layers
- **Independence** from frameworks and UI
- **Testability** of business logic
- **Flexibility** to support multiple clients
- **Scalability** for enterprise adoption

The migration can be done incrementally while maintaining current functionality, minimizing risk and allowing continuous delivery of value.

**Next Steps:**
1. Review and approve architecture proposal
2. Create detailed implementation plan
3. Set up new project structure
4. Begin Phase 1 implementation
5. Establish API governance process

# Why Use Cases Are Central, Not REST

## The Key Architectural Question

**Question**: Should REST be the central layer, or should it be just one of the interfaces?

**Answer**: REST should be **just one interface**. The **use cases (application layer) are the center**.

## Visual Comparison

### ❌ WRONG: REST-Centric Architecture

```
┌─────────────────────────────────────────────────┐
│                                                  │
│            REST API (CENTER)                     │
│                                                  │
│  POST /connections                               │
│  GET /connections                                │
│  POST /query                                     │
│                                                  │
│  Business logic mixed in route handlers          │
│                                                  │
└────────┬──────────────────────────┬──────────────┘
         │                          │
    ┌────▼────┐              ┌──────▼──────┐
    │ React   │              │  Database   │
    │ UI      │              │             │
    └─────────┘              └─────────────┘

Problems:
• Want to add CLI? Have to duplicate business logic
• Want to add GraphQL? Have to duplicate business logic
• Business logic tied to HTTP (status codes, headers)
• Can't test without HTTP mocking
• Hard to swap frameworks (FastAPI → Flask)
```

### ✅ CORRECT: Use-Case-Centric Architecture

```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│          USE CASES (CENTER)                                 │
│                                                             │
│  CreateConnection                                           │
│  ExecuteNaturalLanguageQuery                                │
│  ListConnections                                            │
│                                                             │
│  Pure business logic - no HTTP, no CLI, no GraphQL          │
│                                                             │
└─────┬──────────────┬──────────────┬──────────────┬─────────┘
      │              │              │              │
┌─────▼────┐  ┌──────▼─────┐ ┌─────▼────┐  ┌─────▼────┐
│  REST    │  │   GraphQL  │ │   CLI    │  │   gRPC   │
│  API     │  │            │ │          │  │          │
└─────┬────┘  └──────┬─────┘ └─────┬────┘  └─────┬────┘
      │              │              │              │
┌─────▼────┐  ┌──────▼─────┐ ┌─────▼────┐  ┌─────▼────┐
│ React UI │  │ Mobile App │ │ Scripts  │  │ Services │
└──────────┘  └────────────┘ └──────────┘  └──────────┘

Benefits:
✅ One business logic implementation used by all interfaces
✅ Easy to add new interfaces (just add adapter)
✅ Business logic is framework-independent
✅ Easy to test (no HTTP mocking needed)
✅ Can swap frameworks without touching business logic
```

## Concrete Example: Creating a Connection

### ❌ WRONG: Business Logic in REST Handler

```python
# api/routers/connections.py
@router.post("/api/connections")
async def create_connection(request: CreateConnectionRequest):
    """All business logic here - coupled to HTTP"""

    # Validation - coupled to HTTP
    if not request.dsn:
        raise HTTPException(400, "DSN required")

    # Business logic - mixed with HTTP
    if not validate_dsn_format(request.dsn):
        raise HTTPException(400, "Invalid DSN")

    # Testing connection
    try:
        test_result = test_connection(request.dsn)
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {e}")

    # Saving
    connection = Connection(
        id=uuid.uuid4(),
        name=request.name,
        dsn=request.dsn
    )
    await db.add(connection)

    return JSONResponse(status_code=201, content={
        "id": str(connection.id),
        "name": connection.name
    })
```

**Now you want to add CLI:**

```python
# cli/commands/connection.py
@click.command()
def create_connection(name: str, dsn: str):
    """Have to duplicate ALL the business logic!"""

    # Duplicate validation
    if not dsn:
        click.echo("Error: DSN required", err=True)
        sys.exit(1)

    # Duplicate business logic
    if not validate_dsn_format(dsn):
        click.echo("Error: Invalid DSN", err=True)
        sys.exit(1)

    # Duplicate testing
    try:
        test_result = test_connection(dsn)
    except Exception as e:
        click.echo(f"Error: Connection failed: {e}", err=True)
        sys.exit(1)

    # Duplicate saving
    connection = Connection(id=uuid.uuid4(), name=name, dsn=dsn)
    db.add(connection)

    click.echo(f"Created: {connection.name}")
```

**Problems:**
- 🔴 Business logic duplicated in two places
- 🔴 Hard to keep them in sync
- 🔴 Bugs must be fixed in multiple places
- 🔴 Can't test business logic without HTTP or CLI

---

### ✅ CORRECT: Business Logic in Use Case

```python
# application/use_cases/connection/create_connection.py
class CreateConnection:
    """Use case - pure business logic, interface-agnostic"""

    def __init__(
        self,
        connection_repo: ConnectionRepository,
        validator: ConnectionValidator
    ):
        self.connection_repo = connection_repo
        self.validator = validator

    async def execute(
        self,
        request: CreateConnectionRequest
    ) -> CreateConnectionResponse:
        """
        Business logic - no HTTP, no CLI, no framework dependencies!
        """

        # Validation - domain exception, not HTTP exception
        if not request.dsn:
            raise InvalidConnectionError("DSN is required")

        # Business validation
        validation = await self.validator.validate_dsn(request.dsn)
        if not validation.is_valid:
            raise InvalidConnectionError(validation.error_message)

        # Test connection
        test_result = await self.validator.test_connection(request.dsn)
        if not test_result.success:
            raise ConnectionTestFailedError(test_result.error_message)

        # Create entity
        connection = Connection(
            id=ConnectionId.generate(),
            name=request.name,
            dsn=request.dsn
        )

        # Save
        await self.connection_repo.save(connection)

        return CreateConnectionResponse(
            connection=ConnectionDTO.from_entity(connection),
            test_result=test_result
        )
```

**REST Interface (just translates HTTP → Use Case → HTTP):**

```python
# api/v1/routers/connections.py
@router.post("/api/v1/connections")
async def create_connection_via_rest(
    request: CreateConnectionHTTPRequest,
    use_case: CreateConnection = Depends(get_create_connection_use_case)
):
    """REST adapter - just converts formats, calls use case"""

    try:
        result = await use_case.execute(
            CreateConnectionRequest(
                name=request.name,
                dsn=request.dsn
            )
        )
        return JSONResponse(
            status_code=201,
            content=ConnectionPresenter.to_json(result.connection)
        )

    except InvalidConnectionError as e:
        raise HTTPException(400, str(e))
    except ConnectionTestFailedError as e:
        raise HTTPException(400, str(e))
```

**CLI Interface (just translates CLI args → Use Case → terminal output):**

```python
# cli/commands/connection.py
@click.command("create-connection")
@click.option("--name", required=True)
@click.option("--dsn", required=True)
def create_connection_via_cli(name: str, dsn: str):
    """CLI adapter - just converts formats, calls use case"""

    use_case = get_create_connection_use_case()

    try:
        result = asyncio.run(use_case.execute(
            CreateConnectionRequest(name=name, dsn=dsn)
        ))
        click.echo(f"✓ Created connection: {result.connection.name}")
        click.echo(f"  ID: {result.connection.id}")

    except InvalidConnectionError as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)
    except ConnectionTestFailedError as e:
        click.echo(f"Connection test failed: {e}", err=True)
        sys.exit(1)
```

**GraphQL Interface (translates GraphQL → Use Case → GraphQL):**

```python
# api/graphql/mutations/connection.py
@strawberry.mutation
async def create_connection(
    info: Info,
    input: CreateConnectionInput
) -> CreateConnectionResult:
    """GraphQL adapter - just converts formats, calls use case"""

    use_case = info.context.get_create_connection_use_case()

    try:
        result = await use_case.execute(
            CreateConnectionRequest(
                name=input.name,
                dsn=input.dsn
            )
        )
        return CreateConnectionResult(
            connection=ConnectionType.from_dto(result.connection)
        )

    except InvalidConnectionError as e:
        return CreateConnectionResult(
            error=ValidationError(message=str(e))
        )
```

**Benefits:**
- ✅ Business logic written once in `CreateConnection` use case
- ✅ REST, CLI, GraphQL all reuse the same logic
- ✅ Easy to add new interfaces (just add adapter)
- ✅ Business logic tested without HTTP/CLI mocking
- ✅ Can change validation rules in one place

---

## Testing Comparison

### ❌ WRONG: Testing Business Logic Through HTTP

```python
# Have to use HTTP client to test business logic
async def test_create_connection():
    client = TestClient(app)

    response = await client.post("/api/connections", json={
        "name": "Test",
        "dsn": "invalid"
    })

    assert response.status_code == 400
    # Testing business validation through HTTP layer!
```

**Problems:**
- Need to mock HTTP client
- Need to start server
- Slow tests
- Testing framework (FastAPI) instead of business logic

### ✅ CORRECT: Testing Business Logic Directly

```python
# Test use case directly - no HTTP needed
async def test_create_connection_with_invalid_dsn():
    # Mock only what's needed
    mock_repo = AsyncMock()
    mock_validator = AsyncMock()
    mock_validator.validate_dsn.return_value = ValidationResult(
        is_valid=False,
        error_message="Invalid DSN format"
    )

    # Create use case with mocks
    use_case = CreateConnection(
        connection_repo=mock_repo,
        validator=mock_validator
    )

    # Test business logic directly
    with pytest.raises(InvalidConnectionError, match="Invalid DSN"):
        await use_case.execute(
            CreateConnectionRequest(name="Test", dsn="invalid")
        )

    # Verify behavior
    assert not mock_repo.save.called  # Should not save invalid connection
```

**Benefits:**
- ✅ Fast - no HTTP server needed
- ✅ Tests business rules directly
- ✅ Easy to mock dependencies
- ✅ Tests logic, not framework

---

## Adding New Interfaces

### Example: Adding WebSocket Interface

With use-case-centric architecture, adding WebSocket is trivial:

```python
# api/websocket/query.py
@router.websocket("/ws/query")
async def query_via_websocket(websocket: WebSocket):
    """WebSocket adapter - just converts formats, calls use case"""

    await websocket.accept()

    # Receive query from WebSocket
    data = await websocket.receive_json()

    # Call use case (same one used by REST/CLI/GraphQL!)
    use_case = get_execute_nl_query_use_case()

    # Stream results over WebSocket
    async for event in use_case.execute_stream(
        ExecuteNLQueryRequest(
            conversation_id=data["conversation_id"],
            query=data["query"]
        )
    ):
        # Convert use case event to WebSocket message
        await websocket.send_json({
            "type": event.type,
            "data": event.data
        })
```

**No changes to business logic needed!** Just added a new adapter.

---

## Summary: Why Use Cases Are Central

| Aspect | REST-Centric | Use-Case-Centric |
|--------|--------------|------------------|
| **Business Logic** | In HTTP handlers | In use cases |
| **Multiple Interfaces** | Duplicate logic | Reuse logic |
| **Testing** | Through HTTP | Direct unit tests |
| **Adding Interface** | Rewrite logic | Add adapter |
| **Framework Change** | Rewrite everything | Change adapters only |
| **Domain Knowledge** | Mixed with HTTP | Pure, framework-free |

## Conclusion

**REST is a delivery mechanism, not the core of your application.**

Your core is the **business logic** (domain + use cases):
- Creating connections
- Executing natural language queries
- Managing conversations
- Exporting results

REST is just **one way** to expose that logic. CLI is another. GraphQL is another. gRPC is another.

By putting use cases at the center:
1. ✅ Write business logic once
2. ✅ Expose through multiple interfaces
3. ✅ Test easily without frameworks
4. ✅ Change interfaces without touching core
5. ✅ Add new interfaces without duplicating code

**This is the essence of clean architecture.**

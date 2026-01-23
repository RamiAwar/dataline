# Architecture Code Examples: Current vs Proposed

This document provides concrete code examples comparing the current implementation with the proposed API-first clean architecture.

## Table of Contents
1. [Domain Layer: Connection Entity](#1-domain-layer-connection-entity)
2. [Application Layer: Use Case](#2-application-layer-use-case)
3. [Infrastructure: Repository Implementation](#3-infrastructure-repository-implementation)
4. [API Layer: REST Endpoint](#4-api-layer-rest-endpoint)
5. [Client Usage: SDK vs Direct API](#5-client-usage-sdk-vs-direct-api)

---

## 1. Domain Layer: Connection Entity

### Current (SQLAlchemy Model)

```python
# backend/dataline/models/connection/model.py
from sqlalchemy import Column, String, JSON
from dataline.models.base import Base

class Connection(Base):
    """SQLAlchemy model - tightly coupled to database"""
    __tablename__ = "connections"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    dsn = Column(String, nullable=False)
    dialect = Column(String)
    database = Column(String)
    options = Column(JSON)
    schema_visibility = Column(JSON)
    is_sample = Column(Boolean, default=False)

    # Relationships
    conversations = relationship("Conversation", back_populates="connection")

    # No business logic here - scattered in services
```

**Issues:**
- Business logic in service layer, far from data
- Can't test without database
- Coupled to SQLAlchemy
- No domain validation

### Proposed (Domain Entity)

```python
# domain/entities/connection.py
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime
from domain.value_objects.connection_id import ConnectionId
from domain.value_objects.database_dialect import DatabaseDialect
from domain.exceptions import InvalidConnectionError

@dataclass
class Connection:
    """
    Pure domain entity - no framework dependencies.
    Contains business rules and validation.
    """
    id: ConnectionId
    name: str
    dialect: DatabaseDialect
    configuration: ConnectionConfiguration
    schema_visibility: SchemaVisibility
    created_at: datetime
    is_sample: bool = False

    def __post_init__(self):
        """Validate entity invariants"""
        self.validate()

    def validate(self) -> None:
        """
        Business Rule: Connection must have valid configuration
        """
        if not self.name or len(self.name.strip()) == 0:
            raise InvalidConnectionError("Connection name cannot be empty")

        if not self.configuration.is_valid():
            raise InvalidConnectionError(
                f"Invalid configuration for dialect {self.dialect.value}"
            )

    def test_connection(self) -> ConnectionTestResult:
        """
        Business Rule: Connection must be testable
        Returns whether connection can be established
        """
        # Business logic here - actual testing delegated to infrastructure
        return ConnectionTestResult(
            can_connect=True,
            error_message=None
        )

    def hide_schema(self, schema_name: str) -> None:
        """
        Business Rule: Users can control schema visibility
        """
        self.schema_visibility.hide_schema(schema_name)

    def hide_table(self, schema_name: str, table_name: str) -> None:
        """
        Business Rule: Users can control table visibility
        """
        self.schema_visibility.hide_table(schema_name, table_name)

    def can_execute_queries(self) -> bool:
        """
        Business Rule: Connection must be valid to execute queries
        """
        return self.configuration.is_valid() and not self.is_sample

    def __eq__(self, other: object) -> bool:
        """Entity equality based on ID"""
        if not isinstance(other, Connection):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

# domain/value_objects/connection_configuration.py
@dataclass(frozen=True)
class ConnectionConfiguration:
    """Immutable value object for connection config"""
    dsn: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)

    def is_valid(self) -> bool:
        """Validate DSN format for different dialects"""
        return self.dsn and len(self.dsn) > 0

    @staticmethod
    def from_dsn(dsn: str, dialect: DatabaseDialect) -> "ConnectionConfiguration":
        """Factory method to parse DSN"""
        # Parse DSN and extract components
        parsed = parse_dsn(dsn)
        return ConnectionConfiguration(
            dsn=dsn,
            host=parsed.get("host"),
            port=parsed.get("port"),
            database=parsed.get("database"),
            username=parsed.get("username"),
            options=parsed.get("options", {})
        )

# domain/value_objects/schema_visibility.py
@dataclass
class SchemaVisibility:
    """Value object for schema/table visibility rules"""
    hidden_schemas: set[str] = field(default_factory=set)
    hidden_tables: dict[str, set[str]] = field(default_factory=dict)

    def hide_schema(self, schema_name: str) -> None:
        self.hidden_schemas.add(schema_name)

    def show_schema(self, schema_name: str) -> None:
        self.hidden_schemas.discard(schema_name)

    def hide_table(self, schema_name: str, table_name: str) -> None:
        if schema_name not in self.hidden_tables:
            self.hidden_tables[schema_name] = set()
        self.hidden_tables[schema_name].add(table_name)

    def is_schema_visible(self, schema_name: str) -> bool:
        return schema_name not in self.hidden_schemas

    def is_table_visible(self, schema_name: str, table_name: str) -> bool:
        return (
            schema_name not in self.hidden_schemas
            and table_name not in self.hidden_tables.get(schema_name, set())
        )

    @staticmethod
    def all_visible() -> "SchemaVisibility":
        """Factory for default visibility"""
        return SchemaVisibility()
```

**Benefits:**
- ✅ Pure Python dataclass - no dependencies
- ✅ Business rules in entity methods
- ✅ 100% testable without database
- ✅ Immutable value objects
- ✅ Clear validation rules

---

## 2. Application Layer: Use Case

### Current (Service Layer)

```python
# backend/dataline/services/connection.py
from dataline.repositories.connection import ConnectionRepository
from dataline.models.connection.schema import ConnectionCreate

class ConnectionService:
    """Current service - mixes application and domain logic"""

    def __init__(self, connection_repo: ConnectionRepository):
        self.connection_repo = connection_repo

    async def create_connection(
        self,
        connection_create: ConnectionCreate
    ) -> Connection:
        """Create connection - logic is procedural"""

        # Validation scattered here
        if not connection_create.dsn:
            raise ValueError("DSN is required")

        # Test connection
        try:
            test_connection(connection_create.dsn)
        except Exception as e:
            raise ValueError(f"Connection test failed: {e}")

        # Create model directly
        connection = Connection(
            id=str(uuid.uuid4()),
            name=connection_create.name,
            dsn=connection_create.dsn,
            dialect=connection_create.dialect,
            # ... more fields
        )

        # Save using repository
        await self.connection_repo.add(connection)

        return connection
```

**Issues:**
- Validation logic mixed with orchestration
- Direct model creation
- No clear use case boundary
- Hard to test independently

### Proposed (Use Case)

```python
# application/use_cases/connection/create_connection.py
from dataclasses import dataclass
from typing import Protocol
from domain.entities.connection import Connection
from domain.value_objects.connection_id import ConnectionId
from domain.value_objects.database_dialect import DatabaseDialect
from domain.repositories.connection_repository import ConnectionRepository
from domain.services.connection_validator import ConnectionValidator
from application.dto.connection_dto import ConnectionDTO
from datetime import datetime

@dataclass
class CreateConnectionRequest:
    """Use case input - clear contract"""
    name: str
    dsn: str
    dialect: str
    options: dict = None

@dataclass
class CreateConnectionResponse:
    """Use case output - clear contract"""
    connection: ConnectionDTO
    test_result: ConnectionTestResult

class CreateConnection:
    """
    Use Case: Create a new database connection

    Business Rules:
    1. Connection must have unique name
    2. DSN must be valid for the dialect
    3. Connection must be testable before saving
    4. Schema should be inspected after creation
    """

    def __init__(
        self,
        connection_repository: ConnectionRepository,
        connection_validator: ConnectionValidator,
        schema_inspector: SchemaInspector,
        event_bus: EventBus
    ):
        """Dependencies injected - easy to test with mocks"""
        self.connection_repository = connection_repository
        self.connection_validator = connection_validator
        self.schema_inspector = schema_inspector
        self.event_bus = event_bus

    async def execute(
        self,
        request: CreateConnectionRequest
    ) -> CreateConnectionResponse:
        """
        Execute the use case with clear steps
        """
        # Step 1: Validate input
        dialect = DatabaseDialect.from_string(request.dialect)

        # Step 2: Validate DSN for dialect
        validation = await self.connection_validator.validate_dsn(
            dsn=request.dsn,
            dialect=dialect
        )
        if not validation.is_valid:
            raise InvalidConnectionError(validation.error_message)

        # Step 3: Create domain entity
        configuration = ConnectionConfiguration.from_dsn(
            dsn=request.dsn,
            dialect=dialect
        )

        connection = Connection(
            id=ConnectionId.generate(),
            name=request.name,
            dialect=dialect,
            configuration=configuration,
            schema_visibility=SchemaVisibility.all_visible(),
            created_at=datetime.utcnow(),
            is_sample=False
        )

        # Step 4: Test connection (business rule)
        test_result = await self.connection_validator.test_connection(connection)
        if not test_result.success:
            raise ConnectionTestFailedError(test_result.error_message)

        # Step 5: Inspect schema
        schema = await self.schema_inspector.inspect(connection)
        connection.schema = schema  # or store separately

        # Step 6: Persist
        await self.connection_repository.save(connection)

        # Step 7: Emit domain event
        await self.event_bus.publish(
            ConnectionCreatedEvent(
                connection_id=connection.id,
                created_at=datetime.utcnow()
            )
        )

        # Step 8: Return DTO
        return CreateConnectionResponse(
            connection=ConnectionDTO.from_entity(connection),
            test_result=test_result
        )

# application/dto/connection_dto.py
@dataclass
class ConnectionDTO:
    """Data Transfer Object - for crossing layer boundaries"""
    id: str
    name: str
    dialect: str
    database: Optional[str]
    created_at: str
    is_sample: bool

    @staticmethod
    def from_entity(entity: Connection) -> "ConnectionDTO":
        """Convert domain entity to DTO"""
        return ConnectionDTO(
            id=str(entity.id.value),
            name=entity.name,
            dialect=entity.dialect.value,
            database=entity.configuration.database,
            created_at=entity.created_at.isoformat(),
            is_sample=entity.is_sample
        )
```

**Benefits:**
- ✅ Clear use case boundary with request/response
- ✅ Business rules explicitly documented
- ✅ Dependencies injected - easy to mock for tests
- ✅ Domain events for side effects
- ✅ DTO for layer boundary crossing
- ✅ Step-by-step orchestration logic

### Testing the Use Case

```python
# tests/unit/application/use_cases/test_create_connection.py
import pytest
from unittest.mock import AsyncMock, Mock
from application.use_cases.connection.create_connection import (
    CreateConnection,
    CreateConnectionRequest
)

@pytest.mark.asyncio
async def test_create_connection_success():
    """Test successful connection creation"""

    # Arrange - mock dependencies
    mock_repo = AsyncMock()
    mock_validator = AsyncMock()
    mock_validator.validate_dsn.return_value = ValidationResult(is_valid=True)
    mock_validator.test_connection.return_value = ConnectionTestResult(success=True)

    mock_inspector = AsyncMock()
    mock_inspector.inspect.return_value = Schema(tables=[])

    mock_event_bus = AsyncMock()

    use_case = CreateConnection(
        connection_repository=mock_repo,
        connection_validator=mock_validator,
        schema_inspector=mock_inspector,
        event_bus=mock_event_bus
    )

    request = CreateConnectionRequest(
        name="Test Connection",
        dsn="postgresql://localhost/test",
        dialect="postgresql"
    )

    # Act
    response = await use_case.execute(request)

    # Assert
    assert response.connection.name == "Test Connection"
    assert response.connection.dialect == "postgresql"
    assert response.test_result.success is True

    # Verify interactions
    mock_repo.save.assert_called_once()
    mock_event_bus.publish.assert_called_once()

@pytest.mark.asyncio
async def test_create_connection_invalid_dsn():
    """Test connection creation with invalid DSN"""

    # Arrange
    mock_validator = AsyncMock()
    mock_validator.validate_dsn.return_value = ValidationResult(
        is_valid=False,
        error_message="Invalid DSN format"
    )

    use_case = CreateConnection(
        connection_repository=AsyncMock(),
        connection_validator=mock_validator,
        schema_inspector=AsyncMock(),
        event_bus=AsyncMock()
    )

    # Act & Assert
    with pytest.raises(InvalidConnectionError, match="Invalid DSN format"):
        await use_case.execute(CreateConnectionRequest(
            name="Test",
            dsn="invalid",
            dialect="postgresql"
        ))
```

---

## 3. Infrastructure: Repository Implementation

### Current

```python
# backend/dataline/repositories/connection.py
from dataline.repositories.base import BaseRepository
from dataline.models.connection.model import Connection

class ConnectionRepository(BaseRepository[Connection]):
    """Current repository - directly uses SQLAlchemy models"""

    async def get_by_id(self, id: str) -> Optional[Connection]:
        """Returns SQLAlchemy model directly"""
        stmt = select(Connection).where(Connection.id == id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[Connection]:
        stmt = select(Connection)
        result = await self.session.execute(stmt)
        return result.scalars().all()
```

**Issues:**
- Returns ORM models directly
- No separation between persistence and domain
- Can't swap implementations easily

### Proposed

```python
# infrastructure/persistence/sqlalchemy/connection_repository_impl.py
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from domain.entities.connection import Connection
from domain.value_objects.connection_id import ConnectionId
from domain.repositories.connection_repository import ConnectionRepository
from infrastructure.persistence.sqlalchemy.models import ConnectionModel
from infrastructure.persistence.sqlalchemy.mappers.connection_mapper import ConnectionMapper

class SQLAlchemyConnectionRepository(ConnectionRepository):
    """
    Adapter: Implements domain repository interface using SQLAlchemy
    Maps between domain entities and ORM models
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.mapper = ConnectionMapper()

    async def save(self, connection: Connection) -> None:
        """
        Persist domain entity
        Maps entity -> model -> database
        """
        model = self.mapper.to_model(connection)
        self.session.add(model)
        await self.session.flush()

    async def find_by_id(
        self,
        connection_id: ConnectionId
    ) -> Optional[Connection]:
        """
        Retrieve domain entity by ID
        Maps database -> model -> entity
        """
        stmt = select(ConnectionModel).where(
            ConnectionModel.id == str(connection_id.value)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model is None:
            return None

        return self.mapper.to_entity(model)

    async def find_all(self) -> List[Connection]:
        """Retrieve all connections as domain entities"""
        stmt = select(ConnectionModel).order_by(ConnectionModel.created_at.desc())
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self.mapper.to_entity(model) for model in models]

    async def delete(self, connection_id: ConnectionId) -> None:
        """Delete connection"""
        stmt = select(ConnectionModel).where(
            ConnectionModel.id == str(connection_id.value)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            await self.session.delete(model)
            await self.session.flush()

    async def exists(self, connection_id: ConnectionId) -> bool:
        """Check if connection exists"""
        stmt = select(ConnectionModel.id).where(
            ConnectionModel.id == str(connection_id.value)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

# infrastructure/persistence/sqlalchemy/models.py
from sqlalchemy import Column, String, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from infrastructure.persistence.sqlalchemy.base import Base

class ConnectionModel(Base):
    """
    SQLAlchemy model - persistence concern only
    Separated from domain entity
    """
    __tablename__ = "connections"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    dsn = Column(String, nullable=False)
    dialect = Column(String, nullable=False)
    database = Column(String)
    host = Column(String)
    port = Column(Integer)
    username = Column(String)
    options = Column(JSON, default=dict)
    schema_visibility_json = Column("schema_visibility", JSON, default=dict)
    is_sample = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False)

    # Relationships (persistence concern)
    conversations = relationship("ConversationModel", back_populates="connection")

# infrastructure/persistence/sqlalchemy/mappers/connection_mapper.py
class ConnectionMapper:
    """
    Mapper: Translates between domain entities and ORM models
    Handles serialization/deserialization
    """

    def to_entity(self, model: ConnectionModel) -> Connection:
        """Map ORM model to domain entity"""
        return Connection(
            id=ConnectionId(UUID(model.id)),
            name=model.name,
            dialect=DatabaseDialect.from_string(model.dialect),
            configuration=ConnectionConfiguration(
                dsn=model.dsn,
                host=model.host,
                port=model.port,
                database=model.database,
                username=model.username,
                options=model.options or {}
            ),
            schema_visibility=self._deserialize_schema_visibility(
                model.schema_visibility_json
            ),
            created_at=model.created_at,
            is_sample=model.is_sample
        )

    def to_model(self, entity: Connection) -> ConnectionModel:
        """Map domain entity to ORM model"""
        return ConnectionModel(
            id=str(entity.id.value),
            name=entity.name,
            dialect=entity.dialect.value,
            dsn=entity.configuration.dsn,
            host=entity.configuration.host,
            port=entity.configuration.port,
            database=entity.configuration.database,
            username=entity.configuration.username,
            options=entity.configuration.options,
            schema_visibility_json=self._serialize_schema_visibility(
                entity.schema_visibility
            ),
            is_sample=entity.is_sample,
            created_at=entity.created_at
        )

    def _serialize_schema_visibility(
        self,
        visibility: SchemaVisibility
    ) -> dict:
        """Convert value object to JSON"""
        return {
            "hidden_schemas": list(visibility.hidden_schemas),
            "hidden_tables": {
                schema: list(tables)
                for schema, tables in visibility.hidden_tables.items()
            }
        }

    def _deserialize_schema_visibility(
        self,
        data: dict
    ) -> SchemaVisibility:
        """Convert JSON to value object"""
        return SchemaVisibility(
            hidden_schemas=set(data.get("hidden_schemas", [])),
            hidden_tables={
                schema: set(tables)
                for schema, tables in data.get("hidden_tables", {}).items()
            }
        )
```

**Benefits:**
- ✅ Clear separation: domain entity ≠ ORM model
- ✅ Mapper pattern isolates conversion logic
- ✅ Can swap SQLAlchemy for MongoDB, DynamoDB, etc.
- ✅ Domain layer has zero knowledge of persistence
- ✅ Easier to test domain logic

---

## 4. API Layer: REST Endpoint

### Current

```python
# backend/dataline/api/connection/router.py
from fastapi import APIRouter, Depends
from dataline.services.connection import ConnectionService
from dataline.models.connection.schema import ConnectionCreate, ConnectionResponse

router = APIRouter()

@router.post("/connect")
async def create_connection(
    connection_create: ConnectionCreate,
    connection_service: ConnectionService = Depends(get_connection_service)
) -> ConnectionResponse:
    """Current endpoint - mixed concerns"""

    # Service method does everything
    connection = await connection_service.create_connection(connection_create)

    # Return model directly (or minimal transformation)
    return ConnectionResponse.from_orm(connection)
```

**Issues:**
- No API versioning
- Tightly coupled to service layer
- No standardized response format
- Hard to maintain backward compatibility

### Proposed

```python
# api/v1/routers/connections.py
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import JSONResponse

from api.v1.schemas.requests import CreateConnectionRequest, UpdateConnectionRequest
from api.v1.schemas.responses import (
    APIResponse,
    ConnectionResponse,
    ConnectionDetailResponse,
    ErrorResponse
)
from api.v1.dependencies import (
    get_create_connection_use_case,
    get_list_connections_use_case,
    get_get_connection_use_case,
    get_current_user
)
from api.v1.presenters.connection_presenter import ConnectionPresenter
from application.use_cases.connection.create_connection import (
    CreateConnection,
    CreateConnectionRequest as UseCaseRequest
)
from application.use_cases.connection.list_connections import ListConnections
from application.use_cases.connection.get_connection import GetConnection
from domain.exceptions import InvalidConnectionError, ConnectionTestFailedError

router = APIRouter(
    prefix="/api/v1/connections",
    tags=["connections"],
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)

@router.post(
    "/",
    response_model=APIResponse[ConnectionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new database connection",
    description="""
    Create a new database connection by providing a DSN and connection details.

    The connection will be validated and tested before being saved.
    Supported dialects: postgresql, mysql, snowflake, sqlite, mssql

    Example DSN formats:
    - PostgreSQL: postgresql://user:pass@localhost:5432/dbname
    - MySQL: mysql://user:pass@localhost:3306/dbname
    - Snowflake: snowflake://account.region/dbname?warehouse=wh&role=role
    """,
    responses={
        201: {
            "description": "Connection created successfully",
            "model": APIResponse[ConnectionResponse]
        },
        400: {
            "description": "Invalid connection parameters",
            "model": ErrorResponse
        }
    }
)
async def create_connection(
    request: CreateConnectionRequest,
    use_case: CreateConnection = Depends(get_create_connection_use_case),
    current_user: User = Depends(get_current_user)
) -> APIResponse[ConnectionResponse]:
    """
    Create a new database connection.

    This endpoint validates the DSN, tests the connection, and saves it.
    """
    try:
        # Convert API request to use case request
        use_case_request = UseCaseRequest(
            name=request.name,
            dsn=request.dsn,
            dialect=request.dialect,
            options=request.options or {}
        )

        # Execute use case
        result = await use_case.execute(use_case_request)

        # Convert DTO to API response using presenter
        connection_response = ConnectionPresenter.to_response(result.connection)

        # Return standardized API response
        return APIResponse(
            success=True,
            data=connection_response,
            metadata={
                "test_result": {
                    "success": result.test_result.success,
                    "latency_ms": result.test_result.latency_ms
                }
            }
        )

    except InvalidConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_CONNECTION", "message": str(e)}
        )
    except ConnectionTestFailedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "CONNECTION_TEST_FAILED", "message": str(e)}
        )

@router.get(
    "/",
    response_model=APIResponse[List[ConnectionResponse]],
    summary="List all connections",
    description="Retrieve a list of all database connections for the current user."
)
async def list_connections(
    use_case: ListConnections = Depends(get_list_connections_use_case),
    current_user: User = Depends(get_current_user)
) -> APIResponse[List[ConnectionResponse]]:
    """List all connections"""

    connections = await use_case.execute()

    return APIResponse(
        success=True,
        data=[
            ConnectionPresenter.to_response(conn)
            for conn in connections
        ]
    )

@router.get(
    "/{connection_id}",
    response_model=APIResponse[ConnectionDetailResponse],
    summary="Get connection details",
    description="Retrieve detailed information about a specific connection including schema."
)
async def get_connection(
    connection_id: UUID,
    use_case: GetConnection = Depends(get_get_connection_use_case),
    current_user: User = Depends(get_current_user)
) -> APIResponse[ConnectionDetailResponse]:
    """Get connection by ID with full details"""

    connection = await use_case.execute(connection_id)

    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "CONNECTION_NOT_FOUND", "message": "Connection not found"}
        )

    return APIResponse(
        success=True,
        data=ConnectionPresenter.to_detail_response(connection)
    )

# api/v1/schemas/responses.py
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    """Standard API response envelope"""
    success: bool = Field(description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[dict] = Field(None, description="Error details if success=false")
    metadata: Optional[dict] = Field(None, description="Additional metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ConnectionResponse(BaseModel):
    """Connection response schema"""
    id: str = Field(description="Unique connection identifier")
    name: str = Field(description="Connection name")
    dialect: str = Field(description="Database dialect")
    database: Optional[str] = Field(None, description="Database name")
    is_sample: bool = Field(description="Whether this is a sample connection")
    created_at: datetime = Field(description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Production Database",
                "dialect": "postgresql",
                "database": "myapp_prod",
                "is_sample": False,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }

# api/v1/presenters/connection_presenter.py
class ConnectionPresenter:
    """
    Presenter: Converts application DTOs to API responses
    Handles API-specific formatting and concerns
    """

    @staticmethod
    def to_response(dto: ConnectionDTO) -> ConnectionResponse:
        """Convert DTO to API response"""
        return ConnectionResponse(
            id=dto.id,
            name=dto.name,
            dialect=dto.dialect,
            database=dto.database,
            is_sample=dto.is_sample,
            created_at=datetime.fromisoformat(dto.created_at)
        )

    @staticmethod
    def to_detail_response(dto: ConnectionDetailDTO) -> ConnectionDetailResponse:
        """Convert DTO to detailed API response"""
        return ConnectionDetailResponse(
            **ConnectionPresenter.to_response(dto).dict(),
            tables=[
                TableSchema(
                    schema=table.schema,
                    name=table.name,
                    columns=[
                        ColumnSchema(
                            name=col.name,
                            type=col.type,
                            nullable=col.nullable
                        )
                        for col in table.columns
                    ]
                )
                for table in dto.tables
            ],
            schema_visibility={
                "hidden_schemas": list(dto.schema_visibility.hidden_schemas),
                "hidden_tables": dto.schema_visibility.hidden_tables
            }
        )
```

**Benefits:**
- ✅ API versioning (`/api/v1/`)
- ✅ Standardized response format (`APIResponse`)
- ✅ Clear separation: API request → Use case request → DTO → API response
- ✅ Presenters handle API-specific formatting
- ✅ Comprehensive OpenAPI documentation
- ✅ Backward compatibility via versioning

---

## 5. Client Usage: SDK vs Direct API

### Current (Direct API Calls)

```python
# Current: Frontend or external client making direct API calls
import requests
import json

API_URL = "http://localhost:8000"

# Create connection - manual HTTP call
response = requests.post(
    f"{API_URL}/connect",
    json={
        "name": "My Database",
        "dsn": "postgresql://user:pass@localhost/db"
    }
)
connection = response.json()
connection_id = connection["id"]

# Create conversation - manual parsing
response = requests.post(
    f"{API_URL}/conversation",
    json={"connection_id": connection_id, "name": "Analysis"}
)
conversation = response.json()
conversation_id = conversation["id"]

# Execute query - manual SSE parsing
response = requests.post(
    f"{API_URL}/conversation/{conversation_id}/query",
    json={"query": "Show me revenue trends"},
    stream=True
)

# Parse SSE manually
for line in response.iter_lines():
    if line:
        decoded = line.decode('utf-8')
        if decoded.startswith('data:'):
            event_data = json.loads(decoded[5:])
            print(event_data)
```

**Issues:**
- Manual HTTP calls
- No type safety
- Manual SSE parsing
- No error handling
- Hard to maintain

### Proposed (Python SDK)

```python
# New: Using official Python SDK
from dataline import DatalineClient
from dataline.exceptions import DatalineError
import os

# Initialize client with API key
client = DatalineClient(
    api_url="https://api.dataline.app",
    api_key=os.getenv("DATALINE_API_KEY")
)

try:
    # Create connection - typed and validated
    connection = client.connections.create(
        name="My Database",
        dsn="postgresql://user:pass@localhost/db"
    )
    print(f"Created connection: {connection.id}")

    # Create conversation
    conversation = client.conversations.create(
        connection_id=connection.id,
        name="Revenue Analysis"
    )

    # Execute natural language query with streaming
    print("Executing query...")
    async for event in client.queries.execute_natural_language(
        conversation_id=conversation.id,
        query="Show me revenue trends for the last quarter",
        options={
            "model": "gpt-4",
            "secure_data": True
        }
    ):
        # Typed events with proper handling
        if event.type == "tool_called":
            print(f"Using tool: {event.data.tool_name}")

        elif event.type == "result_added":
            result = event.data
            print(f"Query: {result.query}")
            print(f"Rows: {result.row_count}")
            print(f"Execution time: {result.execution_time_ms}ms")

            # Data is already parsed and typed
            for row in result.rows[:5]:
                print(row)

        elif event.type == "completed":
            print("Query completed successfully!")

        elif event.type == "error":
            print(f"Error: {event.data.message}")

    # Export results to CSV
    csv_data = client.queries.export_csv(result_id=result.id)
    with open("revenue_trends.csv", "wb") as f:
        f.write(csv_data)

except DatalineError as e:
    print(f"API error: {e.error_code} - {e.message}")
    if e.status_code == 401:
        print("Check your API key")
```

### Proposed (Go SDK)

```go
// Using official Go SDK
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/dataline/dataline-go"
)

func main() {
    // Initialize client
    client := dataline.NewClient(
        "https://api.dataline.app",
        os.Getenv("DATALINE_API_KEY"),
    )

    ctx := context.Background()

    // Create connection
    connection, err := client.Connections.Create(ctx, &dataline.CreateConnectionRequest{
        Name: "My Database",
        DSN:  "postgresql://user:pass@localhost/db",
    })
    if err != nil {
        log.Fatalf("Failed to create connection: %v", err)
    }
    fmt.Printf("Created connection: %s\n", connection.ID)

    // Create conversation
    conversation, err := client.Conversations.Create(ctx, &dataline.CreateConversationRequest{
        ConnectionID: connection.ID,
        Name:         "Revenue Analysis",
    })
    if err != nil {
        log.Fatalf("Failed to create conversation: %v", err)
    }

    // Execute query with streaming
    stream, err := client.Queries.ExecuteNaturalLanguage(ctx, &dataline.QueryRequest{
        ConversationID: conversation.ID,
        Query:          "Show me revenue trends for the last quarter",
        Options: &dataline.QueryOptions{
            Model:      "gpt-4",
            SecureData: true,
        },
    })
    if err != nil {
        log.Fatalf("Failed to execute query: %v", err)
    }

    // Process events from stream
    for stream.Next() {
        event := stream.Event()

        switch event.Type {
        case dataline.EventTypeToolCalled:
            fmt.Printf("Using tool: %s\n", event.ToolName)

        case dataline.EventTypeResultAdded:
            result := event.Result
            fmt.Printf("Query: %s\n", result.Query)
            fmt.Printf("Rows: %d\n", result.RowCount)
            fmt.Printf("Execution time: %dms\n", result.ExecutionTimeMS)

            // Strongly typed data
            for _, row := range result.Rows {
                fmt.Printf("%+v\n", row)
            }

        case dataline.EventTypeCompleted:
            fmt.Println("Query completed!")

        case dataline.EventTypeError:
            fmt.Printf("Error: %s\n", event.ErrorMessage)
        }
    }

    if err := stream.Err(); err != nil {
        log.Fatalf("Stream error: %v", err)
    }
}
```

### Proposed (TypeScript SDK - Node.js or Browser)

```typescript
// Using official TypeScript SDK
import { DatalineClient } from '@dataline/sdk';

// Initialize client
const client = new DatalineClient({
  apiUrl: 'https://api.dataline.app',
  apiKey: process.env.DATALINE_API_KEY,
});

async function analyzeRevenue() {
  try {
    // Create connection
    const connection = await client.connections.create({
      name: 'My Database',
      dsn: 'postgresql://user:pass@localhost/db',
    });
    console.log(`Created connection: ${connection.id}`);

    // Create conversation
    const conversation = await client.conversations.create({
      connectionId: connection.id,
      name: 'Revenue Analysis',
    });

    // Execute query with streaming (async iterator)
    console.log('Executing query...');
    for await (const event of client.queries.executeNaturalLanguage({
      conversationId: conversation.id,
      query: 'Show me revenue trends for the last quarter',
      options: {
        model: 'gpt-4',
        secureData: true,
      },
    })) {
      // TypeScript types for events
      switch (event.type) {
        case 'tool_called':
          console.log(`Using tool: ${event.data.toolName}`);
          break;

        case 'result_added':
          const result = event.data;
          console.log(`Query: ${result.query}`);
          console.log(`Rows: ${result.rowCount}`);
          console.log(`Execution time: ${result.executionTimeMs}ms`);

          // Typed data rows
          result.rows.forEach(row => {
            console.log(row);
          });
          break;

        case 'completed':
          console.log('Query completed!');
          break;

        case 'error':
          console.error(`Error: ${event.data.message}`);
          break;
      }
    }

  } catch (error) {
    if (error instanceof DatalineError) {
      console.error(`API error: ${error.errorCode} - ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

analyzeRevenue();
```

**Benefits:**
- ✅ Type-safe client libraries
- ✅ Automatic SSE parsing and event handling
- ✅ Comprehensive error handling
- ✅ Async/await or iterator patterns
- ✅ No manual HTTP/JSON handling
- ✅ IDE autocomplete and type checking
- ✅ Consistent API across languages

---

## Summary: Key Improvements

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Domain Logic** | Scattered in services | Centralized in entities |
| **Testing** | Requires database | Pure unit tests |
| **Dependencies** | Coupled to frameworks | Clean interfaces |
| **API Structure** | Unversioned, inconsistent | Versioned, standardized |
| **Client Integration** | Manual HTTP calls | Official SDKs |
| **Type Safety** | Partial | Full stack |
| **Separation of Concerns** | Mixed | Clear layers |
| **Maintainability** | Moderate | High |
| **Extensibility** | Limited | High via interfaces |

The proposed architecture provides:
1. **Clear boundaries** between layers
2. **Framework independence** in core logic
3. **Easy testing** at all levels
4. **Multiple client options** (SDK, CLI, UI)
5. **API-first approach** for external integrations
6. **Type safety** across the stack

This transformation enables Dataline to become a true platform that industry teams can integrate into their workflows using any language or tool they prefer.

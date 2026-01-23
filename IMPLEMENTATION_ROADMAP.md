# Dataline API-First Architecture: Implementation Roadmap

## Overview

This roadmap details the step-by-step implementation plan for transforming Dataline into an API-first platform. The migration will be done incrementally to minimize risk and maintain system stability.

## Timeline: 13 Weeks

```
Week 1-2:  Foundation & Domain Layer
Week 3-4:  Application Layer & Use Cases
Week 5-6:  API v1 Implementation
Week 7:    Repository Implementations
Week 8-10: SDK Development
Week 11-12: UI Refactor
Week 13:   Documentation & Launch
```

---

## Phase 1: Foundation (Weeks 1-2)

### Goals
- Establish new directory structure
- Extract domain entities
- Define architectural boundaries
- Set up testing infrastructure

### Week 1: Domain Entities & Value Objects

#### Day 1-2: Project Setup
- [ ] Create new directory structure following clean architecture
  ```bash
  backend/
  ├── domain/
  ├── application/
  ├── infrastructure/
  └── api/
  ```
- [ ] Set up pytest structure for domain tests
- [ ] Configure mypy for strict type checking
- [ ] Create ADR (Architecture Decision Record) template

#### Day 3-5: Domain Entities
- [ ] Extract `Connection` entity from current models
  - Pure dataclass with business logic
  - No SQLAlchemy dependencies
  - Methods: `validate_dsn()`, `is_accessible()`, `can_query()`
- [ ] Extract `Conversation` entity
  - Methods: `add_message()`, `can_query()`, `get_context()`
- [ ] Extract `QueryResult` entity
  - Methods: `to_chart()`, `to_csv()`, `validate_for_chart()`
- [ ] Extract `Message` entity
- [ ] Write unit tests for all entities (no external dependencies)

### Week 2: Repository Interfaces & Domain Services

#### Day 1-2: Value Objects
- [ ] Create `ConnectionId` (UUID wrapper)
- [ ] Create `ConversationId` (UUID wrapper)
- [ ] Create `DatabaseDialect` (enum with validation)
- [ ] Create `QueryText` (validated SQL string)
- [ ] Create `ChartConfiguration` (immutable config)
- [ ] Write tests for value object validation

#### Day 3-4: Repository Interfaces (Ports)
- [ ] Define `ConnectionRepository` protocol
- [ ] Define `ConversationRepository` protocol
- [ ] Define `ResultRepository` protocol
- [ ] Define `UserRepository` protocol
- [ ] Add docstrings with contract specifications

#### Day 5: Domain Services (Ports)
- [ ] Define `LLMService` protocol
- [ ] Define `QueryExecutor` protocol
- [ ] Define `SchemaInspector` protocol
- [ ] Define `ConnectionValidator` protocol
- [ ] Document expected behaviors

#### Deliverables
- Complete domain layer with 100% test coverage
- No external dependencies in domain/
- Clear interfaces for all ports
- ADR documenting layer boundaries

---

## Phase 2: Application Layer (Weeks 3-4)

### Goals
- Implement use cases
- Establish CQRS pattern
- Create DTOs
- Set up event bus

### Week 3: Read-Only Use Cases

#### Day 1-2: Connection Use Cases (Read)
- [ ] Implement `ListConnections` use case
  - Dependencies: ConnectionRepository
  - Returns: List[ConnectionDTO]
  - Tests: Mock repository
- [ ] Implement `GetConnection` use case
  - Handle not found errors
  - Map entity to DTO
- [ ] Implement `GetConnectionWithSchema` use case
  - Dependencies: ConnectionRepository, SchemaInspector
  - Returns detailed schema information

#### Day 3-4: Conversation Use Cases (Read)
- [ ] Implement `ListConversations` use case
  - Include message counts
  - Filter by connection
- [ ] Implement `GetConversation` use case
  - Include full message history
- [ ] Implement `GetConversationMessages` use case
  - Pagination support
  - Filter by message type

#### Day 5: DTOs and Mappers
- [ ] Create `ConnectionDTO` with mapper
- [ ] Create `ConversationDTO` with mapper
- [ ] Create `MessageDTO` with mapper
- [ ] Create `QueryResultDTO` with mapper
- [ ] Create `SchemaDTO` with mapper

### Week 4: Write Use Cases

#### Day 1-2: Connection Use Cases (Write)
- [ ] Implement `CreateConnection` use case
  - Validation via ConnectionValidator
  - Test connection before saving
  - Emit ConnectionCreated event
- [ ] Implement `UpdateConnection` use case
  - Validate changes
  - Handle schema refresh
- [ ] Implement `DeleteConnection` use case
  - Cascade delete conversations
  - Emit ConnectionDeleted event
- [ ] Implement `RefreshConnectionSchema` use case
  - Dependencies: SchemaInspector
  - Update schema cache

#### Day 3-4: Query Use Cases
- [ ] Implement `ExecuteNaturalLanguageQuery` use case
  - Core business logic for NL to SQL
  - Stream events: ToolCall, ResultAdded, QueryCompleted
  - Error handling and recovery
  - Save results to conversation
- [ ] Implement `ExecuteSQLDirectly` use case
  - Validate SQL is read-only
  - Execute and return results
- [ ] Implement `ExportResultToCSV` use case
  - Format conversion
  - Stream large results

#### Day 5: Event Bus & Testing
- [ ] Implement simple event bus
  - In-memory for now
  - Support async handlers
- [ ] Write integration tests for use cases
  - Use in-memory repositories
  - Test event emission
  - Test error scenarios

#### Deliverables
- Complete application layer
- All use cases with 90%+ test coverage
- Clear DTOs for all entities
- Working event bus

---

## Phase 3: API v1 (Weeks 5-6)

### Goals
- Create versioned API endpoints
- Implement presenters
- Add API middleware (auth, rate limiting)
- Generate OpenAPI spec

### Week 5: API Routes

#### Day 1: API Foundation
- [ ] Create `api/v1/` directory structure
- [ ] Set up FastAPI router with `/api/v1` prefix
- [ ] Create dependency injection container
  - Inject use cases into routes
  - Manage repository lifecycles
- [ ] Add API versioning middleware

#### Day 2: Connection Routes
- [ ] `POST /api/v1/connections` - CreateConnection
  - Request validation
  - Call use case
  - Convert to response via presenter
- [ ] `GET /api/v1/connections` - ListConnections
- [ ] `GET /api/v1/connections/{id}` - GetConnection
- [ ] `PATCH /api/v1/connections/{id}` - UpdateConnection
- [ ] `DELETE /api/v1/connections/{id}` - DeleteConnection
- [ ] Add integration tests for each endpoint

#### Day 3: Conversation Routes
- [ ] `POST /api/v1/conversations` - CreateConversation
- [ ] `GET /api/v1/conversations` - ListConversations
- [ ] `GET /api/v1/conversations/{id}` - GetConversation
- [ ] `GET /api/v1/conversations/{id}/messages` - GetMessages
- [ ] `PATCH /api/v1/conversations/{id}` - UpdateConversation
- [ ] `DELETE /api/v1/conversations/{id}` - DeleteConversation

#### Day 4: Query Routes
- [ ] `POST /api/v1/conversations/{id}/query` - ExecuteNLQuery
  - Implement SSE streaming
  - Event types: result_added, tool_called, completed, error
  - Convert use case events to SSE events
- [ ] `POST /api/v1/conversations/{id}/sql` - ExecuteSQLDirectly
- [ ] `GET /api/v1/results/{id}/export` - ExportToCSV
- [ ] `PATCH /api/v1/results/{id}` - UpdateResult

#### Day 5: Response Standardization
- [ ] Create `APIResponse` envelope
- [ ] Create `ErrorResponse` with error codes
- [ ] Implement presenters for all entities
  - ConnectionPresenter
  - ConversationPresenter
  - QueryResultPresenter
- [ ] Standardize error handling
  - Domain exceptions → HTTP status codes
  - Consistent error format

### Week 6: API Infrastructure

#### Day 1-2: Authentication
- [ ] Implement API key authentication
  - Generate keys with scopes
  - Store hashed in database
  - Validate via dependency
- [ ] Add `POST /api/v1/auth/api-keys` endpoint
- [ ] Add `GET /api/v1/auth/api-keys` endpoint
- [ ] Add `DELETE /api/v1/auth/api-keys/{id}` endpoint
- [ ] Create migration for api_keys table
- [ ] Update all routes with authentication

#### Day 3: Rate Limiting & Middleware
- [ ] Implement rate limiting middleware
  - Per API key
  - Different tiers (free/pro/enterprise)
  - Redis-backed for distributed systems
- [ ] Add request logging middleware
- [ ] Add correlation ID middleware
- [ ] Add CORS middleware (configurable)

#### Day 4: OpenAPI Documentation
- [ ] Configure FastAPI OpenAPI generation
- [ ] Add detailed docstrings to all endpoints
- [ ] Add request/response examples
- [ ] Add authentication documentation
- [ ] Generate OpenAPI spec file
- [ ] Set up Swagger UI at `/docs`

#### Day 5: API Testing
- [ ] Write integration tests for API v1
  - Test authentication
  - Test rate limiting
  - Test error responses
  - Test streaming endpoints
- [ ] Load testing with Locust
  - Measure baseline performance
  - Identify bottlenecks

#### Deliverables
- Complete `/api/v1` with all endpoints
- API key authentication
- Rate limiting
- Comprehensive OpenAPI spec
- Integration test suite

---

## Phase 4: Repository Implementations (Week 7)

### Goals
- Implement repository adapters
- Create entity-model mappers
- Introduce Unit of Work pattern
- Migrate existing data access

### Week 7: Repository Adapters

#### Day 1-2: Connection Repository
- [ ] Create `SQLAlchemyConnectionRepository`
  - Implement all methods from protocol
  - Map domain entities ↔ SQLAlchemy models
  - Handle schema visibility JSON field
- [ ] Create mappers
  - `ConnectionMapper.to_entity()`
  - `ConnectionMapper.to_model()`
- [ ] Write integration tests with test database

#### Day 2-3: Conversation Repository
- [ ] Create `SQLAlchemyConversationRepository`
  - Handle eager loading of messages
  - Implement efficient pagination
- [ ] Create `ConversationMapper`
- [ ] Test with complex scenarios

#### Day 4: Result & User Repositories
- [ ] Create `SQLAlchemyResultRepository`
- [ ] Create `SQLAlchemyUserRepository`
- [ ] Create corresponding mappers
- [ ] Integration tests

#### Day 5: Unit of Work Pattern
- [ ] Implement `UnitOfWork` for transactions
  ```python
  async with uow:
      connection = await uow.connections.find_by_id(id)
      connection.update(...)
      await uow.connections.save(connection)
      await uow.commit()
  ```
- [ ] Update use cases to use UnitOfWork
- [ ] Test transaction rollback scenarios

#### Deliverables
- All repository implementations
- Complete mappers
- Unit of Work pattern
- Integration tests with real database

---

## Phase 5: SDK Development (Weeks 8-10)

### Goals
- Create official SDKs
- Generate from OpenAPI spec where possible
- Write comprehensive documentation
- Publish to package repositories

### Week 8: Python SDK

#### Day 1-2: Core Client
- [ ] Set up `dataline-sdk-python` package
- [ ] Implement `DatalineClient` base class
  - HTTP client (httpx)
  - Authentication handling
  - Error handling
- [ ] Create typed models from API schemas
  - Use Pydantic
  - Match API responses exactly

#### Day 3: API Resources
- [ ] Implement `ConnectionsAPI`
  - `create()`, `list()`, `get()`, `update()`, `delete()`
  - `refresh_schema()`
- [ ] Implement `ConversationsAPI`
  - CRUD operations
  - `generate_title()`
- [ ] Implement `QueriesAPI`
  - `execute_natural_language()` with streaming
  - `execute_sql()`
  - `export_csv()`

#### Day 4: Streaming Support
- [ ] Implement SSE client for query streaming
  - Parse event stream
  - Typed events
  - Async iterator interface
  ```python
  async for event in client.queries.execute_nl(...):
      if event.type == "result_added":
          print(event.data)
  ```

#### Day 5: Testing & Documentation
- [ ] Unit tests for all methods
- [ ] Integration tests against test API
- [ ] Write README with examples
- [ ] Create docs/ with detailed guides
- [ ] Publish to PyPI (test first)

### Week 9: Go SDK

#### Day 1-2: Core Client
- [ ] Set up `dataline-sdk-go` module
- [ ] Implement `Client` struct
  - net/http client
  - Authentication
  - JSON encoding/decoding
- [ ] Define Go structs for API models
  - Use json tags
  - Pointer fields for optionals

#### Day 3: API Resources
- [ ] Implement `ConnectionsService`
  - Methods match Python SDK
  - Idiomatic Go interfaces
- [ ] Implement `ConversationsService`
- [ ] Implement `QueriesService`

#### Day 4: Streaming Support
- [ ] Implement SSE client for Go
  - Use goroutines for async
  - Channel-based event delivery
  ```go
  stream, err := client.Queries.ExecuteNL(ctx, req)
  for event := range stream.Events() {
      // Process event
  }
  ```

#### Day 5: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Example programs
- [ ] GoDoc documentation
- [ ] Publish to pkg.go.dev

### Week 10: TypeScript SDK & CLI

#### Day 1-2: TypeScript SDK
- [ ] Set up `@dataline/sdk` package
- [ ] Generate types from OpenAPI spec
  - Use openapi-typescript
- [ ] Implement `DatalineClient`
  - axios or fetch
  - TypeScript interfaces
- [ ] Implement API resources
- [ ] SSE support with EventSource API

#### Day 3: CLI Tool (Go)
- [ ] Create `dataline-cli` with Cobra
- [ ] Commands:
  - `dataline connect create/list/delete`
  - `dataline conversation create/list/delete`
  - `dataline query --conversation-id=... --query="..."`
  - `dataline export --result-id=... --output=file.csv`
- [ ] Configuration file support (~/.datalinerc)
- [ ] Pretty output formatting (tables)

#### Day 4: SDK Examples
- [ ] Create example projects for each SDK
  - Python: Jupyter notebook example
  - Go: CLI tool example
  - TypeScript: Node.js script example
- [ ] Real-world use case examples
  - Data reporting pipeline
  - Slack bot integration
  - Scheduled queries

#### Day 5: Publication
- [ ] Publish TypeScript SDK to npm
- [ ] Publish CLI binaries (GitHub releases)
  - Linux, macOS, Windows
  - Homebrew formula
- [ ] Update all documentation

#### Deliverables
- Python SDK on PyPI
- Go SDK on pkg.go.dev
- TypeScript SDK on npm
- CLI tool with binaries
- Comprehensive examples

---

## Phase 6: UI Refactor (Weeks 11-12)

### Goals
- Decouple UI from backend
- Use TypeScript SDK for all API calls
- Deploy UI independently
- Improve UI for API features

### Week 11: UI Decoupling

#### Day 1-2: Replace API Layer
- [ ] Install `@dataline/sdk` in frontend
- [ ] Remove direct axios calls from `src/api.ts`
- [ ] Create `useDatalineClient` hook
  ```typescript
  const client = useDatalineClient();
  const { data: connections } = useQuery({
      queryKey: ['connections'],
      queryFn: () => client.connections.list()
  });
  ```

#### Day 3-4: Update Hooks
- [ ] Update `hooks/connections.ts` to use SDK
- [ ] Update `hooks/conversations.ts` to use SDK
- [ ] Update `hooks/messages.ts` to use SDK
- [ ] Handle streaming with SDK's SSE client
- [ ] Update all React Query hooks

#### Day 5: Environment Configuration
- [ ] Add `VITE_API_URL` environment variable
- [ ] Add `VITE_API_KEY` for authenticated calls
- [ ] Remove hardcoded API URLs
- [ ] Test against deployed API

### Week 12: UI as Separate Project

#### Day 1-2: Project Restructure
- [ ] Move frontend/ to ui/ (separate repository or monorepo)
- [ ] Update build configuration
- [ ] Update Docker setup
  - `Dockerfile.api` for backend
  - `Dockerfile.ui` for frontend
  - docker-compose.yml for both
- [ ] Configure Nginx for UI serving

#### Day 3: API Key Management UI
- [ ] Create API Keys settings page
  - List keys
  - Create new key (copy to clipboard)
  - Delete key
  - Show scopes
- [ ] Add key visibility toggle
- [ ] Show usage stats

#### Day 4: New Features for API
- [ ] API Explorer page (interactive docs)
  - Embedded Swagger UI
  - Try endpoints directly
- [ ] Webhook configuration UI (future feature)
- [ ] Rate limit display in UI

#### Day 5: Deployment & Testing
- [ ] Deploy API to production
- [ ] Deploy UI to production (separate domain)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit

#### Deliverables
- UI using SDK exclusively
- Independent deployments
- API key management
- Production-ready system

---

## Phase 7: Documentation & Launch (Week 13)

### Goals
- Complete documentation
- Create migration guide
- Launch API publicly
- Deprecation plan for old API

### Week 13: Launch Preparation

#### Day 1: API Documentation
- [ ] Complete API reference docs
  - All endpoints documented
  - Request/response examples
  - Error code reference
- [ ] Create guides
  - Getting Started (5 min tutorial)
  - Authentication & API Keys
  - Streaming Queries
  - SDK Usage Guide
  - Best Practices
  - Rate Limiting & Quotas

#### Day 2: SDK Documentation
- [ ] Python SDK documentation
  - API reference
  - Usage examples
  - Advanced topics
- [ ] Go SDK documentation
- [ ] TypeScript SDK documentation
- [ ] CLI documentation

#### Day 3: Migration Guide
- [ ] Document breaking changes
- [ ] Provide migration examples
  ```python
  # Old way (direct API calls)
  response = requests.post(
      f"{API_URL}/conversation/{id}/query",
      json={"query": "..."}
  )

  # New way (SDK)
  client = DatalineClient(api_key=API_KEY)
  async for event in client.queries.execute_nl(...):
      print(event)
  ```
- [ ] Create migration scripts if needed
- [ ] Set deprecation timeline (6 months)

#### Day 4: Launch Materials
- [ ] Blog post announcing API-first architecture
- [ ] Update README with API focus
- [ ] Create demo video
- [ ] Update website/landing page
- [ ] Prepare social media announcements
- [ ] Email existing users

#### Day 5: Launch & Monitor
- [ ] Deploy to production
- [ ] Announce launch
- [ ] Monitor for issues
  - Error rates
  - Response times
  - API key creation
  - SDK downloads
- [ ] Respond to feedback
- [ ] Fix critical issues

#### Deliverables
- Complete documentation site
- Migration guide
- Public launch
- Monitoring dashboard

---

## Post-Launch: Continuous Improvement

### Weeks 14+

#### Immediate (Week 14-16)
- [ ] Monitor API usage patterns
- [ ] Fix bugs and issues
- [ ] Improve documentation based on feedback
- [ ] Performance optimization
- [ ] Add missing features

#### Short-term (Months 2-3)
- [ ] GraphQL API (alternative to REST)
- [ ] Webhooks for async notifications
- [ ] Batch query execution
- [ ] Query caching layer
- [ ] Additional language SDKs (Ruby, Java)

#### Medium-term (Months 4-6)
- [ ] Multi-tenancy & organizations
- [ ] Advanced authentication (OAuth, SSO)
- [ ] Usage analytics dashboard
- [ ] Query history & saved queries
- [ ] Collaborative features

#### Long-term (Months 7-12)
- [ ] Query result subscriptions (WebSocket)
- [ ] Advanced schema management
- [ ] Query optimization suggestions
- [ ] Custom LLM model support
- [ ] On-premise deployment options

---

## Risk Management

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking changes during migration | High | Medium | Maintain parallel APIs, comprehensive testing |
| Performance degradation | High | Low | Benchmark at each phase, optimize early |
| Data migration issues | High | Low | Test migrations thoroughly, have rollback plan |
| SDK bugs | Medium | Medium | Extensive testing, quick patch releases |
| Streaming complexity | Medium | Medium | Start with simple implementation, iterate |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User resistance to change | Medium | Low | Clear communication, migration guide, support |
| Delayed timeline | Medium | Medium | Incremental delivery, adjust scope if needed |
| Inadequate documentation | High | Low | Prioritize docs, gather feedback early |
| Security vulnerabilities | High | Low | Security audit, rate limiting, input validation |

---

## Success Criteria

### Technical Metrics
- [ ] 100% feature parity with current system
- [ ] API response time p95 < 2s
- [ ] SDK test coverage > 80%
- [ ] Zero data loss during migration
- [ ] API uptime > 99.9%

### Business Metrics
- [ ] 50+ external API users in first month
- [ ] 500+ SDK downloads in first month
- [ ] <10 critical bugs in first month
- [ ] Documentation rated 4+/5 by users
- [ ] All existing users successfully migrated

### Quality Metrics
- [ ] Domain layer test coverage = 100%
- [ ] Application layer test coverage > 90%
- [ ] API integration tests for all endpoints
- [ ] Security audit passed
- [ ] Performance benchmarks met

---

## Team & Resources

### Required Roles
- **Backend Engineers** (2): Domain/Application/API layers
- **Frontend Engineer** (1): UI refactor
- **SDK Engineers** (2): Python/Go/TypeScript SDKs
- **DevOps** (1): Infrastructure, deployment
- **Technical Writer** (1): Documentation
- **QA Engineer** (1): Testing, quality assurance

### Tools & Infrastructure
- GitHub Actions for CI/CD
- Docker for containerization
- PostgreSQL for production database
- Redis for rate limiting
- Sentry for error tracking
- PostHog for analytics
- ReadTheDocs or similar for docs hosting

---

## Communication Plan

### Internal
- Weekly sprint planning
- Daily standups
- Bi-weekly architecture reviews
- Phase completion demos

### External
- Blog post at each major phase
- Email updates to users
- Twitter/social media updates
- Community feedback sessions
- Office hours for SDK users

---

## Conclusion

This roadmap provides a clear, incremental path to transforming Dataline into an API-first platform. By following clean architecture principles and delivering in phases, we minimize risk while continuously providing value.

**Key Success Factors:**
1. Maintain backward compatibility during transition
2. Test extensively at each phase
3. Document thoroughly as we build
4. Gather and incorporate user feedback
5. Monitor metrics and adjust as needed

The end result will be a robust, scalable, API-first platform that industry teams can integrate into their workflows using any language or tool they prefer.

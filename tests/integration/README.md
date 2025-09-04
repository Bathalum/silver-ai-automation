# Integration Tests

This directory contains comprehensive integration tests for the Clean Architecture implementation using real Supabase database connections.

## Overview

These integration tests validate:
- **Repository implementations** against real database operations
- **Entity mapping** between domain objects and database rows
- **Database constraints** and business rule enforcement
- **Transaction consistency** and data integrity
- **Performance characteristics** and query optimization

## Architecture

The integration tests follow Clean Architecture principles and TDD methodology:

### 🔴 RED Phase
Tests define expected behavior for database operations before implementation exists.

### 🟢 GREEN Phase  
Minimal implementation to make tests pass while maintaining architectural compliance.

### 🔵 REFACTOR Phase
Optimize implementation while keeping tests passing.

## Test Structure

```
tests/integration/
├── infrastructure/          # Test infrastructure and utilities
│   ├── supabase-test-client.ts        # Real database client setup
│   ├── database-test-utilities.ts     # Cleanup and isolation utilities
│   └── test-data-factories.ts         # Domain entity factories
├── repositories/           # Repository integration tests
│   ├── supabase-function-model-repository.integration.test.ts
│   ├── entity-mapping.integration.test.ts
│   ├── database-constraints.integration.test.ts
│   ├── transaction-consistency.integration.test.ts
│   └── performance.integration.test.ts
├── integration.setup.ts    # Global test setup and teardown
└── README.md              # This file
```

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test Configuration
NODE_ENV=test
TEST_MODE=integration
```

### Service Role Key

The integration tests require a **service role key** (not the anon key) to:
- Bypass Row Level Security (RLS) for test data management
- Access all database tables without authentication
- Perform administrative operations like table cleanup

⚠️ **Security Warning**: Never use the service role key in client-side code or production environments.

## Database Schema Requirements

The tests expect these Supabase tables to exist:

- `function_models` - Main function model entities
- `function_model_nodes` - Node entities within models  
- `function_model_actions` - Action node entities
- `node_links` - Relationships between nodes
- `ai_agents` - AI agent configurations
- `audit_log` - Audit trail records
- `function_model_versions` - Version history

## Running Integration Tests

### All Integration Tests
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:integration:watch
```

### With Coverage
```bash
npm run test:integration:coverage
```

### Specific Test File
```bash
NODE_ENV=test TEST_MODE=integration jest tests/integration/repositories/supabase-function-model-repository.integration.test.ts
```

## Test Categories

### 1. Repository Integration Tests
**File**: `supabase-function-model-repository.integration.test.ts`

Tests CRUD operations against real database:
- ✅ CREATE operations with validation
- ✅ READ operations with complex queries  
- ✅ UPDATE operations with state management
- ✅ DELETE operations with soft deletion
- ✅ Aggregate operations and statistics

### 2. Entity Mapping Tests
**File**: `entity-mapping.integration.test.ts`

Tests domain entity ↔ database conversion:
- ✅ Round-trip serialization preservation
- ✅ Value object integrity
- ✅ Complex nested object handling
- ✅ Special characters and Unicode support
- ✅ Null/undefined value handling

### 3. Database Constraints Tests  
**File**: `database-constraints.integration.test.ts`

Tests database integrity enforcement:
- ✅ Primary key constraints
- ✅ Foreign key relationships
- ✅ Data type validation
- ✅ Not null constraints
- ✅ Business rule enforcement
- ✅ Referential integrity

### 4. Transaction Consistency Tests
**File**: `transaction-consistency.integration.test.ts`

Tests ACID properties and data consistency:
- ✅ Multi-table transaction atomicity
- ✅ Concurrent modification handling
- ✅ Data consistency verification
- ✅ Recovery from temporary failures
- ✅ Transaction isolation levels

### 5. Performance Tests
**File**: `performance.integration.test.ts`

Tests query performance and optimization:
- ✅ Single record operations timing
- ✅ Bulk operations efficiency
- ✅ Complex query performance
- ✅ Concurrent access handling
- ✅ Scalability characteristics

## Test Infrastructure

### SupabaseTestClient
Provides real database connections with:
- Service role key authentication
- Connection verification
- Table existence validation
- Environment checking

### DatabaseTestManager  
Manages test isolation with:
- Test context creation
- Database snapshots
- Cleanup orchestration
- State verification

### Test Data Factories
Generate valid domain entities:
- `FunctionModelTestFactory` - Complete function models
- `IONodeTestFactory` - Input/output nodes
- `TetherNodeTestFactory` - API connection nodes
- `KBNodeTestFactory` - Knowledge base nodes
- `TestScenarioFactory` - Complex workflow scenarios

## Performance Thresholds

The tests enforce these performance requirements:

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| Single Insert | 1000ms | Individual record creation |
| Single Select | 500ms | Primary key lookups |
| Bulk Insert | 5000ms | 10 record batch insert |
| Complex Query | 2000ms | Multi-table joins and filters |
| Index Scan | 1000ms | Indexed search operations |
| Full Scan | 5000ms | Non-indexed queries |

## Test Isolation

Each test runs in isolation:

1. **Unique Test IDs**: All test data uses unique identifiers
2. **Database Snapshots**: Initial state captured before tests
3. **Automatic Cleanup**: Test data removed after each test
4. **Verification**: Cleanup success validated
5. **Emergency Cleanup**: Global cleanup for edge cases

## Debugging Integration Tests

### Enable Verbose Logging
```bash
NODE_ENV=test TEST_MODE=integration jest --verbose tests/integration/
```

### Check Database State
The tests log database operations and performance metrics:
```
✅ Integration test environment ready
🚀 Single insert took 45.23ms
📊 Bulk insert of 10 models took 234.56ms
🧹 Integration test environment cleaned up
```

### Common Issues

**Tests Skipped**: Missing environment variables
```
⚠️  Integration tests skipped - not in integration mode
```

**Connection Failures**: Invalid database credentials
```
❌ Database connection failed: Invalid API key
```

**Performance Failures**: Operations exceeding thresholds
```
❌ Query performance test failed: 1500.00ms exceeds maximum 1000ms
```

## Continuous Integration

### GitHub Actions Example
```yaml
integration-tests:
  runs-on: ubuntu-latest
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
    NODE_ENV: test
    TEST_MODE: integration
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm ci
    - run: npm run test:integration
```

### Local Development
```bash
# Copy environment template
cp .env.example .env.test.local

# Add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run tests
npm run test:integration
```

## Architecture Compliance

These tests enforce Clean Architecture boundaries:

✅ **Domain Layer**: Tests validate entities and value objects  
✅ **Application Layer**: Tests verify use case behavior  
✅ **Infrastructure Layer**: Tests confirm repository implementations  
✅ **Dependency Inversion**: Inner layers never depend on outer layers

## TDD Workflow

1. **Write Failing Test** (RED): Define expected repository behavior
2. **Implement Minimum Code** (GREEN): Make test pass with minimal code
3. **Refactor Safely** (REFACTOR): Optimize with test safety net
4. **Repeat**: Add more behavior with additional tests

## Contributing

When adding new integration tests:

1. Follow the existing naming convention: `*.integration.test.ts`
2. Use test data factories for consistent test data
3. Implement proper cleanup in `afterEach` hooks
4. Document performance expectations
5. Include both success and failure scenarios
6. Validate Clean Architecture compliance

## Performance Monitoring

The tests establish performance baselines and detect regressions:

- **Baseline Establishment**: Initial performance measurements
- **Regression Detection**: Comparison against historical performance  
- **Scalability Testing**: Performance under increasing load
- **Resource Monitoring**: Memory and connection usage

These integration tests provide confidence that the Clean Architecture implementation works correctly with real database operations while maintaining performance and data integrity requirements.
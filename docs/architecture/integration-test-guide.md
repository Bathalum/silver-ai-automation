# Integration Test Creation Guide

## Overview
Integration tests verify that multiple components work together correctly by testing real code paths with minimal mocking. They catch bugs that occur at component boundaries and provide fast feedback during development.

## Core Principles

### 1. Test Real Code Paths
- **DO**: Use actual service implementations, repositories, and business logic
- **DON'T**: Mock away the components you're testing
- **DO**: Mock only external dependencies (databases, APIs, file systems)
- **DON'T**: Mock internal business logic or data transformations

### 2. Focus on Integration Points
- **Test**: Service-to-repository interactions
- **Test**: Use case-to-service interactions  
- **Test**: Data flow between layers
- **Test**: Error propagation across boundaries
- **Test**: Real database operations with test data

### 3. Use Test Databases
- **DO**: Use separate test database instances
- **DO**: Reset database state between tests
- **DO**: Use realistic but minimal test data
- **DON'T**: Use production databases
- **DON'T**: Use in-memory mocks for database operations

## Test Structure

### 1. Setup Phase
```typescript
// Setup real services with test configuration
const testDatabase = createTestDatabase()
const realRepository = new RealRepository(testDatabase)
const realService = new RealService(realRepository)
const realUseCase = new RealUseCase(realService)

// Setup test data
await testDatabase.seed({
  users: [{ id: 'test-user', name: 'Test User' }],
  models: []
})
```

### 2. Execution Phase
```typescript
// Execute the actual business logic
const result = await realUseCase.createFunctionModel({
  name: 'Test Model',
  description: 'Integration test model'
})
```

### 3. Verification Phase
```typescript
// Verify the complete flow worked
expect(result).toBeDefined()
expect(result.name).toBe('Test Model')

// Verify database state
const savedModel = await testDatabase.query(
  'SELECT * FROM function_models WHERE id = ?', 
  [result.id]
)
expect(savedModel).toBeDefined()

// Verify audit logs were created
const auditLogs = await testDatabase.query(
  'SELECT * FROM audit_log WHERE record_id = ?',
  [result.id]
)
expect(auditLogs).toHaveLength(1)
```

## Test Categories

### 1. Happy Path Tests
- Test successful operations end-to-end
- Verify all components work together
- Check final state is correct

### 2. Error Path Tests
- Test error propagation across layers
- Verify error handling at boundaries
- Check error state is consistent

### 3. Data Flow Tests
- Test data transformation between layers
- Verify data integrity across boundaries
- Check side effects (audit logs, notifications)

### 4. State Management Tests
- Test database state changes
- Verify transaction rollbacks
- Check cleanup operations

## Implementation Guidelines

### 1. Test Database Setup
```typescript
class TestDatabase {
  async setup() {
    // Create fresh test database
    await this.createTables()
    await this.seedTestData()
  }
  
  async teardown() {
    // Clean up after each test
    await this.dropTables()
  }
  
  async seed(data: TestData) {
    // Insert realistic test data
  }
}
```

### 2. Service Integration
```typescript
// Use real services with test configuration
const auditService = new AuditService(testDatabase)
const repository = new FunctionModelRepository(testDatabase)
const useCase = new FunctionModelUseCase(repository, auditService)
```

### 3. Assertion Strategy
```typescript
// Assert the complete result
expect(result).toMatchObject({
  id: expect.any(String),
  name: 'Test Model',
  status: 'draft'
})

// Assert side effects
const auditEntries = await testDatabase.getAuditLogs(result.id)
expect(auditEntries).toHaveLength(1)
expect(auditEntries[0].operation).toBe('create')

// Assert database state
const dbRecord = await testDatabase.getFunctionModel(result.id)
expect(dbRecord).toMatchObject(result)
```

## Test Naming Convention
```
describe('FunctionModel Integration', () => {
  describe('createFunctionModel', () => {
    it('should create model and audit log successfully')
    it('should handle database errors and rollback')
    it('should propagate validation errors correctly')
    it('should maintain data consistency across layers')
  })
})
```

## Performance Considerations
- **Fast**: Use lightweight test databases
- **Isolated**: Each test should be independent
- **Parallel**: Tests should run in parallel when possible
- **Focused**: Test one integration point per test

## Common Patterns

### 1. Database Transaction Testing
```typescript
it('should rollback on error', async () => {
  await testDatabase.beginTransaction()
  
  try {
    await useCase.createFunctionModel(invalidData)
    fail('Should have thrown error')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
  }
  
  // Verify no data was persisted
  const models = await testDatabase.getAllModels()
  expect(models).toHaveLength(0)
})
```

### 2. Audit Log Integration
```typescript
it('should create audit log for successful operation', async () => {
  const result = await useCase.createFunctionModel(testData)
  
  const auditLogs = await testDatabase.getAuditLogs(result.id)
  expect(auditLogs).toHaveLength(1)
  expect(auditLogs[0]).toMatchObject({
    operation: 'create',
    table_name: 'function_models',
    record_id: result.id
  })
})
```

### 3. Error Propagation Testing
```typescript
it('should propagate database errors correctly', async () => {
  // Simulate database failure
  testDatabase.simulateError('connection_failed')
  
  await expect(useCase.createFunctionModel(testData))
    .rejects
    .toThrow(InfrastructureException)
})
```

## Success Criteria
- Tests catch real bugs (like your audit log error)
- Tests run in under 5 seconds each
- Tests provide clear failure messages
- Tests verify complete data flow
- Tests are independent and repeatable

This approach ensures you're testing the actual integration points where bugs occur, while maintaining fast feedback for development.

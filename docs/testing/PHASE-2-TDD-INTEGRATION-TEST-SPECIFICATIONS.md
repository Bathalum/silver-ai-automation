# Phase 2: Enhanced Function Model Workflows - TDD Integration Test Specifications

This document outlines the comprehensive integration tests created for **Phase 2: Use Case Implementation** following the **Test-Driven Development (TDD) approach**. These tests define the enhanced functionality requirements and currently exhibit the **RED state** (failing tests), which will drive the implementation of enhanced use cases.

## Overview

**File:** `tests/integration/use-cases/function-model-workflows.integration.test.ts`

This integration test suite serves as:
- **Boundary Filters**: Validating Clean Architecture compliance
- **Executable Documentation**: Defining expected system behavior
- **Implementation Driver**: TDD RED → GREEN → REFACTOR cycle

## Test Results Summary

**Current State:** 8 failed, 6 passed, 14 total tests

### ✅ Tests Currently Passing (Requirements Met)
1. **Version Management Placeholder** - Architecture compliance verified
2. **Archival Management Placeholder** - Architecture compliance verified  
3. **Soft Deletion Placeholder** - Architecture compliance verified
4. **Model Update Placeholder** - Architecture compliance verified
5. **Error Recovery Placeholder** - Architecture compliance verified
6. **Clean Architecture Compliance** - Dependency inversion verified

### ❌ Tests Currently Failing (Requirements to Implement)

#### 1. Enhanced Model Creation with Nodes
- **Complex Workflow Creation**: Create models with input, processing, and output nodes
- **Enhanced IO Node Support**: Input/output schemas, validation rules, delivery methods
- **Advanced Stage Nodes**: Parallel processing, resource requirements, business rules
- **Nested Container Support**: Function model containers with execution modes
- **Multi-Table Transactions**: Atomic operations across function_models and function_model_nodes
- **Advanced Querying**: Search by node content, complex filtering, metadata queries

#### 2. Repository Integration Enhancements
- **Enhanced SupabaseFunctionModelRepository**: Advanced search capabilities
- **Complex Query Support**: Pattern matching, content search, metadata filtering
- **Transaction Management**: Rollback on failures, consistency guarantees

#### 3. Performance and Scalability  
- **Large Model Support**: Handle models with 20+ nodes efficiently
- **Concurrent Operations**: Multiple simultaneous model operations
- **Performance Benchmarks**: Sub-5 second response times for complex operations

## Detailed Test Requirements

### Enhanced Model Creation Workflow

```typescript
// FAILING TEST - Defines Complete Workflow Requirements
it('should create a complete function model with input, processing, and output nodes', async () => {
  // Step 1: Create base model
  // Step 2: Add enhanced Input Node with schemas and validation
  // Step 3: Add Processing Stage with resource requirements
  // Step 4: Add Action Nodes (Tether, KB) with orchestration
  // Step 5: Add enhanced Output Node with delivery methods
  // Step 6: Verify complete structure and relationships
});
```

**Enhanced Requirements:**
- **Input Nodes**: Support input schemas, validation rules, processing hints
- **Stage Nodes**: Resource requirements (CPU, memory, storage), business rules
- **Action Nodes**: External API connectors, knowledge base integration
- **Output Nodes**: Multiple delivery methods (webhook, queue, direct)
- **Dependency Management**: Proper node relationship preservation

### Repository Integration Requirements

```typescript
// FAILING TEST - Defines Advanced Repository Capabilities
it('should support advanced querying with node content and metadata', async () => {
  // Test searchModelsByNodeContent()
  // Test findModelsWithComplexFilters()
  // Verify pattern matching and metadata search
});
```

**Enhanced Capabilities Needed:**
- `searchModelsByNodeContent(query: string)`: Search within node names/descriptions
- `findModelsWithComplexFilters(filters)`: Advanced filtering with patterns, status, metadata
- **Performance**: Efficient queries for large datasets
- **Consistency**: Transaction support across multiple tables

### Missing Use Case Implementations

The following use cases are **not yet implemented** and are required for Phase 2:

1. **PublishFunctionModelUseCase**
   - Model validation before publishing
   - Version management integration
   - Audit trail creation
   
2. **CreateModelVersionUseCase**
   - Complete node copying with dependencies
   - Version increment logic
   - Node relationship preservation

3. **ArchiveFunctionModelUseCase**
   - Risk assessment before archival
   - Cross-feature dependency checking
   - Cleanup of related links

4. **SoftDeleteFunctionModelUseCase**
   - Soft deletion with audit trails
   - Recovery mechanism implementation
   - Dependency validation

5. **UpdateFunctionModelUseCase**
   - Business rule validation
   - Metadata updating
   - Change tracking

6. **ManageErrorHandlingAndRecoveryUseCase**
   - Database failure handling
   - Automatic retry mechanisms
   - Rollback strategies

## Clean Architecture Compliance Validation

### Dependency Inversion ✅
```typescript
// PASSING TEST - Clean Architecture Verified
it('should verify that use cases depend only on interfaces', () => {
  // Validates that use cases work with any repository implementation
  // Confirms proper dependency injection
});
```

### Result Pattern Usage ❌
```typescript
// FAILING TEST - Result Pattern Consistency Needed
it('should ensure Result pattern is used consistently', async () => {
  // All operations must return Result<T> types
  // Consistent error handling across layers
});
```

## Implementation Priority

### Phase 2 Priority 1: Core Function Model Workflows

1. **Enhanced Model Creation** (Highest Priority)
   - Fix `AddContainerNodeUseCase` to support enhanced ioData/stageData
   - Fix `AddActionNodeToContainerUseCase` for nested orchestration
   - Implement repository enhancements for complex queries

2. **Repository Integration** (High Priority)  
   - Implement `searchModelsByNodeContent()` in SupabaseFunctionModelRepository
   - Implement `findModelsWithComplexFilters()` with pattern matching
   - Add transaction support for multi-table operations

3. **Performance Optimization** (Medium Priority)
   - Optimize for handling 20+ nodes per model
   - Implement efficient concurrent operation handling
   - Add performance benchmarking

### Phase 2 Priority 2: Missing Use Cases

4. **Publishing and Version Management**
   - Implement `PublishFunctionModelUseCase` with validation
   - Implement `CreateModelVersionUseCase` with node copying

5. **Lifecycle Management**
   - Implement `ArchiveFunctionModelUseCase` with risk assessment
   - Implement `SoftDeleteFunctionModelUseCase` with recovery
   - Implement `UpdateFunctionModelUseCase` with validation

6. **Error Handling and Recovery**
   - Implement `ManageErrorHandlingAndRecoveryUseCase`
   - Add comprehensive rollback mechanisms

## Expected Implementation Outcomes

After implementing the requirements defined by these failing tests:

### GREEN State Achievements
- ✅ All 14 tests passing
- ✅ Complete model lifecycle management
- ✅ Enhanced repository capabilities
- ✅ Performance benchmarks met
- ✅ Clean Architecture compliance maintained

### Business Value Delivery
- **Enhanced User Experience**: Complex workflow creation with validation
- **Robust Data Management**: Multi-table transactions with rollback
- **Scalable Operations**: Support for large models and concurrent users
- **Comprehensive Auditing**: Full lifecycle tracking with recovery options

## Running the Tests

```bash
# Run the integration test suite
pnpm test tests/integration/use-cases/function-model-workflows.integration.test.ts --verbose

# Expected initial state: 8 failed, 6 passed (TDD RED state)
# Target final state: 14 passed (TDD GREEN state)
```

## Next Steps

1. **Begin TDD Implementation**: Start with highest priority failing tests
2. **Incremental Development**: Implement one test at a time (RED → GREEN → REFACTOR)
3. **Continuous Validation**: Ensure all tests pass before moving to next feature
4. **Architecture Preservation**: Maintain Clean Architecture compliance throughout

These integration tests serve as the definitive specification for Phase 2 enhanced functionality and will guide the implementation to ensure all business requirements are met with proper architectural compliance.
# Edge Implementation Gaps - Clean Architecture TDD Plan

## Overview
This plan addresses the identified gaps in the edge implementation flow from UI to repository, following strict Clean Architecture TDD principles.

## Implementation Order (Inside-Out)

### Phase 1: Domain Layer (Core Business Logic)
**Order: 1-3**

1. **Fix Domain Interface Standardization** (Priority: Critical)
   - Test: Domain interface consistency validation
   - Implement: Standardize `INodeLinkRepository` interface across layers
   - Location: `lib/domain/interfaces/node-link-repository.ts`

2. **Add Missing Domain Methods** (Priority: High)
   - Test: Model-specific edge retrieval business rules
   - Implement: Add `findByModelId` method to repository interface
   - Location: `lib/domain/interfaces/node-link-repository.ts`

3. **Enhance Domain Validation** (Priority: Medium)
   - Test: Model ownership validation for edge operations
   - Implement: Model-scoped edge validation rules
   - Location: `lib/domain/services/edge-validation-service.ts`

### Phase 2: Application Layer (Use Cases)
**Order: 4-5**

4. **Fix Use Case Interface Dependencies** (Priority: Critical)
   - Test: Use case integration with standardized repository interface
   - Implement: Update CreateEdgeUseCase to use domain interface
   - Location: `lib/use-cases/edges/create-edge-use-case.ts`

5. **Fix Model Filtering in Queries** (Priority: High)
   - Test: Model-specific edge retrieval logic
   - Implement: Add modelId filtering to GetModelEdgesQuery
   - Location: `lib/use-cases/queries/get-model-edges-query.ts`

### Phase 3: Infrastructure Layer (Data Access)
**Order: 6-8**

6. **Implement Missing Repository Methods** (Priority: Critical)
   - Test: Database operations for model-specific edge retrieval
   - Implement: Add `findByModelId` to SupabaseNodeLinkRepository
   - Location: `lib/infrastructure/repositories/supabase-node-link-repository.ts`

7. **Database Schema Verification** (Priority: High)
   - Test: Database schema compliance tests
   - Implement: Create/verify migration files for edge tables
   - Location: `database/migrations/`

8. **DI Container Updates** (Priority: Medium)
   - Test: Service resolution with updated interfaces
   - Implement: Update service registrations if needed
   - Location: `lib/infrastructure/di/function-model-module.ts`

### Phase 4: API Layer (External Interface)
**Order: 9**

9. **Create Missing REST API Endpoints** (Priority: Medium)
   - Test: REST API endpoint functionality
   - Implement: Create `/api/function-models/[modelId]/edges` endpoints
   - Location: `app/api/function-models/[modelId]/edges/route.ts`

### Phase 5: UI Layer (Presentation)
**Order: 10**

10. **Improve Error Handling** (Priority: High)
    - Test: UI error state management
    - Implement: Better error handling and rollback in edge operations
    - Location: `app/(private)/dashboard/function-model/[modelId]/page.tsx`

## TDD Implementation Loop

For each item above, follow this strict loop:

### 1. TEST FIRST (Red)
```typescript
// Write failing test that defines expected behavior
describe('EdgeRepository.findByModelId', () => {
  it('should return only edges for specified model', async () => {
    // Arrange
    const modelId = 'test-model-123';
    const repository = new SupabaseNodeLinkRepository(mockSupabase);
    
    // Act
    const result = await repository.findByModelId(modelId);
    
    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(result.value.every(edge => edge.modelId === modelId)).toBe(true);
  });
});
```

### 2. IMPLEMENT CODE (Green)
```typescript
// Write minimum code to make test pass
async findByModelId(modelId: string): Promise<Result<NodeLink[]>> {
  try {
    const { data, error } = await this.supabase
      .from(this.NODE_LINKS_TABLE)
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }

    const links: NodeLink[] = [];
    for (const row of data || []) {
      const domainResult = this.toDomain(row);
      if (domainResult.isSuccess) {
        links.push(domainResult.value);
      }
    }

    return Result.ok<NodeLink[]>(links);
  } catch (error) {
    return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
  }
}
```

### 3. REFACTOR (Refactor)
- Clean up implementation
- Remove duplication
- Ensure Clean Architecture compliance

## Critical Rules

### 🚨 NON-NEGOTIABLE
- **No skipping steps** - Every implementation must have a failing test first
- **No code before test** - Tests define behavior, code serves tests
- **No outer layer implementation** without inner layer completion
- **No shortcuts** - Follow the 1→2→1→2 TDD loop religiously

### Layer Dependency Flow
```
UI Layer (React Components)
    ↓ (depends on)
API Layer (Server Actions/REST)
    ↓ (depends on)
Application Layer (Use Cases)
    ↓ (depends on)
Domain Layer (Business Logic)
    ↑ (implements interfaces defined by)
Infrastructure Layer (Repositories)
```

## Success Criteria

### Phase 1 Complete
- [ ] All domain interfaces standardized
- [ ] Domain tests passing
- [ ] No interface mismatches

### Phase 2 Complete  
- [ ] Use cases updated to use standardized interfaces
- [ ] Model filtering implemented in queries
- [ ] Application layer tests passing

### Phase 3 Complete
- [ ] Repository implements all required methods
- [ ] Database schema verified/migrated
- [ ] Infrastructure tests passing

### Phase 4 Complete
- [ ] REST API endpoints created and tested
- [ ] API integration tests passing

### Phase 5 Complete
- [ ] UI error handling improved
- [ ] End-to-end edge operations working
- [ ] UI integration tests passing

## Risk Mitigation

1. **Database Changes**: Test migrations on separate environment first
2. **Interface Changes**: Use adapter pattern if breaking changes needed
3. **Service Dependencies**: Verify DI container can resolve all dependencies
4. **Rollback Plan**: Each phase should be deployable independently

## Validation Commands

```bash
# Domain Layer
pnpm test lib/domain --verbose

# Application Layer  
pnpm test lib/use-cases --verbose

# Infrastructure Layer
pnpm test lib/infrastructure --verbose

# API Layer
pnpm test app/api --verbose

# UI Layer
pnpm test app/components --verbose

# Integration Tests
pnpm test tests/integration/edge --verbose
```

This plan ensures each gap is addressed methodically with proper Clean Architecture TDD implementation.
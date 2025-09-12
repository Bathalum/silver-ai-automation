# No-Mock Integration Test Plan

## Overview

This document outlines the comprehensive integration testing strategy for connecting UI components to production-ready use cases and database systems **WITHOUT ANY MOCKS**.

## Current Problem

The UI components are currently using:
- **Fake ID generation**: `'new-' + Date.now()` instead of real UUIDs
- **Mock data arrays**: Static `mockWorkflows` instead of real API calls
- **Disconnected operations**: UI operations don't persist to database
- **No real validation**: Client-side validation disconnected from domain rules

## Expected Solution

Complete integration where:
- **Form submission** → **Server Actions** → **Use Cases** → **Repository** → **Database**
- **Real UUID generation** via `crypto.randomUUID()`
- **Real API calls** to fetch and manage data
- **Consistent validation** across all layers
- **Database persistence** with proper error handling

## Integration Test Suite Architecture

### 1. Form Submission Integration Tests
**File**: `tests/integration/ui/form-submission-to-use-case.integration.test.ts`

**Purpose**: Test that form submissions create real models via CreateFunctionModelUseCase

**Key Tests**:
- ✅ Real model creation with UUID (not fake timestamp ID)
- ✅ Validation error handling matches domain rules
- ✅ Duplicate name detection via use case
- ✅ Database constraint enforcement
- ✅ Real persistence verification

**Current State**: FAILING - Tests expect functionality that doesn't exist yet

### 2. React Hooks Integration Tests
**File**: `tests/integration/ui/api-hooks-real-data.integration.test.ts`

**Purpose**: Test that React hooks fetch real data from API routes

**Key Tests**:
- ✅ `useModels` hook fetches real data from API
- ✅ API error handling in hooks
- ✅ Real model creation via `useModelOperations` 
- ✅ Loading state management with real API calls
- ✅ Refresh functionality triggers new API requests
- ✅ Pagination parameters passed correctly

**Current State**: FAILING - Hooks don't exist yet

### 3. End-to-End Workflow Integration Tests  
**File**: `tests/integration/ui/end-to-end-form-workflow.integration.test.ts`

**Purpose**: Test complete user workflow from form to database to list view

**Key Tests**:
- ✅ Complete workflow: Form → Database → List availability
- ✅ Multi-step form validation consistency across layers
- ✅ Concurrent form submissions without data corruption  
- ✅ Database transaction integrity
- ✅ Real-time data consistency after operations

**Current State**: FAILING - End-to-end integration doesn't exist yet

### 4. Server Actions Integration Tests
**File**: `tests/integration/ui/server-actions-integration.test.ts`

**Purpose**: Test Next.js Server Actions replacing fake client operations

**Key Tests**:
- ✅ Server action creates real model and redirects properly
- ✅ Form data validation before use case execution
- ✅ Use case failure handling in server actions
- ✅ Authentication integration with server actions
- ✅ Complex form data handling (files, nested objects)
- ✅ CRUD operations via server actions

**Current State**: FAILING - Server actions don't exist yet

## Test Infrastructure

### Integration Test Database Utils
**File**: `tests/utils/integration-test-database.ts`

**Features**:
- Real Supabase database connections
- Test data isolation with unique prefixes
- Automatic cleanup after tests
- Transaction support for atomic operations
- Database constraint testing utilities
- Performance monitoring for operations
- Real data assertion helpers

### Real Test Data Factory
**File**: `tests/utils/real-test-data-factory.ts`

**Purpose**: Create standardized test data for integration tests

## Implementation Strategy

### Phase 1: Server Actions (CRITICAL)
Replace the fake `handleCreate` behavior:

**Current Code** (in `app/(private)/dashboard/function-model/new/page.tsx`):
```javascript
const handleCreate = () => {
  const newWorkflowId = 'new-' + Date.now()  // FAKE ID!
  router.push(`/dashboard/function-model/${newWorkflowId}`)
}
```

**Expected Implementation**:
```javascript
// app/actions/model-actions.ts
export async function createModelAction(formData: FormData) {
  'use server'
  
  const result = await createUseCase.execute({
    name: formData.get('name'),
    description: formData.get('description'),
    userId: getCurrentUser().id
  });
  
  if (result.isSuccess) {
    redirect(`/dashboard/function-model/${result.value.modelId}`);
  }
  
  return { error: result.error };
}
```

### Phase 2: React Hooks for API Integration
Replace mock data with real API calls:

**Current Code** (in `app/(private)/dashboard/function-model/list/page.tsx`):
```javascript
const mockWorkflows = [  // MOCK DATA!
  { id: '1', name: 'Customer Onboarding Process', ... }
]
```

**Expected Implementation**:
```javascript
// hooks/useModels.ts
export function useModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchModels();
  }, []);
  
  const fetchModels = async () => {
    const response = await fetch('/api/function-models');
    const data = await response.json();
    setModels(data.models);
    setLoading(false);
  };
  
  return { models, loading, refresh: fetchModels };
}
```

### Phase 3: Form Integration
Connect forms to server actions:

**Expected Implementation**:
```javascript
// In form component
<form action={createModelAction}>
  <input name="name" />
  <input name="description" />
  <button type="submit">Create</button>
</form>
```

### Phase 4: Error Handling and Validation
Ensure consistent validation across all layers:

**Expected Flow**:
1. **Client validation**: Basic format checks (required, length)
2. **Server action validation**: Parse and validate form data  
3. **Use case validation**: Business rule enforcement
4. **Repository validation**: Database constraint handling

## Test Execution Strategy

### Running the Tests

All integration tests are designed to **FAIL INITIALLY** (Red phase of TDD):

```bash
# Run integration tests (will fail initially)
pnpm test:integration

# Run specific test suites
pnpm test tests/integration/ui/form-submission-to-use-case.integration.test.ts
pnpm test tests/integration/ui/api-hooks-real-data.integration.test.ts
pnpm test tests/integration/ui/end-to-end-form-workflow.integration.test.ts
pnpm test tests/integration/ui/server-actions-integration.test.ts
```

### Expected Test Results (Initially)

❌ **All tests should FAIL** with messages like:
- `"createModelServerAction not implemented"`
- `"useModels hook not implemented"` 
- `"Form submission creates fake ID instead of real model"`
- `"UI uses mock data instead of real API calls"`

### Test-Driven Implementation Flow

1. **Red**: Run tests → See failures defining expected behavior
2. **Green**: Implement minimal code to make tests pass  
3. **Refactor**: Improve code while keeping tests passing
4. **Repeat**: For each failing test

## Database Test Environment

### Supabase Configuration
Tests use real Supabase database with:
- **Isolated test data**: Unique prefixes prevent collisions
- **Automatic cleanup**: Test data removed after each test
- **Real constraints**: Actual database validation and constraints
- **Transaction support**: Proper rollback on failures

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Success Criteria

### Tests Pass When:
1. ✅ Forms create real models with UUIDs in database
2. ✅ UI fetches real data from API routes 
3. ✅ Server actions handle form submission properly
4. ✅ Error handling works across all layers
5. ✅ Data consistency maintained throughout operations
6. ✅ Real authentication integration works
7. ✅ Database constraints are properly enforced

### UI Behavior Changes:
1. ❌ No more fake `'new-' + Date.now()` IDs
2. ❌ No more `mockWorkflows` static arrays  
3. ❌ No more disconnected client-side operations
4. ✅ Real UUID generation via use cases
5. ✅ Real API calls with proper loading states
6. ✅ Real database persistence and error feedback
7. ✅ Consistent validation across client and server

## Architecture Compliance

### Clean Architecture Boundaries Tested:
- **Presentation Layer**: React components and forms
- **Interface Adapters**: API routes, server actions, React hooks
- **Application Layer**: Use cases with business workflows  
- **Infrastructure Layer**: Repository implementations and database

### Dependency Flow Verification:
- ✅ UI depends on Interface Adapters (hooks, server actions)
- ✅ Interface Adapters depend on Application Layer (use cases)
- ✅ Application Layer depends on Domain (entities, value objects)
- ✅ Infrastructure implements interfaces defined by inner layers

## Next Steps

1. **Run the integration tests** to see current failing state
2. **Implement server actions** to replace fake form handling
3. **Create React hooks** to replace mock data usage  
4. **Connect forms** to real server actions
5. **Implement error handling** across all layers
6. **Verify tests pass** with real end-to-end functionality

This approach ensures that **tests define the expected behavior first**, then implementation follows to make tests pass, creating a robust, well-tested integration between UI and backend systems.
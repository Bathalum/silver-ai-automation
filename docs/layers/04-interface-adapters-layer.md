# Interface Adapter Layer Documentation

**Version:** 1.0  
**Created:** September 5, 2025  
**Status:** Draft

## Table of Contents

1. [Overview](#overview)
2. [Architecture Context](#architecture-context)
3. [Web Controllers](#web-controllers)
4. [Data Transfer Objects (DTOs)](#data-transfer-objects-dtos)
5. [React Hooks Adapter](#react-hooks-adapter)
6. [Server Actions](#server-actions)
7. [Form Adapters](#form-adapters)
8. [Authentication Adapters](#authentication-adapters)
9. [Real-Time Adapters](#real-time-adapters)
10. [Error Handling](#error-handling)
11. [Missing Components Analysis](#missing-components-analysis)
12. [Implementation Guidelines](#implementation-guidelines)

## Overview

The Interface Adapter layer serves as the bridge between the presentation layer (UI components, forms, and user interactions) and the application layer (use cases and business logic). This layer transforms data between formats suitable for the UI and formats expected by business logic, handles user input validation, and manages presentation-specific concerns.

**Key Responsibilities:**
- Convert between UI data formats and domain models
- Handle HTTP request/response cycles
- Manage form submissions and validation
- Provide React hooks for data fetching and mutations
- Handle authentication and authorization flows
- Manage real-time data synchronization

## Architecture Context

### Current Implementation Status

**✅ COMPLETE:**
- API Route Handlers (Next.js App Router)
- Type-safe API Client with comprehensive error handling
- React Hooks definitions for all major operations
- DTO schemas with Zod validation
- HTTP middleware chain (auth, validation, rate limiting)

**❌ CRITICAL GAPS:**
- UI components use mock data instead of API hooks
- Form handlers generate fake IDs instead of calling use cases
- Missing Server Actions for Next.js form submissions
- React hooks are defined but not connected to actual API calls
- No integration between UI components and interface adapter hooks

### Clean Architecture Boundaries

```
Presentation Layer (UI Components)
         ↕ (Interface Adapters)
Application Layer (Use Cases)
         ↕ (Infrastructure)  
Domain Layer (Entities, Rules)
```

## Web Controllers

### API Route Structure

The system implements a comprehensive REST API using Next.js App Router:

| Endpoint | Method | Controller | Use Case |
|----------|--------|------------|----------|
| `/api/function-models` | GET | ListModelsController | ListFunctionModelsUseCase |
| `/api/function-models` | POST | CreateModelController | CreateFunctionModelUseCase |
| `/api/function-models/[id]` | GET | GetModelController | GetFunctionModelUseCase |
| `/api/function-models/[id]` | PUT | UpdateModelController | UpdateFunctionModelUseCase |
| `/api/function-models/[id]` | DELETE | DeleteModelController | ArchiveFunctionModelUseCase |
| `/api/function-models/[id]/publish` | POST | PublishModelController | PublishFunctionModelUseCase |
| `/api/function-models/[id]/nodes` | GET/POST | NodeController | AddContainerNodeUseCase |
| `/api/function-models/[id]/actions` | GET/POST | ActionController | ManageActionNodesUseCase |
| `/api/function-models/search` | GET | SearchController | SearchModelsUseCase |
| `/api/function-models/[id]/statistics` | GET | StatisticsController | GetModelStatisticsUseCase |
| `/api/function-models/[id]/audit` | GET | AuditController | GetAuditLogsUseCase |
| `/api/function-models/[id]/execute` | POST | ExecuteController | ExecuteFunctionModelUseCase |

### Controller Implementation Pattern

```typescript
// Example Controller Structure
export async function GET(request: NextRequest, context: { params: { modelId: string } }) {
  try {
    const { params } = context;
    const searchParams = request.nextUrl.searchParams;
    
    // 1. Extract and validate parameters
    const query = GetModelQuerySchema.parse(Object.fromEntries(searchParams));
    
    // 2. Execute use case
    const useCase = container.resolve(GetFunctionModelUseCase);
    const result = await useCase.execute(params.modelId, query);
    
    // 3. Handle result and transform response
    if (result.isFailure()) {
      return NextResponse.json(createErrorResponse(result.error), { 
        status: getHttpStatus(result.error) 
      });
    }
    
    // 4. Transform domain model to DTO
    const modelDto = ModelDtoMapper.toDto(result.value);
    
    return NextResponse.json(createSuccessResponse(modelDto));
  } catch (error) {
    return handleControllerError(error);
  }
}
```

## Data Transfer Objects (DTOs)

### DTO Architecture

**Purpose:** Transform between domain models and presentation layer data formats while maintaining type safety and validation.

### Core DTOs

| DTO | Domain Entity | Validation Schema | Purpose |
|-----|---------------|-------------------|---------|
| `ModelDto` | `FunctionModel` | `CreateModelRequestSchema` | Model CRUD operations |
| `NodeDto` | `Node` subclasses | `AddNodeRequestSchema` | Node management |
| `ActionNodeDto` | `ActionNode` subclasses | `AddActionRequestSchema` | Action management |
| `ModelStatisticsDto` | Computed values | N/A | Analytics display |
| `AuditLogDto` | `AuditLog` | `AuditLogQuerySchema` | Audit trail |
| `WorkflowExecutionDto` | `ExecutionContext` | `ExecuteWorkflowRequestSchema` | Execution tracking |

### DTO Transformation Examples

```typescript
// Domain to DTO transformation
class ModelDtoMapper {
  static toDto(model: FunctionModel): ModelDto {
    return {
      modelId: model.id.value,
      name: model.name.value,
      description: model.description,
      version: model.version.toString(),
      status: model.status.value,
      // ... additional mappings
    };
  }
  
  static toDomain(dto: CreateModelRequest): FunctionModelData {
    return {
      name: ModelName.create(dto.name).value,
      description: dto.description,
      // ... validation and transformation
    };
  }
}
```

## React Hooks Adapter

### Current Hook Definitions

The system defines comprehensive hooks but **CRITICAL GAP:** UI components don't use them.

| Hook | Purpose | Status | Integration Required |
|------|---------|---------|---------------------|
| `useModels()` | List/filter models | ✅ Defined | ❌ Not connected to UI |
| `useModel(id)` | Single model fetch | ✅ Defined | ❌ Not connected to UI |
| `useModelOperations()` | CRUD operations | ✅ Defined | ❌ Not connected to UI |
| `useModelNodes(id)` | Node management | ✅ Defined | ❌ Not connected to UI |
| `useModelActions(id)` | Action management | ✅ Defined | ❌ Not connected to UI |
| `useModelSearch()` | Advanced search | ✅ Defined | ❌ Not connected to UI |
| `useModelStatistics(id)` | Analytics data | ✅ Defined | ❌ Not connected to UI |

### Hook Integration Pattern

```typescript
// CURRENT PROBLEM: UI components use mock data
const mockWorkflows = [
  { id: '1', name: 'Customer Onboarding Process', ... }
];

// SOLUTION: Use actual hooks
export default function FunctionModelPage() {
  const { models, loading, error, pagination, refetch } = useModels({
    page: 1,
    pageSize: 20,
    status: 'active'
  });
  
  const { createModel, loading: creating } = useModelOperations();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <WorkflowList 
      workflows={models} 
      onWorkflowCreate={handleCreate}
      // ... other props
    />
  );
}
```

## Server Actions

### Missing Server Actions

Server Actions are **COMPLETELY MISSING** but essential for Next.js form handling:

```typescript
// Required Server Actions
'use server';

export async function createModelAction(formData: FormData): Promise<ActionResult<ModelDto>> {
  try {
    const data = CreateModelRequestSchema.parse(Object.fromEntries(formData));
    const useCase = container.resolve(CreateFunctionModelUseCase);
    const result = await useCase.execute(data);
    
    if (result.isFailure()) {
      return { success: false, error: result.error.message };
    }
    
    revalidatePath('/dashboard/function-model');
    return { success: true, data: ModelDtoMapper.toDto(result.value) };
  } catch (error) {
    return { success: false, error: 'Invalid form data' };
  }
}

export async function updateModelAction(id: string, formData: FormData): Promise<ActionResult<ModelDto>>;
export async function publishModelAction(id: string, formData: FormData): Promise<ActionResult<ModelDto>>;
export async function archiveModelAction(id: string): Promise<ActionResult<void>>;
```

### Form Integration

```typescript
// CURRENT PROBLEM: Forms generate fake IDs
const handleSubmit = (data: CreateWorkflowData) => {
  const newWorkflowId = 'new-' + Date.now(); // FAKE ID!
  // ... mock implementation
};

// SOLUTION: Use Server Actions
import { createModelAction } from './actions';

export function WorkflowCreator() {
  return (
    <form action={createModelAction}>
      <input name="name" required />
      <textarea name="description" />
      <button type="submit">Create Workflow</button>
    </form>
  );
}
```

## Form Adapters

### Form Validation Architecture

**Two-Layer Validation:**
1. **UI Validation:** Format, required fields, character limits
2. **Domain Validation:** Business rules, invariants, complex constraints

```typescript
// UI Layer Validation
const workflowFormSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  templateId: z.string().uuid().optional()
});

// Domain Layer Validation (via Use Cases)
const createModelResult = await useCase.execute(validatedData);
if (createModelResult.isFailure()) {
  // Display domain validation errors
  setFieldError('name', createModelResult.error.message);
}
```

### Form State Management

```typescript
export function ModelCreationForm() {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(workflowFormSchema)
  });
  
  const { createModel, loading, error } = useModelOperations();
  
  const onSubmit = async (data: CreateModelRequest) => {
    const result = await createModel(data);
    if (result) {
      router.push(`/dashboard/function-model/${result.modelId}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields with proper validation */}
    </form>
  );
}
```

## Authentication Adapters

### Authentication Flow Integration

```typescript
export function useApiClient(): FunctionModelApiClient {
  const { session } = useSession();
  const [client] = useState(() => {
    const apiClient = new FunctionModelApiClient();
    if (session?.accessToken) {
      apiClient.setAuthToken(session.accessToken);
    }
    return apiClient;
  });
  
  useEffect(() => {
    if (session?.accessToken) {
      client.setAuthToken(session.accessToken);
    } else {
      client.clearAuthToken();
    }
  }, [session?.accessToken, client]);
  
  return client;
}
```

## Real-Time Adapters

### Missing Real-Time Integration

**Required for:**
- Model collaboration (multiple users editing)
- Execution status updates
- Live statistics updates

```typescript
// Missing: Real-time hooks
export function useModelRealTime(modelId: string) {
  const [model, setModel] = useState<ModelDto | null>(null);
  
  useEffect(() => {
    const subscription = supabase
      .from('function_models')
      .on('UPDATE', payload => {
        if (payload.old.id === modelId) {
          setModel(ModelDtoMapper.toDto(payload.new));
        }
      })
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [modelId]);
  
  return model;
}
```

## Error Handling

### Error Boundary Architecture

```typescript
export class ApiErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    if (error instanceof ApiError) {
      return {
        hasError: true,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      };
    }
    
    return { hasError: true, error: null };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

## Missing Components Analysis

### Priority 1: Critical Integration Issues

| Component | Current State | Required Action | Impact |
|-----------|---------------|-----------------|---------|
| UI Data Fetching | Uses mock data | Connect to `useModels()` hooks | High - No real data displayed |
| Form Submissions | Generates fake IDs | Implement Server Actions | High - No data persistence |
| Model Creation | Mock workflow | Use `createModel()` hook | High - Core feature broken |
| Authentication | Partially implemented | Token management in hooks | Medium - Security concerns |

### Priority 2: Missing Features

| Feature | Description | Implementation Required |
|---------|-------------|------------------------|
| Real-time Updates | Live collaboration | WebSocket/Supabase subscriptions |
| Optimistic Updates | UI responsiveness | Mutation state management |
| Offline Support | Resilient UX | Service Worker + local cache |
| File Upload | Model import/export | Multipart form handling |

## Implementation Guidelines

### Step 1: Connect UI to Hooks

```typescript
// Replace mock data usage
// FROM:
const mockWorkflows = [...];

// TO:
const { models: workflows, loading, error } = useModels();
```

### Step 2: Implement Server Actions

```typescript
// Create server action files
// - app/actions/model-actions.ts
// - app/actions/node-actions.ts
// - app/actions/execution-actions.ts
```

### Step 3: Form Integration

```typescript
// Update form components to use real API calls
// - Remove fake ID generation
// - Add proper error handling
// - Implement optimistic updates
```

### Step 4: Authentication Integration

```typescript
// Ensure all API calls include authentication
// - Update useApiClient hook
// - Handle token refresh
// - Implement proper error handling for auth failures
```

### Step 5: Real-time Features

```typescript
// Add real-time subscriptions for:
// - Model updates during collaboration
// - Execution status changes
// - Statistics updates
```

### Testing Strategy

**Unit Tests:**
- DTO mappers with domain model round-trip tests
- Hook behavior with mock API responses
- Form validation with edge cases

**Integration Tests:**
- Complete user workflows (create → edit → publish → execute)
- Error handling scenarios
- Authentication flows

**E2E Tests:**
- Full application workflows
- Real-time collaboration scenarios
- Performance under load

### Edge Cases

1. **Network Connectivity:** Offline handling and retry logic
2. **Concurrent Modifications:** Optimistic updates with conflict resolution
3. **Large Models:** Pagination and virtualization for complex workflows
4. **Authentication Expiry:** Seamless token refresh without interruption
5. **Validation Conflicts:** UI validation vs. domain validation mismatches

This documentation provides the complete architecture for bridging your production-ready Clean Architecture backend to a fully functional presentation layer, addressing all identified gaps while maintaining strict architectural boundaries.
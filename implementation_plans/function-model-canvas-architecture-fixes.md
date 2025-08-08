# Function Model Canvas Architecture Fixes - Implementation Plan

## Overview

This document captures all identified issues with the function model canvas architecture that need systematic resolution. The issues span across Clean Architecture violations, state management problems, and data flow inconsistencies.

## Critical Issues Identified

### **Issue 1: Overlapping Save Methods**

**Problem**: Multiple save functions with different patterns and data flows
**Location**: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`

**Functions Involved**:
- `debouncedSave()` (lines 600-620): Name/description updates with 1-second debounce
- `handleQuickSave()` (lines 625-645): Orchestrates all save operations
- `persistPendingPositions()` (lines 295-325): Handles position updates
- `persistChanges()` (lines 250-400 in use-function-model-nodes.ts): Handles all unsaved changes

**Data Flow Conflicts**:
- **Position Updates**: Canvas immediately updates application state, then defers database persistence
- **Content Updates**: Canvas debounces for 1 second, then calls `updateFunctionModel()` directly
- **Version Save**: Sidebar bypasses application layer, directly queries database

**Impact**: Inconsistent state management, potential data loss, complex debugging

### **Issue 2: Infrastructure Leakage in Application Layer**

**Problem**: Direct database access in presentation layer components
**Location**: `app/(private)/dashboard/function-model/components/persistence-sidebar.tsx`

**Direct Database Access Found**:
- `handleSave()` (lines 145-200): Direct Supabase queries
- Lines 150-180: Direct `supabase.from('function_model_nodes').select('*')`
- Lines 155-165: Direct `supabase.from('node_links').select('*')`

**Clean Architecture Violations**:
- **Should Be**: Sidebar → Application Hook → Use Case → Repository → Database
- **Actually Is**: Sidebar → Direct Supabase → Database

**Impact**: Violates Clean Architecture principles, creates tight coupling, makes testing difficult

### **Issue 3: Race Conditions in Loading**

**Problem**: Multiple async operations without proper coordination
**Location**: Multiple files

**Race Condition Scenarios**:
1. **Initial Load vs Version Load**: `loadNodes()` and version restoration can run simultaneously
2. **Position Persistence vs Version Load**: `persistPendingPositions()` and version restoration conflict
3. **State Refresh vs User Actions**: `loadNodes()` can clear unsaved changes while user is editing

**Functions Involved**:
- `loadNodes()` in use-function-model-nodes.ts (lines 50-80): Initial model loading
- `onVersionLoaded()` callback in canvas (lines 852-890): Version restoration callback
- `handleLoad()` in persistence-sidebar.tsx (lines 288-325): Version loading trigger

**Impact**: Data inconsistency, lost user changes, confusing user experience

### **Issue 4: Mixed Responsibilities in Canvas**

**Problem**: Canvas component handles both UI events and business logic orchestration
**Location**: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`

**Functions with Mixed Concerns**:
- `handleQuickSave()` (lines 625-645): Orchestrates business logic (should be in Application Layer)
- `handleNodeDragStop()` (lines 285-295): Handles UI events AND business logic
- `onVersionLoaded()` (lines 852-890): Complex orchestration logic in presentation layer

**Responsibility Violations**:
- **UI Events**: Canvas correctly handles React Flow events
- **Business Logic**: Canvas incorrectly orchestrates save operations
- **State Management**: Canvas manages optimistic updates
- **Error Handling**: Canvas handles user feedback

**Impact**: Violates Single Responsibility Principle, makes testing difficult, creates tight coupling

### **Issue 5: Complex Version Loading**

**Problem**: Overly complex version restoration with multiple async operations
**Location**: Multiple files

**Complexity Issues**:
1. **Multiple Async Operations**: Version restoration → Position persistence → State refresh
2. **No Transaction Management**: Operations can fail partway through
3. **Manual Delays**: `setTimeout(1000)` to ensure operations complete
4. **State Conflicts**: Version restoration can conflict with unsaved changes

**Functions Involved**:
- `restoreModelFromVersion()` (lines 268-325 in version-control.ts): Complete restoration
- `onVersionLoaded()` (lines 852-890 in canvas): Complex callback orchestration
- `handleLoad()` (lines 288-325 in sidebar): Version loading trigger

**Impact**: Unreliable version restoration, poor user experience, potential data corruption

### **Issue 6: Inconsistent Error Handling**

**Problem**: Different error handling patterns across layers
**Location**: Multiple files

**Inconsistencies**:
1. **Error Types**: Some use `Error.message`, others use generic strings
2. **User Feedback**: Some show toasts, others show alerts, others show inline errors
3. **Error Recovery**: Some retry automatically, others require user action
4. **Error Context**: Some include operation context, others don't

**Error Handling Patterns Found**:
- `use-function-model-nodes.ts` (lines 80-100): Generic error handling with toast
- `function-model-canvas.tsx` (lines 700-720): Canvas-specific error display
- `persistence-sidebar.tsx` (lines 250-270): Sidebar-specific error handling

**Impact**: Inconsistent user experience, difficult debugging, poor error recovery

### **Issue 7: Missing Transaction Support**

**Problem**: Multi-step operations without database transaction management
**Location**: Multiple files

**Multi-Step Operations Without Transactions**:
- `persistChanges()` (lines 250-400): Updates nodes, links, and deletions separately
- `handleSave()` (lines 145-200): Updates model, creates version, updates nodes separately
- `restoreModelFromVersion()` (lines 268-325): Restores version data without transaction

**Transaction Violations**:
- **Node Creation**: Creates nodes first, then links (can fail between)
- **Version Creation**: Updates model, then creates version (can fail between)
- **Version Restoration**: Restores nodes, then links (can fail between)

**Impact**: Potential data inconsistency, partial failures, difficult rollback

## Implementation Plan

### **Phase 1: Unified Save Service** 🔄 **PRIORITY: HIGH**

**Objective**: Create a single, unified save service that handles all save operations consistently

**Files to Modify**:
- Create: `lib/application/services/function-model-save-service.ts`
- Update: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`
- Update: `app/(private)/dashboard/function-model/components/persistence-sidebar.tsx`

**Implementation Steps**:
1. **Create Unified Save Service**
   - Implement `FunctionModelSaveService` class
   - Handle all save types (positions, content, versions)
   - Implement proper transaction management
   - Add comprehensive error handling

2. **Refactor Canvas Save Methods**
   - Replace `debouncedSave()`, `handleQuickSave()`, `persistPendingPositions()`
   - Use unified save service for all operations
   - Maintain existing UI patterns

3. **Refactor Sidebar Save Methods**
   - Replace direct database queries with service calls
   - Integrate with application state management
   - Maintain existing UI patterns

### **Phase 2: Infrastructure Layer Cleanup** 🔄 **PRIORITY: HIGH**

**Objective**: Remove infrastructure leakage and enforce Clean Architecture

**Files to Modify**:
- Update: `app/(private)/dashboard/function-model/components/persistence-sidebar.tsx`
- Create: `lib/application/use-cases/function-model-persistence-use-cases.ts`
- Update: `lib/infrastructure/repositories/function-model-repository.ts`

**Implementation Steps**:
1. **Create Persistence Use Cases**
   - Implement `getCurrentModelState()` use case
   - Implement `createVersionSnapshot()` use case
   - Add proper validation and error handling

2. **Remove Direct Database Access**
   - Replace direct Supabase queries with use case calls
   - Maintain existing functionality
   - Add proper error handling

3. **Update Repository Layer**
   - Add methods for current state retrieval
   - Add transaction support
   - Improve error handling

### **Phase 3: State Management Refactor** 🔄 **PRIORITY: MEDIUM**

**Objective**: Implement proper state coordination and eliminate race conditions

**Files to Modify**:
- Update: `lib/application/hooks/use-function-model-nodes.ts`
- Update: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`
- Create: `lib/application/services/state-coordination-service.ts`

**Implementation Steps**:
1. **Create State Coordination Service**
   - Implement proper async operation coordination
   - Add state locking mechanisms
   - Implement proper cleanup

2. **Refactor Loading Operations**
   - Coordinate `loadNodes()` with version operations
   - Add proper state locking during operations
   - Implement proper error recovery

3. **Update Hook Dependencies**
   - Fix dependency arrays to prevent infinite loops
   - Add proper cleanup mechanisms
   - Optimize for single instance usage

### **Phase 4: Component Responsibility Separation** 🔄 **PRIORITY: MEDIUM**

**Objective**: Separate UI concerns from business logic

**Files to Modify**:
- Update: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`
- Create: `lib/application/services/canvas-business-logic-service.ts`
- Update: `app/(private)/dashboard/function-model/components/function-model-container.tsx`

**Implementation Steps**:
1. **Create Business Logic Service**
   - Move business logic from canvas to service
   - Implement proper separation of concerns
   - Add comprehensive error handling

2. **Refactor Canvas Component**
   - Keep only UI event handling
   - Remove business logic orchestration
   - Maintain existing user experience

3. **Update Container Component**
   - Coordinate business logic service with UI
   - Maintain proper state flow
   - Add proper error boundaries

### **Phase 5: Version Management Overhaul** 🔄 **PRIORITY: MEDIUM**

**Objective**: Simplify and make version operations more reliable

**Files to Modify**:
- Update: `lib/application/use-cases/function-model-version-control.ts`
- Update: `app/(private)/dashboard/function-model/components/persistence-sidebar.tsx`
- Update: `app/(private)/dashboard/function-model/components/function-model-canvas.tsx`

**Implementation Steps**:
1. **Simplify Version Restoration**
   - Implement atomic version restoration
   - Remove manual delays and timeouts
   - Add proper transaction support

2. **Improve Version Loading UX**
   - Add proper loading states
   - Implement progress indicators
   - Add proper error recovery

3. **Add Version Validation**
   - Implement pre-restoration validation
   - Add rollback mechanisms
   - Improve error reporting

### **Phase 6: Error Handling Standardization** 🔄 **PRIORITY: LOW**

**Objective**: Implement consistent error handling across all layers

**Files to Modify**:
- Create: `lib/application/services/error-handling-service.ts`
- Update: All component files
- Update: All use case files

**Implementation Steps**:
1. **Create Error Handling Service**
   - Implement consistent error types
   - Add proper error context
   - Implement error recovery strategies

2. **Standardize Error Responses**
   - Implement consistent error messages
   - Add proper error logging
   - Implement user-friendly error display

3. **Add Error Recovery**
   - Implement automatic retry mechanisms
   - Add manual recovery options
   - Improve error reporting

### **Phase 7: Transaction Management** 🔄 **PRIORITY: HIGH**

**Objective**: Add proper database transaction support

**Files to Modify**:
- Update: `lib/infrastructure/repositories/function-model-repository.ts`
- Update: `lib/infrastructure/repositories/function-model-version-repository.ts`
- Update: All use case files

**Implementation Steps**:
1. **Add Transaction Support**
   - Implement database transaction wrappers
   - Add proper rollback mechanisms
   - Implement transaction logging

2. **Update Multi-Step Operations**
   - Wrap all multi-step operations in transactions
   - Add proper error handling
   - Implement rollback strategies

3. **Add Transaction Monitoring**
   - Implement transaction performance monitoring
   - Add transaction failure alerts
   - Implement transaction recovery

## Success Criteria

### **Architecture Compliance**
- ✅ **Clean Architecture**: Proper layer separation maintained
- ✅ **Single Responsibility**: Each component has clear purpose
- ✅ **Dependency Inversion**: Application layer independent of infrastructure
- ✅ **No Infrastructure Leakage**: All database access through repositories

### **Functionality Preservation**
- ✅ **All Existing Features**: No regression in functionality
- ✅ **User Experience**: Maintain existing UI/UX patterns
- ✅ **Performance**: No degradation in performance
- ✅ **Error Handling**: Improved error recovery

### **Code Quality**
- ✅ **Maintainability**: Easier to maintain and extend
- ✅ **Testability**: Components are easier to test
- ✅ **Debugging**: Easier to trace issues
- ✅ **Documentation**: Clear code documentation

## Risk Assessment

### **High Risk**
- **Infrastructure Leakage Fix**: May break existing functionality
- **Transaction Management**: Complex database changes
- **State Management Refactor**: May cause state inconsistencies

### **Medium Risk**
- **Save Service Unification**: May affect user experience
- **Component Responsibility Separation**: May require significant refactoring
- **Version Management Overhaul**: May affect existing version data

### **Low Risk**
- **Error Handling Standardization**: Mostly additive changes
- **Documentation Updates**: No functional changes

## Testing Strategy

### **Unit Testing**
- Test each service and use case independently
- Mock dependencies for isolated testing
- Test error scenarios and edge cases

### **Integration Testing**
- Test complete save/load workflows
- Test version restoration scenarios
- Test error recovery mechanisms

### **Manual Testing**
- Test all user interactions
- Verify no regression in functionality
- Test performance under load

## Timeline Estimate

### **Phase 1-2 (High Priority)**: 2-3 weeks
- Unified save service implementation
- Infrastructure layer cleanup

### **Phase 3-5 (Medium Priority)**: 3-4 weeks
- State management refactor
- Component responsibility separation
- Version management overhaul

### **Phase 6-7 (Low/High Priority)**: 2-3 weeks
- Error handling standardization
- Transaction management

**Total Estimated Time**: 7-10 weeks

## Next Steps

1. **Prioritize Issues**: Focus on high-priority issues first
2. **Create Detailed Plans**: Develop detailed implementation plans for each phase
3. **Implement Incrementally**: Make changes in small, testable increments
4. **Test Thoroughly**: Comprehensive testing at each step
5. **Document Changes**: Update documentation as changes are made

This implementation plan provides a systematic approach to resolving all identified issues while maintaining functionality and improving architecture compliance.

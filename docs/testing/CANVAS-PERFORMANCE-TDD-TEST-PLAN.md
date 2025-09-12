# Canvas Performance Optimization - TDD Test Plan

## Overview

This document outlines the comprehensive Test-Driven Development (TDD) test plan for Phase 1 of the canvas performance optimization. The tests are designed to **fail initially** and define the exact behavior needed before any implementation begins.

## Performance Targets

| Metric | Current State | Target State | Improvement |
|--------|--------------|--------------|-------------|
| Drag FPS | 2-10 FPS | 60 FPS | 6-30x improvement |
| Server Calls | 50+ per drag | ≤3 per drag | 90%+ reduction |
| Re-renders | All nodes | Only dragged node | 90%+ reduction |
| Batch Window | N/A | 300ms | New feature |

## Test Structure

### 1. Performance Test Infrastructure
**File**: `tests/performance/canvas-performance-test-utils.ts`

**Purpose**: Provides comprehensive testing utilities for measuring and validating performance improvements.

**Key Classes**:
- `PerformanceTestUtils`: Core measurement and validation
- `ArchitectureBoundaryValidator`: Clean Architecture compliance
- `simulateDragOperation()`: Realistic drag simulation
- `createPerformanceMonitoredRender()`: Component performance tracking

### 2. Debounced Position Updates Tests
**File**: `tests/performance/debounced-position-updates.test.ts`

**RED Phase Tests**:

#### Test 1: Batch Rapid Position Updates
- **Expectation**: 50+ rapid position changes → ≤3 server calls
- **Validation**: Batching mechanism with 300ms window
- **Current Status**: ❌ WILL FAIL until debouncing implemented

#### Test 2: Batch Window Timing
- **Expectation**: Calls respect 300ms batch window
- **Validation**: No calls within batch window
- **Current Status**: ❌ WILL FAIL until timing implemented

#### Test 3: Data Integrity During Batching
- **Expectation**: No position updates lost during batching
- **Validation**: Final positions match expectations
- **Current Status**: ❌ WILL FAIL until batch integrity implemented

#### Test 4: Performance Improvement Metrics
- **Expectation**: 85%+ reduction in server calls
- **Validation**: Measurable performance improvement
- **Current Status**: ❌ WILL FAIL until complete optimization

### 3. Component Memoization Tests
**File**: `tests/performance/component-memoization.test.tsx`

**RED Phase Tests**:

#### Test 1: Non-Dragged Node Re-render Prevention
- **Expectation**: Only dragged node re-renders during drag
- **Validation**: Memoization prevents unnecessary re-renders
- **Current Status**: ❌ WILL FAIL until React.memo implemented

#### Test 2: React.memo with Custom Comparison
- **Expectation**: Components only re-render when props actually change
- **Validation**: Proper memo comparison functions
- **Current Status**: ❌ WILL FAIL until custom comparison implemented

#### Test 3: Heavy Load Performance (25+ nodes)
- **Expectation**: Single node drag doesn't affect other 24 nodes
- **Validation**: Performance maintained under load
- **Current Status**: ❌ WILL FAIL until memoization handles load

#### Test 4: Complex Props Change Detection
- **Expectation**: Deep comparison for complex node properties
- **Validation**: Intelligent prop change detection
- **Current Status**: ❌ WILL FAIL until deep comparison implemented

#### Test 5: FPS Improvement Validation
- **Expectation**: 2-10 FPS → 60 FPS improvement
- **Validation**: Measurable FPS improvement
- **Current Status**: ❌ WILL FAIL until memoization achieves target

### 4. Drag Operation Benchmarks
**File**: `tests/performance/drag-operation-benchmarks.test.ts`

**RED Phase Benchmarks**:

#### Benchmark 1: Single Node Drag Performance
- **Target**: 60 FPS, ≤3 server calls/second
- **Duration**: 2 seconds
- **Current Status**: ❌ WILL FAIL until optimizations complete

#### Benchmark 2: Multi-Node Stress Test
- **Target**: 10 nodes, 60 FPS on single drag
- **Validation**: System stability under load
- **Current Status**: ❌ WILL FAIL until stress handling implemented

#### Benchmark 3: Rapid Multi-Node Operations
- **Target**: Multiple concurrent drags remain stable
- **Validation**: System handles overlapping operations
- **Current Status**: ❌ WILL FAIL until concurrent handling implemented

#### Benchmark 4: Memory Leak Prevention
- **Target**: No memory leaks from optimizations
- **Validation**: Memory usage stays under 10MB delta
- **Current Status**: ❌ WILL FAIL if optimizations leak memory

#### Benchmark 5: End-to-End Realistic Usage
- **Target**: Complete workflow operations meet performance targets
- **Validation**: Real-world usage patterns
- **Current Status**: ❌ WILL FAIL until complete optimization suite

### 5. Clean Architecture Boundary Enforcement
**File**: `tests/performance/clean-architecture-boundary-enforcement.test.ts`

**RED Phase Architecture Tests**:

#### Test 1: Domain Layer Purity
- **Expectation**: No performance code in domain layer
- **Validation**: Domain remains free of optimization concerns
- **Current Status**: ❌ WILL FAIL if optimizations violate domain

#### Test 2: Use Case Layer Independence
- **Expectation**: Use cases don't import React/DOM APIs
- **Validation**: Framework independence maintained
- **Current Status**: ❌ WILL FAIL if use cases couple to UI frameworks

#### Test 3: Presentation Layer Encapsulation
- **Expectation**: Performance optimizations properly layered
- **Validation**: Optimizations in correct architectural layers
- **Current Status**: ❌ WILL FAIL if optimizations misplaced

#### Test 4: Dependency Inversion Compliance
- **Expectation**: Optimizations don't violate dependency inversion
- **Validation**: Proper interface usage maintained
- **Current Status**: ❌ WILL FAIL if dependency inversion violated

#### Test 5: No Circular Dependencies
- **Expectation**: Performance modules don't create cycles
- **Validation**: Clean dependency graph maintained
- **Current Status**: ❌ WILL FAIL if circular dependencies introduced

## TDD Implementation Flow

### Phase 1: RED - All Tests Failing ✅ CURRENT STATE
1. ✅ Performance test infrastructure created
2. ✅ Debounced position update tests written (failing)
3. ✅ Component memoization tests written (failing)
4. ✅ Performance benchmarks written (failing)
5. ✅ Architecture boundary tests written (failing)

### Phase 2: GREEN - Make Tests Pass (NEXT)
1. 🔄 Implement `useDebouncedPositionUpdates` hook
2. 🔄 Create `BatchPositionUpdatesUseCase`
3. 🔄 Add React.memo to node components
4. 🔄 Implement custom memo comparison functions
5. 🔄 Create performance monitoring infrastructure

### Phase 3: REFACTOR - Optimize Implementation (FUTURE)
1. 🔄 Optimize batching algorithm
2. 🔄 Fine-tune memoization strategies
3. 🔄 Performance monitoring and metrics
4. 🔄 Documentation and examples

## Running the Tests

### Run All Performance Tests
```bash
# Run all performance tests (currently failing)
pnpm test tests/performance

# Run with coverage
pnpm test tests/performance --coverage

# Watch mode for development
pnpm test tests/performance --watch
```

### Run Specific Test Suites
```bash
# Debounced position updates
pnpm test tests/performance/debounced-position-updates.test.ts

# Component memoization
pnpm test tests/performance/component-memoization.test.tsx

# Performance benchmarks
pnpm test tests/performance/drag-operation-benchmarks.test.ts

# Architecture boundaries
pnpm test tests/performance/clean-architecture-boundary-enforcement.test.ts
```

## Expected Test Results (RED Phase)

All tests should currently **FAIL** with messages like:

```
❌ FAIL: Single node drag should achieve 60 FPS with minimal server calls
   Expected debounced batching to work, but no batching mechanism found

❌ FAIL: Non-dragged nodes should not re-render during drag operations  
   Expected memoization to prevent re-renders, but React.memo not implemented

❌ FAIL: Domain layer should remain pure during performance optimization
   Expected no performance concerns in domain, but boundaries not enforced
```

## Implementation Guidance

### Files to Create/Modify:
1. **Debouncing Hook**: `app/hooks/useDebouncedPositionUpdates.ts`
2. **Batch Use Case**: `lib/use-cases/performance/batch-position-updates-use-case.ts`
3. **Memoized Components**: Wrap existing node components with React.memo
4. **Infrastructure**: Batch update repository and adapters
5. **Performance Monitoring**: Metrics collection and reporting

### Success Criteria:
- ✅ All tests transition from RED to GREEN
- ✅ Performance targets achieved (60 FPS, 90% server call reduction)
- ✅ Clean Architecture boundaries maintained
- ✅ No memory leaks or performance regressions
- ✅ Code coverage >90% for performance optimization modules

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│            PRESENTATION LAYER           │
│  ┌─────────────────────────────────────┐ │
│  │ useDebouncedPositionUpdates Hook    │ │
│  │ React.memo Components               │ │
│  │ Performance Monitoring Hooks        │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ Calls Use Cases
┌─────────────────▼───────────────────────┐
│             USE CASE LAYER              │
│  ┌─────────────────────────────────────┐ │
│  │ BatchPositionUpdatesUseCase         │ │
│  │ PerformanceMetricsUseCase           │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ Uses Repositories
┌─────────────────▼───────────────────────┐
│          INFRASTRUCTURE LAYER           │
│  ┌─────────────────────────────────────┐ │
│  │ BatchPositionUpdateRepository       │ │
│  │ PerformanceMetricsService           │ │
│  │ PositionUpdateBatcher               │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

This test plan ensures that performance optimizations are implemented with TDD discipline while maintaining Clean Architecture principles.
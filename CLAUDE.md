# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
```

### Package Management
This project uses **pnpm** as the package manager. Always use `pnpm install` instead of `npm install`.

## Architecture Overview

### Clean Architecture Foundation
This codebase implements **Clean Architecture** with strict layer separation and dependency inversion:

**Layer Structure** (inside-out):
1. **Domain Layer** (`/lib/domain/`) - Enterprise business rules and core entities
2. **Use Cases Layer** (`/lib/use-cases/`) - Application-specific business workflows  
3. **Interface Adapters** (`/lib/infrastructure/`) - Data access and external service implementations
4. **Frameworks & UI** (`/app/`, `/components/`) - Next.js routes and React components

**Critical Rule**: Dependencies only flow inward. Outer layers implement interfaces defined by inner layers.

### Presentation Layer Architecture
The UI follows a **4-tier component hierarchy** with Clean Architecture integration:

**Component Tiers**:
1. **Base Components** (`/components/ui/`) - Fundamental UI building blocks (Button, Card, Input)
2. **Composite Components** (`/components/composites/`) - Multi-component compositions (DataTable, MetricsGrid)
3. **Feature Components** (`/app/(private)/dashboard/[feature]/components/`) - Business-specific components
4. **Page Components** (`/app/(private)/dashboard/[feature]/page.tsx`) - Full page orchestration

**Presentation Layer Rules**:
- Components contain **only UI logic**, never business logic
- Business operations delegated to **use cases through presentation layer bridges**
- Data flows through **display models**, not domain entities
- UI state managed separately from business state

### Key Architectural Files
- **Presentation Bridges**: `/app/use-cases/data-access/` - Connect UI to application layer
- **UI Display Models**: `/app/use-cases/ui-models/` - UI-specific data models with formatting
- **UI Workflows**: `/app/use-cases/ui-workflows/` - Pure UI processes (notifications, themes)
- **UI State Hooks**: `/app/hooks/` - UI state management with no business logic

## Technology Stack

### Frontend Framework
- **Next.js 14.2** with App Router
- **React 18** with modern hooks patterns
- **TypeScript** for type safety

### UI Components & Styling  
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library built on Radix UI
- **Radix UI** for accessible, unstyled primitives

### Workflow Designer
- **React Flow** (`@xyflow/react`) for the Function Model workflow designer
- **React Flow Legacy** (`reactflow`) for backward compatibility

### State Management
- **React Hooks** for UI state management only
- **Custom hooks** for UI logic coordination
- **URL parameters** for shareable filter states

### Form Handling
- **React Hook Form** with **Zod** validation
- **Form validation separation**: UI validation (format) vs business validation (domain rules)

### Backend Integration
- **Supabase** for authentication and database
- **Server-side rendering** with Next.js API routes

## Project Structure Deep Dive

### Application Routes (`/app/`)
```
(auth)/           # Authentication routes (login, signup, callback)
(private)/        # Protected routes requiring authentication
  dashboard/      # Main dashboard with feature modules
    function-model/ # Function Model workflow designer
(public)/         # Public routes (landing, about, contact)
api/             # Next.js API routes
```

### Component Architecture (`/components/`)
```
ui/              # Base components (Button, Card, Input, etc.)
composites/      # Multi-component compositions
  workflow/      # Workflow-specific composite components
features/        # Landing page feature components
forms/           # Form-specific components
layout/          # Layout components
```

### Clean Architecture Implementation (`/lib/`)
```
domain/          # Domain Layer
  entities/      # Business entities (currently minimal)
  rules/         # Business rule validators
use-cases/       # Application Layer
  [feature]/     # Feature-specific use cases
  interfaces/    # Repository and service interfaces
infrastructure/  # Infrastructure Layer
  repositories/  # Data access implementations
  external/      # External service clients
supabase/        # Database client and middleware
```

### UI Architecture (`/app/`)
```
hooks/           # UI-only state management hooks
use-cases/       # Presentation layer
  data-access/   # Presentation bridges to application layer
  ui-models/     # UI-specific display models
  ui-workflows/  # Pure UI processes
```

## Function Model Feature

### Core Feature
The **Function Model** is a workflow designer using React Flow that allows users to create visual workflows with different node types:

**Container Nodes**:
- **IO Nodes** (purple) - Input/Output boundaries
- **Stage Nodes** (blue) - Process phases

**Action Nodes**:
- **Tether Nodes** (orange) - Automation actions  
- **KB Nodes** (green) - Knowledge base references
- **Function Model Container** (blue) - Nested workflows

### Workflow Designer Components
- **WorkflowCanvas** - Main React Flow canvas with custom node types
- **WorkflowSidebar** - Node toolbox and properties panel
- **WorkflowToolbar** - Top navigation with model actions
- **WorkflowStatusBar** - Bottom status display with validation
- **Node Components** - Modular node implementations with Header/Body/Controls separation

### Clean Architecture in Function Model
- **UI Components** use display models from `/app/use-cases/ui-models/workflow-display-models.ts`
- **Presentation Bridges** in `/app/use-cases/data-access/workflow-operations.ts` handle use case orchestration  
- **UI State Management** in `/app/hooks/use-ui-state.ts` manages pure UI concerns
- **Business Logic** delegates to use cases (interfaces defined, implementations needed)

## Development Patterns

### Component Development
1. **Start with Base Components** - Use existing shadcn/ui components when possible
2. **Build Composite Components** - Combine base components for complex UI patterns
3. **Feature Components** - Business-specific components that delegate to use cases
4. **No Business Logic in Components** - Components only handle UI concerns

### State Management Patterns
1. **UI State** - Use custom hooks in `/app/hooks/` for pure UI state
2. **Form State** - Use React Hook Form with Zod validation
3. **Business State** - Delegate to use cases through presentation bridges
4. **URL State** - Use URL parameters for shareable states (filters, selected items)

### Data Flow Patterns
1. **Inbound**: HTTP → Controller → Use Case → Entity → Repository
2. **Outbound**: Repository → Entity → Use Case → Presentation Bridge → Display Model → Component
3. **UI Events**: Component → Hook → Presentation Bridge → Use Case

### Testing Approach
- **Domain Layer**: Unit tests with no external dependencies
- **Use Cases**: Integration tests with mocked repositories  
- **Components**: React Testing Library with mocked use cases
- **E2E**: Consider Playwright for critical user flows

## Critical Implementation Notes

### Clean Architecture Compliance
- **85% compliant** - UI and presentation layers fully compliant
- **Remaining 15%** - Need actual use case implementations and domain entities
- **Never violate dependency rule** - outer layers must never be imported by inner layers
- **Interface-based design** - use dependency injection for testability

### Component Guidelines
- Components should be **pure presentation** - no business logic
- Use **display models** from UI layer, never domain entities directly
- **Delegate business operations** to use cases through presentation bridges
- **UI state only** in component hooks - no business state

### File Creation Patterns
- **Read before writing** - Always read existing files before editing
- **Follow existing patterns** - Match code style and architectural patterns in similar files
- **Use absolute imports** - Leverage TypeScript path mapping for clean imports
- **Document interfaces** - TypeScript interfaces should be well-documented

### React Flow Specifics
- **Custom node types** registered in `/components/composites/workflow/`
- **Node state management** through custom hooks in `/app/hooks/`
- **Canvas interactions** handled by React Flow with custom handlers
- **Node validation** integrated with workflow validation system

This codebase demonstrates mature Clean Architecture implementation with excellent separation between UI concerns and business logic. When making changes, always maintain the architectural boundaries and follow the established patterns.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 🚨 IMPLEMENTATION RULE — STRICT, NO EXCEPTIONS 🚨

# 🧩 Clean Architecture TDD Orchestrator

## Principle
Always enforce **Clean Architecture** and the **Test-Driven Development (TDD) loop**.  
➡️ **Code must follow the passing test — never the other way around.**
NEVER IMPLEMENT DUMB TEMPORARY FIXES ALWAYS BEST PRACTICES FOR CLEAN ARCHITECTURE.

ALWAYS BACKTRACE THROUGH THE DATA FLOW, LAYERS TO PROPERLY ROOT CAUSE AND RESOLVE
---

## Scope
Applies to all layers in two phases:

- **Phase 1:** Domain, Application  
- **Phase 2:** UI/API Adapters, Persistence Adapters  

---

## Process (Strict 1–2 Punch)

1. **Test First**  
   - Write a failing test that defines expected behavior.  
   - Delegate to `clean-architecture-test-planner` agent.  

2. **Implement Code**  
   - Write the minimum Clean Architecture–compliant code that makes the test pass.  
   - Delegate to `clean-architecture-implementor` agent.  

---

## Loop
Repeat **1 → 2 → 1 → 2** until all behaviors are defined and tests pass.

---

## Non-Negotiable Rules
- 🚫 No skipping steps  
- 🚫 No code before a test  
- 🚫 No test conforming to existing code  
- ✅ Every implementation must serve a **passing test**  

---


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
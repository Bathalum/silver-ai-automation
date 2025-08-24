# Data Flow Analysis Prompt Template

## Overview

This document provides a refined prompt template for analyzing data flow through Clean Architecture layers, with emphasis on **Name**, **Component**, **Function**, and **Action** for any function or feature.

## Refined Prompt Template

**Prompt:**

"For a given function or feature [INSERT FUNCTION/FEATURE NAME], provide a detailed step-by-step data flow analysis by directly inspecting the relevant source files (using logs, debugging tools, or code comments, not memory). Structure the response to trace the data flow through Clean Architecture layers (Entities, Use Cases, Interface Adapters, Frameworks & Drivers), highlighting each component's role and respecting the inward dependency rule. For each step, include:

- **Name**: The specific component or layer involved.
- **Component**: The type of component (e.g., React component, use case, entity, repository, service, database table).
- **Function**: A concise description of its role or purpose in the process.
- **Action**: The specific action it performs during the execution of the function/feature.

Explicitly include infrastructure details, such as specific Supabase tables, Next.js API routes, or other external services, and note any dependency injection or violations of the Dependency Inversion Principle. Ensure the response respects Clean Architecture principles (e.g., inward-only dependencies, proper use of interfaces, entities remain framework-independent). Do not include code snippets; provide a narrative description. Structure the output in a clear narrative format with sections for each layer (Entities, Use Cases, Interface Adapters, Frameworks & Drivers) and an infrastructure details section."

## Sample JSON Output Pattern (Example Only)

This sample shows the structure and detail level for creating a generic "Create Entity" feature, ensuring the **Name**, **Component**, **Function**, and **Action** format. **Note: This JSON is provided as an example of the structure - the actual output should be in narrative format, not JSON.**

```json
{
  "feature": "Create Entity",
  "dataFlow": {
    "frameworksAndDriversLayer": [
      {
        "name": "EntityFormPage",
        "component": "React Component",
        "function": "Renders the UI form for entity creation and handles user interactions",
        "action": "User submits form, triggering 'handleCreateEntity()' which calls the use case"
      },
      {
        "name": "CreateEntityAPIRoute",
        "component": "Next.js API Route",
        "function": "Handles HTTP requests for entity creation",
        "action": "Receives POST request and delegates to use case layer"
      }
    ],
    "interfaceAdaptersLayer": [
      {
        "name": "EntityController",
        "component": "Controller",
        "function": "Converts HTTP requests to use case inputs and formats responses",
        "action": "Maps request data to CreateEntityRequest DTO and calls use case"
      },
      {
        "name": "SupabaseEntityRepository",
        "component": "Repository Implementation",
        "function": "Implements EntityRepository interface, handles database operations via Supabase client",
        "action": "Inserts new entity into 'entities' table with generated UUID"
      }
    ],
    "useCasesLayer": [
      {
        "name": "CreateEntityUseCase",
        "component": "Use Case",
        "function": "Orchestrates entity creation workflow, coordinating entities and external interfaces",
        "action": "Validates request, creates entity through domain logic, persists via repository interface"
      }
    ],
    "entitiesLayer": [
      {
        "name": "Entity",
        "component": "Domain Entity",
        "function": "Represents core business entity with enterprise business rules, independent of frameworks",
        "action": "Enforces business invariants and validates entity data according to business rules"
      }
    ]
  },
  "infrastructureDetails": {
    "supabaseTables": [
      {
        "name": "entities",
        "function": "Stores entity data",
        "columns": ["entity_id", "name", "description", "created_at", "updated_at"]
      },
      {
        "name": "audit_log",
        "function": "Tracks operations for compliance",
        "columns": ["audit_id", "table_name", "operation", "record_id", "changed_by", "changed_at"]
      }
    ],
    "nextjsAPIRoutes": "CreateEntityAPIRoute handles HTTP requests and delegates to Interface Adapters layer.",
    "dependencyInjection": "Uses dependency injection to inject SupabaseEntityRepository implementation into CreateEntityUseCase, adhering to Dependency Inversion Principle.",
    "dependencyInversionViolations": "None detected; Use Cases layer depends on repository interfaces defined in inner layers, not concrete implementations."
  },
  "dataFlowSequence": [
    "User submits form in EntityFormPage (Frameworks & Drivers).",
    "EntityFormPage calls CreateEntityAPIRoute (Frameworks & Drivers).",
    "EntityController maps request to DTO and calls CreateEntityUseCase (Interface Adapters).",
    "CreateEntityUseCase coordinates with Entity for business rule validation (Use Cases → Entities).",
    "Entity enforces business invariants and validates data (Entities).",
    "CreateEntityUseCase calls repository interface for persistence (Use Cases → Interface Adapters).",
    "SupabaseEntityRepository inserts into 'entities' table (Interface Adapters).",
    "Response with entity_id flows back through layers to EntityFormPage (Frameworks & Drivers)."
  ]
}
```

## Key Features

### Focus on Data Flow and Clean Architecture
- The prompt explicitly mandates tracing data flow through Clean Architecture layers (Entities, Use Cases, Interface Adapters, Frameworks & Drivers)
- Ensures alignment with inward dependency rule and emphasizes proper layer separation

### Name, Component, Function, Action Structure
- **Name**: The specific component or layer involved
- **Component**: The type of component (e.g., React component, use case, entity, repository, service, database table)
- **Function**: A concise description of its role or purpose in the process
- **Action**: The specific action it performs during the execution of the function/feature

### File-Based Tracing
- Requires direct file inspection (via logs, debugging tools, or comments)
- Clarifies that this is the *method* of analysis, not the subject

### Infrastructure as Required
- Supabase tables, Next.js API routes, and dependency injection details are mandatory
- Addresses concerns about weak "additionally" phrasing

### Generic for Any Function/Feature
- The template is flexible for any function or feature, not limited to creating a function model

### Narrative Structure
- Provides clear sections for each layer and infrastructure details
- Ensures consistency across analyses
- **Note: Output should be in narrative format, not JSON**

## Usage Guidelines

1. **Replace Placeholder**: Insert the specific function or feature name in the prompt template
2. **Direct File Inspection**: Always inspect source files directly, not from memory
3. **Layer Separation**: Maintain clear boundaries between Entities, Use Cases, Interface Adapters, and Frameworks & Drivers layers
4. **Infrastructure Details**: Always include specific database tables, API routes, and dependency injection patterns
5. **Clean Architecture Compliance**: Ensure inward-only dependencies and proper use of interfaces
6. **Narrative Description**: Provide clear descriptions without code snippets
7. **Output Format**: Use narrative format, not JSON - the JSON above is just an example structure

## Benefits

- **Consistency**: Standardized format for all data flow analyses
- **Completeness**: Ensures all architectural layers are covered
- **Clarity**: Clear structure with Name, Component, Function, Action format
- **Traceability**: Direct file-based analysis ensures accuracy
- **Architecture Compliance**: Enforces Clean Architecture principles

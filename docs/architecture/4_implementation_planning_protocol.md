# 🧠 **Implementation Planning Protocol**

*A rigorous protocol for planning, implementing, and tracking code changes with Clean Architecture compliance and comprehensive testing.*

---

## 🎯 **Core Principles**

1. **Context First**: Fully understand the system before coding
2. **Architecture Compliance**: Maintain Clean Architecture boundaries
3. **Testing Requirements**: No feature is complete without tests
4. **Honest Assessment**: Accurate status tracking with clear criteria

---

## 📊 **Implementation Status Matrix**

### **Status Criteria Definitions**

**100% Complete**:
- ✅ Compiles without errors
- ✅ Follows Clean Architecture (proper dependency direction)
- ✅ Has comprehensive unit tests (>80% coverage)
- ✅ Has integration tests for key workflows
- ✅ Business logic properly encapsulated in entities
- ✅ All interfaces defined in inner layers

**75-95% Complete**:
- ✅ Compiles without errors
- ✅ Architecturally sound
- ⚠️ Missing some tests or minor compliance issues

**50-75% Complete**:
- ✅ Core functionality implemented
- ⚠️ Some compilation issues or architectural concerns
- ❌ Limited or no testing

**<50% Complete**:
- ❌ Significant gaps in implementation
- ❌ May not compile or function properly

### **Standard Implementation Matrix**

| Component | Status | Testing Status | Priority | Est. Fix Time |
|-----------|--------|----------------|----------|---------------|
| **Component Name** | % Complete + Description | Test Coverage Status | Priority Level | Time Estimate |

**Testing Status Options**:
- ✅ **Complete** (Unit + Integration tests, >80% coverage)
- 🟨 **Partial** (Some tests, <80% coverage)  
- ❌ **Missing** (No tests)
- 🚫 **Blocked** (Cannot test due to dependencies)

---

## 🔄 **Planning Process**

### **Phase 1: Context Gathering**
- Map current system architecture
- Identify affected Clean Architecture layers
- Document dependencies and integration points
- Verify business requirements and constraints

### **Phase 2: Architecture Design**
- Design entities and business rules (innermost layer)
- Define use case interfaces and workflows
- Plan adapter interfaces and implementations
- Ensure dependency inversion compliance

### **Phase 3: Implementation Strategy**
- Implement layer by layer (inside-out)
- Write tests for each layer before moving outward
- Validate Clean Architecture compliance at each step
- Document any architectural decisions or trade-offs

### **Phase 4: Testing & Validation**
- Unit tests for domain logic (entities, value objects)
- Integration tests for use cases and workflows
- End-to-end tests for critical user journeys
- Architecture compliance verification

---

## 📦 Output Format

```json
{
  "clarifyingQuestions": [
    "What is the real feature, bug, or request?",
    "What triggers it and what is the expected outcome?",
    "What files/modules handle this currently?",
    "What Clean Architecture layers are affected (Entities, Use Cases, Interface Adapters, Frameworks & Drivers)?",
    "What assumptions are we making?",
    "What dependencies or constraints should be noted?",
    "What could be the side effects or integration conflicts?",
    "Are there recent changes to this area?",
    "What are the risks to performance, integrity, or users?",
    "Is this the minimal safe change, or are we overcomplicating?",
    "Which layer should contain the core business logic for this feature?",
    "Are we maintaining the inward dependency rule?",
    "Will entities remain framework-independent?",
    "Are we defining interfaces in inner layers and implementing in outer layers?"
  ],
  "currentFlowAnalysis": "step-by-step trace of the existing system behavior, integration points, and data/state flow",
  "implementationSummary": "a clear single-line description of the proposed change",
  "implementationPlan": {
    "step1": "define scope and identify which Clean Architecture layers need updates",
    "step2": "map dependencies ensuring inward-only flow and interface compliance",
    "step3": "design entities and business rules first, then use cases, then adapters",
    "step4": "implement layer by layer, starting with innermost (entities) working outward",
    "step5": "run validation tests for each layer independently and integration flows"
  },
  "compatibilityAssurance": "explanation of how the change avoids regressions, breaks, or unintended consequences",
  "implementationConsiderations": "notes on risks, long-term impacts, maintainability, scalability, or UX"
}
```

---

## 🔍 Example Application

### Scenario: Add Version Rollback Feature for Model Versions

**Clarifying Questions:**

1. What is the new feature? (Rollback to previous model versions)
2. What triggers it? (User selects version from UI history)
3. What is the current data model for versions?
4. Which Clean Architecture layers and components are involved?
5. Are we using a state manager or client cache?
6. Is there a field that marks the "active" version?
7. What's the expected rollback behavior — overwrite? duplicate?
8. Are there existing permissions around this action?
9. What are potential performance bottlenecks (large payloads, concurrency)?
10. Is rollback destructive or version-preserving?

**Current Flow Analysis:**

* **Frameworks & Drivers Layer**: `ModelHistoryModal.tsx` (React component) shows available versions; Next.js API routes handle HTTP requests.
* **Interface Adapters Layer**: `POST /models/{id}/versions` controller calls `createVersionSnapshot()` use case; repository implementations handle database operations.
* **Use Cases Layer**: `CreateVersionSnapshotUseCase` orchestrates version creation workflow.
* **Entities Layer**: Version business rules (currently minimal - needs enhancement for rollback).
* **Infrastructure**: `function_model_versions` table stores `model_id`, `version_number`, `data`, etc.
* Active version is inferred as latest, not explicitly tracked in entities.
* No current rollback logic; only append-only model history.
* Dependencies: Supabase DB, React state management, following Clean Architecture dependency flow.
* Side effects: rollbacks could violate business rules if not handled in entities layer.
* Logging is minimal — audit trails needed for traceability and compliance.

**Implementation Summary:**
Enable rollback of model versions by marking older versions as active while preserving the full version history.

**Implementation Plan:**

* **Step 1 (Entities Layer):** Define `ModelVersion` entity with business rules for version activation and rollback constraints.
* **Step 2 (Interface Adapters Layer):** Add `is_active` column to `function_model_versions` table; update repository implementation.
* **Step 3 (Use Cases Layer):** Create `RollbackModelVersionUseCase` with proper business rule enforcement and safety checks.
* **Step 4 (Interface Adapters Layer):** Create controller for `/models/{id}/rollback/{version}` endpoint that delegates to use case.
* **Step 5 (Frameworks & Drivers Layer):** Update React UI to support rollback actions and confirmation dialogs.
* **Step 6 (Interface Adapters Layer):** Implement audit logging repository for rollback actions.
* **Step 7 (Testing):** Write tests for each layer - entity business rules, use case workflows, and UI interactions.

**Compatibility Assurance:**

* Existing use cases continue to return latest version unless `is_active` entity property is specified.
* Rollbacks are additive, preserving all version history in accordance with entity business rules.
* Database migrations handle backfill of active version data without affecting existing entity behavior.
* Interface contracts remain stable - changes are internal to layer implementations.

**Implementation Considerations:**

* **Clean Architecture Compliance:** Business rules must be enforced in entities layer, not in UI or database constraints.
* **Scalability:** Index `is_active` to speed up repository queries; ensure use case performance.
* **Security:** Implement authorization in use cases layer, limit rollback to admin or creator roles through entity validation.
* **Auditability:** Ensure rollback actions are logged through audit repository, maintaining full traceability.
* **Maintainability:** Decouple rollback logic from version creation for clarity; separate use cases for different responsibilities.
* **User Experience:** UI layer must clearly distinguish between rollback and save-new-version actions without containing business logic.
* **Dependency Inversion:** Use cases depend on repository interfaces, not concrete implementations.

---

This unified protocol ensures implementations are **deliberate**, **context-aware**, and **system-safe**. It fosters habits of investigation, validation, and long-term thinking over impulsive development. 
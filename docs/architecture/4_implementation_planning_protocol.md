# 🧠 **Unified Implementation Planning Protocol**

*A rigorous protocol for engineers and AI agents tasked with implementing code safely, scalably, and contextually.*

---

## 🧭 Role & Mindset

You are a methodical, system-aware engineer (human or AI) responsible for implementing features or changes only **after achieving full contextual clarity**. You **do not guess**, **do not assume**, and **never rush to code**.

---

## 🧩 Instructions

### 1. **Do Not Begin with Implementation.**

Begin by slowing down to gather **complete context**:

* What is the exact feature, problem, or requested change?
* What is the desired outcome or behavior?
* What Clean Architecture layers will this affect (Entities, Use Cases, Interface Adapters, Frameworks & Drivers)?
* What triggers or user actions are involved?
* Are there existing flows this will integrate with or disrupt?
* What assumptions are being made — and which ones need verification?
* Are there performance, security, or compatibility requirements?
* Are there known constraints or recent changes in the system?

---

### 2. **Trace the Current System First.**

Before proposing solutions:

* Navigate the real system: inspect the codebase, logs, runtime data, or documentation.
* Understand the **start-to-end execution flow** relevant to the change.
* Identify all involved modules, functions, inputs, state updates, service calls, and side effects.
* Map **dependencies and second-order effects**:

  * What relies on this?
  * How might this impact other modules or future extensibility?

---

### 3. **Mentally Draft and Question Your Solution.**

After investigation:

* Mentally draft a solution (still no code).
* Question it:

  * Is this minimal and sufficient?
  * What are the risks, regressions, or inconsistencies?
  * What are the edge cases, failure scenarios, and load implications?
  * What happens under scale or unexpected input?
* Consider alternatives. Challenge assumptions. Test theories manually if needed.

---

### 4. **Only Then: Plan Implementation.**

Now write:

* A **1-line summary** of the intended change.
* A **step-by-step plan** broken into safe, testable chunks.
* A **compatibility review**: how it integrates without breaking current behavior.
* A **reflection** on long-term impact, tech debt, testability, or UX consequences.

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
# Function Model - Domain Model

**Version**: 1.0  
**Created**: January 2025  
**Status**: Draft

This document defines the core domain model for the Function Model feature within the Silver AI Automation platform, derived from the Supabase database schema analysis and following Clean Architecture principles as outlined in `0_high_level_architecture_context.md`.

## Table of Contents
1. [Domain Overview](#domain-overview)
2. [Core Business Concepts](#core-business-concepts)
3. [Domain Entities](#domain-entities)
4. [Business Rules](#business-rules)
5. [Value Objects](#value-objects)
6. [Domain Services](#domain-services)
7. [Aggregates](#aggregates)
8. [Edge Cases and Constraints](#edge-cases-and-constraints)
9. [Domain Events](#domain-events)
10. [Action Node Types and Configurations](#action-node-types-and-configurations)

## Domain Overview

The Function Model feature is a **business process automation system** that provides visual workflow representation and orchestration capabilities. While designed to work independently, it can optionally integrate with other Silver AI Automation features:

- **Function Models**: Business process automation with visual workflow representation
- **Optional Integration**: Can link to Knowledge Base content, Spindle workflows, and AI agents
- **Standalone Operation**: Functions completely independently without requiring other features

The Function Model enables complex workflow orchestration, hierarchical process management, and comprehensive audit tracking for enterprise-level business process automation.

## Core Business Concepts

### 1. **Standalone Feature Architecture**
The Function Model is designed as a completely independent feature that can optionally integrate with other Silver AI Automation features:
- Function Model maintains its own complete entity lifecycle
- Cross-feature relationships are optional and managed through linking mechanisms
- Function Model can be extended independently while maintaining optional integration capabilities

### 2. **Hierarchical Node-Based Structure**
Function Models utilize a two-tier node architecture:
- **Container Nodes**: Structural elements that define workflow organization (IO, Stage)
- **Action Nodes**: Execution elements nested within containers (Tether, KB, Function Model)
- **Context Sharing**: Hierarchical access patterns enable intelligent cross-feature communication

### 3. **AI Agent Integration**
AI agents are first-class citizens in the domain:
- Agents can be attached to specific features, entities, or individual nodes
- Agents have configurable capabilities and tools
- Agent execution is tracked and auditable

### 4. **Cross-Feature Relationships**
The system supports complex relationships between different features:
- Entity-to-entity links (high-level relationships)
- Node-to-node links (granular relationships)
- Typed relationships with strength indicators

## Domain Entities

### Function Model Aggregate

#### **FunctionModel** (Aggregate Root)
**Purpose**: Represents a complete business process automation workflow.

**Core Properties**:
- `model_id` (Identity): Unique identifier
- `name`: Human-readable model name
- `description`: Business purpose description
- `version`: Current semantic version
- `status`: Lifecycle state (draft, published, archived)
- `current_version`: Active version reference
- `version_count`: Total number of versions

**Business Rules**:
- Status transitions: draft → published → archived
- Versioning follows semantic versioning principles
- Soft deletion preserves audit trail
- Name must be unique within organization scope

**Invariants**:
- A published model cannot be directly modified (requires new version)
- Version count must always be ≥ 1
- Current version must reference existing version
- Deleted models retain metadata for audit purposes

#### **FunctionModelNode** (Entity) - Container Nodes
**Purpose**: Structural container elements that organize workflow and provide context boundaries.

**Core Properties**:
- `node_id` (Identity): Unique identifier
- `model_id`: Parent function model reference
- `node_type`: Container type (`ioNode`, `stageNode`)
- `name`: Node display name
- `description`: Purpose and context description
- `position_x/y`: Visual layout coordinates
- `dependencies`: Array of prerequisite node IDs
- `status`: Node lifecycle state (active, inactive, draft, archived, error)
- `metadata`: Node-specific configuration data
- `visual_properties`: UI rendering properties

**Type-Specific Behavior**:
- **IoNode**: Defines input/output boundaries and data contracts
- **StageNode**: Represents process phases, milestones, or high-level steps

**Business Rules**:
- Container nodes provide structural organization only (no execution)
- Dependencies must form acyclic graph (no circular dependencies)
- Position coordinates are required for visual representation
- Container nodes can host multiple action nodes
- Context is accessible to nested action nodes and related containers

#### **ActionNode** (Entity) - Execution Elements
**Purpose**: Executable elements nested within container nodes that interface with other features to perform specific actions within a stage.

**Core Properties**:
- `action_id` (Identity): Unique identifier
- `parent_node_id`: Reference to containing FunctionModelNode (container)
- `model_id`: Parent function model reference (for direct access)
- `action_type`: Execution type (`tetherNode`, `kbNode`, `functionModelContainer`)
- `name`: Action display name
- `description`: Action purpose and behavior
- `execution_mode`: How this action executes relative to siblings (`sequential`, `parallel`, `conditional`)
- `execution_order`: Order within parent container (for multiple actions)
- `status`: Action lifecycle state (active, inactive, draft, archived, error, executing, completed, failed)
- `priority`: Execution priority within container (1-10, higher = more important)
- `estimated_duration`: Expected execution time in minutes
- `retry_policy`: Retry configuration for failed executions
- `created_at`/`updated_at`: Timestamps for tracking

**Type-Specific Configuration**:
- **TetherNode**: Links to Spindle execution workflows with execution control
- **KbNode**: Links to Knowledge Base content with RACI and documentation
- **FunctionModelContainer**: Links to nested Function Models with context inheritance

**Business Rules**:
- Action nodes must belong to exactly one container node
- Multiple action nodes of different types can exist in same container
- Action nodes inherit context access from their container hierarchy
- Execution order and mode determine workflow orchestration
- Priority affects execution scheduling within parallel execution modes
- Retry policies must be valid for the specific action type
- Status transitions follow defined lifecycle patterns

**Invariants**:
- Execution order must be unique within parent container
- Priority must be within valid range [1-10]
- Estimated duration must be positive
- Status must be valid for current execution context

#### **FunctionModelVersion** (Entity)
**Purpose**: Immutable snapshots of function model state for versioning.

**Core Properties**:
- `version_id` (Identity): Unique identifier
- `model_id`: Parent model reference
- `version_number`: Semantic version string
- `version_data`: Complete model state snapshot
- `author_id`: User who created version
- `is_published`: Publication status

**Business Rules**:
- Version data is immutable once created
- Version numbers must follow semantic versioning
- Only one version per model can be published at a time
- Version data contains complete reproducible model state

### Cross-Feature Relationship Entities

#### **NodeLink** (Entity)
**Purpose**: Granular relationships between individual nodes across or within features.

**Core Properties**:
- `link_id` (Identity): Unique identifier
- `source_feature/target_feature`: Feature type identifiers
- `source_entity_id/target_entity_id`: Parent entity references
- `source_node_id/target_node_id`: Specific node identifiers (optional)
- `link_type`: Relationship semantic (documents, implements, references, supports, nested, triggers, consumes, produces)
- `link_strength`: Relationship weight (0.0-1.0)
- `link_context`: Additional relationship metadata

**Business Rules**:
- Source and target must reference valid features
- Link strength must be within valid range [0.0, 1.0]
- Link types have semantic meaning for workflow execution
- Self-links are prohibited (source ≠ target or different features)

#### **CrossFeatureLink** (Entity)
**Purpose**: High-level relationships between different feature entities.

**Core Properties**:
- `link_id` (Identity): Unique identifier
- `source_feature/target_feature`: Feature type identifiers
- `source_id/target_id`: Entity identifiers
- `link_type`: Relationship type (documents, implements, references, supports, nested)
- `link_strength`: Relationship importance (0.0-1.0)
- `node_context`: Optional node-specific context

**Business Rules**:
- Enforces feature-level relationship constraints
- Supports both entity and node-level contexts
- Self-linking prevention at entity level
- Node context validation when provided

### AI Agent Entity

#### **AIAgent** (Entity)
**Purpose**: Configurable AI automation agents attached to features, entities, or nodes.

**Core Properties**:
- `agent_id` (Identity): Unique identifier
- `feature_type`: Target feature type
- `entity_id`: Parent entity reference
- `node_id`: Specific node reference (optional)
- `name`: Agent display name
- `instructions`: AI behavior instructions
- `tools`: Available agent capabilities
- `capabilities`: Agent skill configuration
- `is_enabled`: Activation status
- `last_executed_at`: Execution tracking

**Business Rules**:
- Agents can be feature-wide, entity-specific, or node-specific
- Tools and capabilities must be valid JSON configurations
- Disabled agents are not executed but preserved
- Execution tracking enables performance monitoring

### Supporting Entities

#### **NodeMetadata** (Entity)
**Purpose**: Unified metadata management for all node types across features.

**Core Properties**:
- `metadata_id` (Identity): Unique identifier
- `feature_type`: Parent feature type
- `entity_id`: Parent entity reference
- `node_id`: Specific node identifier
- `node_type`: Node classification
- `position_x/y`: Visual coordinates
- `vector_embedding`: AI semantic search vector
- `search_keywords`: Searchable terms
- `ai_agent_config`: Node-specific AI configuration

**Business Rules**:
- Provides searchable index for cross-feature node discovery
- Vector embeddings enable semantic search capabilities
- Visual properties support UI rendering consistency

#### **AuditLog** (Entity)
**Purpose**: Immutable audit trail for all domain changes.

**Core Properties**:
- `audit_id` (Identity): Unique identifier
- `table_name`: Affected entity type
- `operation`: Change type (create, update, delete, etc.)
- `record_id`: Affected entity identifier
- `old_data/new_data`: State change details
- `changed_by`: User reference
- `changed_at`: Timestamp

**Business Rules**:
- All domain changes must be audited
- Audit records are immutable
- Supports compliance and debugging requirements
- Tracks both system and user-initiated changes

## Business Rules

### Assumed Domain Logic (Added January 2025)
*These assumptions were made to complete test implementation where business logic was unclear:*

#### Version Comparison and Management
- **Semantic Versioning**: Follows semver (major.minor.patch) with numeric comparison
- **Breaking Changes**: Major version increments indicate breaking changes
- **Compatible Changes**: Minor/patch increments are backwards compatible
- **Version Dependencies**: Use exact version matching for function model containers
- **Version Ordering**: Lexicographic comparison of version strings after semver parsing

#### Node Dependency Resolution
- **Circular Dependency Detection**: Use depth-first search with visited node tracking
- **Execution Path Optimization**: Topological sort with priority-based tie-breaking
- **Parallel Execution Conflicts**: Resolved by execution priority (1-10 scale)
- **Dependency Validation**: Must form a Directed Acyclic Graph (DAG)

#### Context Access and Propagation
- **Sibling Context**: Read-only access to execution results and metadata
- **Uncle/Aunt Access**: Limited to status information and completion results
- **Context Inheritance**: Parent contexts include child execution summaries
- **Conflict Resolution**: Parent context takes precedence in naming conflicts
- **Context Scope**: Three levels - node-local, container-shared, model-global

#### Archive and Recovery Policies
- **Blocking Dependencies**: Active references from published models prevent archival
- **High-Risk Archival**: Models with >10 dependencies or production status
- **Recovery Window**: 30 days for soft-deleted models, 7 days for archived models
- **Recovery Eligibility**: Based on deletion timestamp and dependency state
- **Cascade Deletion**: Archive operations cascade to dependent draft models only

#### Model State Validation
- **Status Transitions**: draft → published → archived (one-way progression)
- **Concurrent Modifications**: Last-write-wins with optimistic locking
- **Referential Integrity**: Foreign key constraints prevent orphaned references
- **Data Consistency**: All aggregate operations are atomic within boundaries

### Function Model Rules

1. **Version Management**:
   - Published models are immutable
   - New versions increment semantically
   - Draft versions can be modified freely
   - Archived models cannot be reactivated

2. **Container Node Composition**:
   - Container nodes must belong to exactly one model
   - Container node dependencies cannot create cycles
   - Container node types determine available configuration options
   - Visual positions must be numeric coordinates
   - Container nodes provide structural organization only (no direct execution)

3. **Action Node Composition**:
   - Action nodes must belong to exactly one container node
   - Multiple action nodes of different types can exist in same container
   - Action nodes inherit context access from container hierarchy
   - Execution order must be specified when multiple actions exist in container
   - Action type determines available configuration data structure

4. **Action Node Orchestration**:
   - Execution modes (sequential, parallel, conditional) determine action flow
   - Priority values (1-10) affect execution scheduling within parallel modes
   - Retry policies must be valid for the specific action type and execution context
   - Estimated duration helps with resource planning and execution scheduling
   - Status transitions follow defined lifecycle patterns with validation
   - Parallel execution requires dependency validation to prevent conflicts

5. **Fractal Orchestration Patterns**:
   - Container nodes act as orchestrators for their action nodes
   - Stage nodes coordinate multiple actions to achieve stage goals
   - IO nodes manage input/output boundaries and data contracts
   - Function model agents orchestrate container node agents
   - Nested function models maintain consistent orchestration patterns
   - Context inheritance follows hierarchical access rules at all levels

6. **Hierarchical Context Access (Universal Rules)**:
   - **Siblings**: Read-only context sharing between nodes at same hierarchical level
   - **Children**: Access only their own context, unless they have siblings (then read-only sibling access)
   - **Parents**: Read/write access to all child contexts and hierarchical contexts below
   - **Uncle/Aunt**: Read-only lateral access for root cause analysis
   - **Deep Nesting**: Cascading access through multi-level function model hierarchy with parent privileges
   - **Function Model as Orchestrator**: Knows about execution but doesn't execute

### Cross-Feature Relationship Rules

1. **Link Validation**:
   - Links must reference valid features and entities
   - Link strength must be in range [0.0, 1.0]
   - Link types must match predefined vocabulary
   - Self-links are prohibited

2. **Relationship Semantics**:
   - "documents" links indicate documentation relationships
   - "implements" links show implementation dependencies
   - "references" links indicate data dependencies
   - "supports" links show supportive relationships
   - "nested" links indicate hierarchical relationships

### AI Agent Rules

1. **Agent Attachment**:
   - Agents can be attached at feature, entity, or node level
   - Multiple agents per target are allowed
   - Disabled agents are preserved but not executed
   - Agent configuration must be valid JSON

2. **Execution Control**:
   - Only enabled agents participate in execution
   - Agent tools must be from approved toolkit
   - Execution tracking is mandatory
   - Failed executions must be logged

## Value Objects

### **FeatureType** (Enumeration)
Valid feature types in the system:
- `function-model`: Business process automation
- `knowledge-base`: Knowledge management
- `spindle`: Advanced process orchestration
- `event-storm`: Event-driven architecture (AI agents only)

### **ContainerNodeType** (Enumeration)
Valid container node types for function models:
- `ioNode`: Input/output boundary and data contract specification
- `stageNode`: Process stage, milestone, or high-level workflow step

### **ActionNodeType** (Enumeration)
Valid action node types that can be nested within containers:
- `tetherNode`: Links to Spindle execution workflows (run logs, memory, output, AI agent communication)
- `kbNode`: Links to Knowledge Base content (text content and metadata)
- `functionModelContainer`: Links to nested Function Models (outputs, contexts, nested tether/kb data)

### **ExecutionMode** (Enumeration)
How action nodes execute relative to siblings within a container:
- `sequential`: Actions execute one after another in order
- `parallel`: Actions execute simultaneously (when possible)
- `conditional`: Actions execute based on conditions or dependencies

### **ActionStatus** (Enumeration)
Enhanced lifecycle states for action nodes:
- `draft`: Under development
- `active`: Ready for execution
- `inactive`: Temporarily disabled
- `executing`: Currently running
- `completed`: Successfully finished
- `failed`: Execution failed
- `retrying`: Attempting to retry after failure
- `archived`: Retired from use
- `error`: System error state

### **RACI** (Value Object)
Responsibility assignment matrix for action nodes:
- `responsible`: Who does the work
- `accountable`: Who is answerable for the outcome
- `consulted`: Who provides input/advice
- `informed`: Who needs to be kept updated

### **RetryPolicy** (Value Object)
Configuration for handling action execution failures:
- `max_attempts`: Maximum retry attempts (1-10)
- `backoff_strategy`: Retry timing strategy (`immediate`, `linear`, `exponential`)
- `backoff_delay`: Delay between retries in seconds
- `failure_threshold`: Number of failures before marking as permanently failed

### **LinkType** (Enumeration)
Relationship semantics:
- `documents`: Documentation relationship
- `implements`: Implementation dependency
- `references`: Data dependency
- `supports`: Supportive relationship
- `nested`: Hierarchical relationship
- `triggers`: Event-driven activation
- `consumes`: Data consumption
- `produces`: Data production

### **ModelStatus** (Enumeration)
Function model lifecycle states:
- `draft`: Under development
- `published`: Active and deployable
- `archived`: Retired but preserved

### **NodeStatus** (Enumeration)
Node lifecycle states:
- `active`: Operational
- `inactive`: Temporarily disabled
- `draft`: Under development
- `archived`: Retired
- `error`: Failed state

## Domain Services

### **FunctionModelVersioningService**
**Purpose**: Manages function model versioning and publication lifecycle.

**Responsibilities**:
- Create new versions from draft models
- Validate semantic version numbering
- Manage publication state transitions
- Ensure version immutability

### **CrossFeatureLinkingService**
**Purpose**: Manages relationships between different features and entities.

**Responsibilities**:
- Validate cross-feature link creation
- Enforce relationship constraints
- Detect relationship cycles
- Maintain link strength calculations

### **NodeDependencyService**
**Purpose**: Manages node dependency graphs within function models.

**Responsibilities**:
- Validate dependency acyclicity
- Calculate execution order
- Detect circular dependencies
- Optimize execution paths

### **NodeContextAccessService**
**Purpose**: Manages hierarchical context access and sharing between nodes across function model hierarchy.

**Responsibilities**:
- **Sibling Access**: Enable read-only context sharing between nodes at same hierarchical level
- **Child Access**: Restrict children to their own context only, unless siblings exist (then read-only sibling access)
- **Parent Access**: Provide parents read/write access to all child contexts and hierarchical contexts below
- **Uncle/Aunt Access**: Enable lateral read-only access for root cause analysis
- **Deep Nesting**: Handle multi-level function model nesting with cascading parent privileges

**Context Types by Action Node**:
- **TetherNode Context**: Run logs, execution memory, output data, AI agent communication
- **KbNode Context**: Linked knowledge base text content and metadata
- **FunctionModelContainer Context**: Nested model outputs, linked KB contexts, nested tether contexts

**Access Patterns**:
- **Siblings**: Read-only context sharing between nodes at same hierarchical level
- **Children**: Access only their own context, unless they have siblings (then read-only sibling access)
- **Parents**: Read/write access to all child contexts and hierarchical contexts below
- **Uncle/Aunt**: Read-only lateral access for root cause analysis
- **Multi-level nesting**: Cascading access through hierarchy with parent privileges

### **ActionNodeOrchestrationService**
**Purpose**: Manages the execution orchestration and flow control of action nodes within containers.

**Responsibilities**:
- **Execution Flow Management**: Coordinate sequential, parallel, and conditional execution modes
- **Priority Scheduling**: Manage execution order based on priority and dependencies
- **Parallel Execution**: Handle simultaneous action execution when possible
- **Conditional Logic**: Evaluate and execute conditional action paths
- **Dependency Resolution**: Ensure proper execution order based on node dependencies
- **Execution State Management**: Track and coordinate action node status transitions

**Orchestration Patterns**:
- **Sequential Flow**: Execute actions in order with dependency validation
- **Parallel Execution**: Identify and execute independent actions simultaneously
- **Conditional Branching**: Evaluate conditions and execute appropriate action paths
- **Error Handling**: Manage failures and retry policies across action groups

### **ActionNodeExecutionService**
**Purpose**: Manages the actual execution of individual action nodes and their lifecycle.

**Responsibilities**:
- **Execution Lifecycle**: Manage action status transitions (draft → active → executing → completed/failed)
- **Retry Management**: Implement retry policies with backoff strategies
- **Execution Monitoring**: Track execution progress, duration, and resource usage
- **Failure Handling**: Capture and categorize execution failures
- **Performance Metrics**: Collect execution time and success rate data
- **Resource Management**: Coordinate resource allocation for parallel executions

**Execution Features**:
- **Retry Policies**: Implement immediate, linear, and exponential backoff strategies
- **Timeout Management**: Handle execution timeouts and resource constraints
- **Status Propagation**: Update parent containers and models with execution state
- **Audit Logging**: Record all execution attempts and outcomes

### **FractalOrchestrationService**
**Purpose**: Manages the fractal nature of function model orchestration across multiple levels.

**Responsibilities**:
- **Hierarchical Orchestration**: Coordinate execution across nested function model levels
- **Context Inheritance**: Manage context flow from parent to child models
- **Cross-Level Communication**: Enable parent models to orchestrate child model execution
- **Fractal Pattern Management**: Maintain consistent orchestration patterns across nesting levels
- **Level Coordination**: Ensure proper execution coordination between different hierarchy levels

**Fractal Patterns**:
- **Vertical Nesting**: Manage deep nesting of function models with consistent orchestration
- **Horizontal Scaling**: Coordinate multiple high-level function models
- **Context Propagation**: Ensure proper context inheritance and access across levels
- **Orchestration Consistency**: Maintain consistent execution patterns regardless of nesting depth

### **AIAgentOrchestrationService**
**Purpose**: Coordinates AI agent execution across features.

**Responsibilities**:
- Route agent execution requests
- Manage agent capability discovery
- Track agent performance metrics
- Handle agent failure scenarios

## Aggregates

### **FunctionModel Aggregate**
**Root**: FunctionModel  
**Entities**: FunctionModelNode (containers), ActionNode, FunctionModelVersion  
**Boundary**: All components of a business process automation model including nested actions

**Consistency Rules**:
- Container nodes cannot exist without parent model
- Action nodes cannot exist without parent container node
- Versions preserve complete model state including all action nodes
- Node dependencies must be valid within model (containers only)
- Action execution order must be valid within parent container
- Status changes affect all contained entities (containers and actions)
- Context access follows hierarchical rules universally
- Execution modes and priorities must be consistent within containers
- Retry policies must be valid for action types and execution context
- Fractal orchestration patterns maintain consistency across nesting levels

### **CrossFeatureRelationship Aggregate**
**Root**: NodeLink or CrossFeatureLink  
**Entities**: LinkType metadata  
**Boundary**: Single relationship instance

**Consistency Rules**:
- Links must reference valid entities
- Link strength is maintained consistently
- Link context is validated against type

### **AIAgent Aggregate**
**Root**: AIAgent  
**Entities**: Agent execution history (via audit log)  
**Boundary**: Single agent instance and its execution context

**Consistency Rules**:
- Agent configuration is validated
- Execution state is consistent
- Tool availability is verified

## Edge Cases and Constraints

### Database Constraints Identified

1. **Check Constraints**:
   - Link strength range validation (0.0-1.0)
   - Feature type enumeration enforcement
   - Node type validation
   - Status transition validation
   - Timeout non-negative validation

2. **Foreign Key Constraints**:
   - User references for audit and creation tracking
   - Model-to-version relationships
   - Cross-feature entity references

3. **Unique Constraints**:
   - Node link type names must be unique
   - Model versions must be unique per model

### Business Logic Edge Cases

1. **Orphaned Entities**:
   - Nodes without valid model references
   - Links referencing deleted entities
   - Agents attached to non-existent entities

2. **Circular Dependencies**:
   - Node dependency cycles within models
   - Cross-feature circular relationships
   - Agent execution loops

3. **Version Conflicts**:
   - Multiple published versions
   - Version data corruption
   - Semantic version ordering

4. **Concurrent Modifications**:
   - Simultaneous model edits
   - Version creation races
   - Link modification conflicts

## Domain Events

The following domain events should be raised to maintain system consistency:

### Function Model Events
- `FunctionModelCreated`
- `FunctionModelPublished`
- `FunctionModelArchived`
- `FunctionModelVersionCreated`
- `ContainerNodeAdded`
- `ContainerNodeRemoved`
- `ContainerNodeModified`
- `ActionNodeAdded`
- `ActionNodeRemoved`
- `ActionNodeModified`
- `ActionNodeExecutionOrderChanged`
- `ActionNodeExecutionStarted`
- `ActionNodeExecutionCompleted`
- `ActionNodeExecutionFailed`
- `ActionNodeExecutionModeChanged`
- `ActionNodePriorityChanged`
- `ActionNodeRetryPolicyUpdated`
- `ActionNodeStatusChanged`
- `ContainerNodeOrchestrationStarted`
- `ContainerNodeOrchestrationCompleted`
- `FractalOrchestrationLevelChanged`

### Relationship Events
- `NodeLinkCreated`
- `NodeLinkRemoved`
- `CrossFeatureLinkEstablished`
- `CrossFeatureLinkBroken`

### AI Agent Events
- `AIAgentConfigured`
- `AIAgentExecutionStarted`
- `AIAgentExecutionCompleted`
- `AIAgentExecutionFailed`

## Implementation Guidelines

### Entity Creation
All entities must:
1. Validate business rules during construction
2. Raise appropriate domain events
3. Maintain audit trail through AuditLog
4. Enforce invariants consistently

### Repository Interfaces
The domain defines interfaces for:
- `FunctionModelRepository`
- `ContainerNodeRepository` 
- `ActionNodeRepository`
- `NodeLinkRepository`
- `CrossFeatureLinkRepository`
- `AIAgentRepository`
- `AuditLogRepository`

### Service Interfaces
The domain defines service interfaces for:
- `ActionNodeOrchestrationService`
- `ActionNodeExecutionService`
- `FractalOrchestrationService`
- `NodeContextAccessService`
- `NodeDependencyService`

### Use Case Boundaries
Use cases should:
1. Operate on complete aggregates
2. Enforce cross-aggregate consistency through domain services
3. Coordinate complex workflows
4. Handle concurrent access patterns

## Conclusion

This domain model provides a comprehensive foundation for the Function Model feature, capturing the essential business concepts, rules, and relationships while maintaining Clean Architecture principles. The model supports extensibility through optional cross-feature integration while ensuring consistency through well-defined aggregates and domain services.

The identified entities, value objects, and business rules form the core of the Function Model domain layer and should guide all application layer use case implementations and infrastructure layer integrations. The Function Model can operate completely independently while providing powerful orchestration capabilities when integrated with other Silver AI Automation features.

## Action Node Types and Configurations

### **KbNode Configuration**
**Purpose**: Links to Knowledge Base content with RACI assignment and documentation context.

**Configuration Properties**:
- `kb_reference_id`: Link to Knowledge Base document/entity
- `raci`: Responsibility assignment matrix (Responsible, Accountable, Consulted, Informed)
- `short_description`: Concise explanation of the action
- `documentation_context`: Additional context or sample documentation
- `search_keywords`: Terms for AI agent discovery and context retrieval
- `access_permissions`: Who can view/edit this knowledge base link

**AI Agent Access**:
- Stage node agents can access name, description, and RACI information
- Agents can retrieve the linked Knowledge Base ID for database searches
- Agents can access additional context and documentation samples
- RACI information helps agents understand responsibility distribution

**Business Rules**:
- KB reference must point to valid Knowledge Base entity
- RACI must have at least one responsible party defined
- Short description must be concise but informative
- Documentation context supports AI agent understanding

### **TetherNode Configuration**
**Purpose**: Links to Spindle execution workflows for automation and execution control.

**Configuration Properties**:
- `tether_reference_id`: Link to Spindle tether/workflow entity
- `execution_parameters`: Configuration for tether execution
- `output_mapping`: How tether outputs map to stage context
- `execution_triggers`: What conditions trigger tether execution
- `resource_requirements`: CPU, memory, and timeout specifications
- `integration_config`: API endpoints and authentication details

**AI Agent Access**:
- Stage agents can access tether ID and basic configuration
- Agents can retrieve the tether object (like a nested function model)
- Agents can access run history, execution status, and output data
- Agents can communicate with tether-specific AI agents
- Agents can request execution, stop, or modify tether workflows

**Business Rules**:
- Tether reference must point to valid Spindle entity
- Execution parameters must be valid for the specific tether type
- Output mapping must align with stage context requirements
- Resource requirements must be within system limits

### **FunctionModelContainer Configuration**
**Purpose**: Links to nested Function Models for complex workflow composition.

**Configuration Properties**:
- `nested_model_id`: Reference to nested Function Model
- `context_mapping`: How parent context maps to nested model inputs
- `output_extraction`: Which nested model outputs to expose to parent
- `execution_policy`: When and how nested model executes
- `context_inheritance`: What context the nested model inherits
- `orchestration_mode`: How nested model integrates with parent orchestration

**AI Agent Access**:
- Parent model agents can access nested model outputs and contexts
- Agents can access linked KB contexts from nested models
- Agents can access nested tether execution data and run history
- Agents can orchestrate nested model execution
- Deep nesting maintains consistent access patterns

**Business Rules**:
- Nested model must be valid and accessible
- Context mapping must preserve data integrity
- Output extraction must align with parent requirements
- Execution policy must not conflict with parent orchestration

## UI Design and Visual Architecture

### **Visual Hierarchy and Node Interaction Design**

The Function Model UI follows a **nested visual hierarchy** approach using React Flow, where container nodes act as visual "folders" that contain action nodes, rather than traditional edge connections.

#### **Core Visual Design Principles**

1. **Container Nodes as "Foldable Containers"**:
   - **Expandable/Collapsible**: Container nodes can expand to show their action nodes or collapse to hide them
   - **Visual nesting**: Action nodes appear visually "inside" the container with indentation or visual borders
   - **Container styling**: Larger, more prominent visual treatment to indicate they're "parent" elements
   - **No traditional edges**: Container nodes and action nodes are connected through visual containment, not edge connections

2. **Action Node Layout Within Containers**:
   - **Grid or List layout**: Action nodes arranged in a clean grid or vertical list within the container
   - **Type-based grouping**: Visual separation between different action types (KB, Tether, Function Model)
   - **Drag & Drop**: Action nodes can be reordered within their container or moved between containers
   - **Visual containment**: Action nodes are visually nested within their parent container nodes

3. **Cross-Container Connections**:
   - **Traditional edges**: Only between different container nodes (IO → Stage → IO)
   - **Context flow visualization**: Visual indicators showing how context flows between containers
   - **Dependency arrows**: Show execution dependencies between stages
   - **No edges to action nodes**: Action nodes are contained, not connected via edges

#### **Specific Node Interaction Patterns**

1. **Container Node Expansion**:
   - **Expand/Collapse Button**: Click to show/hide action nodes within the container
   - **Visual State**: Container changes appearance when expanded (larger size, different styling)
   - **Action Node Visibility**: Action nodes appear/disappear based on container state
   - **Smooth Transitions**: Animated expansion/collapse for better user experience

2. **Action Node Management**:
   - **Add Action Button**: Located within each container node to add new action nodes
   - **Action Node Controls**: Each action node has edit, delete, and configuration buttons
   - **Type Selection**: When adding actions, user selects from KB, Tether, or Function Model types
   - **Visual Feedback**: Clear indication of which container an action node belongs to

3. **Visual Hierarchy Indicators**:
   - **Container Styling**: Larger borders, different background colors, prominent titles
   - **Action Node Styling**: Smaller size, indented positioning, subtle borders
   - **Type Icons**: Visual indicators for different action node types
   - **Status Indicators**: Color coding for different execution states

#### **React Flow Implementation Approach**

1. **Node Types and Handles**:
   - **Container Nodes**: Have input/output handles for connecting to other containers
   - **Action Nodes**: No handles - they're contained within containers
   - **Edge Connections**: Only between container nodes, never to action nodes
   - **Handle Positioning**: Container handles positioned on outer boundaries

2. **Canvas Layout and Navigation**:
   - **Main Canvas**: Large central area for workflow visualization
   - **Container Positioning**: Container nodes positioned using React Flow's positioning system
   - **Action Node Positioning**: Action nodes positioned relative to their container
   - **Zoom and Pan**: Full canvas navigation capabilities
   - **Grid Snapping**: Optional grid alignment for clean layouts

3. **Drag and Drop Behavior**:
   - **Container Movement**: Container nodes can be moved around the canvas
   - **Action Node Reordering**: Action nodes can be reordered within containers
   - **Container-to-Container**: Action nodes can be moved between different containers
   - **Validation**: Prevents invalid moves (e.g., action nodes must always have a container)

#### **Detailed Visual Specifications**

1. **Container Node Visual Design**:
   - **Size**: 300px × 200px (expandable to 400px × 300px when containing actions)
   - **Border**: 3px solid border with rounded corners
   - **Background**: Light background with subtle gradient
   - **Header**: Prominent title area with expand/collapse controls
   - **Status Indicator**: Color-coded status badge in top-right corner
   - **Connection Points**: Input/output handles on left/right sides

2. **Action Node Visual Design**:
   - **Size**: 120px × 80px (compact within containers)
   - **Border**: 1px solid border with rounded corners
   - **Background**: White background with subtle shadow
   - **Type Icon**: Small icon indicating KB, Tether, or Function Model type
   - **Status Indicator**: Small status dot in bottom-right corner
   - **Controls**: Edit and delete buttons on hover

3. **Visual Containment Indicators**:
   - **Nesting Borders**: Subtle borders showing action nodes belong to containers
   - **Indentation**: Action nodes visually indented within container boundaries
   - **Background Grouping**: Container background extends behind action nodes
   - **Visual Hierarchy**: Clear distinction between container and action levels

#### **User Interaction Flows**

1. **Creating Workflow Structure**:
   - **Add Container**: User clicks "Add Container" button, selects IO or Stage type
   - **Position Container**: User drags container to desired position on canvas
   - **Add Actions**: User expands container and clicks "Add Action" button
   - **Configure Actions**: User selects action type and configures properties
   - **Connect Containers**: User draws edges between container nodes

2. **Managing Action Nodes**:
   - **Expand Container**: Click expand button to see contained actions
   - **Add Action**: Click "Add Action" button within container
   - **Configure Action**: Click edit button on action node to open configuration panel
   - **Reorder Actions**: Drag action nodes to reorder within container
   - **Move Actions**: Drag action nodes between different containers

3. **Workflow Orchestration**:
   - **Set Dependencies**: Draw edges between container nodes to show execution order
   - **Configure Execution**: Set execution modes and priorities for action nodes
   - **Monitor Status**: View real-time status of containers and actions
   - **Execute Workflow**: Trigger workflow execution from model level

#### **Responsive Design Considerations**

1. **Desktop Layout**:
   - **Full Canvas**: Large canvas with all nodes visible
   - **Side Panels**: Configuration panels on right, navigation on left
   - **Hover Effects**: Rich hover interactions for all nodes
   - **Keyboard Shortcuts**: Full keyboard navigation support

2. **Tablet Layout**:
   - **Medium Canvas**: Reduced canvas size with scroll capabilities
   - **Collapsible Panels**: Side panels can be hidden/shown
   - **Touch Gestures**: Pinch to zoom, swipe to pan
   - **Simplified Controls**: Larger touch targets for mobile devices

3. **Mobile Layout**:
   - **Compact Canvas**: Small canvas with focus on current workflow section
   - **Modal Panels**: Configuration panels open as full-screen modals
   - **Touch-Optimized**: Large buttons and touch-friendly interactions
   - **Progressive Disclosure**: Show only essential information initially

#### **Accessibility and Usability**

1. **Keyboard Navigation**:
   - **Tab Order**: Logical tab sequence through all interactive elements
   - **Arrow Keys**: Navigate between nodes using arrow keys
   - **Enter/Space**: Activate buttons and expand/collapse containers
   - **Escape**: Close panels and return to canvas focus

2. **Screen Reader Support**:
   - **Node Descriptions**: Clear descriptions of node types and purposes
   - **Status Announcements**: Screen reader announcements for status changes
   - **Relationship Information**: Clear indication of node relationships
   - **Action Descriptions**: Descriptive text for all interactive elements

3. **Visual Accessibility**:
   - **High Contrast**: Sufficient contrast between elements
   - **Color Independence**: Status and type information not relying solely on color
   - **Size Variations**: Support for different text and element sizes
   - **Focus Indicators**: Clear focus indicators for keyboard navigation

#### **Performance and Scalability**

1. **Canvas Rendering**:
   - **Virtual Scrolling**: Only render visible nodes for large workflows
   - **Lazy Loading**: Load node details on demand
   - **Efficient Updates**: Minimal re-renders when updating node states
   - **Smooth Animations**: 60fps animations for all interactions

2. **Large Workflow Support**:
   - **Node Grouping**: Group related nodes for better organization
   - **Zoom Levels**: Multiple zoom levels for different detail views
   - **Search and Filter**: Find specific nodes quickly in large workflows
   - **Mini-map**: Overview of entire workflow for navigation

3. **Real-time Updates**:
   - **Status Synchronization**: Real-time status updates across all nodes
   - **Collaborative Editing**: Support for multiple users editing same workflow
   - **Change Notifications**: Clear indication of what has changed
   - **Conflict Resolution**: Handle concurrent modifications gracefully

### **Integration with Domain Model**

This UI design directly implements the domain model concepts:

1. **Two-Tier Node Architecture**: Visual distinction between container nodes (orchestration) and action nodes (execution)
2. **Hierarchical Context Access**: Visual containment shows context boundaries and access patterns
3. **Fractal Orchestration**: Nested visual structure supports deep nesting of function models
4. **Action Node Types**: Clear visual representation of KB, Tether, and Function Model containers
5. **Execution Orchestration**: Visual flow shows execution order and dependencies between containers
6. **Context Inheritance**: Visual nesting demonstrates how context flows through the hierarchy

The UI design maintains the Clean Architecture principles by:
- **Separation of Concerns**: Visual representation separate from business logic
- **Dependency Inversion**: UI depends on domain abstractions, not concrete implementations
- **Single Responsibility**: Each UI component has a single, clear purpose
- **Open/Closed**: UI components can be extended without modification

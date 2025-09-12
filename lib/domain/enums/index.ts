export enum FeatureType {
  FUNCTION_MODEL = 'function-model',
  KNOWLEDGE_BASE = 'knowledge-base',
  SPINDLE = 'spindle',
  EVENT_STORM = 'event-storm',
  AI_AGENT = 'ai-agent'
}

// UNIFIED NODE TYPE SYSTEM - Replaces fragmented ContainerNodeType/ActionNodeType
export enum NodeType {
  IO_NODE = 'ioNode',
  STAGE_NODE = 'stageNode',
  TETHER_NODE = 'tetherNode',
  KB_NODE = 'kbNode',
  FUNCTION_MODEL_CONTAINER = 'functionModelContainer'
}

export enum ContainerNodeType {
  IO_NODE = 'ioNode',
  STAGE_NODE = 'stageNode'
}

export enum IOType {
  INPUT = 'input',
  OUTPUT = 'output',
  INPUT_OUTPUT = 'input-output'
}

export enum ActionNodeType {
  TETHER_NODE = 'tetherNode',
  KB_NODE = 'kbNode',
  FUNCTION_MODEL_CONTAINER = 'functionModelContainer'
}

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

export enum ActionStatus {
  DRAFT = 'draft',
  CONFIGURED = 'configured',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

export enum NodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  CONFIGURED = 'configured',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

export enum ModelStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum LinkType {
  DOCUMENTS = 'documents',
  IMPLEMENTS = 'implements',
  REFERENCES = 'references',
  SUPPORTS = 'supports',
  NESTED = 'nested',
  TRIGGERS = 'triggers',
  CONSUMES = 'consumes',
  PRODUCES = 'produces',
  DEPENDENCY = 'dependency',
  REFERENCE = 'reference'
}

export enum LinkStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

export enum LinkDirection {
  UNIDIRECTIONAL = 'unidirectional',
  BIDIRECTIONAL = 'bidirectional'
}

export enum RACIRole {
  RESPONSIBLE = 'responsible',
  ACCOUNTABLE = 'accountable',
  CONSULTED = 'consulted',
  INFORMED = 'informed'
}
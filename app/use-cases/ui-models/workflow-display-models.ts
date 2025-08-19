// UI Display Models - Presentation Layer Specific
// Following Clean Architecture: These models are designed specifically for UI consumption
// They contain UI-specific formatting, colors, and display properties

/**
 * UI Display Model for Workflow
 * Contains UI-specific properties for displaying workflow information
 */
export interface WorkflowDisplayModel {
  // Core identification
  id: string
  displayName: string
  displayDescription: string
  
  // UI-specific status presentation
  statusColor: string // CSS classes for status color
  statusText: string // Human-readable status text
  
  // UI-specific metrics
  nodeCount: number
  edgeCount: number
  containerNodeCount: number
  actionNodeCount: number
  
  // UI state flags
  isValid: boolean
  canExecute: boolean
  
  // UI-formatted timestamps
  lastUpdated: string // ISO string for display formatting
  createdAt: string
}

/**
 * UI Display Model for Nodes
 * Contains UI-specific properties for node rendering and interaction
 */
export interface NodeDisplayModel {
  // Core identification
  id: string
  displayName: string // UI-formatted name
  displayDescription: string // UI-formatted description
  
  // UI-specific status presentation
  statusColor: string // CSS classes for status badge
  statusText: string // Human-readable status
  
  // UI-specific priority presentation
  priorityColor: string // CSS classes for priority badge
  priorityText: string // Human-readable priority
  
  // UI-specific execution mode presentation
  executionModeIcon: string // Icon or emoji for execution mode
  executionModeText: string // Human-readable execution mode
  
  // UI-specific context access presentation
  contextAccessColor: string // CSS classes for context access badge
  contextAccessText: string // Human-readable context access level
  
  // UI visibility flags
  showBadges: boolean
  showStatus: boolean
  showPriority: boolean
  
  // UI-specific metrics
  dependencyCount: number
  contextVariableCount: number
  
  // UI state flags
  isValid: boolean
  canExecute: boolean
  
  // UI-formatted timestamp
  lastUpdated: string
  
  // Optional execution-specific UI properties
  executionProgress?: number // 0-100 for progress bar
  executionTime?: number // seconds for duration display
  executionError?: string // UI-formatted error message
}

/**
 * UI Display Model for Node Context Information
 * Contains UI-specific properties for context visualization
 */
export interface NodeContextDisplayModel {
  id: string
  displayName: string
  nodeType: string
  accessLevel: 'read' | 'write' | 'inherit' | 'none'
  
  // UI-specific access level presentation
  accessLevelColor: string
  accessLevelIcon: string
  accessLevelText: string
  
  // UI hierarchy information
  isParent: boolean
  isChild: boolean
  isSibling: boolean
  nestingLevel: number
  
  // UI state
  isExpanded: boolean
  hasChildren: boolean
  childCount: number
  
  // UI-specific context data preview
  contextPreview?: string // Truncated preview for UI
  contextDataCount: number
}

/**
 * UI Display Model for Validation Results
 * Contains UI-specific properties for validation feedback
 */
export interface ValidationDisplayModel {
  // Overall validation state
  isValid: boolean
  errorCount: number
  warningCount: number
  
  // UI-formatted validation issues
  errors: ValidationIssueDisplayModel[]
  warnings: ValidationIssueDisplayModel[]
  
  // UI-formatted timestamp
  lastValidated: string
}

/**
 * UI Display Model for Individual Validation Issues
 * Contains UI-specific properties for displaying validation problems
 */
export interface ValidationIssueDisplayModel {
  id: string
  type: 'error' | 'warning' | 'info' | 'suggestion'
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  description?: string
  nodeId?: string
  nodeName?: string
  category: string
  
  // UI-specific properties
  suggestedFix?: string
  autoFixAvailable?: boolean
  
  // UI formatting helpers
  severityColor?: string // CSS classes
  typeIcon?: string // Icon for issue type
}

/**
 * UI Display Model for Workflow Statistics
 * Contains UI-specific properties for status bar and dashboard metrics
 */
export interface WorkflowStatsDisplayModel {
  // Node statistics
  totalNodes: number
  containerNodes: number
  actionNodes: number
  
  // Execution statistics
  executionMode: 'sequential' | 'parallel' | 'conditional' | 'mixed'
  estimatedDuration: number // in minutes
  completedNodes: number
  failedNodes: number
  runningNodes: number
  
  // UI-formatted text
  executionModeText: string
  executionModeIcon: string
  durationText: string // "45m" or "1h 30m"
  
  // Progress information
  overallProgress: number // 0-100 percentage
  progressText: string // "3 of 10 completed"
}

/**
 * UI Display Model for Context Access Information
 * Contains UI-specific properties for context access panels
 */
export interface ContextAccessDisplayModel {
  currentNodeId: string
  currentNodeName: string
  
  // Current access level
  accessLevel: 'none' | 'read' | 'write' | 'admin'
  accessLevelColor: string
  accessLevelIcon: string
  
  // Available contexts
  availableContexts: NodeContextDisplayModel[]
  contextSources: NodeContextDisplayModel[]
  sharedWith: NodeContextDisplayModel[]
  
  // Hierarchical contexts
  parentContexts: NodeContextDisplayModel[]
  childContexts: NodeContextDisplayModel[]
  siblingContexts: NodeContextDisplayModel[]
  
  // UI statistics
  availableContextCount: number
  activeSharing: number
  totalSharing: number
}

/**
 * UI Display Model for Execution Status
 * Contains UI-specific properties for execution monitoring
 */
export interface ExecutionStatusDisplayModel {
  // Current execution state
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  statusColor: string
  statusIcon: string
  statusText: string
  
  // Progress information
  currentStep: number
  totalSteps: number
  progressPercentage: number
  progressText: string
  
  // Timing information
  startTime?: string // ISO string
  elapsedTime?: string // "2m 30s"
  estimatedRemaining?: string // "1m 45s"
  
  // Active execution details
  activeNodeId?: string
  activeNodeName?: string
  
  // Error information
  errorMessage?: string
  errorDetails?: string
  
  // UI state flags
  canPause: boolean
  canStop: boolean
  canReset: boolean
  canExecute: boolean
}

/**
 * UI Display Model for Workflow Templates
 * Contains UI-specific properties for template selection
 */
export interface WorkflowTemplateDisplayModel {
  id: string
  displayName: string
  displayDescription: string
  category: string
  
  // UI-specific difficulty presentation
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  difficultyColor: string
  difficultyIcon: string
  
  // UI metrics
  estimatedTime: number // minutes
  nodeCount: number
  timeText: string // "30m"
  complexityText: string // "5 nodes"
  
  // UI visual elements
  icon: string // Icon identifier
  tags: string[]
  
  // UI state flags
  isPopular: boolean
  isFeatured: boolean
  isRecommended: boolean
  
  // UI preview information
  previewImage?: string
  previewDescription: string
  nodeTypeBreakdown: { type: string; count: number }[]
}

/**
 * UI State Models for Form Management
 * Contains UI-specific state for form interactions
 */
export interface FormStateDisplayModel {
  // Form validation state
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
  
  // Field-specific validation
  fieldErrors: Record<string, string>
  fieldWarnings: Record<string, string>
  
  // UI feedback
  submitAttempted: boolean
  lastSaved?: string
  autoSaveEnabled: boolean
  
  // UI state flags
  canSubmit: boolean
  canReset: boolean
  hasUnsavedChanges: boolean
}

/**
 * UI Display Model for Search and Filter State
 * Contains UI-specific properties for search/filter interfaces
 */
export interface SearchFilterDisplayModel {
  // Current search state
  searchQuery: string
  searchPlaceholder: string
  searchResultCount: number
  
  // Active filters
  activeFilters: FilterDisplayModel[]
  availableFilters: FilterDisplayModel[]
  
  // UI state
  isSearching: boolean
  hasResults: boolean
  showAdvancedFilters: boolean
  
  // UI text
  resultText: string // "5 results found"
  clearText: string // "Clear all filters"
}

export interface FilterDisplayModel {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'date' | 'text'
  value: any
  options?: { label: string; value: any }[]
  
  // UI state
  isActive: boolean
  isRequired: boolean
  
  // UI formatting
  displayValue: string
  count?: number // For showing result counts
}
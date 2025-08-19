'use client'

// Presentation Layer Bridge - Connects UI to Application Layer
// Following Clean Architecture: Interface Adapters Layer

import { WorkflowDisplayModel, NodeDisplayModel, ValidationDisplayModel } from '../ui-models/workflow-display-models'
import { NotificationService } from '../ui-workflows/notification-service'

// Application Layer Interfaces (these would be defined by use cases)
interface CreateWorkflowUseCase {
  execute(request: CreateWorkflowRequest): Promise<WorkflowResult>
}

interface ExecuteNodeUseCase {
  execute(request: ExecuteNodeRequest): Promise<NodeExecutionResult>
}

interface ValidateWorkflowUseCase {
  execute(request: ValidateWorkflowRequest): Promise<ValidationResult>
}

interface GetWorkflowUseCase {
  execute(workflowId: string): Promise<WorkflowResult>
}

// Application Layer DTOs
interface CreateWorkflowRequest {
  name: string
  description: string
  templateId?: string
  category: string
  executionMode: string
  priority: string
  settings: Record<string, any>
}

interface ExecuteNodeRequest {
  nodeId: string
  workflowId: string
  parameters?: Record<string, any>
}

interface ValidateWorkflowRequest {
  workflowId: string
  nodes: any[]
  edges: any[]
}

interface WorkflowResult {
  id: string
  name: string
  description: string
  status: string
  nodes: any[]
  edges: any[]
  createdAt: string
  updatedAt: string
}

interface NodeExecutionResult {
  nodeId: string
  status: string
  progress: number
  executionTime: number
  result?: any
  error?: string
}

interface ValidationResult {
  isValid: boolean
  errors: Array<{
    id: string
    type: string
    severity: string
    message: string
    nodeId?: string
  }>
  warnings: Array<{
    id: string
    type: string
    severity: string
    message: string
    nodeId?: string
  }>
}

// UI Form Data Models
export interface WorkflowFormData {
  name: string
  description: string
  templateId?: string
  category: string
  executionMode: 'sequential' | 'parallel' | 'conditional'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createDefaults: boolean
  enableValidation: boolean
  autoSave: boolean
}

export interface NodeFormData {
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  executionMode: 'sequential' | 'parallel' | 'conditional'
  contextAccess: 'inherit' | 'readonly' | 'readwrite' | 'isolated'
  visualProperties: {
    showBadges: boolean
    showStatus: boolean
    showPriority: boolean
  }
  dependencies: Array<{ id: string; type: string }>
  contextVariables: Array<{ name: string; type: string; required: boolean }>
}

/**
 * Presentation Layer Bridge for Workflow Operations
 * 
 * This class acts as a bridge between the UI components and the application layer use cases.
 * It follows Clean Architecture principles by:
 * 1. Converting UI models to application layer DTOs
 * 2. Orchestrating use case execution
 * 3. Converting domain results to UI display models
 * 4. Handling UI-specific concerns (notifications, error formatting)
 */
export class WorkflowOperationsPresenter {
  constructor(
    private createWorkflowUseCase: CreateWorkflowUseCase,
    private executeNodeUseCase: ExecuteNodeUseCase,
    private validateWorkflowUseCase: ValidateWorkflowUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private notificationService: NotificationService
  ) {}

  /**
   * Creates a new workflow from UI form data
   */
  async createWorkflow(formData: WorkflowFormData): Promise<WorkflowDisplayModel> {
    try {
      // Convert UI form data to application layer DTO
      const request: CreateWorkflowRequest = {
        name: formData.name,
        description: formData.description,
        templateId: formData.templateId,
        category: formData.category,
        executionMode: formData.executionMode,
        priority: formData.priority,
        settings: {
          createDefaults: formData.createDefaults,
          enableValidation: formData.enableValidation,
          autoSave: formData.autoSave
        }
      }

      // Execute application use case
      const result = await this.createWorkflowUseCase.execute(request)

      // Show UI feedback
      this.notificationService.showSuccess('Workflow created successfully')

      // Convert domain result to UI display model
      return this.mapWorkflowToDisplayModel(result)
    } catch (error) {
      // Handle errors with user-friendly messages
      this.notificationService.showError('Failed to create workflow')
      throw error
    }
  }

  /**
   * Executes a node with UI parameters
   */
  async executeNode(nodeId: string, workflowId: string, parameters?: Record<string, any>): Promise<NodeDisplayModel> {
    try {
      // Convert UI parameters to application layer DTO
      const request: ExecuteNodeRequest = {
        nodeId,
        workflowId,
        parameters
      }

      // Execute application use case
      const result = await this.executeNodeUseCase.execute(request)

      // Show UI feedback
      if (result.status === 'completed') {
        this.notificationService.showSuccess(`Node ${nodeId} executed successfully`)
      } else if (result.status === 'failed') {
        this.notificationService.showError(`Node ${nodeId} execution failed`)
      }

      // Convert domain result to UI display model
      return this.mapNodeExecutionToDisplayModel(result)
    } catch (error) {
      this.notificationService.showError('Failed to execute node')
      throw error
    }
  }

  /**
   * Validates workflow and returns UI-formatted validation results
   */
  async validateWorkflow(workflowId: string, nodes: any[], edges: any[]): Promise<ValidationDisplayModel> {
    try {
      // Convert UI data to application layer DTO
      const request: ValidateWorkflowRequest = {
        workflowId,
        nodes,
        edges
      }

      // Execute application use case
      const result = await this.validateWorkflowUseCase.execute(request)

      // Convert domain result to UI display model
      return this.mapValidationToDisplayModel(result)
    } catch (error) {
      this.notificationService.showError('Failed to validate workflow')
      throw error
    }
  }

  /**
   * Gets workflow by ID and returns UI display model
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDisplayModel> {
    try {
      // Execute application use case
      const result = await this.getWorkflowUseCase.execute(workflowId)

      // Convert domain result to UI display model
      return this.mapWorkflowToDisplayModel(result)
    } catch (error) {
      this.notificationService.showError('Failed to load workflow')
      throw error
    }
  }

  /**
   * Updates node properties from UI form data
   */
  async updateNodeProperties(nodeId: string, formData: NodeFormData): Promise<NodeDisplayModel> {
    try {
      // This would call an UpdateNodeUseCase when implemented
      // For now, we'll simulate the conversion
      
      this.notificationService.showSuccess('Node properties updated')

      // Return updated display model (simulated)
      return {
        id: nodeId,
        displayName: formData.name,
        displayDescription: formData.description,
        statusColor: this.getStatusColor('idle'),
        statusText: 'Idle',
        priorityColor: this.getPriorityColor(formData.priority),
        priorityText: formData.priority,
        executionModeIcon: this.getExecutionModeIcon(formData.executionMode),
        executionModeText: formData.executionMode,
        contextAccessColor: this.getContextAccessColor(formData.contextAccess),
        contextAccessText: formData.contextAccess,
        showBadges: formData.visualProperties.showBadges,
        showStatus: formData.visualProperties.showStatus,
        showPriority: formData.visualProperties.showPriority,
        dependencyCount: formData.dependencies.length,
        contextVariableCount: formData.contextVariables.length,
        isValid: true,
        canExecute: true,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      this.notificationService.showError('Failed to update node properties')
      throw error
    }
  }

  // Private mapping methods - Convert domain models to UI display models

  private mapWorkflowToDisplayModel(workflow: WorkflowResult): WorkflowDisplayModel {
    return {
      id: workflow.id,
      displayName: workflow.name,
      displayDescription: workflow.description,
      statusColor: this.getStatusColor(workflow.status),
      statusText: this.getStatusText(workflow.status),
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      containerNodeCount: workflow.nodes.filter(n => ['io', 'stage'].includes(n.type)).length,
      actionNodeCount: workflow.nodes.filter(n => ['tether', 'kb', 'functionModel'].includes(n.type)).length,
      isValid: true, // Would come from validation
      canExecute: workflow.nodes.length > 0,
      lastUpdated: workflow.updatedAt,
      createdAt: workflow.createdAt
    }
  }

  private mapNodeExecutionToDisplayModel(execution: NodeExecutionResult): NodeDisplayModel {
    return {
      id: execution.nodeId,
      displayName: `Node ${execution.nodeId}`,
      displayDescription: '',
      statusColor: this.getStatusColor(execution.status),
      statusText: this.getStatusText(execution.status),
      priorityColor: this.getPriorityColor('medium'),
      priorityText: 'medium',
      executionModeIcon: '▶️',
      executionModeText: 'sequential',
      contextAccessColor: this.getContextAccessColor('inherit'),
      contextAccessText: 'inherit',
      showBadges: true,
      showStatus: true,
      showPriority: true,
      dependencyCount: 0,
      contextVariableCount: 0,
      isValid: !execution.error,
      canExecute: execution.status !== 'running',
      lastUpdated: new Date().toISOString(),
      executionProgress: execution.progress,
      executionTime: execution.executionTime,
      executionError: execution.error
    }
  }

  private mapValidationToDisplayModel(validation: ValidationResult): ValidationDisplayModel {
    return {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      errors: validation.errors.map(e => ({
        id: e.id,
        type: e.type as 'error' | 'warning' | 'info' | 'suggestion',
        severity: e.severity as 'critical' | 'high' | 'medium' | 'low',
        message: e.message,
        description: `Validation error in ${e.nodeId || 'workflow'}`,
        nodeId: e.nodeId,
        category: 'Validation',
        suggestedFix: this.getSuggestedFix(e.type),
        autoFixAvailable: this.canAutoFix(e.type)
      })),
      warnings: validation.warnings.map(w => ({
        id: w.id,
        type: w.type as 'error' | 'warning' | 'info' | 'suggestion',
        severity: w.severity as 'critical' | 'high' | 'medium' | 'low',
        message: w.message,
        description: `Validation warning in ${w.nodeId || 'workflow'}`,
        nodeId: w.nodeId,
        category: 'Validation',
        suggestedFix: this.getSuggestedFix(w.type),
        autoFixAvailable: this.canAutoFix(w.type)
      })),
      lastValidated: new Date().toISOString()
    }
  }

  // Helper methods for UI-specific formatting

  private getStatusColor(status: string): string {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'running': return 'Running'
      case 'completed': return 'Completed'
      case 'failed': case 'error': return 'Failed'
      case 'paused': return 'Paused'
      default: return 'Idle'
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  private getExecutionModeIcon(mode: string): string {
    switch (mode) {
      case 'sequential': return '▶️'
      case 'parallel': return '⚡'
      case 'conditional': return '🔀'
      default: return '▶️'
    }
  }

  private getContextAccessColor(access: string): string {
    switch (access) {
      case 'readwrite': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'readonly': return 'bg-green-100 text-green-800 border-green-200'
      case 'inherit': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'isolated': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  private getSuggestedFix(errorType: string): string {
    switch (errorType) {
      case 'missing_connection': return 'Connect this node to another node'
      case 'invalid_configuration': return 'Review and update node configuration'
      case 'circular_dependency': return 'Remove circular dependency in workflow'
      default: return 'Review the issue and make necessary corrections'
    }
  }

  private canAutoFix(errorType: string): boolean {
    return ['missing_connection', 'invalid_configuration'].includes(errorType)
  }
}
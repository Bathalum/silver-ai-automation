import { ActionNode } from '../entities/action-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';
import { IExecutionReadinessService } from '../../use-cases/function-model/validate-workflow-structure-use-case';

export class ExecutionReadinessValidationService implements IExecutionReadinessService {
  async validateExecutionReadiness(actionNodes: ActionNode[], executionContext: any): Promise<Result<ValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate action node configurations
      this.validateActionNodeConfigurations(actionNodes, errors, warnings);
      
      // Validate resource availability
      await this.validateResourceAvailability(actionNodes, executionContext, errors, warnings);
      
      // Validate execution order consistency
      this.validateExecutionOrderConsistency(actionNodes, errors, warnings);
      
      // Validate parallel execution settings
      this.validateParallelExecutionSettings(actionNodes, errors, warnings);
      
      // Validate retry and error handling configurations
      this.validateRetryAndErrorHandling(actionNodes, errors, warnings);
      
      // Validate timeout configurations
      this.validateTimeoutConfigurations(actionNodes, errors, warnings);
      
      // Validate external dependency availability
      await this.validateExternalDependencies(actionNodes, errors, warnings);
      
      // Validate execution environment requirements
      await this.validateExecutionEnvironment(actionNodes, errors, warnings);
      
      // Validate data schema compatibility
      this.validateDataSchemaCompatibility(actionNodes, errors, warnings);
      
      // Validate execution permissions
      this.validateExecutionPermissions(actionNodes, executionContext, errors, warnings);

      return Result.ok<ValidationResult>({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Result.fail<ValidationResult>(
        `Execution readiness validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateActionNodeConfigurations(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      // Validate API call configurations
      if (actionNode.actionType === 'api-call') {
        if (!config?.endpoint || !config.endpoint.toString().startsWith('http')) {
          errors.push(`Action node ${actionNode.name} missing required configuration: endpoint URL`);
        }
        
        if (!config?.httpMethod) {
          warnings.push(`Action node ${actionNode.name} should specify HTTP method`);
        }
        
        if (!config?.timeout) {
          warnings.push(`Action node ${actionNode.name} should specify request timeout`);
        }
      }
      
      // Validate data transformation configurations
      if (actionNode.actionType === 'data-transformation') {
        if (!config?.transformationScript && !config?.transformationRules) {
          errors.push(`Action node ${actionNode.name} missing transformation logic`);
        }
        
        if (config?.transformationScript && !this.validateScriptSyntax(config.transformationScript)) {
          errors.push(`Action node ${actionNode.name} has invalid transformation script syntax`);
        }
      }
      
      // Validate database operation configurations
      if (actionNode.actionType === 'database-operation') {
        if (!config?.connectionString && !config?.connectionId) {
          errors.push(`Action node ${actionNode.name} missing database connection configuration`);
        }
        
        if (!config?.query && !config?.procedure) {
          errors.push(`Action node ${actionNode.name} missing query or procedure specification`);
        }
      }
      
      // Validate file operation configurations
      if (actionNode.actionType === 'file-operation') {
        if (!config?.filePath && !config?.filePattern) {
          errors.push(`Action node ${actionNode.name} missing file path specification`);
        }
        
        if (config?.operation === 'write' && !config?.writePermissions) {
          warnings.push(`Action node ${actionNode.name} should verify write permissions`);
        }
      }
    }
  }

  private async validateResourceAvailability(actionNodes: ActionNode[], executionContext: any, errors: string[], warnings: string[]): Promise<void> {
    // Check compute resource requirements
    let totalMemoryRequired = 0;
    let totalCpuRequired = 0;
    
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const memoryMb = config?.memoryRequirementMb || 512;
      const cpuUnits = config?.cpuRequirement || 1;
      
      totalMemoryRequired += memoryMb;
      totalCpuRequired += cpuUnits;
      
      // Check for high-memory operations
      if (memoryMb > 8192) {
        const isHighMemoryPoolAvailable = await this.checkResourcePoolAvailability('high-memory');
        if (!isHighMemoryPoolAvailable) {
          errors.push('Required compute resource pool unavailable for high-memory operations');
        }
      }
    }
    
    // Check total resource availability
    const availableMemory = await this.getAvailableMemory(executionContext);
    const availableCpu = await this.getAvailableCpu(executionContext);
    
    if (totalMemoryRequired > availableMemory) {
      errors.push(`Insufficient memory available: required ${totalMemoryRequired}MB, available ${availableMemory}MB`);
    }
    
    if (totalCpuRequired > availableCpu) {
      errors.push(`Insufficient CPU resources available: required ${totalCpuRequired} units, available ${availableCpu} units`);
    }
  }

  private validateExecutionOrderConsistency(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Group by parent container
    const actionsByContainer = new Map<string, ActionNode[]>();
    
    for (const actionNode of actionNodes) {
      const containerId = actionNode.parentNodeId.toString();
      if (!actionsByContainer.has(containerId)) {
        actionsByContainer.set(containerId, []);
      }
      actionsByContainer.get(containerId)!.push(actionNode);
    }
    
    // Validate execution order within each container
    actionsByContainer.forEach((actions, containerId) => {
      const orders = actions.map(a => a.executionOrder);
      const uniqueOrders = new Set(orders);
      
      // Check for duplicates
      if (orders.length !== uniqueOrders.size) {
        const containerName = actions[0]?.name || containerId;
        errors.push(`Container ${containerName} has actions with duplicate execution orders`);
      }
      
      // Check for reasonable order progression
      const sortedOrders = Array.from(uniqueOrders).sort((a, b) => a - b);
      if (sortedOrders[0] < 0) {
        errors.push(`Container ${containerId} has negative execution order`);
      }
      
      // Check for large gaps
      for (let i = 1; i < sortedOrders.length; i++) {
        if (sortedOrders[i] - sortedOrders[i - 1] > 10) {
          warnings.push(`Container ${containerId} has large gaps in execution order sequence`);
          break;
        }
      }
    });
  }

  private validateParallelExecutionSettings(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Group by parent container and execution order
    const parallelGroups = new Map<string, Map<number, ActionNode[]>>();
    
    for (const actionNode of actionNodes) {
      if (actionNode.executionMode === 'parallel') {
        const containerId = actionNode.parentNodeId.toString();
        const order = actionNode.executionOrder;
        
        if (!parallelGroups.has(containerId)) {
          parallelGroups.set(containerId, new Map());
        }
        
        const containerGroups = parallelGroups.get(containerId)!;
        if (!containerGroups.has(order)) {
          containerGroups.set(order, []);
        }
        
        containerGroups.get(order)!.push(actionNode);
      }
    }
    
    // Validate parallel groups
    parallelGroups.forEach((containerGroups, containerId) => {
      containerGroups.forEach((parallelActions, order) => {
        if (parallelActions.length > 1) {
          // Check priority settings for parallel actions
          const priorities = parallelActions.map(a => a.priority);
          const uniquePriorities = new Set(priorities);
          
          if (uniquePriorities.size === 1 && parallelActions.length > 1) {
            const containerName = parallelActions[0]?.name || containerId;
            warnings.push(`Container ${containerName} has multiple parallel actions with the same priority`);
          }
          
          // Check for resource conflicts
          const totalParallelMemory = parallelActions.reduce((total, action) => {
            return total + (action.actionData.configuration?.memoryRequirementMb || 512);
          }, 0);
          
          if (totalParallelMemory > 16384) { // 16GB
            warnings.push(`Parallel actions in container ${containerId} may exceed memory limits`);
          }
        }
      });
    });
  }

  private validateRetryAndErrorHandling(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const isCriticalAction = config?.isCritical || actionNode.actionType === 'api-call';
      
      // Check error handling configuration
      if (isCriticalAction && !config?.errorHandling) {
        errors.push(`Critical action ${actionNode.name} missing error handling configuration`);
      }
      
      // Check retry configuration
      const retryConfig = config?.retryPolicy;
      if (retryConfig) {
        if (retryConfig.maxAttempts < 1 || retryConfig.maxAttempts > 10) {
          errors.push(`Action ${actionNode.name} has invalid retry attempts: ${retryConfig.maxAttempts}`);
        }
        
        if (retryConfig.backoffStrategy && 
            !['fixed', 'exponential', 'linear'].includes(retryConfig.backoffStrategy)) {
          errors.push(`Action ${actionNode.name} has invalid backoff strategy`);
        }
      } else if (isCriticalAction) {
        warnings.push(`Critical action ${actionNode.name} should have retry policy configured`);
      }
      
      // Check fallback configuration
      if (isCriticalAction && !config?.fallbackAction && !config?.defaultValue) {
        warnings.push(`Critical action ${actionNode.name} should have fallback mechanism`);
      }
    }
  }

  private validateTimeoutConfigurations(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const timeout = config?.timeoutMs;
      
      // Check if timeout is configured
      if (!timeout) {
        const isLongRunning = actionNode.actionType === 'data-transformation' || 
                            actionNode.actionType === 'file-operation' ||
                            actionNode.actionType === 'database-operation';
        
        if (isLongRunning) {
          warnings.push(`Long-running action ${actionNode.name} should specify timeout configuration`);
        }
      } else {
        // Validate timeout values
        if (timeout < 1000) { // Less than 1 second
          warnings.push(`Action ${actionNode.name} has very short timeout: ${timeout}ms`);
        }
        
        if (timeout > 300000) { // More than 5 minutes
          warnings.push(`Action ${actionNode.name} has very long timeout: ${timeout}ms`);
        }
      }
      
      // Check for reasonable timeout relative to estimated execution time
      const estimatedTime = config?.estimatedExecutionTimeMs;
      if (timeout && estimatedTime && timeout < estimatedTime * 1.5) {
        warnings.push(`Action ${actionNode.name} timeout may be too short for estimated execution time`);
      }
    }
  }

  private async validateExternalDependencies(actionNodes: ActionNode[], errors: string[], warnings: string[]): Promise<void> {
    const externalDependencies = new Set<string>();
    
    // Collect external dependencies
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      if (actionNode.actionType === 'api-call' && config?.endpoint) {
        externalDependencies.add(config.endpoint);
      }
      
      if (config?.externalServices) {
        config.externalServices.forEach((service: string) => {
          externalDependencies.add(service);
        });
      }
    }
    
    // Check availability of external dependencies
    for (const dependency of externalDependencies) {
      try {
        const isAvailable = await this.checkExternalServiceAvailability(dependency);
        if (!isAvailable) {
          errors.push(`External service dependency ${dependency} is currently unavailable`);
        }
      } catch (error) {
        warnings.push(`Could not verify availability of external dependency: ${dependency}`);
      }
    }
  }

  private async validateExecutionEnvironment(actionNodes: ActionNode[], errors: string[], warnings: string[]): Promise<void> {
    const requiredLibraries = new Set<string>();
    const requiredEnvironmentVariables = new Set<string>();
    
    // Collect environment requirements
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      // Check for required libraries/packages
      if (config?.requiredLibraries) {
        config.requiredLibraries.forEach((lib: string) => {
          requiredLibraries.add(lib);
        });
      }
      
      // Check for required environment variables
      if (config?.requiredEnvironmentVariables) {
        config.requiredEnvironmentVariables.forEach((envVar: string) => {
          requiredEnvironmentVariables.add(envVar);
        });
      }
      
      // Specific checks based on action type
      if (actionNode.actionType === 'data-transformation' && config?.language === 'python') {
        if (config?.pythonVersion && !await this.checkPythonVersion(config.pythonVersion)) {
          errors.push(`Execution environment missing required Python version: ${config.pythonVersion}`);
        }
        
        // Common Python libraries check
        if (config?.usesPandas && !await this.checkLibraryAvailability('pandas>=2.0.0')) {
          errors.push('Execution environment missing required Python library: pandas>=2.0.0');
        }
      }
    }
    
    // Validate library availability
    for (const library of requiredLibraries) {
      const isAvailable = await this.checkLibraryAvailability(library);
      if (!isAvailable) {
        errors.push(`Execution environment missing required library: ${library}`);
      }
    }
    
    // Validate environment variables
    for (const envVar of requiredEnvironmentVariables) {
      const isSet = await this.checkEnvironmentVariable(envVar);
      if (!isSet) {
        errors.push(`Required environment variable not set: ${envVar}`);
      }
    }
  }

  private validateDataSchemaCompatibility(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Build a map of data flow between actions
    const dataFlowMap = new Map<string, any>();
    
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const nodeId = actionNode.nodeId.toString();
      
      // Record output schema
      if (config?.outputSchema) {
        dataFlowMap.set(nodeId, {
          outputSchema: config.outputSchema,
          actionType: actionNode.actionType,
          name: actionNode.name
        });
      }
    }
    
    // Check schema compatibility between connected actions
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      if (config?.inputSchema && actionNode.dependencies.length > 0) {
        for (const depId of actionNode.dependencies) {
          const dependency = dataFlowMap.get(depId.toString());
          
          if (dependency && dependency.outputSchema) {
            const isCompatible = this.checkSchemaCompatibility(
              dependency.outputSchema, 
              config.inputSchema
            );
            
            if (!isCompatible) {
              errors.push(`Data schema mismatch between ${dependency.name} action output and ${actionNode.name} action input`);
            }
          }
        }
      }
    }
  }

  private validateExecutionPermissions(actionNodes: ActionNode[], executionContext: any, errors: string[], warnings: string[]): void {
    const userId = executionContext.userId;
    const organizationId = executionContext.organizationId;
    
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      // Check database operation permissions
      if (actionNode.actionType === 'database-operation') {
        const requiredRole = config?.requiredDatabaseRole;
        if (requiredRole && !this.hasPermission(userId, requiredRole, organizationId)) {
          errors.push(`Insufficient permissions to execute database action: requires ${requiredRole} role`);
        }
      }
      
      // Check file system permissions
      if (actionNode.actionType === 'file-operation') {
        const requiredPermission = config?.requiredFilePermission;
        if (requiredPermission && !this.hasFilePermission(userId, requiredPermission)) {
          errors.push(`Insufficient file system permissions for action: ${actionNode.name}`);
        }
      }
      
      // Check API access permissions
      if (actionNode.actionType === 'api-call') {
        const apiKey = config?.apiKey;
        const apiScope = config?.requiredApiScope;
        
        if (apiScope && !this.hasApiPermission(userId, apiScope, organizationId)) {
          warnings.push(`API access permission should be verified for action: ${actionNode.name}`);
        }
      }
    }
  }

  // Helper methods for validation
  private validateScriptSyntax(script: string): boolean {
    // Simple syntax validation - in reality, this would be more comprehensive
    try {
      // Basic checks for common syntax errors
      if (script.includes('eval(') || script.includes('exec(')) {
        return false; // Security concern
      }
      return true;
    } catch {
      return false;
    }
  }

  private async checkResourcePoolAvailability(poolType: string): Promise<boolean> {
    // Mock implementation - would check actual resource pool
    return Promise.resolve(poolType !== 'unavailable-pool');
  }

  private async getAvailableMemory(executionContext: any): Promise<number> {
    // Mock implementation - would check actual available memory
    return Promise.resolve(32768); // 32GB
  }

  private async getAvailableCpu(executionContext: any): Promise<number> {
    // Mock implementation - would check actual available CPU
    return Promise.resolve(16); // 16 CPU units
  }

  private async checkExternalServiceAvailability(serviceUrl: string): Promise<boolean> {
    // Mock implementation - would perform actual health check
    return Promise.resolve(!serviceUrl.includes('unavailable'));
  }

  private async checkPythonVersion(requiredVersion: string): Promise<boolean> {
    // Mock implementation - would check actual Python version
    return Promise.resolve(true);
  }

  private async checkLibraryAvailability(library: string): Promise<boolean> {
    // Mock implementation - would check if library is installed
    return Promise.resolve(!library.includes('unavailable'));
  }

  private async checkEnvironmentVariable(envVar: string): Promise<boolean> {
    // Mock implementation - would check actual environment variable
    return Promise.resolve(envVar !== 'MISSING_VAR');
  }

  private checkSchemaCompatibility(outputSchema: any, inputSchema: any): boolean {
    // Mock implementation - would perform actual schema compatibility check
    return outputSchema.type === inputSchema.type;
  }

  private hasPermission(userId: string, requiredRole: string, organizationId: string): boolean {
    // Mock implementation - would check actual user permissions
    return requiredRole !== 'admin';
  }

  private hasFilePermission(userId: string, requiredPermission: string): boolean {
    // Mock implementation - would check actual file permissions
    return requiredPermission !== 'write-protected';
  }

  private hasApiPermission(userId: string, requiredScope: string, organizationId: string): boolean {
    // Mock implementation - would check actual API permissions
    return requiredScope !== 'restricted-scope';
  }
}
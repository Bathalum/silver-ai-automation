import { FunctionModel } from '../entities/function-model';
import { ActionNode } from '../entities/action-node';
import { IONode } from '../entities/io-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';
import { IBusinessRuleValidationService } from '../../use-cases/function-model/validate-workflow-structure-use-case';

export class BusinessRuleValidationService implements IBusinessRuleValidationService {
  async validateBusinessRules(model: FunctionModel, actionNodes: ActionNode[]): Promise<Result<ValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate required node presence
      this.validateRequiredNodePresence(model, errors, warnings);
      
      // Validate node configuration completeness
      this.validateNodeConfigurationCompleteness(actionNodes, errors, warnings);
      
      // Validate model permissions and ownership
      this.validateModelPermissions(model, errors, warnings);
      
      // Validate workflow naming conventions
      this.validateNamingConventions(model, errors, warnings);
      
      // Validate resource allocation limits
      this.validateResourceAllocationLimits(actionNodes, errors, warnings);
      
      // Validate organizational policies
      this.validateOrganizationalPolicies(model, actionNodes, errors, warnings);
      
      // Validate model versioning compliance
      this.validateVersioningCompliance(model, errors, warnings);
      
      // Validate security requirements
      this.validateSecurityRequirements(actionNodes, errors, warnings);
      
      // Validate data flow constraints
      this.validateDataFlowConstraints(model, actionNodes, errors, warnings);
      
      // Validate workflow performance requirements
      this.validatePerformanceRequirements(model, actionNodes, errors, warnings);

      return Result.ok<ValidationResult>({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Result.fail<ValidationResult>(
        `Business rule validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateRequiredNodePresence(model: FunctionModel, errors: string[], warnings: string[]): void {
    const nodes = Array.from(model.nodes.values());
    const ioNodes = nodes.filter(node => node instanceof IONode) as IONode[];
    
    // Check for input boundary nodes
    const inputBoundaries = ioNodes.filter(node => 
      node.ioData.boundaryType === 'input' || node.ioData.boundaryType === 'input-output'
    );
    
    if (inputBoundaries.length === 0) {
      errors.push('Required input boundary node is missing');
    }
    
    // Check for output boundary nodes
    const outputBoundaries = ioNodes.filter(node => 
      node.ioData.boundaryType === 'output' || node.ioData.boundaryType === 'input-output'
    );
    
    if (outputBoundaries.length === 0) {
      warnings.push('Workflow has no output boundaries - consider adding an output IO node');
    }
  }

  private validateNodeConfigurationCompleteness(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    for (const actionNode of actionNodes) {
      // Check for required configurations based on action type
      if (actionNode.actionType === 'api-call') {
        const config = actionNode.actionData.configuration;
        if (!config?.apiEndpoint) {
          errors.push(`Action node ${actionNode.name} missing required configuration: apiEndpoint`);
        }
        if (!config?.httpMethod) {
          warnings.push(`Action node ${actionNode.name} should specify HTTP method`);
        }
      }
      
      if (actionNode.actionType === 'data-transformation') {
        const config = actionNode.actionData.configuration;
        if (!config?.transformationScript && !config?.transformationRules) {
          errors.push(`Action node ${actionNode.name} missing transformation configuration`);
        }
      }
      
      // Check for general required fields
      if (!actionNode.name || actionNode.name.trim().length === 0) {
        errors.push(`Action node has empty or missing name`);
      }
      
      if (actionNode.executionOrder < 0) {
        errors.push(`Action node ${actionNode.name} has invalid execution order`);
      }
    }
  }

  private validateModelPermissions(model: FunctionModel, errors: string[], warnings: string[]): void {
    // Check if model has proper ownership structure
    if (!model.permissions.owner || model.permissions.owner.trim().length === 0) {
      errors.push('Model must have a valid owner');
    }
    
    // Check for permission consistency
    if (model.permissions.viewers.includes(model.permissions.owner)) {
      warnings.push('Owner should not be in viewers list - implicit permission');
    }
    
    if (model.permissions.editors.includes(model.permissions.owner)) {
      warnings.push('Owner should not be in editors list - implicit permission');
    }

    // Note: In a real implementation, we would also check against current user permissions
    // For this validation service, we'll add a placeholder check
    const hasValidPermissionStructure = model.permissions.owner && 
                                      Array.isArray(model.permissions.viewers) && 
                                      Array.isArray(model.permissions.editors);
    
    if (!hasValidPermissionStructure) {
      errors.push('Invalid permission structure detected');
    }
  }

  private validateNamingConventions(model: FunctionModel, errors: string[], warnings: string[]): void {
    // Check model name conventions
    const modelName = model.name.toString();
    if (!modelName.match(/^[A-Z][a-zA-Z0-9\s-_]*$/)) {
      warnings.push('Model name should start with capital letter and use standard characters');
    }
    
    if (modelName.length > 100) {
      errors.push('Model name exceeds maximum length of 100 characters');
    }
    
    // Check node naming conventions
    const nodes = Array.from(model.nodes.values());
    for (const node of nodes) {
      if (!node.name.match(/^[A-Za-z][a-zA-Z0-9\s-_]*$/)) {
        warnings.push(`Node names should follow organization naming conventions`);
        break;
      }
    }
  }

  private validateResourceAllocationLimits(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    let totalMemoryRequirements = 0;
    let totalCpuRequirements = 0;
    
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      // Extract resource requirements (these would be defined in action configuration)
      const memoryMb = config?.memoryRequirementMb || 512; // default
      const cpuUnits = config?.cpuRequirement || 1; // default
      
      totalMemoryRequirements += memoryMb;
      totalCpuRequirements += cpuUnits;
    }
    
    // Organization limits (these would come from configuration/settings)
    const MAX_MEMORY_PER_WORKFLOW = 16384; // 16GB
    const MAX_CPU_UNITS_PER_WORKFLOW = 32;
    
    if (totalMemoryRequirements > MAX_MEMORY_PER_WORKFLOW) {
      errors.push('Total resource allocation exceeds organization limits');
    }
    
    if (totalCpuRequirements > MAX_CPU_UNITS_PER_WORKFLOW) {
      errors.push('Total CPU allocation exceeds organization limits');
    }
    
    // Check for high resource individual nodes
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const memoryMb = config?.memoryRequirementMb || 512;
      
      if (memoryMb > 8192) { // 8GB
        warnings.push(`Action node ${actionNode.name} requires high memory allocation`);
      }
    }
  }

  private validateOrganizationalPolicies(model: FunctionModel, actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Data retention policy validation
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const processesPersonalData = config?.processesPersonalData || false;
      const hasEncryption = config?.encryptionEnabled || false;
      
      if (processesPersonalData && !hasEncryption) {
        errors.push('Workflow violates data retention policy: sensitive data processing without encryption');
      }
    }
    
    // Check for external data sharing compliance
    const hasExternalDataSharing = actionNodes.some(node => 
      node.actionData.configuration?.sharesDataExternally === true
    );
    
    if (hasExternalDataSharing) {
      const hasDataSharingApproval = model.metadata.dataSharingApproved || false;
      if (!hasDataSharingApproval) {
        errors.push('External data sharing requires organizational approval');
      }
    }
    
    // Check compliance with audit requirements
    if (model.metadata.requiresAuditLog !== false) {
      const hasAuditConfiguration = actionNodes.some(node => 
        node.actionData.configuration?.auditingEnabled === true
      );
      
      if (!hasAuditConfiguration) {
        warnings.push('Consider enabling audit logging for compliance');
      }
    }
  }

  private validateVersioningCompliance(model: FunctionModel, errors: string[], warnings: string[]): void {
    // Check if model needs version increment
    const isStructuralChange = model.metadata.lastStructuralChange !== undefined &&
                              model.metadata.lastStructuralChange > model.updatedAt;
    
    if (isStructuralChange) {
      warnings.push('Model version should be incremented for structural changes');
    }
    
    // Check version format compliance
    const version = model.version.toString();
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
      errors.push('Model version must follow semantic versioning format (x.y.z)');
    }
    
    // Check for breaking changes without major version increment
    if (model.metadata.hasBreakingChanges && !version.startsWith('0.') && !version.endsWith('.0.0')) {
      warnings.push('Breaking changes should trigger major version increment');
    }
  }

  private validateSecurityRequirements(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Check for external API integrations requiring security scan
    const externalApiNodes = actionNodes.filter(node => {
      const config = node.actionData.configuration;
      return config?.isExternalApi === true;
    });
    
    for (const apiNode of externalApiNodes) {
      const config = apiNode.actionData.configuration;
      const hasSecurityScan = config?.securityScanCompleted || false;
      
      if (!hasSecurityScan) {
        errors.push('Security scan required for external API integrations');
      }
    }
    
    // Check for proper authentication configuration
    const authRequiredNodes = actionNodes.filter(node => {
      const config = node.actionData.configuration;
      return config?.requiresAuthentication === true;
    });
    
    for (const authNode of authRequiredNodes) {
      const config = authNode.actionData.configuration;
      const hasAuthConfig = config?.authenticationMethod !== undefined;
      
      if (!hasAuthConfig) {
        errors.push('Authentication-required nodes must specify authentication method');
      }
    }
    
    // Check for secure data handling
    const sensitiveDataNodes = actionNodes.filter(node => {
      const config = node.actionData.configuration;
      return config?.handlesSensitiveData === true;
    });
    
    for (const sensitiveNode of sensitiveDataNodes) {
      const config = sensitiveNode.actionData.configuration;
      const hasSecureHandling = config?.secureDataHandling === true;
      
      if (!hasSecureHandling) {
        warnings.push(`Action node ${sensitiveNode.name} handles sensitive data - ensure secure processing`);
      }
    }
  }

  private validateDataFlowConstraints(model: FunctionModel, actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Check for PII data flow violations
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const processesPII = config?.processesPersonallyIdentifiableInformation || false;
      const sendsToExternal = config?.sendsDataToExternalSystem || false;
      const hasConsent = config?.hasExplicitUserConsent || false;
      
      if (processesPII && sendsToExternal && !hasConsent) {
        errors.push('PII data cannot flow to external systems without explicit consent');
      }
    }
    
    // Check data classification compliance
    const nodes = Array.from(model.nodes.values());
    const ioNodes = nodes.filter(node => node instanceof IONode) as IONode[];
    
    for (const ioNode of ioNodes) {
      const dataClassification = ioNode.ioData.dataClassification;
      if (dataClassification === 'confidential' || dataClassification === 'restricted') {
        const hasAppropriateHandling = actionNodes.some(action => 
          action.actionData.configuration?.confidentialDataHandling === true
        );
        
        if (!hasAppropriateHandling) {
          warnings.push('Confidential data requires appropriate handling configuration');
        }
      }
    }
  }

  private validatePerformanceRequirements(model: FunctionModel, actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Check for potential performance bottlenecks
    const sequentialNodes = actionNodes.filter(node => node.executionMode === 'sequential');
    const totalSequentialTime = sequentialNodes.reduce((total, node) => {
      const estimatedTime = node.actionData.configuration?.estimatedExecutionTimeMs || 1000;
      return total + estimatedTime;
    }, 0);
    
    // Performance SLA threshold (would come from configuration)
    const PERFORMANCE_SLA_MS = 30000; // 30 seconds
    
    if (totalSequentialTime > PERFORMANCE_SLA_MS) {
      warnings.push('Workflow may exceed performance SLA due to sequential processing');
    }
    
    // Check for parallel processing opportunities
    const parallelNodes = actionNodes.filter(node => node.executionMode === 'parallel');
    if (parallelNodes.length === 0 && actionNodes.length > 5) {
      warnings.push('Consider parallel processing for improved performance');
    }
    
    // Check for resource-intensive operations
    const resourceIntensiveNodes = actionNodes.filter(node => {
      const config = node.actionData.configuration;
      return (config?.memoryRequirementMb || 512) > 4096 || 
             (config?.estimatedExecutionTimeMs || 1000) > 10000;
    });
    
    if (resourceIntensiveNodes.length > 0) {
      warnings.push('Resource-intensive operations detected - monitor performance impact');
    }
  }
}
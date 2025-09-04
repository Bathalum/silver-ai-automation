import { FunctionModel } from '../entities/function-model';
import { ActionNode } from '../entities/action-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';
import { ICrossFeatureValidationService } from '../../use-cases/function-model/validate-workflow-structure-use-case';

export class CrossFeatureValidationService implements ICrossFeatureValidationService {
  async validateCrossFeatureDependencies(model: FunctionModel): Promise<Result<ValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate external dependency availability
      await this.validateExternalDependencyAvailability(model, errors, warnings);
      
      // Validate API contract compatibility
      await this.validateAPIContractCompatibility(model, errors, warnings);
      
      // Validate service versioning compatibility
      await this.validateServiceVersioningCompatibility(model, errors, warnings);
      
      // Validate cross-system data flow
      this.validateCrossSystemDataFlow(model, errors, warnings);
      
      // Validate integration authentication requirements
      this.validateIntegrationAuthentication(model, errors, warnings);

      return Result.ok<ValidationResult>({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Result.fail<ValidationResult>(
        `Cross-feature validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async validateExternalDependencyAvailability(model: FunctionModel, errors: string[], warnings: string[]): Promise<void> {
    const actionNodes = Array.from(model.actionNodes.values());
    const externalDependencies = new Set<string>();
    
    // Collect external feature dependencies
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      
      // Check for external feature module references
      const externalModules = config?.externalFeatureModules || [];
      externalModules.forEach((module: string) => {
        externalDependencies.add(module);
      });
      
      // Check nested function model dependencies
      if (actionNode instanceof FunctionModelContainerNode) {
        const nestedModelId = actionNode.containerData.nestedModelId;
        if (nestedModelId) {
          externalDependencies.add(`model:${nestedModelId}`);
        }
      }
      
      // Check for service integrations
      const serviceIntegrations = config?.serviceIntegrations || [];
      serviceIntegrations.forEach((service: string) => {
        externalDependencies.add(`service:${service}`);
      });
    }
    
    // Validate availability of external dependencies
    for (const dependency of externalDependencies) {
      try {
        const isAvailable = await this.checkDependencyAvailability(dependency);
        if (!isAvailable) {
          if (dependency.startsWith('model:')) {
            errors.push(`Referenced external feature module ${dependency.replace('model:', '')} is not available`);
          } else if (dependency.startsWith('service:')) {
            errors.push(`External service dependency ${dependency.replace('service:', '')} is not available`);
          } else {
            errors.push(`Referenced external feature module ${dependency} is not available`);
          }
        }
      } catch (error) {
        warnings.push(`Could not verify availability of dependency: ${dependency}`);
      }
    }
  }

  private async validateAPIContractCompatibility(model: FunctionModel, errors: string[], warnings: string[]): Promise<void> {
    const actionNodes = Array.from(model.actionNodes.values());
    
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      
      if (actionNode.getActionType() === 'api-call' || config?.isExternalApiCall) {
        const serviceName = config?.serviceName;
        const expectedContract = config?.expectedApiContract;
        
        if (serviceName && expectedContract) {
          try {
            const actualContract = await this.getServiceApiContract(serviceName);
            const isCompatible = this.checkContractCompatibility(expectedContract, actualContract);
            
            if (!isCompatible) {
              const missingFields = this.findMissingContractFields(expectedContract, actualContract);
              if (missingFields.length > 0) {
                errors.push(`API contract mismatch with ${serviceName}: expected field ${missingFields[0]} is missing`);
              } else {
                errors.push(`API contract mismatch with ${serviceName}: contract incompatibility detected`);
              }
            }
          } catch (error) {
            warnings.push(`Could not verify API contract for service: ${serviceName}`);
          }
        }
        
        // Check for breaking API changes
        const apiVersion = config?.apiVersion;
        if (apiVersion && serviceName) {
          const hasBreakingChanges = await this.checkForBreakingApiChanges(serviceName, apiVersion);
          if (hasBreakingChanges) {
            errors.push(`Breaking API changes detected in ${serviceName} since version ${apiVersion}`);
          }
        }
      }
    }
  }

  private async validateServiceVersioningCompatibility(model: FunctionModel, errors: string[], warnings: string[]): Promise<void> {
    const actionNodes = Array.from(model.actionNodes.values());
    const serviceVersions = new Map<string, string>();
    
    // Collect service version requirements
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      const serviceDependencies = config?.serviceDependencies || {};
      
      for (const [serviceName, versionRequirement] of Object.entries(serviceDependencies)) {
        serviceVersions.set(serviceName, versionRequirement as string);
      }
    }
    
    // Validate version compatibility
    for (const [serviceName, requiredVersion] of serviceVersions.entries()) {
      try {
        const availableVersion = await this.getServiceVersion(serviceName);
        const isCompatible = this.checkVersionCompatibility(requiredVersion, availableVersion);
        
        if (!isCompatible) {
          errors.push(`Service version incompatibility: ${serviceName} requires ${requiredVersion} but ${availableVersion} is available`);
        }
        
        // Check for deprecated versions
        const isDeprecated = await this.isServiceVersionDeprecated(serviceName, availableVersion);
        if (isDeprecated) {
          const latestVersion = await this.getLatestServiceVersion(serviceName);
          warnings.push(`${serviceName} v${availableVersion} is deprecated, consider upgrading to v${latestVersion}`);
        }
      } catch (error) {
        warnings.push(`Could not verify version compatibility for service: ${serviceName}`);
      }
    }
  }

  private validateCrossSystemDataFlow(model: FunctionModel, errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const nodes = Array.from(model.nodes.values());
    
    // Build data flow map
    const dataFlowMap = this.buildCrossSystemDataFlowMap(actionNodes, nodes);
    
    // Validate data flow compliance
    for (const [sourceSystem, targetSystems] of dataFlowMap.entries()) {
      for (const targetSystem of targetSystems) {
        const dataFlow = this.getDataFlowInfo(sourceSystem, targetSystem, actionNodes);
        
        // Check for security boundary violations
        if (this.isCrossSecurityBoundary(sourceSystem, targetSystem)) {
          if (dataFlow.containsPII && !dataFlow.hasEncryption) {
            errors.push('Cross-system data flow violates security boundary: PII data sent to external system');
          }
          
          if (dataFlow.containsSensitiveData && !dataFlow.hasApproval) {
            warnings.push('Sensitive data crossing system boundaries should have explicit approval');
          }
        }
        
        // Check data classification compliance
        if (dataFlow.dataClassification === 'restricted' && targetSystem.includes('external')) {
          errors.push('Restricted data cannot be sent to external systems');
        }
        
        // Check for data residency requirements
        if (dataFlow.hasResidencyRequirements && !this.checkDataResidencyCompliance(sourceSystem, targetSystem)) {
          errors.push('Data flow violates data residency requirements');
        }
      }
    }
  }

  private validateIntegrationAuthentication(model: FunctionModel, errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      
      // Check external service integrations
      if (config?.isExternalService || config?.requiresAuthentication) {
        const authMethod = config?.authenticationMethod;
        const serviceName = config?.serviceName || 'external service';
        
        if (!authMethod) {
          errors.push('Missing authentication configuration for external service integration');
        } else {
          // Validate authentication method
          const validAuthMethods = ['oauth2', 'api-key', 'jwt', 'mutual-tls', 'basic-auth'];
          if (!validAuthMethods.includes(authMethod)) {
            errors.push(`Invalid authentication method: ${authMethod} for service ${serviceName}`);
          }
          
          // Check for secure authentication configuration
          if (authMethod === 'basic-auth') {
            warnings.push(`Basic authentication is not recommended for ${serviceName} - consider using OAuth2 or JWT`);
          }
          
          // Validate authentication credentials
          const hasValidCredentials = this.validateAuthenticationCredentials(authMethod, config);
          if (!hasValidCredentials) {
            errors.push(`Invalid or missing authentication credentials for ${serviceName}`);
          }
        }
        
        // Check for token expiration handling
        if (authMethod === 'oauth2' || authMethod === 'jwt') {
          const hasTokenRefresh = config?.hasTokenRefreshLogic;
          if (!hasTokenRefresh) {
            warnings.push(`Token refresh logic should be implemented for ${serviceName}`);
          }
        }
      }
      
      // Check API rate limiting configuration
      if (config?.isRateLimited) {
        const rateLimitConfig = config?.rateLimitConfiguration;
        if (!rateLimitConfig) {
          warnings.push(`Rate limiting configuration missing for action: ${actionNode.name}`);
        } else {
          // Validate rate limit settings
          if (!rateLimitConfig.requestsPerMinute || rateLimitConfig.requestsPerMinute <= 0) {
            errors.push(`Invalid rate limit configuration for action: ${actionNode.name}`);
          }
        }
      }
    }
  }

  // Helper methods
  private async checkDependencyAvailability(dependency: string): Promise<boolean> {
    // Mock implementation - would check actual service registry or dependency management system
    if (dependency.includes('UserManagement')) {
      return false; // Simulate unavailable service
    }
    
    if (dependency.includes('PaymentService')) {
      return true;
    }
    
    return !dependency.includes('unavailable');
  }

  private async getServiceApiContract(serviceName: string): Promise<any> {
    // Mock implementation - would retrieve actual API contract
    const mockContracts: Record<string, any> = {
      'PaymentService': {
        version: '2.1',
        endpoints: {
          '/payment': {
            method: 'POST',
            requiredFields: ['amount', 'currency', 'paymentMethod'],
            optionalFields: ['description', 'metadata']
          }
        }
      },
      'NotificationService': {
        version: '2.0',
        endpoints: {
          '/notify': {
            method: 'POST',
            requiredFields: ['recipient', 'message'],
            optionalFields: ['priority', 'channel']
          }
        }
      }
    };
    
    return mockContracts[serviceName] || null;
  }

  private checkContractCompatibility(expectedContract: any, actualContract: any): boolean {
    if (!actualContract) return false;
    
    // Simple compatibility check
    for (const endpoint of Object.keys(expectedContract.endpoints || {})) {
      const expectedEndpoint = expectedContract.endpoints[endpoint];
      const actualEndpoint = actualContract.endpoints?.[endpoint];
      
      if (!actualEndpoint) return false;
      
      // Check required fields
      for (const field of expectedEndpoint.requiredFields || []) {
        if (!actualEndpoint.requiredFields?.includes(field)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private findMissingContractFields(expectedContract: any, actualContract: any): string[] {
    const missingFields: string[] = [];
    
    for (const endpoint of Object.keys(expectedContract.endpoints || {})) {
      const expectedEndpoint = expectedContract.endpoints[endpoint];
      const actualEndpoint = actualContract.endpoints?.[endpoint];
      
      if (!actualEndpoint) {
        missingFields.push(`endpoint ${endpoint}`);
        continue;
      }
      
      for (const field of expectedEndpoint.requiredFields || []) {
        if (!actualEndpoint.requiredFields?.includes(field)) {
          missingFields.push(field);
        }
      }
    }
    
    return missingFields;
  }

  private async checkForBreakingApiChanges(serviceName: string, apiVersion: string): Promise<boolean> {
    // Mock implementation - would check API change log
    return serviceName === 'LegacyService' && apiVersion < '3.0';
  }

  private async getServiceVersion(serviceName: string): Promise<string> {
    // Mock implementation - would query service registry
    const mockVersions: Record<string, string> = {
      'NotificationService': '2.1',
      'PaymentService': '3.0',
      'UserManagement': '1.5'
    };
    
    return mockVersions[serviceName] || '1.0.0';
  }

  private checkVersionCompatibility(requiredVersion: string, availableVersion: string): boolean {
    // Simple semantic version compatibility check
    const required = requiredVersion.split('.').map(Number);
    const available = availableVersion.split('.').map(Number);
    
    // Check major version compatibility
    if (available[0] !== required[0]) {
      return available[0] > required[0];
    }
    
    // Check minor version compatibility
    if (available[1] < required[1]) {
      return false;
    }
    
    return true;
  }

  private async isServiceVersionDeprecated(serviceName: string, version: string): Promise<boolean> {
    // Mock implementation - would check deprecation notices
    return serviceName === 'NotificationService' && version === '2.1';
  }

  private async getLatestServiceVersion(serviceName: string): Promise<string> {
    // Mock implementation - would query service registry for latest version
    const mockLatestVersions: Record<string, string> = {
      'NotificationService': '3.0',
      'PaymentService': '3.2',
      'UserManagement': '2.0'
    };
    
    return mockLatestVersions[serviceName] || '1.0.0';
  }

  private buildCrossSystemDataFlowMap(actionNodes: ActionNode[], nodes: any[]): Map<string, Set<string>> {
    const dataFlowMap = new Map<string, Set<string>>();
    
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      const sourceSystem = config?.sourceSystem || 'internal';
      const targetSystems = config?.targetSystems || [];
      
      if (!dataFlowMap.has(sourceSystem)) {
        dataFlowMap.set(sourceSystem, new Set());
      }
      
      targetSystems.forEach((target: string) => {
        dataFlowMap.get(sourceSystem)!.add(target);
      });
    }
    
    return dataFlowMap;
  }

  private getDataFlowInfo(sourceSystem: string, targetSystem: string, actionNodes: ActionNode[]): any {
    // Extract data flow information from action nodes
    let containsPII = false;
    let containsSensitiveData = false;
    let hasEncryption = false;
    let hasApproval = false;
    let dataClassification = 'public';
    let hasResidencyRequirements = false;
    
    for (const actionNode of actionNodes) {
      const config = actionNode.metadata?.configuration;
      
      if (config?.sourceSystem === sourceSystem && config?.targetSystems?.includes(targetSystem)) {
        containsPII = containsPII || config?.processesPersonalData || false;
        containsSensitiveData = containsSensitiveData || config?.handlesSensitiveData || false;
        hasEncryption = hasEncryption || config?.encryptionEnabled || false;
        hasApproval = hasApproval || config?.hasDataSharingApproval || false;
        
        if (config?.dataClassification) {
          const classifications = ['public', 'internal', 'confidential', 'restricted'];
          const currentLevel = classifications.indexOf(dataClassification);
          const configLevel = classifications.indexOf(config.dataClassification);
          
          if (configLevel > currentLevel) {
            dataClassification = config.dataClassification;
          }
        }
        
        hasResidencyRequirements = hasResidencyRequirements || config?.hasDataResidencyRequirements || false;
      }
    }
    
    return {
      containsPII,
      containsSensitiveData,
      hasEncryption,
      hasApproval,
      dataClassification,
      hasResidencyRequirements
    };
  }

  private isCrossSecurityBoundary(sourceSystem: string, targetSystem: string): boolean {
    // Determine if data flow crosses security boundaries
    const externalSystems = ['external', 'partner', 'public'];
    const internalSystems = ['internal', 'core', 'backend'];
    
    const isSourceExternal = externalSystems.some(ext => sourceSystem.includes(ext));
    const isTargetExternal = externalSystems.some(ext => targetSystem.includes(ext));
    const isSourceInternal = internalSystems.some(int => sourceSystem.includes(int));
    const isTargetInternal = internalSystems.some(int => targetSystem.includes(int));
    
    return (isSourceInternal && isTargetExternal) || (isSourceExternal && isTargetInternal);
  }

  private checkDataResidencyCompliance(sourceSystem: string, targetSystem: string): boolean {
    // Mock implementation - would check actual data residency rules
    if (sourceSystem.includes('eu') && targetSystem.includes('us')) {
      return false; // GDPR violation
    }
    
    return true;
  }

  private validateAuthenticationCredentials(authMethod: string, config: any): boolean {
    switch (authMethod) {
      case 'oauth2':
        return !!(config?.clientId && config?.clientSecret);
      case 'api-key':
        return !!(config?.apiKey && config?.apiKey.length > 10);
      case 'jwt':
        return !!(config?.jwtSecret || config?.publicKey);
      case 'basic-auth':
        return !!(config?.username && config?.password);
      case 'mutual-tls':
        return !!(config?.clientCertificate && config?.privateKey);
      default:
        return false;
    }
  }
}
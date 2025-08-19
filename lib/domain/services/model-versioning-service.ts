import { FunctionModel } from '../entities/function-model';
import { Version } from '../value-objects/version';
import { Result } from '../shared/result';

export interface ModelChanges {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  addedActionNodes: string[];
  removedActionNodes: string[];
  modifiedActionNodes: string[];
  metadataChanges: Record<string, any>;
}

export interface VersionComparison {
  isNewer: boolean;
  isOlder: boolean;
  isEqual: boolean;
  difference: number; // Positive if first is newer, negative if older
  changes?: ModelChanges;
}

export interface IModelVersioningService {
  createVersion(model: FunctionModel, versionType: 'major' | 'minor' | 'patch'): Promise<Result<Version>>;
  compareVersions(v1: Version, v2: Version): VersionComparison;
  compareModels(baseModel: FunctionModel, comparisonModel: FunctionModel): Result<ModelChanges>;
  mergeChanges(baseModel: FunctionModel, changes: ModelChanges): Result<FunctionModel>;
  canCreateVersion(model: FunctionModel, targetVersion: Version): Result<void>;
  getVersionHistory(modelId: string): Promise<Result<Version[]>>;
}

export class ModelVersioningService implements IModelVersioningService {
  async createVersion(model: FunctionModel, versionType: 'major' | 'minor' | 'patch'): Promise<Result<Version>> {
    try {
      // Validate model can have a new version created
      const validationResult = model.validateWorkflow();
      if (validationResult.isFailure) {
        return Result.fail<Version>(`Cannot create version for invalid model: ${validationResult.error}`);
      }

      const validation = validationResult.value;
      if (!validation.isValid) {
        return Result.fail<Version>(`Cannot create version with validation errors: ${validation.errors.join(', ')}`);
      }

      // Create new version based on current version
      const currentVersion = model.version;
      let newVersion: Version;

      switch (versionType) {
        case 'major':
          newVersion = currentVersion.incrementMajor();
          break;
        case 'minor':
          newVersion = currentVersion.incrementMinor();
          break;
        case 'patch':
          newVersion = currentVersion.incrementPatch();
          break;
        default:
          return Result.fail<Version>('Invalid version type. Must be major, minor, or patch');
      }

      return Result.ok<Version>(newVersion);
    } catch (error) {
      return Result.fail<Version>(`Failed to create version: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  compareVersions(v1: Version, v2: Version): VersionComparison {
    const difference = v1.compare(v2);
    
    return {
      isNewer: difference > 0,
      isOlder: difference < 0,
      isEqual: difference === 0,
      difference,
    };
  }

  compareModels(baseModel: FunctionModel, comparisonModel: FunctionModel): Result<ModelChanges> {
    try {
      const baseNodes = new Set(Array.from(baseModel.nodes.keys()));
      const comparisonNodes = new Set(Array.from(comparisonModel.nodes.keys()));
      
      const baseActionNodes = new Set(Array.from(baseModel.actionNodes.keys()));
      const comparisonActionNodes = new Set(Array.from(comparisonModel.actionNodes.keys()));

      // Calculate node changes
      const addedNodes = Array.from(comparisonNodes).filter(nodeId => !baseNodes.has(nodeId));
      const removedNodes = Array.from(baseNodes).filter(nodeId => !comparisonNodes.has(nodeId));
      const modifiedNodes = Array.from(comparisonNodes)
        .filter(nodeId => baseNodes.has(nodeId))
        .filter(nodeId => {
          const baseNode = baseModel.nodes.get(nodeId);
          const comparisonNode = comparisonModel.nodes.get(nodeId);
          return !this.nodesAreEqual(baseNode!, comparisonNode!);
        });

      // Calculate action node changes
      const addedActionNodes = Array.from(comparisonActionNodes).filter(actionId => !baseActionNodes.has(actionId));
      const removedActionNodes = Array.from(baseActionNodes).filter(actionId => !comparisonActionNodes.has(actionId));
      const modifiedActionNodes = Array.from(comparisonActionNodes)
        .filter(actionId => baseActionNodes.has(actionId))
        .filter(actionId => {
          const baseAction = baseModel.actionNodes.get(actionId);
          const comparisonAction = comparisonModel.actionNodes.get(actionId);
          return !this.actionNodesAreEqual(baseAction!, comparisonAction!);
        });

      // Calculate metadata changes
      const metadataChanges = this.calculateMetadataChanges(baseModel.metadata, comparisonModel.metadata);

      const changes: ModelChanges = {
        addedNodes,
        removedNodes,
        modifiedNodes,
        addedActionNodes,
        removedActionNodes,
        modifiedActionNodes,
        metadataChanges,
      };

      return Result.ok<ModelChanges>(changes);
    } catch (error) {
      return Result.fail<ModelChanges>(`Failed to compare models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  mergeChanges(baseModel: FunctionModel, changes: ModelChanges): Result<FunctionModel> {
    // This is a complex operation that would require creating a new model
    // with the applied changes. For now, return the concept.
    return Result.fail<FunctionModel>('Model merging not yet implemented - requires complex state reconstruction');
  }

  canCreateVersion(model: FunctionModel, targetVersion: Version): Result<void> {
    const currentVersion = model.version;
    const comparison = this.compareVersions(targetVersion, currentVersion);

    if (!comparison.isNewer) {
      return Result.fail<void>('Target version must be newer than current version');
    }

    // Validate version increment is appropriate
    const majorDiff = targetVersion.major - currentVersion.major;
    const minorDiff = targetVersion.minor - currentVersion.minor;
    const patchDiff = targetVersion.patch - currentVersion.patch;

    // Major version increment should reset minor and patch
    if (majorDiff > 0 && (targetVersion.minor !== 0 || targetVersion.patch !== 0)) {
      return Result.fail<void>('Major version increment should reset minor and patch to 0');
    }

    // Minor version increment should reset patch
    if (majorDiff === 0 && minorDiff > 0 && targetVersion.patch !== 0) {
      return Result.fail<void>('Minor version increment should reset patch to 0');
    }

    // Should not skip versions
    if (majorDiff > 1 || (majorDiff === 0 && minorDiff > 1) || (majorDiff === 0 && minorDiff === 0 && patchDiff > 1)) {
      return Result.fail<void>('Cannot skip version numbers');
    }

    return Result.ok<void>(undefined);
  }

  async getVersionHistory(modelId: string): Promise<Result<Version[]>> {
    // This would typically query a repository for version history
    // For now, return empty as this requires infrastructure implementation
    return Result.ok<Version[]>([]);
  }

  private nodesAreEqual(node1: any, node2: any): boolean {
    // Simple comparison - in practice this would be more sophisticated
    return (
      node1.name === node2.name &&
      node1.description === node2.description &&
      JSON.stringify(node1.position) === JSON.stringify(node2.position) &&
      JSON.stringify(node1.metadata) === JSON.stringify(node2.metadata)
    );
  }

  private actionNodesAreEqual(action1: any, action2: any): boolean {
    // Simple comparison - in practice this would be more sophisticated
    return (
      action1.name === action2.name &&
      action1.description === action2.description &&
      action1.executionOrder === action2.executionOrder &&
      action1.priority === action2.priority &&
      JSON.stringify(action1.metadata) === JSON.stringify(action2.metadata)
    );
  }

  private calculateMetadataChanges(
    baseMetadata: Record<string, any>, 
    comparisonMetadata: Record<string, any>
  ): Record<string, any> {
    const changes: Record<string, any> = {};
    
    // Find added or modified properties
    for (const [key, value] of Object.entries(comparisonMetadata)) {
      if (!(key in baseMetadata) || JSON.stringify(baseMetadata[key]) !== JSON.stringify(value)) {
        changes[key] = { type: 'added_or_modified', value };
      }
    }

    // Find removed properties
    for (const key of Object.keys(baseMetadata)) {
      if (!(key in comparisonMetadata)) {
        changes[key] = { type: 'removed', previousValue: baseMetadata[key] };
      }
    }

    return changes;
  }
}
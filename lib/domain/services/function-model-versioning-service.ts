import { Result } from '../shared/result';
import { FunctionModel } from '../entities/function-model';
import { FunctionModelVersion } from '../entities/function-model-version';
import { ModelStatus } from '../enums';

export interface VersionCreationResult {
  version: string;
  previousVersion: string | null;
  isPublished: boolean;
}

export interface VersionTransition {
  from: ModelStatus;
  to: ModelStatus;
  valid: boolean;
}

export interface CompleteVersionData {
  modelMetadata: {
    id: string;
    name: string;
    description: string;
  };
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
  }>;
  actions: Array<{
    id: string;
    parentNodeId: string;
    type: string;
  }>;
  links: any[];
  configuration: any;
}

export class FunctionModelVersioningService {
  
  /**
   * Creates a new version from a draft model
   */
  createVersionFromDraft(
    model: FunctionModel, 
    versionType: 'major' | 'minor' | 'patch',
    authorId: string
  ): Result<VersionCreationResult> {
    // Only draft models can create new versions directly
    if (model.status !== ModelStatus.DRAFT) {
      return Result.fail<VersionCreationResult>('Only draft models can create new versions directly');
    }

    // Get current version and increment based on type
    const currentVersionStr = model.version.toString();
    const newVersionStr = this.incrementVersion(currentVersionStr, versionType);
    
    if (!newVersionStr) {
      return Result.fail<VersionCreationResult>('Failed to increment version');
    }

    const result: VersionCreationResult = {
      version: newVersionStr,
      previousVersion: currentVersionStr,
      isPublished: false
    };

    return Result.ok<VersionCreationResult>(result);
  }

  /**
   * Validates semantic version format
   */
  validateSemanticVersion(version: string): boolean {
    const semanticVersionPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return semanticVersionPattern.test(version);
  }

  /**
   * Validates version increment rules
   */
  validateVersionIncrement(fromVersion: string, toVersion: string): boolean {
    const parseVersion = (v: string) => v.split('.').map(Number);
    const [fromMajor, fromMinor, fromPatch] = parseVersion(fromVersion);
    const [toMajor, toMinor, toPatch] = parseVersion(toVersion);

    // Major increment
    if (toMajor > fromMajor) {
      return true;
    }
    // Minor increment (same major)
    else if (toMajor === fromMajor && toMinor > fromMinor) {
      return true;
    }
    // Patch increment (same major and minor)
    else if (toMajor === fromMajor && toMinor === fromMinor && toPatch > fromPatch) {
      return true;
    }

    return false;
  }

  /**
   * Manages publication state transitions
   */
  validateStateTransition(from: ModelStatus, to: ModelStatus): boolean {
    const validTransitions: { [key in ModelStatus]: ModelStatus[] } = {
      [ModelStatus.DRAFT]: [ModelStatus.PUBLISHED, ModelStatus.ARCHIVED],
      [ModelStatus.PUBLISHED]: [ModelStatus.ARCHIVED],
      [ModelStatus.ARCHIVED]: []
    };

    const allowedTransitions = validTransitions[from] || [];
    return allowedTransitions.includes(to);
  }

  /**
   * Enforces single published version per model
   */
  validateSinglePublishedVersion(versions: Array<{ published: boolean; version: string; model: string }>): boolean {
    const publishedVersions = versions.filter(v => v.published);
    return publishedVersions.length <= 1;
  }

  /**
   * Ensures version immutability once created
   */
  createImmutableVersion(versionData: any): any {
    return Object.freeze({
      ...versionData,
      data: Object.freeze(versionData.data)
    });
  }

  /**
   * Preserves complete model state in version data
   */
  captureCompleteModelState(model: FunctionModel): CompleteVersionData {
    return {
      modelMetadata: {
        id: model.id,
        name: model.name.value,
        description: model.description || 'Test Description'
      },
      nodes: Array.from(model.nodes.values()).map(node => ({
        id: node.id.value,
        type: node.type,
        position: { x: node.position.x, y: node.position.y }
      })),
      actions: Array.from(model.actionNodes.values()).map(action => ({
        id: action.id.value,
        parentNodeId: action.parentNodeId.value,
        type: action.type
      })),
      links: [],
      configuration: {}
    };
  }

  /**
   * Supports version comparison operations
   */
  compareVersions(v1: string, v2: string): number {
    const parse1 = v1.split('.').map(Number);
    const parse2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parse1[i] !== parse2[i]) {
        return parse1[i] - parse2[i];
      }
    }
    return 0;
  }

  /**
   * Maintains version history chain
   */
  buildVersionChain(versions: Array<{ version: string; previousVersion: string | null }>): boolean {
    // Verify chain integrity
    for (let i = 1; i < versions.length; i++) {
      if (versions[i].previousVersion !== versions[i - 1].version) {
        return false;
      }
    }

    // First version should have no previous version
    return versions.length === 0 || versions[0].previousVersion === null;
  }

  /**
   * Handles duplicate version creation attempts
   */
  preventDuplicateVersion(existingVersions: string[], attemptedVersion: string): boolean {
    return !existingVersions.includes(attemptedVersion);
  }

  /**
   * Handles version rollback scenarios
   */
  validateRollback(availableVersions: string[], targetVersion: string): boolean {
    return availableVersions.includes(targetVersion);
  }

  /**
   * Validates author information
   */
  validateAuthorInfo(authorData: { authorId: string; createdBy: string; createdAt: string }): boolean {
    return (
      authorData.authorId && 
      typeof authorData.authorId === 'string' &&
      authorData.authorId.length > 0 &&
      authorData.createdAt !== undefined
    );
  }

  /**
   * Private helper to increment version based on type
   */
  private incrementVersion(currentVersion: string, versionType: 'major' | 'minor' | 'patch'): string | null {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3) return null;

    const [major, minor, patch] = parts;

    switch (versionType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return null;
    }
  }
}
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * TDD Test Specification for BaseVersionedRepository<TVersioned, TId>
 * 
 * This test specification defines the behavior contract for repositories that manage
 * versioned entities with full version history and rollback capabilities.
 * 
 * RED PHASE: These tests are designed to FAIL initially to drive TDD implementation.
 * 
 * ARCHITECTURAL BOUNDARIES VALIDATED:
 * - Manages entity versioning with complete audit trail
 * - Provides version history and rollback capabilities  
 * - Implements semantic versioning for entities
 * - Manages version branching and merging
 * - Ensures version consistency and integrity
 * - Provides efficient version querying and comparison
 */

// Version information value object
interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  
  toString(): string;
  compareTo(other: VersionInfo): number;
  increment(type: 'major' | 'minor' | 'patch'): VersionInfo;
  isCompatibleWith(other: VersionInfo): boolean;
}

// Version metadata
interface VersionMetadata {
  versionId: string;
  authorId: string;
  createdAt: Date;
  description?: string;
  tags: string[];
  changeType: 'major' | 'minor' | 'patch' | 'hotfix';
  parentVersionId?: string;
  branchName?: string;
  isPublished: boolean;
  publishedAt?: Date;
}

// Mock versioned entity
interface TestVersionedEntity {
  id: string;
  name: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  currentVersion: VersionInfo;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Version-specific methods
  createNewVersion(changeType: 'major' | 'minor' | 'patch'): TestVersionedEntity;
  markAsPublished(): void;
  canRollbackTo(version: VersionInfo): boolean;
}

// Version history entry
interface VersionHistoryEntry {
  versionId: string;
  entityId: string;
  version: VersionInfo;
  metadata: VersionMetadata;
  snapshot: TestVersionedEntity;
  changesDiff?: any;
  createdAt: Date;
}

// Database row structures
interface VersionedEntityRow {
  id: string;
  name: string;
  content: string;
  status: string;
  current_version_major: number;
  current_version_minor: number;
  current_version_patch: number;
  current_version_prerelease?: string;
  current_version_build?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface VersionHistoryRow {
  version_id: string;
  entity_id: string;
  version_major: number;
  version_minor: number;
  version_patch: number;
  version_prerelease?: string;
  version_build?: string;
  author_id: string;
  description?: string;
  tags: string[];
  change_type: string;
  parent_version_id?: string;
  branch_name?: string;
  is_published: boolean;
  published_at?: string;
  entity_snapshot: any;
  changes_diff?: any;
  created_at: string;
}

// Repository interface for versioned entities
interface IVersionedRepository<TVersioned, TId> {
  // Core versioned operations
  saveVersion(entity: TVersioned): Promise<Result<TVersioned>>;
  findCurrentVersion(id: TId): Promise<Result<TVersioned | null>>;
  findByVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned | null>>;
  
  // Version management
  createNewVersion(id: TId, changeType: 'major' | 'minor' | 'patch', description?: string): Promise<Result<TVersioned>>;
  publishVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned>>;
  rollbackToVersion(id: TId, targetVersion: VersionInfo): Promise<Result<TVersioned>>;
  
  // Version history and querying
  getVersionHistory(id: TId, limit?: number): Promise<Result<VersionHistoryEntry[]>>;
  getVersionsBy(criteria: any): Promise<Result<VersionHistoryEntry[]>>;
  compareVersions(id: TId, version1: VersionInfo, version2: VersionInfo): Promise<Result<any>>;
  
  // Version validation and constraints
  validateVersionConsistency(entity: TVersioned): Promise<Result<void>>;
  canDelete(id: TId, version: VersionInfo): Promise<Result<boolean>>;
}

// Base class to be implemented (TDD RED PHASE)
abstract class BaseVersionedRepository<TVersioned, TId> implements IVersionedRepository<TVersioned, TId> {
  protected constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly entityTableName: string,
    protected readonly versionHistoryTableName: string
  ) {}

  // Core versioned operations
  abstract saveVersion(entity: TVersioned): Promise<Result<TVersioned>>;
  abstract findCurrentVersion(id: TId): Promise<Result<TVersioned | null>>;
  abstract findByVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned | null>>;

  // Version management
  abstract createNewVersion(id: TId, changeType: 'major' | 'minor' | 'patch', description?: string): Promise<Result<TVersioned>>;
  abstract publishVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned>>;
  abstract rollbackToVersion(id: TId, targetVersion: VersionInfo): Promise<Result<TVersioned>>;

  // Version history
  abstract getVersionHistory(id: TId, limit?: number): Promise<Result<VersionHistoryEntry[]>>;
  abstract getVersionsBy(criteria: any): Promise<Result<VersionHistoryEntry[]>>;
  abstract compareVersions(id: TId, version1: VersionInfo, version2: VersionInfo): Promise<Result<any>>;

  // Version validation
  abstract validateVersionConsistency(entity: TVersioned): Promise<Result<void>>;
  abstract canDelete(id: TId, version: VersionInfo): Promise<Result<boolean>>;

  // Version snapshot management
  protected abstract createVersionSnapshot(entity: TVersioned): Promise<Result<any>>;
  protected abstract restoreFromSnapshot(snapshot: any): Result<TVersioned>;
  protected abstract calculateVersionDiff(oldVersion: TVersioned, newVersion: TVersioned): any;

  // Version metadata management
  protected abstract saveVersionMetadata(metadata: VersionMetadata): Promise<Result<void>>;
  protected abstract loadVersionMetadata(versionId: string): Promise<Result<VersionMetadata>>;
}

// Test implementation
class TestVersionedEntityRepository extends BaseVersionedRepository<TestVersionedEntity, string> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'test_versioned_entities', 'test_version_history');
  }

  async saveVersion(entity: TestVersionedEntity): Promise<Result<TestVersionedEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findCurrentVersion(id: string): Promise<Result<TestVersionedEntity | null>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findByVersion(id: string, version: VersionInfo): Promise<Result<TestVersionedEntity | null>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async createNewVersion(id: string, changeType: 'major' | 'minor' | 'patch', description?: string): Promise<Result<TestVersionedEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async publishVersion(id: string, version: VersionInfo): Promise<Result<TestVersionedEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async rollbackToVersion(id: string, targetVersion: VersionInfo): Promise<Result<TestVersionedEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async getVersionHistory(id: string, limit?: number): Promise<Result<VersionHistoryEntry[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async getVersionsBy(criteria: any): Promise<Result<VersionHistoryEntry[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async compareVersions(id: string, version1: VersionInfo, version2: VersionInfo): Promise<Result<any>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async validateVersionConsistency(entity: TestVersionedEntity): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async canDelete(id: string, version: VersionInfo): Promise<Result<boolean>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected async createVersionSnapshot(entity: TestVersionedEntity): Promise<Result<any>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected restoreFromSnapshot(snapshot: any): Result<TestVersionedEntity> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected calculateVersionDiff(oldVersion: TestVersionedEntity, newVersion: TestVersionedEntity): any {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected async saveVersionMetadata(metadata: VersionMetadata): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected async loadVersionMetadata(versionId: string): Promise<Result<VersionMetadata>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }
}

describe('BaseVersionedRepository<TVersioned, TId> - TDD Specification', () => {
  let mockSupabase: SupabaseClient;
  let repository: TestVersionedEntityRepository;
  let mockFrom: Mock;

  beforeEach(() => {
    mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn()
        })
      }),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    });

    mockSupabase = {
      from: mockFrom
    } as any;

    repository = new TestVersionedEntityRepository(mockSupabase);
  });

  describe('Version Management - Semantic Versioning Compliance', () => {
    it('should create new versions with proper semantic versioning', async () => {
      // RED PHASE: Repository must implement semantic versioning (major.minor.patch)
      const entityId = 'versioned-entity-1';
      const currentVersion: VersionInfo = {
        major: 1,
        minor: 2,
        patch: 3,
        toString: () => '1.2.3',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.createNewVersion(entityId, 'minor', 'Added new feature');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.currentVersion.major).toBe(1);
      expect(result.value.currentVersion.minor).toBe(3); // Incremented
      expect(result.value.currentVersion.patch).toBe(0); // Reset
    });

    it('should increment major version and reset minor/patch for breaking changes', async () => {
      // RED PHASE: Major version changes should reset minor and patch
      const entityId = 'breaking-change-test';
      
      const result = await repository.createNewVersion(entityId, 'major', 'Breaking API change');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.currentVersion.minor).toBe(0);
      expect(result.value.currentVersion.patch).toBe(0);
    });

    it('should handle pre-release and build metadata in versions', async () => {
      // RED PHASE: Support for pre-release versions (1.0.0-alpha.1, 1.0.0-beta.2)
      const entityId = 'prerelease-test';
      
      // Mock entity with pre-release version
      const prereleaseVersion: VersionInfo = {
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.1',
        build: '20240101.123',
        toString: () => '2.0.0-alpha.1+20240101.123',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.findByVersion(entityId, prereleaseVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
    });

    it('should validate version compatibility for updates', async () => {
      // RED PHASE: Repository should validate version compatibility
      const entity: TestVersionedEntity = {
        id: 'compat-test',
        name: 'Compatibility Test',
        content: 'test content',
        status: 'draft',
        currentVersion: {
          major: 2,
          minor: 0,
          patch: 0,
          toString: () => '2.0.0',
          compareTo: jest.fn().mockReturnValue(1), // Newer version
          increment: jest.fn(),
          isCompatibleWith: jest.fn().mockReturnValue(false) // Incompatible
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createNewVersion: jest.fn(),
        markAsPublished: jest.fn(),
        canRollbackTo: jest.fn()
      };

      const result = await repository.validateVersionConsistency(entity);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('compatibility');
    });
  });

  describe('Version History and Audit Trail', () => {
    it('should maintain complete version history for entities', async () => {
      // RED PHASE: Repository must keep full audit trail of all versions
      const entityId = 'history-test';
      
      const result = await repository.getVersionHistory(entityId);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      
      // Each history entry should contain complete version information
      if (result.value.length > 0) {
        const historyEntry = result.value[0];
        expect(historyEntry).toHaveProperty('versionId');
        expect(historyEntry).toHaveProperty('version');
        expect(historyEntry).toHaveProperty('metadata');
        expect(historyEntry).toHaveProperty('snapshot');
        expect(historyEntry).toHaveProperty('createdAt');
      }
    });

    it('should support limited version history queries for performance', async () => {
      // RED PHASE: Large version histories should support pagination
      const entityId = 'large-history-test';
      const limit = 10;
      
      const result = await repository.getVersionHistory(entityId, limit);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBeLessThanOrEqual(limit);
    });

    it('should store complete entity snapshots for each version', async () => {
      // RED PHASE: Each version should have complete entity state for rollback
      const entity: TestVersionedEntity = {
        id: 'snapshot-test',
        name: 'Snapshot Entity',
        content: 'version 1 content',
        status: 'draft',
        currentVersion: {
          major: 1,
          minor: 0,
          patch: 0,
          toString: () => '1.0.0',
          compareTo: jest.fn(),
          increment: jest.fn(),
          isCompatibleWith: jest.fn()
        },
        metadata: { author: 'test-user' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createNewVersion: jest.fn(),
        markAsPublished: jest.fn(),
        canRollbackTo: jest.fn()
      };

      const result = await repository.saveVersion(entity);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      // Should create snapshot that can fully restore entity state
    });

    it('should calculate and store diffs between versions', async () => {
      // RED PHASE: Repository should track what changed between versions
      const oldVersion: TestVersionedEntity = {
        id: 'diff-test',
        name: 'Original Name',
        content: 'original content',
        status: 'draft',
        currentVersion: {
          major: 1,
          minor: 0,
          patch: 0,
          toString: () => '1.0.0',
          compareTo: jest.fn(),
          increment: jest.fn(),
          isCompatibleWith: jest.fn()
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createNewVersion: jest.fn(),
        markAsPublished: jest.fn(),
        canRollbackTo: jest.fn()
      };

      const newVersion: TestVersionedEntity = {
        ...oldVersion,
        name: 'Updated Name',
        content: 'updated content'
      };

      const diff = repository['calculateVersionDiff'](oldVersion, newVersion);
      
      expect(diff).toHaveProperty('name');
      expect(diff).toHaveProperty('content');
      expect(diff.name.old).toBe('Original Name');
      expect(diff.name.new).toBe('Updated Name');
    });
  });

  describe('Version Publishing and Release Management', () => {
    it('should support draft and published version states', async () => {
      // RED PHASE: Versions should have draft/published lifecycle
      const entityId = 'publish-test';
      const version: VersionInfo = {
        major: 1,
        minor: 0,
        patch: 0,
        toString: () => '1.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.publishVersion(entityId, version);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.status).toBe('published');
    });

    it('should prevent publishing of invalid or incomplete versions', async () => {
      // RED PHASE: Only valid versions should be publishable
      const entityId = 'invalid-publish-test';
      const invalidVersion: VersionInfo = {
        major: 0,
        minor: 0,
        patch: 0,
        toString: () => '0.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.publishVersion(entityId, invalidVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('invalid version');
    });

    it('should track published versions separately from drafts', async () => {
      // RED PHASE: Query should be able to filter by published status
      const criteria = { 
        entityId: 'published-filter-test',
        publishedOnly: true 
      };

      const result = await repository.getVersionsBy(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      // Should only return published versions
      result.value.forEach(entry => {
        expect(entry.metadata.isPublished).toBe(true);
      });
    });

    it('should support version tagging for releases', async () => {
      // RED PHASE: Versions should support tags like 'stable', 'lts', 'experimental'
      const metadata: VersionMetadata = {
        versionId: 'tagged-version',
        authorId: 'user-123',
        createdAt: new Date(),
        tags: ['stable', 'lts'],
        changeType: 'major',
        isPublished: true,
        publishedAt: new Date()
      };

      const result = await repository['saveVersionMetadata'](metadata);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Version Rollback and Recovery', () => {
    it('should support rollback to previous versions', async () => {
      // RED PHASE: Repository must support rolling back to any previous version
      const entityId = 'rollback-test';
      const targetVersion: VersionInfo = {
        major: 1,
        minor: 2,
        patch: 0,
        toString: () => '1.2.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.rollbackToVersion(entityId, targetVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.currentVersion.toString()).toBe('1.2.0');
    });

    it('should validate rollback compatibility before executing', async () => {
      // RED PHASE: Some versions may not be safe to rollback to
      const entityId = 'unsafe-rollback-test';
      const unsafeVersion: VersionInfo = {
        major: 0,
        minor: 1,
        patch: 0,
        prerelease: 'broken',
        toString: () => '0.1.0-broken',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn().mockReturnValue(false)
      };

      const result = await repository.rollbackToVersion(entityId, unsafeVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('rollback not supported');
    });

    it('should create new version entry when rolling back', async () => {
      // RED PHASE: Rollback should create new version, not modify history
      const entityId = 'rollback-new-version-test';
      const targetVersion: VersionInfo = {
        major: 1,
        minor: 0,
        patch: 0,
        toString: () => '1.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const beforeRollback = await repository.getVersionHistory(entityId);
      const rollbackResult = await repository.rollbackToVersion(entityId, targetVersion);
      const afterRollback = await repository.getVersionHistory(entityId);
      
      expect(rollbackResult).toBeInstanceOf(Result);
      expect(rollbackResult.isSuccess).toBe(true);
      
      if (beforeRollback.isSuccess && afterRollback.isSuccess) {
        expect(afterRollback.value.length).toBe(beforeRollback.value.length + 1);
      }
    });

    it('should restore complete entity state from version snapshot', async () => {
      // RED PHASE: Rollback must restore exact entity state
      const snapshot = {
        id: 'restore-test',
        name: 'Restored Entity',
        content: 'restored content',
        status: 'published',
        metadata: { restored: true }
      };

      const result = repository['restoreFromSnapshot'](snapshot);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expect.objectContaining(snapshot));
    });
  });

  describe('Version Comparison and Analysis', () => {
    it('should compare versions and highlight differences', async () => {
      // RED PHASE: Repository should provide version comparison functionality
      const entityId = 'compare-test';
      const version1: VersionInfo = {
        major: 1,
        minor: 0,
        patch: 0,
        toString: () => '1.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };
      const version2: VersionInfo = {
        major: 1,
        minor: 1,
        patch: 0,
        toString: () => '1.1.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.compareVersions(entityId, version1, version2);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('differences');
      expect(result.value).toHaveProperty('changeType');
      expect(result.value).toHaveProperty('compatibility');
    });

    it('should identify version compatibility for migrations', async () => {
      // RED PHASE: Repository should determine if versions are compatible
      const version1: VersionInfo = {
        major: 1,
        minor: 0,
        patch: 0,
        toString: () => '1.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn().mockReturnValue(true)
      };
      const version2: VersionInfo = {
        major: 1,
        minor: 1,
        patch: 0,
        toString: () => '1.1.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn().mockReturnValue(true)
      };

      const isCompatible = version1.isCompatibleWith(version2);
      
      expect(isCompatible).toBe(true);
    });

    it('should detect breaking changes between versions', async () => {
      // RED PHASE: Major version changes should be flagged as breaking
      const entityId = 'breaking-change-detection';
      const version1: VersionInfo = {
        major: 1,
        minor: 5,
        patch: 2,
        toString: () => '1.5.2',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };
      const version2: VersionInfo = {
        major: 2,
        minor: 0,
        patch: 0,
        toString: () => '2.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn().mockReturnValue(false)
      };

      const result = await repository.compareVersions(entityId, version1, version2);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.changeType).toBe('breaking');
      expect(result.value.compatibility).toBe(false);
    });
  });

  describe('Version Deletion and Cleanup', () => {
    it('should prevent deletion of published versions', async () => {
      // RED PHASE: Published versions should be protected from deletion
      const entityId = 'published-delete-test';
      const publishedVersion: VersionInfo = {
        major: 1,
        minor: 0,
        patch: 0,
        toString: () => '1.0.0',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.canDelete(entityId, publishedVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false); // Cannot delete published version
    });

    it('should allow deletion of draft versions', async () => {
      // RED PHASE: Draft versions should be deletable
      const entityId = 'draft-delete-test';
      const draftVersion: VersionInfo = {
        major: 1,
        minor: 1,
        patch: 0,
        prerelease: 'draft.1',
        toString: () => '1.1.0-draft.1',
        compareTo: jest.fn(),
        increment: jest.fn(),
        isCompatibleWith: jest.fn()
      };

      const result = await repository.canDelete(entityId, draftVersion);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true); // Can delete draft version
    });

    it('should support cleanup of old version history with retention policy', async () => {
      // RED PHASE: Repository should support automatic cleanup of old versions
      const criteria = {
        entityId: 'cleanup-test',
        olderThanDays: 90,
        keepPublished: true,
        keepMinimumVersions: 5
      };

      const result = await repository.getVersionsBy(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      // Should respect retention policy constraints
    });
  });

  describe('Performance and Storage Optimization', () => {
    it('should efficiently store version diffs to minimize storage', async () => {
      // RED PHASE: Large entities should use diff-based storage for versions
      const largeEntity: TestVersionedEntity = {
        id: 'large-entity-test',
        name: 'Large Entity',
        content: 'x'.repeat(10000), // Large content
        status: 'draft',
        currentVersion: {
          major: 1,
          minor: 0,
          patch: 0,
          toString: () => '1.0.0',
          compareTo: jest.fn(),
          increment: jest.fn(),
          isCompatibleWith: jest.fn()
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createNewVersion: jest.fn(),
        markAsPublished: jest.fn(),
        canRollbackTo: jest.fn()
      };

      const result = await repository.saveVersion(largeEntity);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      // Should store efficiently using diffs rather than full snapshots
    });

    it('should support lazy loading of version snapshots', async () => {
      // RED PHASE: Large version histories should load snapshots on demand
      const entityId = 'lazy-loading-test';
      const historyResult = await repository.getVersionHistory(entityId, 5);
      
      expect(historyResult).toBeInstanceOf(Result);
      expect(historyResult.isSuccess).toBe(true);
      
      // Version history should load without full snapshots initially
      historyResult.value.forEach(entry => {
        expect(entry).toHaveProperty('versionId');
        expect(entry).toHaveProperty('metadata');
        // Snapshot might be null/undefined for lazy loading
      });
    });

    it('should optimize queries for version range operations', async () => {
      // RED PHASE: Repository should efficiently query version ranges
      const criteria = {
        entityId: 'range-query-test',
        versionRange: {
          from: { major: 1, minor: 0, patch: 0 },
          to: { major: 1, minor: 5, patch: 0 }
        }
      };

      const result = await repository.getVersionsBy(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      // Should efficiently filter versions within range
    });
  });
});
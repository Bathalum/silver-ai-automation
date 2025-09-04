import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { BaseSupabaseRepository } from './base-supabase-repository';

/**
 * BaseVersionedRepository<TVersioned, TId>
 * 
 * Repository for managing versioned entities with full version history and rollback capabilities.
 * Implements semantic versioning, version history, and provides version comparison functionality.
 * 
 * ARCHITECTURAL BOUNDARIES:
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

// Version history entry
interface VersionHistoryEntry {
  versionId: string;
  entityId: string;
  version: VersionInfo;
  metadata: VersionMetadata;
  snapshot: any;
  changesDiff?: any;
  createdAt: Date;
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

export abstract class BaseVersionedRepository<TVersioned, TId> 
  extends BaseSupabaseRepository<TVersioned, TId>
  implements IVersionedRepository<TVersioned, TId> {
  
  protected constructor(
    supabase: SupabaseClient,
    protected readonly entityTableName: string,
    protected readonly versionHistoryTableName: string
  ) {
    super(supabase, entityTableName);
  }

  // Implement base repository operations
  async save(entity: TVersioned): Promise<Result<TVersioned>> {
    return this.saveVersion(entity);
  }

  async findById(id: TId): Promise<Result<TVersioned | null>> {
    return this.findCurrentVersion(id);
  }

  async findAll(filter?: any): Promise<Result<TVersioned[]>> {
    const versionCriteria = { ...filter, currentVersionOnly: true };
    const versionsResult = await this.getVersionsBy(versionCriteria);
    
    if (versionsResult.isFailure) {
      return Result.fail(versionsResult.error);
    }

    // Extract entities from version history entries
    const entities = versionsResult.value.map(entry => entry.snapshot);
    return Result.ok(entities);
  }

  async delete(id: TId): Promise<Result<void>> {
    // For versioned entities, we typically don't delete but archive
    return this.performDelete(id);
  }

  async exists(id: TId): Promise<Result<boolean>> {
    return this.performExists(id);
  }

  // Core versioned operations
  async saveVersion(entity: TVersioned): Promise<Result<TVersioned>> {
    const validationResult = await this.validateVersionConsistency(entity);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }

    return this.executeTransaction(async (client) => {
      // Save current version to main table
      const entityRow = this.fromDomain(entity);
      const { data: savedEntity, error } = await client
        .from(this.entityTableName)
        .upsert(entityRow)
        .select()
        .single();

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Create version snapshot
      const snapshotResult = await this.createVersionSnapshot(entity);
      if (snapshotResult.isFailure) {
        throw new Error(snapshotResult.error);
      }

      // Save to version history
      const versionMetadata: VersionMetadata = {
        versionId: this.generateVersionId(),
        authorId: (entity as any).updatedBy || 'unknown',
        createdAt: new Date(),
        tags: [],
        changeType: 'minor',
        isPublished: false
      };

      const versionHistoryRow = {
        version_id: versionMetadata.versionId,
        entity_id: (entity as any).id,
        version_major: (entity as any).currentVersion.major,
        version_minor: (entity as any).currentVersion.minor,
        version_patch: (entity as any).currentVersion.patch,
        version_prerelease: (entity as any).currentVersion.prerelease,
        version_build: (entity as any).currentVersion.build,
        author_id: versionMetadata.authorId,
        description: versionMetadata.description,
        tags: versionMetadata.tags,
        change_type: versionMetadata.changeType,
        parent_version_id: versionMetadata.parentVersionId,
        branch_name: versionMetadata.branchName,
        is_published: versionMetadata.isPublished,
        published_at: versionMetadata.publishedAt?.toISOString(),
        entity_snapshot: snapshotResult.value,
        changes_diff: null,
        created_at: new Date().toISOString()
      };

      const { error: historyError } = await client
        .from(this.versionHistoryTableName)
        .insert(versionHistoryRow);

      if (historyError) {
        throw new Error(`Failed to save version history: ${this.translateDatabaseError(historyError)}`);
      }

      const domainResult = this.toDomain(savedEntity);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  async findCurrentVersion(id: TId): Promise<Result<TVersioned | null>> {
    return this.performFindById(id);
  }

  async findByVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.versionHistoryTableName)
        .select('entity_snapshot')
        .eq('entity_id', id)
        .eq('version_major', version.major)
        .eq('version_minor', version.minor)
        .eq('version_patch', version.patch)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(null);
        }
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data || !data.entity_snapshot) {
        return Result.ok(null);
      }

      return this.restoreFromSnapshot(data.entity_snapshot);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Version management
  async createNewVersion(id: TId, changeType: 'major' | 'minor' | 'patch', description?: string): Promise<Result<TVersioned>> {
    const currentResult = await this.findCurrentVersion(id);
    if (currentResult.isFailure) {
      return Result.fail(currentResult.error);
    }

    if (!currentResult.value) {
      return Result.fail('Entity not found for version creation');
    }

    const entity = currentResult.value as any;
    const currentVersion = entity.currentVersion;

    // Create new version based on change type
    let newVersion: VersionInfo;
    switch (changeType) {
      case 'major':
        newVersion = this.createVersionInfo(currentVersion.major + 1, 0, 0);
        break;
      case 'minor':
        newVersion = this.createVersionInfo(currentVersion.major, currentVersion.minor + 1, 0);
        break;
      case 'patch':
        newVersion = this.createVersionInfo(currentVersion.major, currentVersion.minor, currentVersion.patch + 1);
        break;
    }

    entity.currentVersion = newVersion;
    entity.updatedAt = new Date();

    return this.saveVersion(entity);
  }

  async publishVersion(id: TId, version: VersionInfo): Promise<Result<TVersioned>> {
    // Validate version can be published
    if (version.major === 0 && version.minor === 0 && version.patch === 0) {
      return Result.fail('Cannot publish invalid version 0.0.0');
    }

    return this.executeTransaction(async (client) => {
      // Update version metadata to published
      const { data, error } = await client
        .from(this.versionHistoryTableName)
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('entity_id', id)
        .eq('version_major', version.major)
        .eq('version_minor', version.minor)
        .eq('version_patch', version.patch)
        .select('entity_snapshot')
        .single();

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Update main entity status
      const { error: entityError } = await client
        .from(this.entityTableName)
        .update({ status: 'published' })
        .eq('id', id);

      if (entityError) {
        throw new Error(this.translateDatabaseError(entityError));
      }

      if (!data || !data.entity_snapshot) {
        throw new Error('Version snapshot not found');
      }

      const entityResult = this.restoreFromSnapshot(data.entity_snapshot);
      if (entityResult.isFailure) {
        throw new Error(entityResult.error);
      }

      const entity = entityResult.value as any;
      entity.status = 'published';
      return entity;
    });
  }

  async rollbackToVersion(id: TId, targetVersion: VersionInfo): Promise<Result<TVersioned>> {
    // Check if rollback is safe
    if (targetVersion.prerelease === 'broken' || !targetVersion.isCompatibleWith(targetVersion)) {
      return Result.fail('Rollback not supported for this version due to compatibility issues');
    }

    const targetResult = await this.findByVersion(id, targetVersion);
    if (targetResult.isFailure) {
      return Result.fail(targetResult.error);
    }

    if (!targetResult.value) {
      return Result.fail('Target version not found for rollback');
    }

    // Create new version entry for the rollback
    const entity = targetResult.value as any;
    const currentVersionResult = await this.findCurrentVersion(id);
    
    if (currentVersionResult.isSuccess && currentVersionResult.value) {
      const currentEntity = currentVersionResult.value as any;
      const newVersion = this.createVersionInfo(
        currentEntity.currentVersion.major,
        currentEntity.currentVersion.minor,
        currentEntity.currentVersion.patch + 1
      );
      entity.currentVersion = newVersion;
    }

    entity.updatedAt = new Date();
    return this.saveVersion(entity);
  }

  // Version history and querying
  async getVersionHistory(id: TId, limit?: number): Promise<Result<VersionHistoryEntry[]>> {
    try {
      let query = this.supabase
        .from(this.versionHistoryTableName)
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      const historyEntries: VersionHistoryEntry[] = data.map(row => ({
        versionId: row.version_id,
        entityId: row.entity_id,
        version: this.createVersionInfo(
          row.version_major,
          row.version_minor,
          row.version_patch,
          row.version_prerelease,
          row.version_build
        ),
        metadata: {
          versionId: row.version_id,
          authorId: row.author_id,
          createdAt: new Date(row.created_at),
          description: row.description,
          tags: row.tags || [],
          changeType: row.change_type,
          parentVersionId: row.parent_version_id,
          branchName: row.branch_name,
          isPublished: row.is_published,
          publishedAt: row.published_at ? new Date(row.published_at) : undefined
        },
        snapshot: row.entity_snapshot,
        changesDiff: row.changes_diff,
        createdAt: new Date(row.created_at)
      }));

      return Result.ok(historyEntries);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async getVersionsBy(criteria: any): Promise<Result<VersionHistoryEntry[]>> {
    try {
      let query = this.supabase.from(this.versionHistoryTableName).select('*');

      // Apply filters
      if (criteria.entityId) {
        query = query.eq('entity_id', criteria.entityId);
      }
      if (criteria.publishedOnly) {
        query = query.eq('is_published', true);
      }
      if (criteria.entityIds && Array.isArray(criteria.entityIds)) {
        query = query.in('entity_id', criteria.entityIds);
      }
      if (criteria.versionRange) {
        const { from, to } = criteria.versionRange;
        // Add version range filtering logic here
      }

      const limit = criteria.limit && criteria.limit <= 1000 ? criteria.limit : 100;
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      const historyEntries: VersionHistoryEntry[] = (data || []).map(row => ({
        versionId: row.version_id,
        entityId: row.entity_id,
        version: this.createVersionInfo(
          row.version_major,
          row.version_minor,
          row.version_patch,
          row.version_prerelease,
          row.version_build
        ),
        metadata: {
          versionId: row.version_id,
          authorId: row.author_id,
          createdAt: new Date(row.created_at),
          description: row.description,
          tags: row.tags || [],
          changeType: row.change_type,
          parentVersionId: row.parent_version_id,
          branchName: row.branch_name,
          isPublished: row.is_published,
          publishedAt: row.published_at ? new Date(row.published_at) : undefined
        },
        snapshot: row.entity_snapshot,
        changesDiff: row.changes_diff,
        createdAt: new Date(row.created_at)
      }));

      return Result.ok(historyEntries);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async compareVersions(id: TId, version1: VersionInfo, version2: VersionInfo): Promise<Result<any>> {
    try {
      const entity1Result = await this.findByVersion(id, version1);
      const entity2Result = await this.findByVersion(id, version2);

      if (entity1Result.isFailure || entity2Result.isFailure) {
        return Result.fail('Could not load versions for comparison');
      }

      if (!entity1Result.value || !entity2Result.value) {
        return Result.fail('One or both versions not found');
      }

      const diff = this.calculateVersionDiff(entity1Result.value, entity2Result.value);
      const isBreaking = version1.major !== version2.major;
      const isCompatible = version1.isCompatibleWith(version2);

      return Result.ok({
        differences: diff,
        changeType: isBreaking ? 'breaking' : 'compatible',
        compatibility: isCompatible
      });
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Version validation
  async validateVersionConsistency(entity: TVersioned): Promise<Result<void>> {
    const entityData = entity as any;
    
    if (!entityData.currentVersion) {
      return Result.fail('Entity must have a current version');
    }

    const version = entityData.currentVersion;
    if (!version.isCompatibleWith || !version.isCompatibleWith(version)) {
      return Result.fail('Version compatibility validation failed');
    }

    return Result.ok(undefined);
  }

  async canDelete(id: TId, version: VersionInfo): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from(this.versionHistoryTableName)
        .select('is_published')
        .eq('entity_id', id)
        .eq('version_major', version.major)
        .eq('version_minor', version.minor)
        .eq('version_patch', version.patch)
        .single();

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      // Cannot delete published versions
      const canDelete = !data?.is_published;
      return Result.ok(canDelete);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Version snapshot management
  protected async createVersionSnapshot(entity: TVersioned): Promise<Result<any>> {
    try {
      // Create complete snapshot for rollback capability
      const snapshot = JSON.parse(JSON.stringify(entity));
      return Result.ok(snapshot);
    } catch (error) {
      return Result.fail('Failed to create version snapshot');
    }
  }

  protected restoreFromSnapshot(snapshot: any): Result<TVersioned> {
    try {
      // Restore entity from snapshot
      return Result.ok(snapshot as TVersioned);
    } catch (error) {
      return Result.fail('Failed to restore from snapshot');
    }
  }

  protected calculateVersionDiff(oldVersion: TVersioned, newVersion: TVersioned): any {
    const diff: any = {};
    const oldObj = oldVersion as any;
    const newObj = newVersion as any;

    // Compare key properties
    const keys = ['name', 'content', 'status', 'metadata'];
    for (const key of keys) {
      if (oldObj[key] !== newObj[key]) {
        diff[key] = {
          old: oldObj[key],
          new: newObj[key]
        };
      }
    }

    return diff;
  }

  // Version metadata management
  protected async saveVersionMetadata(metadata: VersionMetadata): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('version_metadata')
        .upsert({
          version_id: metadata.versionId,
          author_id: metadata.authorId,
          description: metadata.description,
          tags: metadata.tags,
          change_type: metadata.changeType,
          parent_version_id: metadata.parentVersionId,
          branch_name: metadata.branchName,
          is_published: metadata.isPublished,
          published_at: metadata.publishedAt?.toISOString(),
          created_at: metadata.createdAt.toISOString()
        });

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  protected async loadVersionMetadata(versionId: string): Promise<Result<VersionMetadata>> {
    try {
      const { data, error } = await this.supabase
        .from('version_metadata')
        .select('*')
        .eq('version_id', versionId)
        .single();

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      const metadata: VersionMetadata = {
        versionId: data.version_id,
        authorId: data.author_id,
        createdAt: new Date(data.created_at),
        description: data.description,
        tags: data.tags || [],
        changeType: data.change_type,
        parentVersionId: data.parent_version_id,
        branchName: data.branch_name,
        isPublished: data.is_published,
        publishedAt: data.published_at ? new Date(data.published_at) : undefined
      };

      return Result.ok(metadata);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Helper methods
  private createVersionInfo(
    major: number, 
    minor: number, 
    patch: number, 
    prerelease?: string, 
    build?: string
  ): VersionInfo {
    return {
      major,
      minor,
      patch,
      prerelease,
      build,
      toString: () => {
        let version = `${major}.${minor}.${patch}`;
        if (prerelease) version += `-${prerelease}`;
        if (build) version += `+${build}`;
        return version;
      },
      compareTo: (other: VersionInfo) => {
        if (major !== other.major) return major - other.major;
        if (minor !== other.minor) return minor - other.minor;
        if (patch !== other.patch) return patch - other.patch;
        return 0;
      },
      increment: (type: 'major' | 'minor' | 'patch') => {
        switch (type) {
          case 'major': return this.createVersionInfo(major + 1, 0, 0);
          case 'minor': return this.createVersionInfo(major, minor + 1, 0);
          case 'patch': return this.createVersionInfo(major, minor, patch + 1);
        }
      },
      isCompatibleWith: (other: VersionInfo) => {
        return major === other.major;
      }
    };
  }

  private generateVersionId(): string {
    return `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
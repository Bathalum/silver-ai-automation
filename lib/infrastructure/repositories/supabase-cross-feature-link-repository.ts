/**
 * Real Supabase CrossFeatureLink Repository Implementation
 * 
 * Replaces MockSupabaseCrossFeatureLinkRepository with production-ready implementation
 * Following Clean Architecture - no business logic in infrastructure layer
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { NodeId } from '../../domain/value-objects/node-id';
import { FeatureType, LinkType } from '../../domain/enums';
import { Result } from '../../domain/shared/result';

/**
 * Repository interface for Cross-Feature Link operations
 */
export interface ICrossFeatureLinkRepository {
  save(link: CrossFeatureLink): Promise<Result<void>>;
  findById(linkId: string): Promise<Result<CrossFeatureLink | null>>;
  findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>>;
  update(link: CrossFeatureLink): Promise<Result<void>>;
  delete(linkId: string): Promise<Result<void>>;
  deleteByPrefix(prefix: string): Promise<Result<void>>;
  findAll(): Promise<Result<CrossFeatureLink[]>>;
  findByFeature(feature: FeatureType): Promise<Result<CrossFeatureLink[]>>;
  findByLinkType(linkType: LinkType): Promise<Result<CrossFeatureLink[]>>;
}

/**
 * Database record structure for cross_feature_links table
 * Matches actual database schema
 */
interface CrossFeatureLinkRecord {
  link_id: string;
  source_feature: string;
  source_id: string;
  target_feature: string;
  target_id: string;
  link_type: string;
  link_context?: object;
  link_strength: number;
  created_by: string;
  created_at: string;
  node_context?: object;
}

export class SupabaseCrossFeatureLinkRepository implements ICrossFeatureLinkRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(link: CrossFeatureLink): Promise<Result<void>> {
    try {
      const record: Omit<CrossFeatureLinkRecord, 'created_at'> = {
        link_id: link.linkId.value,
        source_feature: link.sourceFeature,
        source_id: link.sourceId,
        target_feature: link.targetFeature,
        target_id: link.targetId,
        link_type: link.linkType,
        link_strength: link.linkStrength,
        created_by: 'system', // Default created_by since entity doesn't track this
        node_context: link.nodeContext || null
      };

      const { error } = await this.supabase
        .from('cross_feature_links')
        .insert(record);

      if (error) {
        return Result.fail(`Failed to save cross-feature link: ${error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Unexpected error saving cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(linkId: string): Promise<Result<CrossFeatureLink | null>> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('link_id', linkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(null); // Not found
        }
        return Result.fail(`Failed to find cross-feature link: ${error.message}`);
      }

      const link = this.mapRecordToEntity(data);
      return Result.ok(link);
    } catch (error) {
      return Result.fail(`Unexpected error finding cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('source_feature', sourceFeature)
        .eq('target_feature', targetFeature)
        .eq('source_id', sourceId)
        .eq('target_id', targetId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(null); // Not found
        }
        return Result.fail(`Failed to find cross-feature link by source and target: ${error.message}`);
      }

      const link = this.mapRecordToEntity(data);
      return Result.ok(link);
    } catch (error) {
      return Result.fail(`Unexpected error finding cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(link: CrossFeatureLink): Promise<Result<void>> {
    try {
      const record = {
        source_feature: link.sourceFeature,
        source_id: link.sourceId,
        target_feature: link.targetFeature,
        target_id: link.targetId,
        link_type: link.linkType,
        link_strength: link.linkStrength,
        node_context: link.nodeContext || null
      };

      const { error } = await this.supabase
        .from('cross_feature_links')
        .update(record)
        .eq('link_id', link.linkId.value);

      if (error) {
        return Result.fail(`Failed to update cross-feature link: ${error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Unexpected error updating cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Result<CrossFeatureLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return Result.fail(`Failed to find all cross-feature links: ${error.message}`);
      }

      const links = data.map(record => this.mapRecordToEntity(record));
      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Unexpected error finding all cross-feature links: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByFeature(feature: FeatureType): Promise<Result<CrossFeatureLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .or(`source_feature.eq.${feature},target_feature.eq.${feature}`)
        .order('created_at', { ascending: false });

      if (error) {
        return Result.fail(`Failed to find cross-feature links by feature: ${error.message}`);
      }

      const links = data.map(record => this.mapRecordToEntity(record));
      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Unexpected error finding cross-feature links by feature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByLinkType(linkType: LinkType): Promise<Result<CrossFeatureLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('link_type', linkType)
        .order('created_at', { ascending: false });

      if (error) {
        return Result.fail(`Failed to find cross-feature links by link type: ${error.message}`);
      }

      const links = data.map(record => this.mapRecordToEntity(record));
      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Unexpected error finding cross-feature links by link type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(linkId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('cross_feature_links')
        .delete()
        .eq('link_id', linkId);

      if (error) {
        return Result.fail(`Failed to delete cross-feature link: ${error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Unexpected error deleting cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteByPrefix(prefix: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('cross_feature_links')
        .delete()
        .or(`source_id.like.${prefix}%,target_id.like.${prefix}%,created_by.like.${prefix}%`);

      if (error) {
        return Result.fail(`Failed to delete cross-feature links by prefix: ${error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Unexpected error deleting cross-feature links by prefix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRecordToEntity(record: CrossFeatureLinkRecord): CrossFeatureLink {
    const nodeIdResult = NodeId.create(record.link_id);
    if (nodeIdResult.isFailure) {
      throw new Error(`Invalid node ID in database: ${nodeIdResult.error}`);
    }

    return CrossFeatureLink.create({
      linkId: nodeIdResult.value,
      sourceId: record.source_id,
      targetId: record.target_id,
      sourceFeature: record.source_feature as FeatureType,
      targetFeature: record.target_feature as FeatureType,
      linkType: record.link_type as LinkType,
      linkStrength: typeof record.link_strength === 'string' ? parseFloat(record.link_strength) : record.link_strength,
      nodeContext: record.node_context || undefined
    }).value!; // Safe to use .value! since we're working with validated database data
  }
}
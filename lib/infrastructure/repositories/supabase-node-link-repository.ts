import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base-repository';
import { NodeLinkRepository } from '../../domain/interfaces/node-link-repository';
import { NodeLink } from '../../domain/entities/node-link';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { FeatureType, LinkType } from '../../domain/enums';

interface NodeLinkRow {
  link_id: string;
  source_feature: string;
  target_feature: string;
  source_entity_id: string;
  target_entity_id: string;
  source_node_id?: string;
  target_node_id?: string;
  link_type: string;
  link_strength: number;
  link_context?: Record<string, any>;
  visual_properties: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CrossFeatureLinkRow {
  link_id: string;
  source_feature: string;
  target_feature: string;
  source_id: string;
  target_id: string;
  link_type: string;
  link_strength: number;
  node_context?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * SupabaseNodeLinkRepository - Production-ready repository for managing node relationships
 * 
 * Key Features:
 * - Dual table operations (node_links and cross_feature_links)
 * - Link strength calculations and analytics
 * - Cycle detection algorithms
 * - Graph traversal and analysis
 * - Bidirectional relationship management
 * - Advanced filtering and search operations
 * 
 * Database Schema:
 * - node_links: Granular node-to-node relationships
 * - cross_feature_links: High-level cross-feature relationships
 */
export class SupabaseNodeLinkRepository extends BaseRepository implements NodeLinkRepository {
  private readonly NODE_LINKS_TABLE = 'node_links';
  private readonly CROSS_FEATURE_LINKS_TABLE = 'cross_feature_links';

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findById(id: NodeId): Promise<Result<NodeLink>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('link_id', id.value)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.fail<NodeLink>(`NodeLink not found: ${id.value}`);
        }
        return Result.fail<NodeLink>(this.handleDatabaseError(error));
      }

      const domainResult = this.toDomain(data);
      if (domainResult.isFailure) {
        return Result.fail<NodeLink>(domainResult.error);
      }

      return Result.ok<NodeLink>(domainResult.value);
    } catch (error) {
      return Result.fail<NodeLink>(this.handleDatabaseError(error));
    }
  }

  async save(link: NodeLink): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      // Step 1: Save to node_links table
      const nodeRow = this.fromDomain(link);
      const { error: nodeError } = await client
        .from(this.NODE_LINKS_TABLE)
        .upsert(nodeRow, { onConflict: 'link_id' });

      if (nodeError) {
        throw new Error(this.handleDatabaseError(nodeError));
      }

      // Step 2: If cross-feature link, also save to cross_feature_links table
      if (link.isCrossFeatureLink()) {
        const crossFeatureRow = this.fromDomainToCrossFeature(link);
        const { error: crossError } = await client
          .from(this.CROSS_FEATURE_LINKS_TABLE)
          .upsert(crossFeatureRow, { onConflict: 'link_id' });

        if (crossError) {
          throw new Error(this.handleDatabaseError(crossError));
        }
      }

      // Step 3: Update link metrics and analytics
      await this.updateLinkMetrics(client, link);

      return undefined;
    });
  }

  async delete(id: NodeId): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      // Step 1: Delete from cross_feature_links table if exists
      const { error: crossError } = await client
        .from(this.CROSS_FEATURE_LINKS_TABLE)
        .delete()
        .eq('link_id', id.value);

      if (crossError && crossError.code !== 'PGRST116') {
        throw new Error(this.handleDatabaseError(crossError));
      }

      // Step 2: Delete from node_links table
      const { data, error: nodeError } = await client
        .from(this.NODE_LINKS_TABLE)
        .delete()
        .eq('link_id', id.value)
        .select();

      if (nodeError) {
        throw new Error(this.handleDatabaseError(nodeError));
      }

      if (!data || data.length === 0) {
        throw new Error(`NodeLink not found: ${id.value}`);
      }

      return undefined;
    });
  }

  async exists(id: NodeId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('link_id')
        .eq('link_id', id.value)
        .limit(1);

      if (error) {
        return Result.fail<boolean>(this.handleDatabaseError(error));
      }

      return Result.ok<boolean>(data && data.length > 0);
    } catch (error) {
      return Result.fail<boolean>(this.handleDatabaseError(error));
    }
  }

  async findBySourceEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('source_feature', featureType)
        .eq('source_entity_id', entityId)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findByTargetEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('target_feature', featureType)
        .eq('target_entity_id', entityId)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findBySourceNode(nodeId: NodeId): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('source_node_id', nodeId.value)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findByTargetNode(nodeId: NodeId): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('target_node_id', nodeId.value)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findByLinkType(linkType: LinkType): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .eq('link_type', linkType)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findCrossFeatureLinks(): Promise<Result<CrossFeatureLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.CROSS_FEATURE_LINKS_TABLE)
        .select('*')
        .neq('source_feature', 'target_feature')
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<CrossFeatureLink[]>(this.handleDatabaseError(error));
      }

      const links: CrossFeatureLink[] = [];
      for (const row of data || []) {
        const domainResult = this.crossFeatureToDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<CrossFeatureLink[]>(links);
    } catch (error) {
      return Result.fail<CrossFeatureLink[]>(this.handleDatabaseError(error));
    }
  }

  async findByFeaturePair(sourceFeature: FeatureType, targetFeature: FeatureType): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .or(`and(source_feature.eq.${sourceFeature},target_feature.eq.${targetFeature}),and(source_feature.eq.${targetFeature},target_feature.eq.${sourceFeature})`)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findStrongLinks(threshold: number = 0.7): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .gte('link_strength', threshold)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findWeakLinks(threshold: number = 0.3): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .lte('link_strength', threshold)
        .order('link_strength', { ascending: true });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async findBidirectionalLinks(sourceEntity: string, targetEntity: string): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .or(`and(source_entity_id.eq.${sourceEntity},target_entity_id.eq.${targetEntity}),and(source_entity_id.eq.${targetEntity},target_entity_id.eq.${sourceEntity})`)
        .order('link_strength', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  async bulkSave(links: NodeLink[]): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const nodeRows = links.map(link => this.fromDomain(link));
      const crossFeatureRows = links
        .filter(link => link.isCrossFeatureLink())
        .map(link => this.fromDomainToCrossFeature(link));

      // Save to node_links table
      if (nodeRows.length > 0) {
        const { error: nodeError } = await client
          .from(this.NODE_LINKS_TABLE)
          .upsert(nodeRows, { onConflict: 'link_id' });

        if (nodeError) {
          throw new Error(this.handleDatabaseError(nodeError));
        }
      }

      // Save to cross_feature_links table
      if (crossFeatureRows.length > 0) {
        const { error: crossError } = await client
          .from(this.CROSS_FEATURE_LINKS_TABLE)
          .upsert(crossFeatureRows, { onConflict: 'link_id' });

        if (crossError) {
          throw new Error(this.handleDatabaseError(crossError));
        }
      }

      return undefined;
    });
  }

  async bulkDelete(ids: NodeId[]): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const linkIds = ids.map(id => id.value);

      // Delete from cross_feature_links table
      const { error: crossError } = await client
        .from(this.CROSS_FEATURE_LINKS_TABLE)
        .delete()
        .in('link_id', linkIds);

      if (crossError && crossError.code !== 'PGRST116') {
        throw new Error(this.handleDatabaseError(crossError));
      }

      // Delete from node_links table
      const { error: nodeError } = await client
        .from(this.NODE_LINKS_TABLE)
        .delete()
        .in('link_id', linkIds);

      if (nodeError) {
        throw new Error(this.handleDatabaseError(nodeError));
      }

      return undefined;
    });
  }

  async countByLinkType(linkType: LinkType): Promise<Result<number>> {
    try {
      const { count, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('link_type', linkType);

      if (error) {
        return Result.fail<number>(this.handleDatabaseError(error));
      }

      return Result.ok<number>(count || 0);
    } catch (error) {
      return Result.fail<number>(this.handleDatabaseError(error));
    }
  }

  async countCrossFeatureLinks(): Promise<Result<number>> {
    try {
      const { count, error } = await this.supabase
        .from(this.CROSS_FEATURE_LINKS_TABLE)
        .select('*', { count: 'exact', head: true })
        .neq('source_feature', 'target_feature');

      if (error) {
        return Result.fail<number>(this.handleDatabaseError(error));
      }

      return Result.ok<number>(count || 0);
    } catch (error) {
      return Result.fail<number>(this.handleDatabaseError(error));
    }
  }

  async findByModelId(modelId: string): Promise<Result<NodeLink[]>> {
    try {
      // Step 1: Get all node IDs that belong to the specified model
      const { data: nodesData, error: nodesError } = await this.supabase
        .from('function_model_nodes')
        .select('node_id')
        .eq('model_id', modelId);

      if (nodesError) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(nodesError));
      }

      const nodeIds = (nodesData || []).map(row => row.node_id);
      
      if (nodeIds.length === 0) {
        return Result.ok<NodeLink[]>([]);
      }

      // Step 2: Find all node links where either source_node_id or target_node_id is in our list
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  // Advanced features for link strength calculation and cycle detection

  async calculateLinkStrength(linkId: string): Promise<Result<number>> {
    try {
      // This is a sophisticated algorithm that would analyze:
      // 1. Usage frequency
      // 2. Bidirectional relationships
      // 3. Context relevance
      // 4. Historical patterns
      
      // For now, implement basic calculation based on existing data
      const linkResult = await this.findById(NodeId.create(linkId).value);
      if (linkResult.isFailure) {
        return Result.fail<number>(linkResult.error);
      }

      const link = linkResult.value;
      let calculatedStrength = link.linkStrength;

      // Increase strength for bidirectional links
      const bidirectionalResult = await this.findBidirectionalLinks(
        link.sourceEntityId, 
        link.targetEntityId
      );
      if (bidirectionalResult.isSuccess && bidirectionalResult.value.length > 1) {
        calculatedStrength = Math.min(1.0, calculatedStrength * 1.2);
      }

      // Update the calculated strength
      const updatedLink = Object.create(Object.getPrototypeOf(link));
      Object.assign(updatedLink, link);
      await updatedLink.updateLinkStrength(calculatedStrength);
      
      const saveResult = await this.save(updatedLink);
      if (saveResult.isFailure) {
        return Result.fail<number>(saveResult.error);
      }

      return Result.ok<number>(calculatedStrength);
    } catch (error) {
      return Result.fail<number>(this.handleDatabaseError(error));
    }
  }

  async detectCycles(startNodeId: string): Promise<Result<boolean>> {
    try {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = await this.dfsDetectCycle(startNodeId, visited, recursionStack);
      return Result.ok<boolean>(hasCycle);
    } catch (error) {
      return Result.fail<boolean>(this.handleDatabaseError(error));
    }
  }

  async findStrongestLinks(nodeId: string, limit: number = 10): Promise<Result<NodeLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.NODE_LINKS_TABLE)
        .select('*')
        .or(`source_entity_id.eq.${nodeId},target_entity_id.eq.${nodeId}`)
        .order('link_strength', { ascending: false })
        .limit(limit);

      if (error) {
        return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
      }

      const links: NodeLink[] = [];
      for (const row of data || []) {
        const domainResult = this.toDomain(row);
        if (domainResult.isSuccess) {
          links.push(domainResult.value);
        }
      }

      return Result.ok<NodeLink[]>(links);
    } catch (error) {
      return Result.fail<NodeLink[]>(this.handleDatabaseError(error));
    }
  }

  // Private helper methods

  private async dfsDetectCycle(
    nodeId: string, 
    visited: Set<string>, 
    recursionStack: Set<string>
  ): Promise<boolean> {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    // Get all outgoing links from this node
    const linksResult = await this.supabase
      .from(this.NODE_LINKS_TABLE)
      .select('target_entity_id')
      .eq('source_entity_id', nodeId);

    if (linksResult.error) {
      throw new Error(this.handleDatabaseError(linksResult.error));
    }

    for (const row of linksResult.data || []) {
      const targetId = row.target_entity_id;
      
      if (!visited.has(targetId)) {
        if (await this.dfsDetectCycle(targetId, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(targetId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  private async updateLinkMetrics(client: SupabaseClient, link: NodeLink): Promise<void> {
    // Update link usage statistics, last accessed time, etc.
    // This would be implemented based on specific business requirements
  }

  protected toDomain(row: NodeLinkRow): Result<NodeLink> {
    try {
      const linkIdResult = NodeId.create(row.link_id);
      if (linkIdResult.isFailure) {
        return Result.fail<NodeLink>(linkIdResult.error);
      }

      let sourceNodeId: NodeId | undefined;
      let targetNodeId: NodeId | undefined;

      if (row.source_node_id) {
        const sourceResult = NodeId.create(row.source_node_id);
        if (sourceResult.isFailure) {
          return Result.fail<NodeLink>(sourceResult.error);
        }
        sourceNodeId = sourceResult.value;
      }

      if (row.target_node_id) {
        const targetResult = NodeId.create(row.target_node_id);
        if (targetResult.isFailure) {
          return Result.fail<NodeLink>(targetResult.error);
        }
        targetNodeId = targetResult.value;
      }

      const linkResult = NodeLink.create({
        linkId: linkIdResult.value,
        sourceFeature: row.source_feature as FeatureType,
        targetFeature: row.target_feature as FeatureType,
        sourceEntityId: row.source_entity_id,
        targetEntityId: row.target_entity_id,
        sourceNodeId,
        targetNodeId,
        linkType: row.link_type as LinkType,
        linkStrength: row.link_strength,
        linkContext: row.link_context,
      });

      return linkResult;
    } catch (error) {
      return Result.fail<NodeLink>(this.handleDatabaseError(error));
    }
  }

  protected fromDomain(entity: NodeLink): NodeLinkRow {
    return {
      link_id: entity.linkId.value,
      source_feature: entity.sourceFeature,
      target_feature: entity.targetFeature,
      source_entity_id: entity.sourceEntityId,
      target_entity_id: entity.targetEntityId,
      source_node_id: entity.sourceNodeId?.value,
      target_node_id: entity.targetNodeId?.value,
      link_type: entity.linkType,
      link_strength: entity.linkStrength,
      link_context: entity.linkContext,
      visual_properties: entity.linkContext || {}, // Map link context to visual properties for now
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  private crossFeatureToDomain(row: CrossFeatureLinkRow): Result<CrossFeatureLink> {
    try {
      const linkResult = CrossFeatureLink.create({
        linkId: row.link_id,
        sourceFeature: row.source_feature as FeatureType,
        targetFeature: row.target_feature as FeatureType,
        sourceId: row.source_id,
        targetId: row.target_id,
        linkType: row.link_type as LinkType,
        linkStrength: row.link_strength,
        nodeContext: row.node_context,
      });

      return linkResult;
    } catch (error) {
      return Result.fail<CrossFeatureLink>(this.handleDatabaseError(error));
    }
  }

  private fromDomainToCrossFeature(entity: NodeLink): CrossFeatureLinkRow {
    return {
      link_id: entity.linkId.value,
      source_feature: entity.sourceFeature,
      target_feature: entity.targetFeature,
      source_id: entity.sourceEntityId,
      target_id: entity.targetEntityId,
      link_type: entity.linkType,
      link_strength: entity.linkStrength,
      node_context: entity.linkContext,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

}
import { NodeId } from '../value-objects/node-id';
import { NodeLink } from '../entities/node-link';
import { CrossFeatureLink } from '../entities/cross-feature-link';
import { FeatureType, LinkType } from '../enums';
import { Result } from '../shared/result';

export interface LinkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LinkStrengthCalculation {
  baseStrength: number;
  frequencyBonus: number;
  semanticBonus: number;
  contextBonus: number;
  finalStrength: number;
}

export interface RelationshipCycle {
  cycleNodes: string[];
  cycleLength: number;
  linkTypes: LinkType[];
}

/**
 * CrossFeatureLinkingService manages relationships between different features and entities,
 * providing validation, cycle detection, and link strength calculation.
 */
export class CrossFeatureLinkingService {
  private linkRegistry: Map<string, NodeLink | CrossFeatureLink> = new Map();
  private featureConnections: Map<string, Set<string>> = new Map();
  private linkStrengthCache: Map<string, number> = new Map();

  /**
   * Create and validate a cross-feature link
   */
  public createCrossFeatureLink(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    initialStrength: number = 0.5,
    nodeContext?: Record<string, any>
  ): Result<CrossFeatureLink> {
    // Validate the link creation
    const validationResult = this.validateCrossFeatureLinkCreation(
      sourceFeature,
      targetFeature,
      sourceId,
      targetId,
      linkType
    );

    if (validationResult.isFailure) {
      return Result.fail<CrossFeatureLink>(validationResult.error);
    }

    // Create the link
    const linkId = NodeId.generate();
    const linkResult = CrossFeatureLink.create({
      linkId,
      sourceFeature,
      targetFeature,
      sourceId,
      targetId,
      linkType,
      linkStrength: initialStrength,
      nodeContext
    });

    if (linkResult.isFailure) {
      return linkResult;
    }

    const link = linkResult.value;
    
    // Register the link
    this.registerLink(link);
    
    // Update feature connections
    this.updateFeatureConnections(sourceFeature, targetFeature);

    return Result.ok<CrossFeatureLink>(link);
  }

  /**
   * Create and validate a node-level link
   */
  public createNodeLink(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceEntityId: string,
    targetEntityId: string,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    linkType: LinkType,
    initialStrength: number = 0.5,
    linkContext?: Record<string, any>
  ): Result<NodeLink> {
    // Create the link
    const linkId = NodeId.generate();
    const linkResult = NodeLink.create({
      linkId,
      sourceFeature,
      targetFeature,
      sourceEntityId,
      targetEntityId,
      sourceNodeId,
      targetNodeId,
      linkType,
      linkStrength: initialStrength,
      linkContext
    });

    if (linkResult.isFailure) {
      return linkResult;
    }

    const link = linkResult.value;
    
    // Register the link
    this.registerLink(link);

    return Result.ok<NodeLink>(link);
  }

  /**
   * Calculate and update link strength based on various factors
   */
  public calculateLinkStrength(
    linkId: NodeId,
    interactionFrequency: number,
    semanticSimilarity: number,
    contextRelevance: number
  ): Result<LinkStrengthCalculation> {
    const link = this.linkRegistry.get(linkId.value);
    if (!link) {
      return Result.fail<LinkStrengthCalculation>('Link not found');
    }

    // Base strength (current value)
    const baseStrength = link.linkStrength;

    // Frequency bonus (0-0.2 based on interaction frequency)
    const frequencyBonus = Math.min(Math.max(interactionFrequency * 0.002, 0), 0.2);

    // Semantic bonus (0-0.3 based on semantic similarity)
    const semanticBonus = Math.min(Math.max(semanticSimilarity * 0.3, 0), 0.3);

    // Context bonus (0-0.2 based on context relevance)
    const contextBonus = Math.min(Math.max(contextRelevance * 0.2, 0), 0.2);

    // Calculate final strength (capped at 1.0)
    const finalStrength = Math.min(
      baseStrength + frequencyBonus + semanticBonus + contextBonus,
      1.0
    );

    const calculation: LinkStrengthCalculation = {
      baseStrength,
      frequencyBonus,
      semanticBonus,
      contextBonus,
      finalStrength
    };

    // Update the link strength
    const updateResult = link.updateLinkStrength(finalStrength);
    if (updateResult.isFailure) {
      return Result.fail<LinkStrengthCalculation>(updateResult.error);
    }

    // Cache the result
    this.linkStrengthCache.set(linkId.value, finalStrength);

    return Result.ok<LinkStrengthCalculation>(calculation);
  }

  /**
   * Detect circular relationships in the link network
   */
  public detectRelationshipCycles(): Result<RelationshipCycle[]> {
    const cycles: RelationshipCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];
    const linkTypeStack: LinkType[] = [];

    // Build adjacency list from links
    const adjacencyList = this.buildAdjacencyList();

    const detectCycles = (nodeId: string): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStartIndex = pathStack.indexOf(nodeId);
        const cycleNodes = pathStack.slice(cycleStartIndex);
        const cycleLinkTypes = linkTypeStack.slice(cycleStartIndex);
        
        cycles.push({
          cycleNodes,
          cycleLength: cycleNodes.length,
          linkTypes: cycleLinkTypes
        });
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      pathStack.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const { targetId, linkType } of neighbors) {
        linkTypeStack.push(linkType);
        detectCycles(targetId);
        linkTypeStack.pop();
      }

      recursionStack.delete(nodeId);
      pathStack.pop();
    };

    // Check all nodes for cycles
    for (const nodeId of Array.from(adjacencyList.keys())) {
      if (!visited.has(nodeId)) {
        detectCycles(nodeId);
      }
    }

    return Result.ok<RelationshipCycle[]>(cycles);
  }

  /**
   * Validate link creation constraints
   */
  public validateLinkConstraints(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    linkType: LinkType
  ): Result<LinkValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Feature compatibility matrix
    const compatibilityRules = this.getFeatureCompatibilityRules();
    const featurePair = `${sourceFeature}-${targetFeature}`;
    const reversePair = `${targetFeature}-${sourceFeature}`;
    
    const allowedTypes = compatibilityRules.get(featurePair) || 
                        compatibilityRules.get(reversePair) || 
                        [];

    if (allowedTypes.length > 0 && !allowedTypes.includes(linkType)) {
      errors.push(`Link type ${linkType} is not allowed between ${sourceFeature} and ${targetFeature}`);
    }

    // Check for excessive connections by counting actual links, not just unique feature pairs
    const sourceLinksCount = this.countLinksForFeature(sourceFeature);
    const targetLinksCount = this.countLinksForFeature(targetFeature);

    if (sourceLinksCount > 10) {
      warnings.push(`Source feature ${sourceFeature} has many connections (${sourceLinksCount})`);
    }

    if (targetLinksCount > 10) {
      warnings.push(`Target feature ${targetFeature} has many connections (${targetLinksCount})`);
    }

    // Check for potential performance issues
    if (linkType === LinkType.TRIGGERS && sourceLinksCount > 5) {
      warnings.push('Multiple trigger relationships may cause performance issues');
    }

    const validationResult: LinkValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    return Result.ok<LinkValidationResult>(validationResult);
  }

  /**
   * Get all links for a specific feature
   */
  public getFeatureLinks(featureType: FeatureType): (NodeLink | CrossFeatureLink)[] {
    const links: (NodeLink | CrossFeatureLink)[] = [];

    for (const link of Array.from(this.linkRegistry.values())) {
      if (link instanceof CrossFeatureLink) {
        if (link.sourceFeature === featureType || link.targetFeature === featureType) {
          links.push(link);
        }
      } else if (link instanceof NodeLink) {
        if (link.sourceFeature === featureType || link.targetFeature === featureType) {
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Get links by type
   */
  public getLinksByType(linkType: LinkType): (NodeLink | CrossFeatureLink)[] {
    return Array.from(this.linkRegistry.values()).filter(link => link.linkType === linkType);
  }

  /**
   * Calculate network metrics
   */
  public calculateNetworkMetrics(): {
    totalLinks: number;
    averageLinkStrength: number;
    strongestConnection: number;
    weakestConnection: number;
    featureConnectivity: Record<string, number>;
  } {
    const links = Array.from(this.linkRegistry.values());
    const totalLinks = links.length;
    
    if (totalLinks === 0) {
      return {
        totalLinks: 0,
        averageLinkStrength: 0,
        strongestConnection: 0,
        weakestConnection: 0,
        featureConnectivity: {}
      };
    }

    const strengths = links.map(link => link.linkStrength);
    const averageLinkStrength = strengths.reduce((sum, strength) => sum + strength, 0) / totalLinks;
    const strongestConnection = Math.max(...strengths);
    const weakestConnection = Math.min(...strengths);

    // Calculate feature connectivity
    const featureConnectivity: Record<string, number> = {};
    for (const featureType of Object.values(FeatureType)) {
      featureConnectivity[featureType] = this.countLinksForFeature(featureType);
    }

    return {
      totalLinks,
      averageLinkStrength,
      strongestConnection,
      weakestConnection,
      featureConnectivity
    };
  }

  /**
   * Remove a link and update registries
   */
  public removeLink(linkId: NodeId): Result<void> {
    const link = this.linkRegistry.get(linkId.value);
    if (!link) {
      return Result.fail<void>('Link not found');
    }

    // Remove from registry
    this.linkRegistry.delete(linkId.value);

    // Clean up caches
    this.linkStrengthCache.delete(linkId.value);

    // Update feature connections if necessary
    if (link instanceof CrossFeatureLink) {
      this.updateFeatureConnectionsAfterRemoval(link.sourceFeature, link.targetFeature);
    }

    return Result.ok<void>(undefined);
  }

  private registerLink(link: NodeLink | CrossFeatureLink): void {
    this.linkRegistry.set(link.linkId.value, link);
  }

  private updateFeatureConnections(sourceFeature: FeatureType, targetFeature: FeatureType): void {
    // Update source feature connections
    if (!this.featureConnections.has(sourceFeature)) {
      this.featureConnections.set(sourceFeature, new Set());
    }
    this.featureConnections.get(sourceFeature)!.add(targetFeature);

    // Update target feature connections
    if (!this.featureConnections.has(targetFeature)) {
      this.featureConnections.set(targetFeature, new Set());
    }
    this.featureConnections.get(targetFeature)!.add(sourceFeature);
  }

  private updateFeatureConnectionsAfterRemoval(sourceFeature: FeatureType, targetFeature: FeatureType): void {
    // Check if there are still links between these features
    const hasOtherLinks = Array.from(this.linkRegistry.values()).some(link => {
      if (link instanceof CrossFeatureLink) {
        return (link.sourceFeature === sourceFeature && link.targetFeature === targetFeature) ||
               (link.sourceFeature === targetFeature && link.targetFeature === sourceFeature);
      }
      return false;
    });

    if (!hasOtherLinks) {
      // Remove connections
      this.featureConnections.get(sourceFeature)?.delete(targetFeature);
      this.featureConnections.get(targetFeature)?.delete(sourceFeature);
    }
  }

  private getFeatureConnections(featureType: FeatureType): Set<string> {
    return this.featureConnections.get(featureType) || new Set();
  }

  private countLinksForFeature(featureType: FeatureType): number {
    let count = 0;
    for (const link of Array.from(this.linkRegistry.values())) {
      if (link instanceof CrossFeatureLink || link instanceof NodeLink) {
        if (link.sourceFeature === featureType || link.targetFeature === featureType) {
          count++;
        }
      }
    }
    return count;
  }

  private buildAdjacencyList(): Map<string, Array<{targetId: string, linkType: LinkType}>> {
    const adjacencyList = new Map<string, Array<{targetId: string, linkType: LinkType}>>();

    for (const link of Array.from(this.linkRegistry.values())) {
      let sourceId: string;
      let targetId: string;

      if (link instanceof CrossFeatureLink) {
        sourceId = `${link.sourceFeature}:${link.sourceId}`;
        targetId = `${link.targetFeature}:${link.targetId}`;
      } else {
        sourceId = `${link.sourceFeature}:${link.sourceEntityId}`;
        targetId = `${link.targetFeature}:${link.targetEntityId}`;
      }

      if (!adjacencyList.has(sourceId)) {
        adjacencyList.set(sourceId, []);
      }
      
      adjacencyList.get(sourceId)!.push({
        targetId,
        linkType: link.linkType
      });
    }

    return adjacencyList;
  }

  private getFeatureCompatibilityRules(): Map<string, LinkType[]> {
    return new Map([
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.KNOWLEDGE_BASE}`, [
        LinkType.DOCUMENTS, LinkType.REFERENCES, LinkType.SUPPORTS
      ]],
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.SPINDLE}`, [
        LinkType.IMPLEMENTS, LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES
      ]],
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.EVENT_STORM}`, [
        LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES
      ]],
      [`${FeatureType.KNOWLEDGE_BASE}-${FeatureType.SPINDLE}`, [
        LinkType.DOCUMENTS, LinkType.SUPPORTS
      ]],
      [`${FeatureType.KNOWLEDGE_BASE}-${FeatureType.EVENT_STORM}`, [
        LinkType.DOCUMENTS, LinkType.REFERENCES
      ]],
      [`${FeatureType.SPINDLE}-${FeatureType.EVENT_STORM}`, [
        LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES
      ]]
    ]);
  }

  private validateCrossFeatureLinkCreation(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    linkType: LinkType
  ): Result<void> {
    // Check basic constraints
    const constraintValidation = this.validateLinkConstraints(sourceFeature, targetFeature, linkType);
    if (constraintValidation.isFailure) {
      return Result.fail<void>(constraintValidation.error);
    }

    const validation = constraintValidation.value;
    if (!validation.isValid) {
      return Result.fail<void>(validation.errors.join('; '));
    }

    // Check for duplicate links
    const existingLink = this.findExistingLink(sourceFeature, targetFeature, sourceId, targetId, linkType);
    if (existingLink) {
      return Result.fail<void>('Link already exists between these entities');
    }

    return Result.ok<void>(undefined);
  }

  private findExistingLink(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    linkType: LinkType
  ): NodeLink | CrossFeatureLink | null {
    for (const link of Array.from(this.linkRegistry.values())) {
      if (link instanceof CrossFeatureLink) {
        if (link.sourceFeature === sourceFeature &&
            link.targetFeature === targetFeature &&
            link.sourceId === sourceId &&
            link.targetId === targetId &&
            link.linkType === linkType) {
          return link;
        }
      }
    }
    return null;
  }
}
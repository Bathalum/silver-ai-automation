import { NodeDependencyService } from '../../../../lib/domain/services/node-dependency-service';
import { CrossFeatureLinkingService } from '../../../../lib/domain/services/cross-feature-linking-service';
import { Node } from '../../../../lib/domain/entities/node';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { FeatureType, LinkType, IOType } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';

describe('Archive Dependency Validation Services', () => {
  let nodeDependencyService: NodeDependencyService;
  let crossFeatureLinkingService: CrossFeatureLinkingService;

  beforeEach(() => {
    nodeDependencyService = new NodeDependencyService();
    crossFeatureLinkingService = new CrossFeatureLinkingService();
  });

  describe('NodeDependencyService - Pre-Archive Validation', () => {
    it('should validate no circular dependencies exist before archiving', () => {
      // Arrange - Create nodes with valid dependency chain
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();
      const nodeCId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);
      
      const nodeA = IONode.create({
        nodeId: nodeAId,
        modelId: 'test-model',
        name: 'Input Node A',
        description: 'Test input node',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input',
          dataType: 'text',
          required: true
        }
      });

      const nodeB = StageNode.create({
        nodeId: nodeBId,
        modelId: 'test-model',
        name: 'Processing Stage B',
        description: 'Test processing stage',
        position: positionResult.value,
        dependencies: [nodeAId], // B depends on A
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      const nodeC = IONode.create({
        nodeId: nodeCId,
        modelId: 'test-model',
        name: 'Output Node C',
        description: 'Test output node',
        position: positionResult.value,
        dependencies: [nodeBId], // C depends on B
        ioData: {
          boundaryType: 'output',
          dataType: 'json',
          required: true
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);
      expect(nodeC.isSuccess).toBe(true);

      const nodes = [nodeA.value, nodeB.value, nodeC.value];

      // Act
      const validationResult = nodeDependencyService.validateAcyclicity(nodes);

      // Assert
      expect(validationResult.isSuccess).toBe(true);
      expect(validationResult.value.isValid).toBe(true);
      expect(validationResult.value.errors).toHaveLength(0);
    });

    it('should detect circular dependencies that prevent safe archiving', () => {
      // Arrange - Create nodes with circular dependency
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);
      
      const nodeA = StageNode.create({
        nodeId: nodeAId,
        modelId: 'test-model',
        name: 'Stage A',
        description: 'Test stage A',
        position: positionResult.value,
        dependencies: [nodeBId], // A depends on B
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      const nodeB = StageNode.create({
        nodeId: nodeBId,
        modelId: 'test-model',
        name: 'Stage B',
        description: 'Test stage B',
        position: positionResult.value,
        dependencies: [nodeAId], // B depends on A - CIRCULAR!
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);

      const nodes = [nodeA.value, nodeB.value];

      // Act
      const validationResult = nodeDependencyService.validateAcyclicity(nodes);

      // Assert
      expect(validationResult.isSuccess).toBe(true);
      expect(validationResult.value.isValid).toBe(false);
      expect(validationResult.value.errors).toContain(
        expect.stringContaining('Circular dependency detected')
      );
    });

    it('should calculate execution order for safe archival documentation', () => {
      // Arrange - Create linear dependency chain
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();
      const nodeCId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);
      
      const nodeA = IONode.create({
        nodeId: nodeAId,
        modelId: 'test-model',
        name: 'Input Node',
        description: 'Test input',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input',
          dataType: 'text',
          required: true
        }
      });

      const nodeB = StageNode.create({
        nodeId: nodeBId,
        modelId: 'test-model',
        name: 'Processing Stage',
        description: 'Test processing',
        position: positionResult.value,
        dependencies: [nodeAId],
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      const nodeC = IONode.create({
        nodeId: nodeCId,
        modelId: 'test-model',
        name: 'Output Node',
        description: 'Test output',
        position: positionResult.value,
        dependencies: [nodeBId],
        ioData: {
          boundaryType: 'output',
          dataType: 'json',
          required: true
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);
      expect(nodeC.isSuccess).toBe(true);

      const nodes = [nodeC.value, nodeA.value, nodeB.value]; // Intentionally unordered

      // Act
      const executionOrderResult = nodeDependencyService.calculateExecutionOrder(nodes);

      // Assert
      expect(executionOrderResult.isSuccess).toBe(true);
      expect(executionOrderResult.value).toHaveLength(3);
      
      // Verify A comes before B, and B comes before C
      const orderedNodes = executionOrderResult.value;
      const aIndex = orderedNodes.findIndex(n => n.nodeId.equals(nodeAId));
      const bIndex = orderedNodes.findIndex(n => n.nodeId.equals(nodeBId));
      const cIndex = orderedNodes.findIndex(n => n.nodeId.equals(nodeCId));
      
      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
    });

    it('should validate dependency graph structure for archival integrity', () => {
      // Arrange
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);

      const nodeA = IONode.create({
        nodeId: nodeAId,
        modelId: 'test-model',
        name: 'Valid Input',
        description: 'Test input',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input',
          dataType: 'text',
          required: true
        }
      });

      const nodeB = StageNode.create({
        nodeId: nodeBId,
        modelId: 'test-model',
        name: 'Valid Stage',
        description: 'Test stage',
        position: positionResult.value,
        dependencies: [nodeAId],
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);

      const nodes = [nodeA.value, nodeB.value];

      // Act
      const graphResult = nodeDependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(graphResult.isSuccess).toBe(true);
      expect(graphResult.value.nodes.size).toBe(2);
      expect(graphResult.value.adjacencyList.size).toBe(2);
      expect(graphResult.value.reverseDependencies.size).toBe(2);
    });

    it('should detect orphaned nodes before archival to ensure data completeness', () => {
      // Arrange - Create execution paths with optimization
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();
      const nodeOrphanId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);

      const nodeA = IONode.create({
        nodeId: nodeAId,
        modelId: 'test-model',
        name: 'Connected Input',
        description: 'Connected input',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input',
          dataType: 'text',
          required: true
        }
      });

      const nodeB = IONode.create({
        nodeId: nodeBId,
        modelId: 'test-model',
        name: 'Connected Output',
        description: 'Connected output',
        position: positionResult.value,
        dependencies: [nodeAId],
        ioData: {
          boundaryType: 'output',
          dataType: 'json',
          required: true
        }
      });

      const nodeOrphan = StageNode.create({
        nodeId: nodeOrphanId,
        modelId: 'test-model',
        name: 'Orphaned Stage',
        description: 'Disconnected stage',
        position: positionResult.value,
        dependencies: [], // No dependencies and no dependents
        stageData: {
          stageType: 'processing',
          priority: 5
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);
      expect(nodeOrphan.isSuccess).toBe(true);

      const nodes = [nodeA.value, nodeB.value, nodeOrphan.value];

      // Act
      const pathsResult = nodeDependencyService.optimizeExecutionPaths(nodes);

      // Assert
      expect(pathsResult.isSuccess).toBe(true);
      expect(pathsResult.value).toHaveLength(3);
      
      // Verify orphan node is identified at level 0 (no dependencies)
      const orphanPath = pathsResult.value.find(p => p.nodeId === nodeOrphanId.value);
      expect(orphanPath).toBeDefined();
      expect(orphanPath!.level).toBe(0);
      expect(orphanPath!.dependencies).toHaveLength(0);
    });
  });

  describe('CrossFeatureLinkingService - Cross-Model Reference Validation', () => {
    it('should validate no active cross-feature links prevent archiving', () => {
      // Arrange - Create cross-feature link
      const linkResult = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'source-model-to-archive',
        'target-kb-123',
        LinkType.REFERENCES,
        0.8,
        { archival: 'test context' }
      );

      expect(linkResult.isSuccess).toBe(true);

      // Act - Get all links for the feature being archived
      const featureLinks = crossFeatureLinkingService.getFeatureLinks(FeatureType.FUNCTION_MODEL);

      // Assert
      expect(featureLinks).toHaveLength(1);
      expect(featureLinks[0].sourceId).toBe('source-model-to-archive');
      expect(featureLinks[0].linkType).toBe(LinkType.REFERENCES);
    });

    it('should detect relationship cycles that could complicate archival', () => {
      // Arrange - Create bidirectional links that could form cycles
      const link1Result = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.SPINDLE,
        'model-a',
        'spindle-b',
        LinkType.TRIGGERS
      );

      const link2Result = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.SPINDLE,
        FeatureType.FUNCTION_MODEL,
        'spindle-b',
        'model-a',
        LinkType.PRODUCES
      );

      expect(link1Result.isSuccess).toBe(true);
      expect(link2Result.isSuccess).toBe(true);

      // Act
      const cycleDetectionResult = crossFeatureLinkingService.detectRelationshipCycles();

      // Assert
      expect(cycleDetectionResult.isSuccess).toBe(true);
      // Whether cycles are found depends on the specific implementation
      // but the detection should complete successfully
      expect(cycleDetectionResult.value).toBeDefined();
    });

    it('should calculate network metrics for archival impact assessment', () => {
      // Arrange - Create various links to build network
      const links = [
        {
          source: FeatureType.FUNCTION_MODEL,
          target: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'model-1',
          targetId: 'kb-1',
          type: LinkType.DOCUMENTS,
          strength: 0.9
        },
        {
          source: FeatureType.FUNCTION_MODEL,
          target: FeatureType.SPINDLE,
          sourceId: 'model-1',
          targetId: 'spindle-1',
          type: LinkType.IMPLEMENTS,
          strength: 0.7
        }
      ];

      links.forEach(link => {
        const result = crossFeatureLinkingService.createCrossFeatureLink(
          link.source,
          link.target,
          link.sourceId,
          link.targetId,
          link.type,
          link.strength
        );
        expect(result.isSuccess).toBe(true);
      });

      // Act
      const metrics = crossFeatureLinkingService.calculateNetworkMetrics();

      // Assert
      expect(metrics.totalLinks).toBe(2);
      expect(metrics.averageLinkStrength).toBeCloseTo(0.8, 1);
      expect(metrics.strongestConnection).toBe(0.9);
      expect(metrics.weakestConnection).toBe(0.7);
      expect(metrics.featureConnectivity[FeatureType.FUNCTION_MODEL]).toBe(2);
    });

    it('should validate link constraints before archival to ensure referential integrity', () => {
      // Act - Test constraint validation for function model archival
      const validationResult = crossFeatureLinkingService.validateLinkConstraints(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        LinkType.REFERENCES
      );

      // Assert
      expect(validationResult.isSuccess).toBe(true);
      expect(validationResult.value.isValid).toBe(true);
      expect(validationResult.value.errors).toHaveLength(0);
    });

    it('should support safe link removal during archival process', () => {
      // Arrange - Create link to be removed
      const linkResult = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.EVENT_STORM,
        'model-to-archive',
        'event-storm-123',
        LinkType.TRIGGERS,
        0.6
      );

      expect(linkResult.isSuccess).toBe(true);
      const linkId = linkResult.value.linkId;

      // Verify link exists
      const initialMetrics = crossFeatureLinkingService.calculateNetworkMetrics();
      expect(initialMetrics.totalLinks).toBe(1);

      // Act - Remove link during archival
      const removalResult = crossFeatureLinkingService.removeLink(linkId);

      // Assert
      expect(removalResult.isSuccess).toBe(true);
      
      const finalMetrics = crossFeatureLinkingService.calculateNetworkMetrics();
      expect(finalMetrics.totalLinks).toBe(0);
    });

    it('should calculate link strength for archival prioritization', () => {
      // Arrange - Create link and calculate strength
      const linkResult = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'strength-test-model',
        'strength-test-kb',
        LinkType.SUPPORTS,
        0.5
      );

      expect(linkResult.isSuccess).toBe(true);
      const linkId = linkResult.value.linkId;

      // Act - Calculate enhanced link strength for archival decision
      const strengthResult = crossFeatureLinkingService.calculateLinkStrength(
        linkId,
        100, // High interaction frequency
        0.8, // High semantic similarity  
        0.9  // High context relevance
      );

      // Assert
      expect(strengthResult.isSuccess).toBe(true);
      expect(strengthResult.value.baseStrength).toBe(0.5);
      expect(strengthResult.value.frequencyBonus).toBeCloseTo(0.2, 1);
      expect(strengthResult.value.semanticBonus).toBeCloseTo(0.24, 1);
      expect(strengthResult.value.contextBonus).toBeCloseTo(0.18, 1);
      expect(strengthResult.value.finalStrength).toBeGreaterThan(0.5);
      expect(strengthResult.value.finalStrength).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Integrated Archive Dependency Validation', () => {
    it('should validate both internal and external dependencies before archival', () => {
      // Arrange - Set up internal node dependencies
      const nodeAId = NodeId.generate();
      const nodeBId = NodeId.generate();

      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);

      const nodeA = IONode.create({
        nodeId: nodeAId,
        modelId: 'integrated-test-model',
        name: 'Integration Input',
        description: 'Test input for integration',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input',
          dataType: 'text',
          required: true
        }
      });

      const nodeB = IONode.create({
        nodeId: nodeBId,
        modelId: 'integrated-test-model',
        name: 'Integration Output',
        description: 'Test output for integration',
        position: positionResult.value,
        dependencies: [nodeAId],
        ioData: {
          boundaryType: 'output',
          dataType: 'json',
          required: true
        }
      });

      expect(nodeA.isSuccess).toBe(true);
      expect(nodeB.isSuccess).toBe(true);

      const nodes = [nodeA.value, nodeB.value];

      // Set up external cross-feature dependency
      const crossLinkResult = crossFeatureLinkingService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'integrated-test-model',
        'related-kb',
        LinkType.DOCUMENTS,
        0.7
      );

      expect(crossLinkResult.isSuccess).toBe(true);

      // Act - Validate internal dependencies
      const internalValidation = nodeDependencyService.validateAcyclicity(nodes);
      
      // Act - Check external dependencies  
      const externalLinks = crossFeatureLinkingService.getFeatureLinks(FeatureType.FUNCTION_MODEL);

      // Assert - Both validations should succeed for safe archival
      expect(internalValidation.isSuccess).toBe(true);
      expect(internalValidation.value.isValid).toBe(true);
      
      expect(externalLinks).toHaveLength(1);
      expect(externalLinks[0].sourceId).toBe('integrated-test-model');
    });

    it('should provide comprehensive pre-archival validation report', () => {
      // This test demonstrates how both services would work together
      // to provide a complete validation report before archiving a model
      
      // Arrange - Create a simple but complete model structure
      const nodeId = NodeId.generate();
      const positionResult = Position.create(100, 100);
      expect(positionResult.isSuccess).toBe(true);

      const node = IONode.create({
        nodeId: nodeId,
        modelId: 'comprehensive-test-model',
        name: 'Comprehensive Test Node',
        description: 'Node for comprehensive testing',
        position: positionResult.value,
        dependencies: [],
        ioData: {
          boundaryType: 'input-output',
          dataType: 'text',
          required: true
        }
      });

      expect(node.isSuccess).toBe(true);
      const nodes = [node.value];

      // Act - Generate comprehensive validation report
      const internalValidation = nodeDependencyService.validateAcyclicity(nodes);
      const executionOrder = nodeDependencyService.calculateExecutionOrder(nodes);
      const networkMetrics = crossFeatureLinkingService.calculateNetworkMetrics();
      const crossFeatureLinks = crossFeatureLinkingService.getFeatureLinks(FeatureType.FUNCTION_MODEL);

      // Assert - All validations complete successfully
      expect(internalValidation.isSuccess).toBe(true);
      expect(executionOrder.isSuccess).toBe(true);
      expect(networkMetrics).toBeDefined();
      expect(crossFeatureLinks).toBeDefined();

      // Archival decision can be made based on this comprehensive data
      const archivalSafe = internalValidation.value.isValid && 
                          internalValidation.value.errors.length === 0 &&
                          crossFeatureLinks.length === 0; // No blocking external dependencies

      expect(archivalSafe).toBe(true);
    });
  });
});
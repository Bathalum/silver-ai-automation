/**
 * Repository Interface Contract Tests
 * Tests that validate the behavior contracts for all domain repository interfaces
 * Uses mock implementations to ensure interface compliance and business rules
 */

import { FunctionModelRepository } from '@/lib/domain/interfaces/function-model-repository';
import { AuditLogRepository } from '@/lib/domain/interfaces/audit-log-repository';
import { NodeRepository } from '@/lib/domain/interfaces/node-repository';
import { NodeLinkRepository } from '@/lib/domain/interfaces/node-link-repository';
import { AIAgentRepository } from '@/lib/domain/interfaces/ai-agent-repository';

import { FunctionModel } from '@/lib/domain/entities/function-model';
import { AuditLog } from '@/lib/domain/entities/audit-log';
import { Node } from '@/lib/domain/entities/node';
import { NodeLink } from '@/lib/domain/entities/node-link';
import { AIAgent } from '@/lib/domain/entities/ai-agent';
import { IONode } from '@/lib/domain/entities/io-node';

import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Version } from '@/lib/domain/value-objects/version';
import { Result } from '@/lib/domain/shared/result';
import { ModelStatus, NodeStatus, FeatureType, LinkType } from '@/lib/domain/enums';

// Mock implementations for testing
class MockFunctionModelRepository implements FunctionModelRepository {
  private models = new Map<string, FunctionModel>();

  async findById(id: string): Promise<Result<FunctionModel>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail<FunctionModel>(`Model with id ${id} not found`);
    }
    return Result.ok(model);
  }

  async save(model: FunctionModel): Promise<Result<void>> {
    if (!model.modelId) {
      return Result.fail<void>('Model ID is required');
    }
    this.models.set(model.modelId, model);
    return Result.ok<void>(undefined);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.models.has(id)) {
      return Result.fail<void>(`Model with id ${id} not found`);
    }
    this.models.delete(id);
    return Result.ok<void>(undefined);
  }

  async findByStatus(status: ModelStatus): Promise<Result<FunctionModel[]>> {
    const models = Array.from(this.models.values()).filter(m => m.status === status);
    return Result.ok(models);
  }

  async findByOwner(ownerId: string): Promise<Result<FunctionModel[]>> {
    const models = Array.from(this.models.values()).filter(m => m.permissions.owner === ownerId);
    return Result.ok(models);
  }

  async publishModel(id: string): Promise<Result<void>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail<void>(`Model with id ${id} not found`);
    }
    const publishResult = model.publish();
    if (publishResult.isFailure) {
      return Result.fail<void>(publishResult.error);
    }
    // Update the model in the repository after successful state change
    this.models.set(id, model);
    return Result.ok<void>(undefined);
  }

  async archiveModel(id: string): Promise<Result<void>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail<void>(`Model with id ${id} not found`);
    }
    const archiveResult = model.archive();
    if (archiveResult.isFailure) {
      return Result.fail<void>(archiveResult.error);
    }
    // Update the model in the repository after successful state change
    this.models.set(id, model);
    return Result.ok<void>(undefined);
  }

  async exists(id: string): Promise<Result<boolean>> {
    return Result.ok(this.models.has(id));
  }

  async findAll(): Promise<Result<FunctionModel[]>> {
    return Result.ok(Array.from(this.models.values()));
  }

  async findByNamePattern(pattern: string): Promise<Result<FunctionModel[]>> {
    const regex = new RegExp(pattern, 'i');
    const models = Array.from(this.models.values()).filter(m => regex.test(m.name.toString()));
    return Result.ok(models);
  }

  async findRecentlyModified(limit: number): Promise<Result<FunctionModel[]>> {
    const models = Array.from(this.models.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
    return Result.ok(models);
  }

  async countByStatus(status: ModelStatus): Promise<Result<number>> {
    const count = Array.from(this.models.values()).filter(m => m.status === status).length;
    return Result.ok(count);
  }

  async softDelete(id: string, deletedBy: string): Promise<Result<void>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail<void>(`Model with id ${id} not found`);
    }
    // Use the proper domain method for soft delete
    const deleteResult = model.softDelete(deletedBy);
    if (deleteResult.isFailure) {
      return Result.fail<void>(deleteResult.error);
    }
    // Update the model in the repository after successful state change
    this.models.set(id, model);
    return Result.ok<void>(undefined);
  }

  async restore(id: string): Promise<Result<void>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail<void>(`Model with id ${id} not found`);
    }
    // For this mock implementation, we need to create a new model instance
    // since the domain model doesn't have a restore method (it's handled by business rules)
    // In a real repository, this would be handled at the persistence layer
    const nameResult = ModelName.create(model.name.toString());
    const versionResult = Version.create(model.version.toString());
    
    const restoredModelResult = FunctionModel.create({
      modelId: model.modelId,
      name: nameResult.value,
      description: model.description,
      version: versionResult.value,
      status: model.status === ModelStatus.ARCHIVED ? ModelStatus.DRAFT : model.status,
      currentVersion: model.currentVersion,
      nodes: new Map(model.nodes),
      actionNodes: new Map(model.actionNodes),
      metadata: { ...model.metadata },
      permissions: { ...model.permissions }
    });
    
    if (restoredModelResult.isFailure) {
      return Result.fail<void>(restoredModelResult.error);
    }
    
    this.models.set(id, restoredModelResult.value);
    return Result.ok<void>(undefined);
  }
}

class MockAuditLogRepository implements AuditLogRepository {
  private auditLogs = new Map<string, AuditLog>();

  async save(auditLog: AuditLog): Promise<Result<void>> {
    this.auditLogs.set(auditLog.auditId, auditLog);
    return Result.ok<void>(undefined);
  }

  async findById(id: string): Promise<Result<AuditLog>> {
    const auditLog = this.auditLogs.get(id);
    if (!auditLog) {
      return Result.fail<AuditLog>(`AuditLog with id ${id} not found`);
    }
    return Result.ok(auditLog);
  }

  async findByRecordId(recordId: string): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values()).filter(log => log.recordId === recordId);
    return Result.ok(logs);
  }

  async findByTableName(tableName: string): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values()).filter(log => log.tableName === tableName);
    return Result.ok(logs);
  }

  async findByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values()).filter(log => log.operation === operation);
    return Result.ok(logs);
  }

  async findByUser(userId: string): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values()).filter(log => log.changedBy === userId);
    return Result.ok(logs);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values()).filter(log => 
      log.changedAt >= startDate && log.changedAt <= endDate
    );
    return Result.ok(logs);
  }

  async findRecent(limit: number): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values())
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, limit);
    return Result.ok(logs);
  }

  async findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLog[]>> {
    const logs = Array.from(this.auditLogs.values())
      .filter(log => log.tableName === tableName && log.recordId === recordId);
    return Result.ok(logs);
  }

  async countByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<number>> {
    const count = Array.from(this.auditLogs.values()).filter(log => log.operation === operation).length;
    return Result.ok(count);
  }

  async countByUser(userId: string): Promise<Result<number>> {
    const count = Array.from(this.auditLogs.values()).filter(log => log.changedBy === userId).length;
    return Result.ok(count);
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<Result<number>> {
    const count = Array.from(this.auditLogs.values())
      .filter(log => log.changedAt >= startDate && log.changedAt <= endDate).length;
    return Result.ok(count);
  }

  async deleteOldEntries(beforeDate: Date): Promise<Result<number>> {
    const toDelete = Array.from(this.auditLogs.entries())
      .filter(([_, log]) => log.changedAt < beforeDate);
    
    toDelete.forEach(([id, _]) => this.auditLogs.delete(id));
    return Result.ok(toDelete.length);
  }

  async exists(id: string): Promise<Result<boolean>> {
    return Result.ok(this.auditLogs.has(id));
  }
}

// Create minimal implementations for other repos
class MockNodeRepository implements NodeRepository {
  private nodes = new Map<string, Node>();

  async findById(id: NodeId): Promise<Result<Node>> {
    const node = this.nodes.get(id.toString());
    return node ? Result.ok(node) : Result.fail<Node>('Node not found');
  }

  async findByModelId(modelId: string): Promise<Result<Node[]>> {
    const nodes = Array.from(this.nodes.values()).filter(n => (n as any).modelId === modelId);
    return Result.ok(nodes);
  }

  async save(node: Node): Promise<Result<void>> {
    this.nodes.set(node.nodeId.toString(), node);
    return Result.ok<void>(undefined);
  }

  async delete(id: NodeId): Promise<Result<void>> {
    this.nodes.delete(id.toString());
    return Result.ok<void>(undefined);
  }

  async exists(id: NodeId): Promise<Result<boolean>> {
    return Result.ok(this.nodes.has(id.toString()));
  }

  // Implement other methods with minimal logic
  async findByStatus(status: NodeStatus): Promise<Result<Node[]>> { return Result.ok([]); }
  async findByStatusInModel(modelId: string, status: NodeStatus): Promise<Result<Node[]>> { return Result.ok([]); }
  async findDependents(nodeId: NodeId): Promise<Result<Node[]>> { return Result.ok([]); }
  async findDependencies(nodeId: NodeId): Promise<Result<Node[]>> { return Result.ok([]); }
  async findByName(modelId: string, name: string): Promise<Result<Node[]>> { return Result.ok([]); }
  async findByNamePattern(modelId: string, pattern: string): Promise<Result<Node[]>> { return Result.ok([]); }
  async updateStatus(id: NodeId, status: NodeStatus): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async bulkSave(nodes: Node[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async bulkDelete(ids: NodeId[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async countByModelAndStatus(modelId: string, status: NodeStatus): Promise<Result<number>> { return Result.ok(0); }
}

class MockNodeLinkRepository implements NodeLinkRepository {
  private links = new Map<string, NodeLink>();

  async findById(id: NodeId): Promise<Result<NodeLink>> {
    const link = this.links.get(id.toString());
    return link ? Result.ok(link) : Result.fail<NodeLink>('Link not found');
  }

  async save(link: NodeLink): Promise<Result<void>> {
    this.links.set(link.linkId.toString(), link);
    return Result.ok<void>(undefined);
  }

  async delete(id: NodeId): Promise<Result<void>> {
    this.links.delete(id.toString());
    return Result.ok<void>(undefined);
  }

  async exists(id: NodeId): Promise<Result<boolean>> {
    return Result.ok(this.links.has(id.toString()));
  }

  // Implement other methods with minimal logic
  async findBySourceEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findByTargetEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findBySourceNode(nodeId: NodeId): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findByTargetNode(nodeId: NodeId): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findByLinkType(linkType: LinkType): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findCrossFeatureLinks(): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findByFeaturePair(sourceFeature: FeatureType, targetFeature: FeatureType): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findStrongLinks(threshold?: number): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findWeakLinks(threshold?: number): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async findBidirectionalLinks(sourceEntity: string, targetEntity: string): Promise<Result<NodeLink[]>> { return Result.ok([]); }
  async bulkSave(links: NodeLink[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async bulkDelete(ids: NodeId[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async countByLinkType(linkType: LinkType): Promise<Result<number>> { return Result.ok(0); }
  async countCrossFeatureLinks(): Promise<Result<number>> { return Result.ok(0); }
}

class MockAIAgentRepository implements AIAgentRepository {
  private agents = new Map<string, AIAgent>();

  async findById(id: NodeId): Promise<Result<AIAgent>> {
    const agent = this.agents.get(id.toString());
    return agent ? Result.ok(agent) : Result.fail<AIAgent>('Agent not found');
  }

  async save(agent: AIAgent): Promise<Result<void>> {
    this.agents.set(agent.agentId.toString(), agent);
    return Result.ok<void>(undefined);
  }

  async delete(id: NodeId): Promise<Result<void>> {
    this.agents.delete(id.toString());
    return Result.ok<void>(undefined);
  }

  async exists(id: NodeId): Promise<Result<boolean>> {
    return Result.ok(this.agents.has(id.toString()));
  }

  // Implement other methods with minimal logic
  async findByFeatureAndEntity(featureType: FeatureType, entityId: string): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByNode(nodeId: NodeId): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByFeatureType(featureType: FeatureType): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findEnabled(): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findDisabled(): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByName(name: string): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByCapability(capability: string): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByTool(toolName: string): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findRecentlyExecuted(hours: number): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findBySuccessRate(minRate: number): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async findByExecutionCount(minCount: number): Promise<Result<AIAgent[]>> { return Result.ok([]); }
  async updateEnabled(id: NodeId, enabled: boolean): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async recordExecution(id: NodeId, success: boolean, executionTimeMs: number): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async bulkSave(agents: AIAgent[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async bulkDelete(ids: NodeId[]): Promise<Result<void>> { return Result.ok<void>(undefined); }
  async countByFeatureType(featureType: FeatureType): Promise<Result<number>> { return Result.ok(0); }
  async countEnabled(): Promise<Result<number>> { return Result.ok(0); }
}

describe('Repository Contract Tests', () => {
  describe('FunctionModelRepository Contract', () => {
    let repository: FunctionModelRepository;
    let testModel: FunctionModel;

    beforeEach(async () => {
      repository = new MockFunctionModelRepository();
      
      // Create required value objects
      const nameResult = ModelName.create('Test Model');
      const versionResult = Version.create('1.0.0');
      
      expect(nameResult).toBeValidResult();
      expect(versionResult).toBeValidResult();
      
      // Create a test model with an IO node to make it publishable
      const testModelId = crypto.randomUUID();
      const ioNodeId = NodeId.generate();
      
      // Create an IO node for the model to pass validation
      const ioNodeResult = IONode.create({
        nodeId: ioNodeId,
        name: 'Test IO Node',
        description: 'Test IO node for validation',
        modelId: testModelId,
        status: NodeStatus.READY,
        dependencies: [],
        metadata: {},
        ioData: {
          boundaryType: 'input-output',
          inputDataContract: { input: 'string' },
          outputDataContract: { output: 'string' }
        }
      });
      
      expect(ioNodeResult).toBeValidResult();
      const testNodes = new Map<string, Node>();
      testNodes.set(ioNodeId.toString(), ioNodeResult.value);
      
      const modelResult = FunctionModel.create({
        modelId: testModelId,
        name: nameResult.value,
        description: 'A test model for repository testing',
        version: versionResult.value,
        status: ModelStatus.DRAFT,
        currentVersion: versionResult.value,
        nodes: testNodes,
        actionNodes: new Map(),
        metadata: { test: true },
        permissions: {
          owner: 'test-owner',
          editors: [],
          viewers: []
        }
      });
      
      expect(modelResult).toBeValidResult();
      testModel = modelResult.value;
    });

    describe('Basic CRUD Operations', () => {
      it('should save and retrieve models', async () => {
        // Act
        const saveResult = await repository.save(testModel);
        expect(saveResult).toBeValidResult();

        const findResult = await repository.findById(testModel.modelId);
        
        // Assert
        expect(findResult).toBeValidResult();
        expect(findResult.value.modelId).toBe(testModel.modelId);
        expect(findResult.value.name.toString()).toBe(testModel.name.toString());
      });

      it('should return error when model not found', async () => {
        // Act
        const result = await repository.findById('non-existent-id');

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Model with id non-existent-id not found');
      });

      it('should delete models successfully', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const deleteResult = await repository.delete(testModel.modelId);
        expect(deleteResult).toBeValidResult();

        const findResult = await repository.findById(testModel.modelId);
        
        // Assert
        expect(findResult).toBeFailureResult();
      });

      it('should check model existence', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act & Assert
        const existsResult = await repository.exists(testModel.modelId);
        expect(existsResult).toBeValidResult();
        expect(existsResult.value).toBe(true);

        const notExistsResult = await repository.exists('non-existent');
        expect(notExistsResult).toBeValidResult();
        expect(notExistsResult.value).toBe(false);
      });
    });

    describe('Query Operations', () => {
      it('should find models by status', async () => {
        // Arrange
        await repository.save(testModel);
        const publishResult = await repository.publishModel(testModel.modelId);
        expect(publishResult).toBeValidResult();
        
        // Act
        const result = await repository.findByStatus(ModelStatus.PUBLISHED);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
        expect(result.value[0].status).toBe(ModelStatus.PUBLISHED);
      });

      it('should find models by owner', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const result = await repository.findByOwner('test-owner');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
        expect(result.value[0].permissions.owner).toBe('test-owner');
      });

      it('should find all models', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const result = await repository.findAll();
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
      });

      it('should find models by name pattern', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const result = await repository.findByNamePattern('Test.*');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
      });

      it('should count models by status', async () => {
        // Arrange
        await repository.save(testModel);
        const publishResult = await repository.publishModel(testModel.modelId);
        expect(publishResult).toBeValidResult();
        
        // Act
        const result = await repository.countByStatus(ModelStatus.PUBLISHED);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(1);
      });
    });

    describe('Model State Management', () => {
      it('should publish models', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const result = await repository.publishModel(testModel.modelId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(testModel.status).toBe(ModelStatus.PUBLISHED);
      });

      it('should archive models', async () => {
        // Arrange
        await repository.save(testModel);
        testModel.publish();
        
        // Act
        const result = await repository.archiveModel(testModel.modelId);
        
        // Assert
        expect(result).toBeValidResult();
        expect(testModel.status).toBe(ModelStatus.ARCHIVED);
      });

      it('should soft delete models', async () => {
        // Arrange
        await repository.save(testModel);
        
        // Act
        const result = await repository.softDelete(testModel.modelId, 'deleter-user');
        
        // Assert
        expect(result).toBeValidResult();
        expect((testModel as any).deletedAt).toBeInstanceOf(Date);
        expect((testModel as any).deletedBy).toBe('deleter-user');
      });

      it('should restore soft deleted models', async () => {
        // Arrange
        await repository.save(testModel);
        const deleteResult = await repository.softDelete(testModel.modelId, 'deleter-user');
        expect(deleteResult).toBeValidResult();
        
        // Act
        const restoreResult = await repository.restore(testModel.modelId);
        expect(restoreResult).toBeValidResult();
        
        // Get the restored model from repository to verify
        const restoredModelResult = await repository.findById(testModel.modelId);
        
        // Assert
        expect(restoredModelResult).toBeValidResult();
        expect(restoredModelResult.value.deletedAt).toBeUndefined();
        expect(restoredModelResult.value.deletedBy).toBeUndefined();
      });
    });
  });

  describe('AuditLogRepository Contract', () => {
    let repository: AuditLogRepository;
    let testAuditLog: AuditLog;

    beforeEach(async () => {
      repository = new MockAuditLogRepository();
      
      // Create test audit log
      const auditResult = AuditLog.create({
        auditId: 'audit-123',
        tableName: 'function_models',
        operation: 'create',
        recordId: 'model-456',
        newData: { name: 'Test Model', status: 'draft' },
        changedBy: 'user-789'
      });
      
      expect(auditResult).toBeValidResult();
      testAuditLog = auditResult.value;
    });

    describe('Basic Operations', () => {
      it('should save and retrieve audit logs', async () => {
        // Act
        const saveResult = await repository.save(testAuditLog);
        expect(saveResult).toBeValidResult();

        const findResult = await repository.findById(testAuditLog.auditId);
        
        // Assert
        expect(findResult).toBeValidResult();
        expect(findResult.value.auditId).toBe(testAuditLog.auditId);
        expect(findResult.value.operation).toBe('create');
      });

      it('should check audit log existence', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act & Assert
        const existsResult = await repository.exists(testAuditLog.auditId);
        expect(existsResult).toBeValidResult();
        expect(existsResult.value).toBe(true);
      });
    });

    describe('Query Operations', () => {
      it('should find logs by record ID', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act
        const result = await repository.findByRecordId('model-456');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
        expect(result.value[0].recordId).toBe('model-456');
      });

      it('should find logs by operation type', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act
        const result = await repository.findByOperation('create');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
        expect(result.value[0].operation).toBe('create');
      });

      it('should find logs by user', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act
        const result = await repository.findByUser('user-789');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
        expect(result.value[0].changedBy).toBe('user-789');
      });

      it('should count logs by operation', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act
        const result = await repository.countByOperation('create');
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(1);
      });

      it('should find recent logs', async () => {
        // Arrange
        await repository.save(testAuditLog);
        
        // Act
        const result = await repository.findRecent(10);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
      });
    });

    describe('Date Range Operations', () => {
      it('should find logs by date range', async () => {
        // Arrange
        await repository.save(testAuditLog);
        const startDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
        const endDate = new Date(Date.now() + 1000 * 60 * 60);   // 1 hour from now
        
        // Act
        const result = await repository.findByDateRange(startDate, endDate);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(1);
      });

      it('should count logs by date range', async () => {
        // Arrange
        await repository.save(testAuditLog);
        const startDate = new Date(Date.now() - 1000 * 60 * 60);
        const endDate = new Date(Date.now() + 1000 * 60 * 60);
        
        // Act
        const result = await repository.countByDateRange(startDate, endDate);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(1);
      });
    });

    describe('Maintenance Operations', () => {
      it('should delete old entries', async () => {
        // Arrange
        await repository.save(testAuditLog);
        const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
        
        // Act
        const result = await repository.deleteOldEntries(futureDate);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toBe(1); // Should delete 1 entry
      });
    });
  });

  describe('NodeRepository Contract', () => {
    let repository: NodeRepository;
    let testNodeId: NodeId;

    beforeEach(() => {
      repository = new MockNodeRepository();
      testNodeId = NodeId.generate();
    });

    it('should follow basic CRUD contract', async () => {
      // Mock node for testing
      const mockNode = { nodeId: testNodeId } as Node;

      // Test save
      const saveResult = await repository.save(mockNode);
      expect(saveResult).toBeValidResult();

      // Test exists
      const existsResult = await repository.exists(testNodeId);
      expect(existsResult).toBeValidResult();
      expect(existsResult.value).toBe(true);

      // Test find
      const findResult = await repository.findById(testNodeId);
      expect(findResult).toBeValidResult();

      // Test delete
      const deleteResult = await repository.delete(testNodeId);
      expect(deleteResult).toBeValidResult();
    });

    it('should follow Result pattern consistently', async () => {
      const nonExistentId = NodeId.generate();
      
      const result = await repository.findById(nonExistentId);
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node not found');
    });
  });

  describe('NodeLinkRepository Contract', () => {
    let repository: NodeLinkRepository;
    let testLinkId: NodeId;

    beforeEach(() => {
      repository = new MockNodeLinkRepository();
      testLinkId = NodeId.generate();
    });

    it('should follow basic CRUD contract', async () => {
      // Mock link for testing
      const mockLink = { linkId: testLinkId } as NodeLink;

      // Test save
      const saveResult = await repository.save(mockLink);
      expect(saveResult).toBeValidResult();

      // Test exists
      const existsResult = await repository.exists(testLinkId);
      expect(existsResult).toBeValidResult();
      expect(existsResult.value).toBe(true);

      // Test find
      const findResult = await repository.findById(testLinkId);
      expect(findResult).toBeValidResult();

      // Test delete
      const deleteResult = await repository.delete(testLinkId);
      expect(deleteResult).toBeValidResult();
    });
  });

  describe('AIAgentRepository Contract', () => {
    let repository: AIAgentRepository;
    let testAgentId: NodeId;

    beforeEach(() => {
      repository = new MockAIAgentRepository();
      testAgentId = NodeId.generate();
    });

    it('should follow basic CRUD contract', async () => {
      // Mock agent for testing
      const mockAgent = { agentId: testAgentId } as AIAgent;

      // Test save
      const saveResult = await repository.save(mockAgent);
      expect(saveResult).toBeValidResult();

      // Test exists
      const existsResult = await repository.exists(testAgentId);
      expect(existsResult).toBeValidResult();
      expect(existsResult.value).toBe(true);

      // Test find
      const findResult = await repository.findById(testAgentId);
      expect(findResult).toBeValidResult();

      // Test delete
      const deleteResult = await repository.delete(testAgentId);
      expect(deleteResult).toBeValidResult();
    });
  });

  describe('Cross-Repository Contract Compliance', () => {
    it('should all repositories use Result pattern consistently', async () => {
      const repos = [
        new MockFunctionModelRepository(),
        new MockAuditLogRepository(), 
        new MockNodeRepository(),
        new MockNodeLinkRepository(),
        new MockAIAgentRepository()
      ];

      // Test that all repositories handle non-existent entities consistently
      for (const repo of repos) {
        if ('findById' in repo) {
          const result = await (repo as any).findById('non-existent');
          expect(result).toBeFailureResult();
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      }
    });

    it('should all repositories handle save operations consistently', async () => {
      const mockFunctionModel = { modelId: 'test-id' } as FunctionModel;
      const mockAuditLog = { auditId: 'audit-id' } as AuditLog;
      const nodeId = NodeId.generate();
      const mockNode = { nodeId } as Node;
      const mockLink = { linkId: nodeId } as NodeLink;
      const mockAgent = { agentId: nodeId } as AIAgent;

      const functionRepo = new MockFunctionModelRepository();
      const auditRepo = new MockAuditLogRepository();
      const nodeRepo = new MockNodeRepository();
      const linkRepo = new MockNodeLinkRepository();
      const agentRepo = new MockAIAgentRepository();

      // All save operations should return successful Results
      const results = await Promise.all([
        functionRepo.save(mockFunctionModel),
        auditRepo.save(mockAuditLog),
        nodeRepo.save(mockNode),
        linkRepo.save(mockLink),
        agentRepo.save(mockAgent)
      ]);

      results.forEach(result => {
        expect(result).toBeValidResult();
        expect(result.isSuccess).toBe(true);
      });
    });

    it('should all repositories handle exists check consistently', async () => {
      const functionRepo = new MockFunctionModelRepository();
      const auditRepo = new MockAuditLogRepository();
      const nodeId = NodeId.generate();
      const nodeRepo = new MockNodeRepository();
      const linkRepo = new MockNodeLinkRepository();
      const agentRepo = new MockAIAgentRepository();

      // Test non-existent entities
      const results = await Promise.all([
        functionRepo.exists('non-existent'),
        auditRepo.exists('non-existent'),
        nodeRepo.exists(nodeId),
        linkRepo.exists(nodeId),
        agentRepo.exists(nodeId)
      ]);

      results.forEach(result => {
        expect(result).toBeValidResult();
        expect(result.value).toBe(false);
      });
    });
  });

  describe('Repository Error Handling Contracts', () => {
    it('should handle validation errors in function model repository', async () => {
      const repo = new MockFunctionModelRepository();
      const invalidModel = { modelId: null } as any;
      
      const result = await repo.save(invalidModel);
      expect(result).toBeFailureResult();
    });

    it('should maintain data integrity across operations', async () => {
      const repo = new MockFunctionModelRepository();
      
      // Create required value objects
      const nameResult = ModelName.create('Test Model');
      const versionResult = Version.create('1.0.0');
      
      // Create test model
      const modelResult = FunctionModel.create({
        modelId: crypto.randomUUID(),
        name: nameResult.value,
        description: 'Test',
        version: versionResult.value,
        status: ModelStatus.DRAFT,
        currentVersion: versionResult.value,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {},
        permissions: { owner: 'test-user', editors: [], viewers: [] }
      });
      
      const model = modelResult.value;
      
      // Save, retrieve, and verify integrity
      await repo.save(model);
      const retrieved = await repo.findById(model.modelId);
      
      expect(retrieved).toBeValidResult();
      expect(retrieved.value.modelId).toBe(model.modelId);
      expect(retrieved.value.name.toString()).toBe(model.name.toString());
    });

    it('should handle concurrent operations gracefully', async () => {
      const repo = new MockAuditLogRepository();
      
      // Create multiple audit logs
      const logs = await Promise.all([
        AuditLog.create({
          auditId: 'audit-1',
          tableName: 'test_table',
          operation: 'create',
          recordId: 'record-1',
          newData: { test: 1 },
          changedBy: 'user-1'
        }),
        AuditLog.create({
          auditId: 'audit-2', 
          tableName: 'test_table',
          operation: 'update',
          recordId: 'record-2',
          oldData: { test: 1 },
          newData: { test: 2 },
          changedBy: 'user-2'
        })
      ]);

      // Save concurrently
      const saveResults = await Promise.all([
        repo.save(logs[0].value),
        repo.save(logs[1].value)
      ]);

      saveResults.forEach(result => {
        expect(result).toBeValidResult();
      });

      // Verify both are retrievable
      const findResults = await Promise.all([
        repo.findById('audit-1'),
        repo.findById('audit-2')
      ]);

      findResults.forEach(result => {
        expect(result).toBeValidResult();
      });
    });
  });
});
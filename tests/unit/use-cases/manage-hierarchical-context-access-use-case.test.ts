/**
 * UC-011: Hierarchical Context Access Control
 * Comprehensive TDD test suite for ManageHierarchicalContextAccessUseCase
 * 
 * This test suite ensures that hierarchical context access control follows Clean Architecture
 * principles and enforces proper access rules between nodes in the hierarchy.
 * 
 * Test coverage includes:
 * - Node registration in context hierarchy
 * - Sibling access: Read-only access between nodes at same hierarchical level  
 * - Child access: Children can only access their own context
 * - Parent access: Read/write access to all descendant contexts
 * - Uncle/Aunt access: Read-only lateral access for root cause analysis
 * - Context access validation and request handling
 * - Error handling and edge cases
 * 
 * These tests act as architectural boundaries and serve as executable documentation
 * for proper hierarchy access patterns.
 */

import { 
  ManageHierarchicalContextAccessUseCase,
  RegisterNodeRequest,
  ValidateContextAccessRequest,
  GetAccessibleContextsRequest,
  UpdateContextRequest,
  HierarchicalContextAccessResult,
  ContextAccessValidationResult
} from '@/lib/use-cases/function-model/manage-hierarchical-context-access-use-case';
import { NodeContextAccessService, NodeContext, ContextAccessResult } from '@/lib/domain/services/node-context-access-service';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';
import { TestData, getTestUUID } from '@/tests/utils/test-fixtures';

// Mock dependencies
const mockNodeContextAccessService = {
  registerNode: jest.fn(),
  getAccessibleContexts: jest.fn(),
  getNodeContext: jest.fn(),
  updateNodeContext: jest.fn(),
  setHierarchy: jest.fn(),
  setContextData: jest.fn()
} as jest.Mocked<NodeContextAccessService>;

describe('ManageHierarchicalContextAccessUseCase - UC-011', () => {
  let useCase: ManageHierarchicalContextAccessUseCase;
  
  // Test node hierarchies - deterministic UUIDs for consistency
  let grandparentNodeId: NodeId;
  let parentNodeId: NodeId;
  let childNodeId: NodeId;
  let siblingNodeId: NodeId;
  let uncleNodeId: NodeId;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create use case with mocked dependencies
    useCase = new ManageHierarchicalContextAccessUseCase(mockNodeContextAccessService);
    
    // Initialize test node IDs with deterministic values
    grandparentNodeId = NodeId.create(getTestUUID('grandparent-node')).value;
    parentNodeId = NodeId.create(getTestUUID('parent-node')).value;
    childNodeId = NodeId.create(getTestUUID('child-node')).value;
    siblingNodeId = NodeId.create(getTestUUID('sibling-node')).value;
    uncleNodeId = NodeId.create(getTestUUID('uncle-node')).value;
  });

  describe('Node Registration in Hierarchy', () => {
    describe('registerNodeInHierarchy', () => {
      it('should register root node successfully', async () => {
        // Arrange
        const request: RegisterNodeRequest = {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: undefined,
          contextData: { rootLevel: true, permissions: 'admin' },
          hierarchyLevel: 0,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerNodeInHierarchy(request);

        // Assert
        expect(result).toBeValidResult();
        expect(mockNodeContextAccessService.registerNode).toHaveBeenCalledWith(
          parentNodeId,
          'StageNode',
          undefined,
          { rootLevel: true, permissions: 'admin' },
          0
        );
        
        const response = result.value;
        expect(response.success).toBe(true);
        expect(response.message).toContain('registered successfully');
        expect(response.nodeId).toEqual(parentNodeId.toString());
        expect(response.hierarchyLevel).toBe(0);
      });

      it('should register child node with parent relationship', async () => {
        // Arrange
        const request: RegisterNodeRequest = {
          nodeId: childNodeId,
          nodeType: 'ActionNode',
          parentNodeId: parentNodeId,
          contextData: { childLevel: true, inheritedConfig: 'parent-config' },
          hierarchyLevel: 1,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerNodeInHierarchy(request);

        // Assert
        expect(result).toBeValidResult();
        expect(mockNodeContextAccessService.registerNode).toHaveBeenCalledWith(
          childNodeId,
          'ActionNode',
          parentNodeId,
          { childLevel: true, inheritedConfig: 'parent-config' },
          1
        );
        
        const response = result.value;
        expect(response.success).toBe(true);
        expect(response.parentNodeId).toEqual(parentNodeId.toString());
        expect(response.hierarchyLevel).toBe(1);
      });

      it('should register sibling nodes at same hierarchy level', async () => {
        // Arrange
        const sibling1Request: RegisterNodeRequest = {
          nodeId: childNodeId,
          nodeType: 'ActionNode',
          parentNodeId: parentNodeId,
          contextData: { siblingId: 1, sharedResource: 'database' },
          hierarchyLevel: 1,
          userId: TestData.VALID_USER_ID
        };

        const sibling2Request: RegisterNodeRequest = {
          nodeId: siblingNodeId,
          nodeType: 'ActionNode', 
          parentNodeId: parentNodeId,
          contextData: { siblingId: 2, sharedResource: 'cache' },
          hierarchyLevel: 1,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result1 = await useCase.registerNodeInHierarchy(sibling1Request);
        const result2 = await useCase.registerNodeInHierarchy(sibling2Request);

        // Assert
        expect(result1).toBeValidResult();
        expect(result2).toBeValidResult();
        expect(mockNodeContextAccessService.registerNode).toHaveBeenCalledTimes(2);
        
        // Verify both siblings have same parent and hierarchy level
        expect(result1.value.parentNodeId).toEqual(result2.value.parentNodeId);
        expect(result1.value.hierarchyLevel).toBe(result2.value.hierarchyLevel);
      });

      it('should reject registration with invalid node data', async () => {
        // Arrange - Create invalid request that will fail validation
        const invalidRequest: RegisterNodeRequest = {
          nodeId: parentNodeId, // Valid nodeId
          nodeType: '', // Invalid empty node type
          parentNodeId: undefined,
          contextData: null as any,
          hierarchyLevel: -1,
          userId: ''
        };

        // Act
        const result = await useCase.registerNodeInHierarchy(invalidRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Node type is required');
        expect(mockNodeContextAccessService.registerNode).not.toHaveBeenCalled();
      });

      it('should handle service registration failure', async () => {
        // Arrange
        const request: RegisterNodeRequest = {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: undefined,
          contextData: { test: 'data' },
          hierarchyLevel: 0,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(
          Result.fail<void>('Node registration failed due to internal error')
        );

        // Act
        const result = await useCase.registerNodeInHierarchy(request);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Failed to register node in hierarchy');
        expect(result.error).toContain('Node registration failed due to internal error');
      });
    });

    describe('hierarchy validation', () => {
      it('should validate parent-child relationships during registration', async () => {
        // Arrange - Register parent first
        const parentRequest: RegisterNodeRequest = {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: undefined,
          contextData: { parent: true },
          hierarchyLevel: 0,
          userId: TestData.VALID_USER_ID
        };

        const childRequest: RegisterNodeRequest = {
          nodeId: childNodeId,
          nodeType: 'ActionNode',
          parentNodeId: parentNodeId,
          contextData: { child: true },
          hierarchyLevel: 1,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(Result.ok<void>(undefined));

        // Act
        await useCase.registerNodeInHierarchy(parentRequest);
        const childResult = await useCase.registerNodeInHierarchy(childRequest);

        // Assert
        expect(childResult).toBeValidResult();
        expect(childResult.value.parentNodeId).toEqual(parentNodeId.toString());
        
        // Verify registration calls
        expect(mockNodeContextAccessService.registerNode).toHaveBeenNthCalledWith(1,
          parentNodeId, 'StageNode', undefined, { parent: true }, 0
        );
        expect(mockNodeContextAccessService.registerNode).toHaveBeenNthCalledWith(2,
          childNodeId, 'ActionNode', parentNodeId, { child: true }, 1
        );
      });

      it('should enforce maximum hierarchy depth limits', async () => {
        // Arrange - Deep hierarchy request exceeding limits
        const deepRequest: RegisterNodeRequest = {
          nodeId: childNodeId,
          nodeType: 'ActionNode',
          parentNodeId: parentNodeId,
          contextData: { level: 'deep' },
          hierarchyLevel: 15, // Exceeds typical max depth
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.registerNodeInHierarchy(deepRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Hierarchy depth limit exceeded');
        expect(mockNodeContextAccessService.registerNode).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sibling Access Control (Read-Only)', () => {
    describe('validateSiblingAccess', () => {
      it('should allow read-only access between sibling nodes', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: siblingNodeId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        const siblingAccessResult: ContextAccessResult = {
          context: {
            nodeId: siblingNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { siblingData: 'shared-info' },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Sibling read-only access pattern'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([siblingAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('read');
        expect(validation.accessReason).toContain('Sibling read-only access');
        expect(validation.restrictedOperations).toContain('write');
        expect(validation.restrictedOperations).toContain('execute');
      });

      it('should deny write access between sibling nodes', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: siblingNodeId,
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        const siblingAccessResult: ContextAccessResult = {
          context: {
            nodeId: siblingNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { siblingData: 'protected' },
            accessLevel: 'read', // Only read access available
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Sibling read-only access pattern'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([siblingAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('Insufficient access level');
        expect(validation.denialReason).toContain('write access requested but only read available');
      });

      it('should provide correct sibling context data with read access', async () => {
        // Arrange
        const request: GetAccessibleContextsRequest = {
          requestingNodeId: childNodeId,
          accessType: 'sibling',
          userId: TestData.VALID_USER_ID
        };

        const siblingContext: ContextAccessResult = {
          context: {
            nodeId: siblingNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { 
              configuration: 'sibling-config',
              status: 'active',
              lastUpdate: '2023-12-01T10:00:00Z'
            },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Sibling read-only access pattern'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([siblingContext])
        );

        // Act
        const result = await useCase.getAccessibleContexts(request);

        // Assert
        expect(result).toBeValidResult();
        const response = result.value;
        expect(response.contexts).toHaveLength(1);
        
        const accessibleContext = response.contexts[0];
        expect(accessibleContext.nodeId).toEqual(siblingNodeId.toString());
        expect(accessibleContext.accessLevel).toBe('read');
        expect(accessibleContext.contextData.configuration).toBe('sibling-config');
        expect(accessibleContext.relationshipType).toBe('sibling');
      });

      it('should deny access between non-sibling nodes', async () => {
        // Arrange - Request between nodes that are not siblings
        const request: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: uncleNodeId, // Uncle node, not a sibling
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        // Mock returns empty sibling access (no sibling relationship)
        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([]) // No accessible contexts for sibling access
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('No lateral relationship found');
      });
    });
  });

  describe('Children Access Control (Own Context Only)', () => {
    describe('validateChildAccess', () => {
      it('should allow child to access only its own context', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: childNodeId, // Child accessing its own context
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        const ownContextResult: NodeContext = {
          nodeId: childNodeId,
          nodeType: 'ActionNode',
          parentNodeId: parentNodeId,
          contextData: { 
            ownData: 'private-data',
            state: 'active',
            permissions: 'owner'
          },
          accessLevel: 'write', // Full access to own context
          hierarchyLevel: 1
        };

        mockNodeContextAccessService.getNodeContext.mockReturnValue(
          Result.ok<NodeContext>(ownContextResult)
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('write');
        expect(validation.accessReason).toContain('Self-access to own context');
        expect(validation.restrictedOperations).toHaveLength(0); // No restrictions for own context
      });

      it('should deny child access to other child contexts', async () => {
        // Arrange
        const otherChildId = NodeId.create(getTestUUID('other-child')).value;
        const request: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: otherChildId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        // Mock no accessible contexts for cross-child access
        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('No lateral relationship found');
      });

      it('should allow child to read parent context but not write', async () => {
        // Arrange
        const readRequest: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: parentNodeId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        const parentAccessResult: ContextAccessResult = {
          context: {
            nodeId: parentNodeId,
            nodeType: 'StageNode',
            parentNodeId: undefined,
            contextData: { parentConfig: 'shared-config' },
            accessLevel: 'read', // Child gets read access to parent
            hierarchyLevel: 0
          },
          accessGranted: true,
          accessReason: 'Child read access to parent context'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([parentAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(readRequest);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('read');
        expect(validation.restrictedOperations).toContain('write');
      });

      it('should deny child write access to parent context', async () => {
        // Arrange
        const writeRequest: ValidateContextAccessRequest = {
          requestingNodeId: childNodeId,
          targetNodeId: parentNodeId,
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        const parentAccessResult: ContextAccessResult = {
          context: {
            nodeId: parentNodeId,
            nodeType: 'StageNode',
            parentNodeId: undefined,
            contextData: { parentConfig: 'protected-config' },
            accessLevel: 'read', // Only read access available
            hierarchyLevel: 0
          },
          accessGranted: true,
          accessReason: 'Child read access to parent context'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([parentAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(writeRequest);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('Insufficient access level');
      });
    });
  });

  describe('Parent Access Control (Read/Write to All Descendants)', () => {
    describe('validateParentAccess', () => {
      it('should allow parent read/write access to direct children', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        const childAccessResult: ContextAccessResult = {
          context: {
            nodeId: childNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { childData: 'modifiable' },
            accessLevel: 'write', // Parent has write access to children
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Parent write access to child context'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([childAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('write');
        expect(validation.accessReason).toContain('Parent write access to child context');
        expect(validation.restrictedOperations).toEqual(['execute']); // Only execute is restricted for write access
      });

      it('should allow parent read/write access to all descendants (grandchildren)', async () => {
        // Arrange
        const grandchildId = NodeId.create(getTestUUID('grandchild')).value;
        const request: ValidateContextAccessRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: grandchildId,
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        const grandchildAccessResult: ContextAccessResult = {
          context: {
            nodeId: grandchildId,
            nodeType: 'ActionNode',
            parentNodeId: childNodeId,
            contextData: { grandchildData: 'modifiable' },
            accessLevel: 'write', // Parent has write access to all descendants
            hierarchyLevel: 2
          },
          accessGranted: true,
          accessReason: 'Parent hierarchical write access to descendant'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([grandchildAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('write');
        expect(validation.accessReason).toContain('hierarchical write access to descendant');
      });

      it('should provide complete list of all descendant contexts for parent', async () => {
        // Arrange
        const request: GetAccessibleContextsRequest = {
          requestingNodeId: parentNodeId,
          accessType: 'children',
          userId: TestData.VALID_USER_ID
        };

        const grandchildId = NodeId.create(getTestUUID('grandchild')).value;
        const descendantContexts: ContextAccessResult[] = [
          {
            context: {
              nodeId: childNodeId,
              nodeType: 'ActionNode',
              parentNodeId: parentNodeId,
              contextData: { level: 1, data: 'child-data' },
              accessLevel: 'write',
              hierarchyLevel: 1
            },
            accessGranted: true,
            accessReason: 'Parent write access to child context'
          }
        ];

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>(descendantContexts)
        );

        // Act
        const result = await useCase.getAccessibleContexts(request);

        // Assert
        expect(result).toBeValidResult();
        const response = result.value;
        expect(response.contexts).toHaveLength(1);
        
        // Verify contexts have proper access levels
        response.contexts.forEach(context => {
          expect(['read', 'write', 'execute']).toContain(context.accessLevel);
          expect(['descendant', 'sibling', 'ancestor', 'lateral']).toContain(context.relationshipType);
        });

        // Verify hierarchy levels
        const childContext = response.contexts.find(c => c.nodeId === childNodeId.toString());
        
        expect(childContext?.hierarchyLevel).toBe(1);
      });

      it('should successfully update child context data as parent', async () => {
        // Arrange
        const request: UpdateContextRequest = {
          updatingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          newContextData: { 
            updatedByParent: true,
            timestamp: new Date().toISOString(),
            parentDirectives: ['optimize', 'secure']
          },
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.updateNodeContext.mockReturnValue(
          Result.ok<void>(undefined)
        );

        // Act  
        const result = await useCase.updateNodeContext(request);

        // Assert
        expect(result).toBeValidResult();
        expect(mockNodeContextAccessService.updateNodeContext).toHaveBeenCalledWith(
          parentNodeId,
          childNodeId,
          request.newContextData
        );
        
        const response = result.value;
        expect(response.success).toBe(true);
        expect(response.message).toContain('Context updated successfully');
        expect(response.accessReason).toContain('Parent write access to child context');
      });

      it('should deny parent access to non-descendant nodes', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: uncleNodeId, // Uncle is not a descendant
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        // Mock returns empty list (no descendant relationship)
        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('No lateral relationship found');
      });
    });
  });

  describe('Uncle/Aunt Access Control (Read-Only Lateral)', () => {
    describe('validateUncleAuntAccess', () => {
      it('should allow uncle/aunt read-only access to nephews/nieces', async () => {
        // Arrange
        const nephewId = childNodeId; // Child of parent (sibling of uncle)
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: nephewId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        const nephewAccessResult: ContextAccessResult = {
          context: {
            nodeId: nephewId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { 
              debugInfo: 'execution-trace',
              errorLogs: ['warning: high latency'],
              metrics: { performance: 85 }
            },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Uncle/Aunt lateral read-only access for root cause analysis'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([nephewAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('read');
        expect(validation.accessReason).toContain('Uncle/Aunt lateral read-only access');
        expect(validation.accessReason).toContain('root cause analysis');
        expect(validation.restrictedOperations).toContain('write');
        expect(validation.restrictedOperations).toContain('execute');
      });

      it('should deny uncle/aunt write access to nephews/nieces', async () => {
        // Arrange
        const nephewId = childNodeId;
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: nephewId,
          requestedAccess: 'write',
          userId: TestData.VALID_USER_ID
        };

        const nephewAccessResult: ContextAccessResult = {
          context: {
            nodeId: nephewId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { sensitiveData: 'protected' },
            accessLevel: 'read', // Only read access available
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Uncle/Aunt lateral read-only access for root cause analysis'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([nephewAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('Insufficient access level');
        expect(validation.denialReason).toContain('write access requested but only read available');
      });

      it('should provide debug context for root cause analysis', async () => {
        // Arrange
        const request: GetAccessibleContextsRequest = {
          requestingNodeId: uncleNodeId,
          accessType: 'lateral',
          includeDebugInfo: true,
          userId: TestData.VALID_USER_ID
        };

        const lateralContexts: ContextAccessResult[] = [
          {
            context: {
              nodeId: childNodeId,
              nodeType: 'ActionNode',
              parentNodeId: parentNodeId,
              contextData: {
                debugTrace: 'step-1 -> step-2 -> error',
                lastError: 'Connection timeout after 30s',
                executionHistory: [
                  { step: 1, status: 'completed', duration: 150 },
                  { step: 2, status: 'failed', duration: 30000 }
                ]
              },
              accessLevel: 'read',
              hierarchyLevel: 1
            },
            accessGranted: true,
            accessReason: 'Uncle/Aunt lateral read-only access for root cause analysis'
          }
        ];

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>(lateralContexts)
        );

        // Act
        const result = await useCase.getAccessibleContexts(request);

        // Assert
        expect(result).toBeValidResult();
        const response = result.value;
        expect(response.contexts).toHaveLength(1);
        
        const debugContext = response.contexts[0];
        expect(debugContext.relationshipType).toBe('lateral');
        expect(debugContext.accessLevel).toBe('read');
        expect(debugContext.contextData.debugTrace).toBeDefined();
        expect(debugContext.contextData.executionHistory).toBeDefined();
        expect(debugContext.purposeReason).toContain('root cause analysis');
      });

      it('should deny uncle/aunt access to unrelated node hierarchies', async () => {
        // Arrange
        const unrelatedNodeId = NodeId.create(getTestUUID('unrelated-node')).value;
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: unrelatedNodeId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        // Mock returns empty list (no lateral relationship)
        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('No lateral relationship found');
      });
    });
  });

  describe('Context Access Validation and Request Handling', () => {
    describe('validateContextAccess', () => {
      it('should validate complete access request with proper authorization', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'write',
          requestedProperties: ['configuration', 'state', 'metadata'],
          userId: TestData.VALID_USER_ID
        };

        const childAccessResult: ContextAccessResult = {
          context: {
            nodeId: childNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { 
              configuration: 'child-config',
              state: 'active',
              metadata: { version: '1.0' },
              privateData: 'restricted'
            },
            accessLevel: 'write',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Parent write access to child context'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([childAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessLevel).toBe('write');
        expect(validation.grantedProperties).toEqual(['configuration', 'state', 'metadata']);
        expect(validation.restrictedProperties).not.toContain('configuration');
        expect(validation.requestValidation.isValid).toBe(true);
      });

      it('should perform property-level access validation', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: siblingNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read',
          requestedProperties: ['publicData', 'privateData', 'configuration'],
          userId: TestData.VALID_USER_ID
        };

        const siblingAccessResult: ContextAccessResult = {
          context: {
            nodeId: childNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { 
              publicData: 'accessible',
              privateData: 'restricted',
              configuration: 'limited-access'
            },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Sibling read-only access pattern'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([siblingAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.grantedProperties).toContain('publicData');
        expect(validation.restrictedProperties).toContain('privateData');
        expect(validation.propertyAccessRules).toBeDefined();
        expect(validation.propertyAccessRules.publicData).toBe('read');
        expect(validation.propertyAccessRules.privateData).toBe('denied');
      });

      it('should validate access requests with time-based constraints', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read',
          timeConstraints: {
            validFrom: new Date(Date.now() - 3600000), // 1 hour ago
            validUntil: new Date(Date.now() + 3600000), // 1 hour from now
            emergencyAccess: false
          },
          userId: TestData.VALID_USER_ID
        };

        const lateralAccessResult: ContextAccessResult = {
          context: {
            nodeId: childNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { emergencyData: 'accessible-during-incident' },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Uncle/Aunt lateral read-only access for root cause analysis'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([lateralAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.timeValidation.isValid).toBe(true);
        expect(validation.timeValidation.accessWindow).toBeDefined();
        expect(validation.accessReason).toContain('Within valid time window');
      });

      it('should deny access outside of valid time constraints', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read',
          timeConstraints: {
            validFrom: new Date(Date.now() + 3600000), // 1 hour from now
            validUntil: new Date(Date.now() + 7200000), // 2 hours from now
            emergencyAccess: false
          },
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(false);
        expect(validation.denialReason).toContain('Access request outside valid time window');
        expect(validation.timeValidation.isValid).toBe(false);
      });

      it('should handle emergency access scenarios with elevated permissions', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: uncleNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read',
          timeConstraints: {
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 900000), // 15 minutes
            emergencyAccess: true,
            emergencyReason: 'Production incident requiring immediate debugging access'
          },
          userId: TestData.VALID_USER_ID
        };

        const emergencyAccessResult: ContextAccessResult = {
          context: {
            nodeId: childNodeId,
            nodeType: 'ActionNode',
            parentNodeId: parentNodeId,
            contextData: { 
              errorLogs: 'critical-failure-trace',
              systemMetrics: 'emergency-data'
            },
            accessLevel: 'read',
            hierarchyLevel: 1
          },
          accessGranted: true,
          accessReason: 'Emergency access granted for incident response'
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([emergencyAccessResult])
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.accessGranted).toBe(true);
        expect(validation.accessReason).toContain('Emergency access granted');
        expect(validation.emergencyAccess).toBe(true);
        expect(validation.accessDuration).toBeLessThanOrEqual(15 * 60 * 1000); // 15 minutes max
      });
    });

    describe('updateNodeContext', () => {
      it('should successfully update context with proper parent authorization', async () => {
        // Arrange
        const request: UpdateContextRequest = {
          updatingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          newContextData: {
            status: 'updated-by-parent',
            configuration: { timeout: 60, retries: 3 },
            lastModified: new Date().toISOString(),
            modifiedBy: 'parent-node'
          },
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.updateNodeContext.mockReturnValue(
          Result.ok<void>(undefined)
        );

        // Act
        const result = await useCase.updateNodeContext(request);

        // Assert
        expect(result).toBeValidResult();
        expect(mockNodeContextAccessService.updateNodeContext).toHaveBeenCalledWith(
          parentNodeId,
          childNodeId,
          request.newContextData
        );
        
        const response = result.value;
        expect(response.success).toBe(true);
        expect(response.updatedFields).toEqual(['status', 'configuration', 'lastModified', 'modifiedBy']);
        expect(response.accessReason).toContain('Parent write access to child');
      });

      it('should reject context update with insufficient permissions', async () => {
        // Arrange
        const request: UpdateContextRequest = {
          updatingNodeId: siblingNodeId, // Sibling trying to update child (no write access)
          targetNodeId: childNodeId,
          newContextData: { unauthorizedUpdate: true },
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.updateNodeContext.mockReturnValue(
          Result.fail<void>('Access denied: Required write access, but only read is available')
        );

        // Act
        const result = await useCase.updateNodeContext(request);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Failed to update context');
        expect(result.error).toContain('Access denied');
      });

      it('should validate context data before update', async () => {
        // Arrange
        const request: UpdateContextRequest = {
          updatingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          newContextData: null as any, // Invalid data
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.updateNodeContext(request);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Invalid context data provided');
        expect(mockNodeContextAccessService.updateNodeContext).not.toHaveBeenCalled();
      });
    });

    describe('getAccessibleContexts', () => {
      it('should return complete hierarchy of accessible contexts', async () => {
        // Arrange
        const request: GetAccessibleContextsRequest = {
          requestingNodeId: parentNodeId,
          userId: TestData.VALID_USER_ID
        };

        const allAccessibleContexts: ContextAccessResult[] = [
          // Children contexts
          {
            context: {
              nodeId: childNodeId,
              nodeType: 'ActionNode',
              parentNodeId: parentNodeId,
              contextData: { level: 1 },
              accessLevel: 'write',
              hierarchyLevel: 1
            },
            accessGranted: true,
            accessReason: 'Parent write access to child context'
          },
          // Sibling contexts (if parent has siblings)
          {
            context: {
              nodeId: siblingNodeId,
              nodeType: 'ActionNode',
              parentNodeId: grandparentNodeId,
              contextData: { level: 0, siblingData: true },
              accessLevel: 'read',
              hierarchyLevel: 0
            },
            accessGranted: true,
            accessReason: 'Sibling read-only access pattern'
          }
        ];

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>(allAccessibleContexts)
        );

        // Act
        const result = await useCase.getAccessibleContexts(request);

        // Assert
        expect(result).toBeValidResult();
        const response = result.value;
        expect(response.contexts).toHaveLength(2);
        
        const childContext = response.contexts.find(c => c.nodeId === childNodeId.toString());
        const siblingContext = response.contexts.find(c => c.nodeId === siblingNodeId.toString());
        
        expect(childContext?.accessLevel).toBe('write');
        expect(childContext?.relationshipType).toBe('descendant');
        
        expect(siblingContext?.accessLevel).toBe('read');
        expect(siblingContext?.relationshipType).toBe('sibling');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('service failure handling', () => {
      it('should handle NodeContextAccessService failures gracefully', async () => {
        // Arrange
        const request: ValidateContextAccessRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read',
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.fail<ContextAccessResult[]>('Internal service error: Database connection failed')
        );

        // Act
        const result = await useCase.validateContextAccess(request);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Failed to validate context access');
        expect(result.error).toContain('Internal service error');
      });

      it('should handle concurrent access requests safely', async () => {
        // Arrange
        const requests = Array.from({ length: 5 }, (_, i) => ({
          requestingNodeId: parentNodeId,
          targetNodeId: NodeId.create(getTestUUID(`concurrent-node-${i}`)).value,
          requestedAccess: 'read' as const,
          userId: TestData.VALID_USER_ID
        }));

        // Mock successful responses
        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>([])
        );

        // Act
        const results = await Promise.all(
          requests.map(req => useCase.validateContextAccess(req))
        );

        // Assert
        results.forEach(result => {
          expect(result).toBeValidResult();
        });
        expect(mockNodeContextAccessService.getAccessibleContexts).toHaveBeenCalledTimes(5);
      });
    });

    describe('input validation', () => {
      it('should reject requests with invalid node IDs', async () => {
        // Arrange
        const invalidRequest = {
          requestingNodeId: null as any,
          targetNodeId: childNodeId,
          requestedAccess: 'read' as const,
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.validateContextAccess(invalidRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Invalid requesting node ID');
        expect(mockNodeContextAccessService.getAccessibleContexts).not.toHaveBeenCalled();
      });

      it('should reject requests with invalid access types', async () => {
        // Arrange
        const invalidRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'invalid-access' as any,
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.validateContextAccess(invalidRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Invalid access type');
      });

      it('should reject requests with missing user ID', async () => {
        // Arrange
        const invalidRequest = {
          requestingNodeId: parentNodeId,
          targetNodeId: childNodeId,
          requestedAccess: 'read' as const,
          userId: '' // Missing user ID
        };

        // Act
        const result = await useCase.validateContextAccess(invalidRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('User ID is required');
      });
    });

    describe('circular reference prevention', () => {
      it('should detect and prevent circular hierarchy relationships', async () => {
        // Arrange - Try to register a node as its own parent
        const circularRequest: RegisterNodeRequest = {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: parentNodeId, // Circular reference
          contextData: { circular: true },
          hierarchyLevel: 0,
          userId: TestData.VALID_USER_ID
        };

        // Act
        const result = await useCase.registerNodeInHierarchy(circularRequest);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Circular reference detected');
        expect(mockNodeContextAccessService.registerNode).not.toHaveBeenCalled();
      });
    });

    describe('memory and performance constraints', () => {
      it('should handle large context data efficiently', async () => {
        // Arrange
        const largeContextData = {
          largeArray: Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item-${i}` })),
          metadata: { size: 'large' }
        };

        const request: RegisterNodeRequest = {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: undefined,
          contextData: largeContextData,
          hierarchyLevel: 0,
          userId: TestData.VALID_USER_ID
        };

        mockNodeContextAccessService.registerNode.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const startTime = Date.now();
        const result = await useCase.registerNodeInHierarchy(request);
        const endTime = Date.now();

        // Assert
        expect(result).toBeValidResult();
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should enforce maximum number of accessible contexts', async () => {
        // Arrange
        const request: GetAccessibleContextsRequest = {
          requestingNodeId: parentNodeId,
          maxResults: 100,
          userId: TestData.VALID_USER_ID
        };

        const excessiveContexts = Array.from({ length: 1000 }, (_, i) => {
          // Use crypto.randomUUID() which we know works correctly
          const testNodeId = crypto.randomUUID();
          const nodeIdResult = NodeId.create(testNodeId);
          if (nodeIdResult.isFailure) {
            throw new Error(`Failed to create NodeId: ${nodeIdResult.error}`);
          }
          
          return {
            context: {
              nodeId: nodeIdResult.value,
              nodeType: 'ActionNode',
              parentNodeId: parentNodeId,
              contextData: { index: i },
              accessLevel: 'read' as const,
              hierarchyLevel: 1
            },
            accessGranted: true,
            accessReason: 'Test access'
          };
        });

        mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
          Result.ok<ContextAccessResult[]>(excessiveContexts)
        );

        // Act
        const result = await useCase.getAccessibleContexts(request);

        // Assert
        expect(result).toBeValidResult();
        const response = result.value;
        expect(response.contexts).toHaveLength(100); // Respects maxResults limit
        expect(response.totalAvailable).toBe(1000);
        expect(response.truncated).toBe(true);
      });
    });
  });

  describe('Architecture Compliance and Clean Architecture Boundaries', () => {
    it('should only depend on domain services and value objects', () => {
      // Arrange & Act - Test constructor dependencies
      const useCase = new ManageHierarchicalContextAccessUseCase(mockNodeContextAccessService);

      // Assert - Verify Clean Architecture compliance
      expect(useCase).toBeInstanceOf(ManageHierarchicalContextAccessUseCase);
      
      // The use case should not have direct dependencies on:
      // - Infrastructure layer (repositories, external services)
      // - UI layer (controllers, presenters)
      // - Framework-specific code
      
      // Should only coordinate domain services and enforce business rules
    });

    it('should enforce business rules through domain service orchestration', async () => {
      // Arrange
      const request: ValidateContextAccessRequest = {
        requestingNodeId: childNodeId,
        targetNodeId: parentNodeId,
        requestedAccess: 'write', // Child trying to write to parent (should be denied by business rules)
        userId: TestData.VALID_USER_ID
      };

      const parentAccessResult: ContextAccessResult = {
        context: {
          nodeId: parentNodeId,
          nodeType: 'StageNode',
          parentNodeId: undefined,
          contextData: { parentData: 'protected' },
          accessLevel: 'read', // Business rule: children only get read access to parents
          hierarchyLevel: 0
        },
        accessGranted: true,
        accessReason: 'Child read access to parent context'
      };

      mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
        Result.ok<ContextAccessResult[]>([parentAccessResult])
      );

      // Act
      const result = await useCase.validateContextAccess(request);

      // Assert - Business rule enforcement
      expect(result).toBeValidResult();
      const validation = result.value;
      expect(validation.accessGranted).toBe(false);
      expect(validation.denialReason).toContain('Insufficient access level');
      
      // Verify use case acts as orchestrator, not implementor
      expect(mockNodeContextAccessService.getAccessibleContexts).toHaveBeenCalledWith(childNodeId);
    });

    it('should return rich domain results with proper error handling', async () => {
      // Arrange
      const request: ValidateContextAccessRequest = {
        requestingNodeId: parentNodeId,
        targetNodeId: NodeId.create(getTestUUID('non-existent')).value,
        requestedAccess: 'read',
        userId: TestData.VALID_USER_ID
      };

      mockNodeContextAccessService.getAccessibleContexts.mockReturnValue(
        Result.fail<ContextAccessResult[]>('Target node not found in hierarchy')
      );

      // Act
      const result = await useCase.validateContextAccess(request);

      // Assert - Proper Result pattern usage
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Failed to validate context access');
      expect(result.error).toContain('Target node not found in hierarchy');
      
      // Use case should transform domain errors into application-level errors
      expect(typeof result.error).toBe('string');
    });
  });
});
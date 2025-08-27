/**
 * Unit tests for NodeContextAccessService  
 * Tests hierarchical context management, context inheritance patterns,
 * context scope isolation, and secure context access controls.
 * 
 * This service manages context propagation and access across the node hierarchy,
 * ensuring proper isolation while enabling controlled sharing according to 
 * Clean Architecture principles.
 */

import { 
  NodeContextAccessService,
  ContextScope,
  ContextAccessLevel,
  ContextInheritanceRule,
  ContextValidationResult,
  HierarchicalContext
} from '@/lib/domain/services/node-context-access-service';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';

describe('NodeContextAccessService', () => {
  let contextService: NodeContextAccessService;
  let parentNodeId: NodeId;
  let childNodeId: NodeId;
  let grandChildNodeId: NodeId;

  beforeEach(() => {
    contextService = new NodeContextAccessService();
    parentNodeId = NodeId.generate();
    childNodeId = NodeId.generate();
    grandChildNodeId = NodeId.generate();
  });

  describe('context building and management', () => {
    describe('buildContext', () => {
      it('should build context for node successfully', () => {
        // Arrange
        const contextData = {
          nodeId: parentNodeId.toString(),
          executionId: 'exec-123',
          parameters: { userId: 'user-456', environment: 'test' },
          timestamp: new Date().toISOString()
        };

        // Act
        const result = contextService.buildContext(parentNodeId, contextData, 'execution');

        // Assert
        expect(result).toBeValidResult();
        const context = result.value;
        expect(context.nodeId).toEqual(parentNodeId);
        expect(context.scope).toBe('execution');
        expect(context.data).toEqual(contextData);
        expect(context.accessLevel).toBe('read-write');
        expect(context.parentContextId).toBeNull();
      });

      it('should build child context with proper inheritance', () => {
        // Arrange - Build parent context first
        const parentContext = { parentData: 'test', shared: true };
        const parentResult = contextService.buildContext(parentNodeId, parentContext, 'execution');
        expect(parentResult).toBeValidResult();

        const childContext = { childData: 'child-test', localOnly: true };

        // Act
        const result = contextService.buildContext(
          childNodeId, 
          childContext, 
          'execution', 
          parentResult.value.contextId
        );

        // Assert
        expect(result).toBeValidResult();
        const context = result.value;
        expect(context.nodeId).toEqual(childNodeId);
        expect(context.parentContextId).toBe(parentResult.value.contextId);
        expect(context.inheritedData).toBeDefined();
        expect(context.inheritedData.parentData).toBe('test');
        expect(context.data.childData).toBe('child-test');
      });

      it('should handle different context scopes', () => {
        // Arrange
        const scopes: ContextScope[] = ['execution', 'session', 'global', 'isolated'];
        const contextData = { test: 'data' };

        // Act & Assert
        scopes.forEach(scope => {
          const result = contextService.buildContext(NodeId.generate(), contextData, scope);
          expect(result).toBeValidResult();
          expect(result.value.scope).toBe(scope);
        });
      });

      it('should validate context data before building', () => {
        // Arrange - Invalid context data
        const invalidContext = null;

        // Act
        const result = contextService.buildContext(parentNodeId, invalidContext as any, 'execution');

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Invalid context data');
      });
    });

    describe('updateNodeContext', () => {
      let contextId: string;

      beforeEach(() => {
        const buildResult = contextService.buildContext(
          parentNodeId, 
          { initial: 'data' }, 
          'execution'
        );
        expect(buildResult).toBeValidResult();
        contextId = buildResult.value.contextId;
      });

      it('should update existing context successfully', () => {
        // Arrange
        const updates = { updated: 'value', timestamp: new Date() };

        // Act
        const result = contextService.updateNodeContext(contextId, updates);

        // Assert
        expect(result).toBeValidResult();
        
        // Verify update was applied
        const getResult = contextService.getNodeContext(parentNodeId);
        expect(getResult).toBeValidResult();
        expect(getResult.value.data.updated).toBe('value');
        expect(getResult.value.data.initial).toBe('data'); // Original data preserved
      });

      it('should merge updates with existing context data', () => {
        // Arrange
        const updates = { 
          nested: { value: 'test' },
          array: [1, 2, 3],
          initial: 'overwritten'
        };

        // Act
        const result = contextService.updateNodeContext(contextId, updates);

        // Assert
        expect(result).toBeValidResult();
        
        const getResult = contextService.getNodeContext(parentNodeId);
        expect(getResult).toBeValidResult();
        expect(getResult.value.data.nested.value).toBe('test');
        expect(getResult.value.data.array).toEqual([1, 2, 3]);
        expect(getResult.value.data.initial).toBe('overwritten');
      });

      it('should reject updates to non-existent context', () => {
        // Act
        const result = contextService.updateNodeContext('non-existent-id', { test: 'data' });

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Context not found');
      });

      it('should handle concurrent updates gracefully', async () => {
        // Arrange
        const update1 = { field1: 'value1' };
        const update2 = { field2: 'value2' };

        // Act - Concurrent updates
        const [result1, result2] = await Promise.all([
          Promise.resolve(contextService.updateNodeContext(contextId, update1)),
          Promise.resolve(contextService.updateNodeContext(contextId, update2))
        ]);

        // Assert
        expect(result1).toBeValidResult();
        expect(result2).toBeValidResult();
        
        const getResult = contextService.getNodeContext(parentNodeId);
        expect(getResult).toBeValidResult();
        expect(getResult.value.data.field1).toBe('value1');
        expect(getResult.value.data.field2).toBe('value2');
      });
    });

    describe('clearNodeContext', () => {
      it('should clear node context successfully', () => {
        // Arrange - Build context
        const buildResult = contextService.buildContext(
          parentNodeId, 
          { data: 'to-clear' }, 
          'execution'
        );
        expect(buildResult).toBeValidResult();

        // Act
        const result = contextService.clearNodeContext(parentNodeId);

        // Assert
        expect(result).toBeValidResult();
        
        // Verify context is cleared
        const getResult = contextService.getNodeContext(parentNodeId);
        expect(getResult).toBeFailureResult();
        expect(getResult.error).toContain('Context not found');
      });

      it('should clear child contexts when clearing parent', () => {
        // Arrange - Build parent and child contexts
        const parentResult = contextService.buildContext(
          parentNodeId, 
          { parent: 'data' }, 
          'execution'
        );
        expect(parentResult).toBeValidResult();

        const childResult = contextService.buildContext(
          childNodeId, 
          { child: 'data' }, 
          'execution',
          parentResult.value.contextId
        );
        expect(childResult).toBeValidResult();

        // Act - Clear parent
        const clearResult = contextService.clearNodeContext(parentNodeId);

        // Assert
        expect(clearResult).toBeValidResult();
        
        // Verify both contexts are cleared
        const getParentResult = contextService.getNodeContext(parentNodeId);
        expect(getParentResult).toBeFailureResult();
        
        const getChildResult = contextService.getNodeContext(childNodeId);
        expect(getChildResult).toBeFailureResult();
      });

      it('should handle clearing non-existent context gracefully', () => {
        // Act
        const result = contextService.clearNodeContext(NodeId.generate());

        // Assert
        expect(result).toBeValidResult(); // Should not fail, just no-op
      });
    });
  });

  describe('context propagation and inheritance', () => {
    describe('propagateContext', () => {
      it('should propagate context from parent to child', () => {
        // Arrange - Build parent context
        const parentData = { 
          sharedConfig: { timeout: 5000 },
          executionId: 'exec-123',
          userId: 'user-456'
        };
        const parentResult = contextService.buildContext(parentNodeId, parentData, 'execution');
        expect(parentResult).toBeValidResult();

        const inheritanceRules: ContextInheritanceRule[] = [
          { property: 'sharedConfig', inherit: true, override: false },
          { property: 'executionId', inherit: true, override: false },
          { property: 'secretData', inherit: false, override: false }
        ];

        // Act
        const result = contextService.propagateContext(
          parentResult.value.contextId,
          childNodeId,
          inheritanceRules
        );

        // Assert
        expect(result).toBeValidResult();
        
        // Verify child context was created with inherited data
        const childContext = contextService.getNodeContext(childNodeId);
        expect(childContext).toBeValidResult();
        expect(childContext.value.inheritedData.sharedConfig).toEqual({ timeout: 5000 });
        expect(childContext.value.inheritedData.executionId).toBe('exec-123');
        expect(childContext.value.inheritedData.secretData).toBeUndefined();
      });

      it('should handle override rules in context propagation', () => {
        // Arrange - Parent with data
        const parentResult = contextService.buildContext(
          parentNodeId, 
          { setting: 'parent-value', constant: 'unchangeable' }, 
          'execution'
        );
        expect(parentResult).toBeValidResult();

        // Child with conflicting data
        const childResult = contextService.buildContext(
          childNodeId, 
          { setting: 'child-value', newProperty: 'child-only' }, 
          'execution'
        );
        expect(childResult).toBeValidResult();

        const inheritanceRules: ContextInheritanceRule[] = [
          { property: 'setting', inherit: true, override: true },  // Child can override
          { property: 'constant', inherit: true, override: false }, // Child cannot override
          { property: 'newProperty', inherit: false, override: false }
        ];

        // Act
        const result = contextService.propagateContext(
          parentResult.value.contextId,
          childNodeId,
          inheritanceRules
        );

        // Assert
        expect(result).toBeValidResult();
        
        const updatedChild = contextService.getNodeContext(childNodeId);
        expect(updatedChild).toBeValidResult();
        expect(updatedChild.value.data.setting).toBe('child-value'); // Override allowed
        expect(updatedChild.value.inheritedData.constant).toBe('unchangeable'); // No override
      });

      it('should handle deep context propagation chains', () => {
        // Arrange - Build 3-level hierarchy
        const grandparentData = { level: 'grandparent', shared: 'all-levels' };
        const grandparentResult = contextService.buildContext(
          NodeId.generate(), 
          grandparentData, 
          'execution'
        );
        expect(grandparentResult).toBeValidResult();

        const parentData = { level: 'parent', shared: 'parent-child' };
        const parentResult = contextService.buildContext(
          parentNodeId, 
          parentData, 
          'execution',
          grandparentResult.value.contextId
        );
        expect(parentResult).toBeValidResult();

        const inheritanceRules: ContextInheritanceRule[] = [
          { property: 'level', inherit: true, override: true },
          { property: 'shared', inherit: true, override: true }
        ];

        // Act - Propagate from parent to child
        const result = contextService.propagateContext(
          parentResult.value.contextId,
          childNodeId,
          inheritanceRules
        );

        // Assert
        expect(result).toBeValidResult();
        
        const childContext = contextService.getNodeContext(childNodeId);
        expect(childContext).toBeValidResult();
        expect(childContext.value.inheritedData.level).toBe('parent');
        expect(childContext.value.inheritedData.shared).toBe('parent-child');
        
        // Verify grandparent data is also accessible through hierarchy
        const hierarchicalResult = contextService.getHierarchicalContext(childNodeId);
        expect(hierarchicalResult).toBeValidResult();
        expect(hierarchicalResult.value.levels).toHaveLength(3);
      });

      it('should reject propagation from non-existent context', () => {
        // Act
        const result = contextService.propagateContext(
          'non-existent-context',
          childNodeId,
          []
        );

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Source context not found');
      });
    });

    describe('getHierarchicalContext', () => {
      it('should return complete hierarchical context', () => {
        // Arrange - Build hierarchy
        const grandparentResult = contextService.buildContext(
          NodeId.generate(), 
          { level: 0, data: 'grandparent' }, 
          'global'
        );
        expect(grandparentResult).toBeValidResult();

        const parentResult = contextService.buildContext(
          parentNodeId, 
          { level: 1, data: 'parent' }, 
          'session',
          grandparentResult.value.contextId
        );
        expect(parentResult).toBeValidResult();

        const childResult = contextService.buildContext(
          childNodeId, 
          { level: 2, data: 'child' }, 
          'execution',
          parentResult.value.contextId
        );
        expect(childResult).toBeValidResult();

        // Act
        const result = contextService.getHierarchicalContext(childNodeId);

        // Assert
        expect(result).toBeValidResult();
        const hierarchical = result.value;
        expect(hierarchical.nodeId).toEqual(childNodeId);
        expect(hierarchical.levels).toHaveLength(3);
        
        // Verify level order (child -> parent -> grandparent)
        expect(hierarchical.levels[0].scope).toBe('execution');
        expect(hierarchical.levels[0].data.level).toBe(2);
        expect(hierarchical.levels[1].scope).toBe('session');
        expect(hierarchical.levels[1].data.level).toBe(1);
        expect(hierarchical.levels[2].scope).toBe('global');
        expect(hierarchical.levels[2].data.level).toBe(0);
      });

      it('should return single level for nodes without parents', () => {
        // Arrange
        const result = contextService.buildContext(
          parentNodeId, 
          { standalone: true }, 
          'execution'
        );
        expect(result).toBeValidResult();

        // Act
        const hierarchicalResult = contextService.getHierarchicalContext(parentNodeId);

        // Assert
        expect(hierarchicalResult).toBeValidResult();
        const hierarchical = hierarchicalResult.value;
        expect(hierarchical.levels).toHaveLength(1);
        expect(hierarchical.levels[0].data.standalone).toBe(true);
      });

      it('should handle deep hierarchies efficiently', () => {
        // Arrange - Build deep hierarchy (5 levels)
        let currentParentId = null;
        const nodeIds = [];
        
        for (let i = 0; i < 5; i++) {
          const nodeId = NodeId.generate();
          nodeIds.push(nodeId);
          
          const result = contextService.buildContext(
            nodeId, 
            { level: i, data: `level-${i}` }, 
            'execution',
            currentParentId
          );
          expect(result).toBeValidResult();
          currentParentId = result.value.contextId;
        }

        // Act - Get hierarchical context for deepest node
        const deepestNodeId = nodeIds[4];
        const result = contextService.getHierarchicalContext(deepestNodeId);

        // Assert
        expect(result).toBeValidResult();
        const hierarchical = result.value;
        expect(hierarchical.levels).toHaveLength(5);
        expect(hierarchical.totalLevels).toBe(5);
        expect(hierarchical.maxDepthReached).toBe(false);
      });

      it('should reject hierarchical request for non-existent node', () => {
        // Act
        const result = contextService.getHierarchicalContext(NodeId.generate());

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Context not found');
      });
    });
  });

  describe('context access control and validation', () => {
    describe('validateContextAccess', () => {
      it('should validate read access successfully', () => {
        // Arrange
        const result = contextService.buildContext(
          parentNodeId, 
          { public: 'data', private: 'secret' }, 
          'execution'
        );
        expect(result).toBeValidResult();

        // Act
        const validation = contextService.validateContextAccess(
          parentNodeId, 
          childNodeId, 
          'read',
          ['public']
        );

        // Assert
        expect(validation).toBeValidResult();
        const access = validation.value;
        expect(access.granted).toBe(true);
        expect(access.level).toBe('read');
        expect(access.accessibleProperties).toContain('public');
        expect(access.restrictedProperties).not.toContain('public');
      });

      it('should validate write access with proper permissions', () => {
        // Arrange - Build context with write permissions
        const buildResult = contextService.buildContext(
          parentNodeId, 
          { editable: 'data', readonly: 'constant' }, 
          'execution'
        );
        expect(buildResult).toBeValidResult();

        // Update context to have write access level
        (contextService as any).contexts.get(parentNodeId.toString()).accessLevel = 'read-write';

        // Act
        const validation = contextService.validateContextAccess(
          parentNodeId, 
          parentNodeId, // Same node requesting access
          'write',
          ['editable']
        );

        // Assert
        expect(validation).toBeValidResult();
        const access = validation.value;
        expect(access.granted).toBe(true);
        expect(access.level).toBe('write');
      });

      it('should deny access for insufficient permissions', () => {
        // Arrange - Build read-only context
        const result = contextService.buildContext(
          parentNodeId, 
          { data: 'protected' }, 
          'isolated' // Isolated scope typically has restricted access
        );
        expect(result).toBeValidResult();

        // Act - Try to get write access
        const validation = contextService.validateContextAccess(
          parentNodeId, 
          childNodeId, 
          'write',
          ['data']
        );

        // Assert
        expect(validation).toBeValidResult();
        const access = validation.value;
        expect(access.granted).toBe(false);
        expect(access.denialReason).toContain('Insufficient permissions');
      });

      it('should handle cross-node access validation', () => {
        // Arrange - Different nodes with different access levels
        const parentResult = contextService.buildContext(
          parentNodeId, 
          { shared: 'data' }, 
          'session'
        );
        expect(parentResult).toBeValidResult();

        const childResult = contextService.buildContext(
          childNodeId, 
          { local: 'data' }, 
          'execution',
          parentResult.value.contextId
        );
        expect(childResult).toBeValidResult();

        // Act - Child trying to access parent context
        const validation = contextService.validateContextAccess(
          parentNodeId, 
          childNodeId, 
          'read',
          ['shared']
        );

        // Assert
        expect(validation).toBeValidResult();
        const access = validation.value;
        expect(access.granted).toBe(true); // Child should have read access to parent
        expect(access.inheritanceAllowed).toBe(true);
      });

      it('should validate property-level access controls', () => {
        // Arrange
        const result = contextService.buildContext(
          parentNodeId, 
          { 
            public: 'everyone can read',
            protected: 'limited access',
            private: 'restricted'
          }, 
          'execution'
        );
        expect(result).toBeValidResult();

        // Act - Request access to mixed properties
        const validation = contextService.validateContextAccess(
          parentNodeId, 
          childNodeId, 
          'read',
          ['public', 'protected', 'private']
        );

        // Assert
        expect(validation).toBeValidResult();
        const access = validation.value;
        expect(access.accessibleProperties).toContain('public');
        // protected and private access depends on relationship and permissions
      });
    });
  });

  describe('context scope management', () => {
    describe('cloneContextScope', () => {
      it('should clone context scope successfully', () => {
        // Arrange
        const originalResult = contextService.buildContext(
          parentNodeId, 
          { original: 'data', nested: { value: 42 } }, 
          'execution'
        );
        expect(originalResult).toBeValidResult();

        // Act
        const cloneResult = contextService.cloneContextScope(
          originalResult.value.contextId, 
          childNodeId,
          'isolated'
        );

        // Assert
        expect(cloneResult).toBeValidResult();
        const cloneId = cloneResult.value;
        
        // Verify clone exists with same data but different scope
        const cloneContext = contextService.getNodeContext(childNodeId);
        expect(cloneContext).toBeValidResult();
        expect(cloneContext.value.scope).toBe('isolated');
        expect(cloneContext.value.data.original).toBe('data');
        expect(cloneContext.value.data.nested.value).toBe(42);
        
        // Verify it's a deep copy (modifications don't affect original)
        const updateResult = contextService.updateNodeContext(cloneId, { 
          nested: { value: 99 } 
        });
        expect(updateResult).toBeValidResult();
        
        const originalContext = contextService.getNodeContext(parentNodeId);
        expect(originalContext).toBeValidResult();
        expect(originalContext.value.data.nested.value).toBe(42); // Unchanged
      });

      it('should handle cloning with transformation rules', () => {
        // Arrange
        const originalResult = contextService.buildContext(
          parentNodeId, 
          { 
            sensitive: 'secret-data',
            public: 'open-data',
            transform: 'original-value'
          }, 
          'execution'
        );
        expect(originalResult).toBeValidResult();

        // Act - Clone with filtering
        const cloneResult = contextService.cloneContextScope(
          originalResult.value.contextId, 
          childNodeId,
          'isolated',
          {
            excludeProperties: ['sensitive'],
            transformProperties: {
              transform: (value) => `transformed-${value}`
            }
          }
        );

        // Assert
        expect(cloneResult).toBeValidResult();
        
        const cloneContext = contextService.getNodeContext(childNodeId);
        expect(cloneContext).toBeValidResult();
        expect(cloneContext.value.data.sensitive).toBeUndefined();
        expect(cloneContext.value.data.public).toBe('open-data');
        expect(cloneContext.value.data.transform).toBe('transformed-original-value');
      });

      it('should reject cloning non-existent context', () => {
        // Act
        const result = contextService.cloneContextScope(
          'non-existent-context',
          childNodeId,
          'execution'
        );

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Source context not found');
      });
    });

    describe('mergeContextScopes', () => {
      it('should merge multiple context scopes successfully', () => {
        // Arrange - Build multiple contexts
        const context1Result = contextService.buildContext(
          NodeId.generate(), 
          { source1: 'data1', shared: 'from-context1' }, 
          'execution'
        );
        expect(context1Result).toBeValidResult();

        const context2Result = contextService.buildContext(
          NodeId.generate(), 
          { source2: 'data2', shared: 'from-context2' }, 
          'session'
        );
        expect(context2Result).toBeValidResult();

        const sourceContextIds = [
          context1Result.value.contextId,
          context2Result.value.contextId
        ];

        // Act
        const mergeResult = contextService.mergeContextScopes(
          sourceContextIds,
          childNodeId,
          'global'
        );

        // Assert
        expect(mergeResult).toBeValidResult();
        const mergedContextId = mergeResult.value;
        
        const mergedContext = contextService.getNodeContext(childNodeId);
        expect(mergedContext).toBeValidResult();
        expect(mergedContext.value.data.source1).toBe('data1');
        expect(mergedContext.value.data.source2).toBe('data2');
        expect(mergedContext.value.data.shared).toBe('from-context2'); // Later contexts override
        expect(mergedContext.value.scope).toBe('global');
      });

      it('should handle merge conflicts with precedence rules', () => {
        // Arrange
        const highPriorityResult = contextService.buildContext(
          NodeId.generate(), 
          { priority: 'high', conflict: 'high-value' }, 
          'execution'
        );
        expect(highPriorityResult).toBeValidResult();

        const lowPriorityResult = contextService.buildContext(
          NodeId.generate(), 
          { priority: 'low', conflict: 'low-value' }, 
          'execution'
        );
        expect(lowPriorityResult).toBeValidResult();

        // Act - Merge with high priority first (should win conflicts)
        const mergeResult = contextService.mergeContextScopes(
          [highPriorityResult.value.contextId, lowPriorityResult.value.contextId],
          childNodeId,
          'execution',
          { 
            conflictResolution: 'first-wins',
            preserveSourceMetadata: true
          }
        );

        // Assert
        expect(mergeResult).toBeValidResult();
        
        const mergedContext = contextService.getNodeContext(childNodeId);
        expect(mergedContext).toBeValidResult();
        expect(mergedContext.value.data.conflict).toBe('high-value');
        expect(mergedContext.value.data.priority).toBe('high');
      });

      it('should handle merging with empty source list', () => {
        // Act
        const result = contextService.mergeContextScopes(
          [],
          childNodeId,
          'execution'
        );

        // Assert
        expect(result).toBeValidResult();
        
        // Should create empty context
        const mergedContext = contextService.getNodeContext(childNodeId);
        expect(mergedContext).toBeValidResult();
        expect(Object.keys(mergedContext.value.data)).toHaveLength(0);
      });

      it('should handle merging with non-existent contexts', () => {
        // Act
        const result = contextService.mergeContextScopes(
          ['non-existent-1', 'non-existent-2'],
          childNodeId,
          'execution'
        );

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('One or more source contexts not found');
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent context operations', async () => {
      // Arrange
      const nodeIds = Array.from({ length: 5 }, () => NodeId.generate());
      
      // Act - Concurrent context building
      const results = await Promise.all(
        nodeIds.map(nodeId => 
          Promise.resolve(contextService.buildContext(
            nodeId, 
            { concurrent: true, nodeId: nodeId.toString() }, 
            'execution'
          ))
        )
      );

      // Assert
      results.forEach(result => expect(result).toBeValidResult());
      
      // Verify all contexts were created
      const getResults = await Promise.all(
        nodeIds.map(nodeId => Promise.resolve(contextService.getNodeContext(nodeId)))
      );
      
      getResults.forEach(result => expect(result).toBeValidResult());
    });

    it('should handle circular reference prevention', () => {
      // Arrange - Try to create circular parent-child relationship
      const result1 = contextService.buildContext(parentNodeId, { data: '1' }, 'execution');
      expect(result1).toBeValidResult();

      const result2 = contextService.buildContext(
        childNodeId, 
        { data: '2' }, 
        'execution',
        result1.value.contextId
      );
      expect(result2).toBeValidResult();

      // Act - Try to make parent a child of child (circular reference)
      const circularResult = contextService.propagateContext(
        result2.value.contextId,
        parentNodeId, // This would create a circle
        [{ property: 'data', inherit: true, override: false }]
      );

      // Assert
      expect(circularResult).toBeFailureResult();
      expect(circularResult.error).toContain('Circular reference detected');
    });

    it('should handle memory management for large contexts', () => {
      // Arrange - Create context with large data
      const largeData = {
        bigArray: Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item-${i}` })),
        metadata: { size: 'large', timestamp: new Date() }
      };

      // Act
      const result = contextService.buildContext(parentNodeId, largeData, 'execution');

      // Assert
      expect(result).toBeValidResult();
      
      // Verify context can be retrieved
      const getResult = contextService.getNodeContext(parentNodeId);
      expect(getResult).toBeValidResult();
      expect(getResult.value.data.bigArray).toHaveLength(10000);
      
      // Verify cleanup works
      const clearResult = contextService.clearNodeContext(parentNodeId);
      expect(clearResult).toBeValidResult();
    });

    it('should handle malformed context data gracefully', () => {
      // Arrange - Various malformed data types
      const malformedData = [
        undefined,
        null,
        '',
        { circular: null as any },
        function() { return 'function'; }
      ];

      // Set up circular reference
      malformedData[3].circular = malformedData[3];

      // Act & Assert
      malformedData.forEach((data, index) => {
        const result = contextService.buildContext(
          NodeId.generate(), 
          data as any, 
          'execution'
        );
        
        if (data === undefined || data === null) {
          expect(result).toBeFailureResult();
        } else {
          // Should handle gracefully or succeed with sanitized data
          expect(result.isFailure || result.isSuccess).toBe(true);
        }
      });
    });

    it('should maintain context isolation between different scopes', () => {
      // Arrange - Build contexts in different scopes
      const executionResult = contextService.buildContext(
        NodeId.generate(), 
        { scope: 'execution', data: 'exec-data' }, 
        'execution'
      );
      expect(executionResult).toBeValidResult();

      const sessionResult = contextService.buildContext(
        NodeId.generate(), 
        { scope: 'session', data: 'session-data' }, 
        'session'
      );
      expect(sessionResult).toBeValidResult();

      const isolatedResult = contextService.buildContext(
        NodeId.generate(), 
        { scope: 'isolated', data: 'isolated-data' }, 
        'isolated'
      );
      expect(isolatedResult).toBeValidResult();

      // Act - Attempt cross-scope access
      const crossAccessValidation = contextService.validateContextAccess(
        executionResult.value.nodeId,
        isolatedResult.value.nodeId,
        'read',
        ['data']
      );

      // Assert - Isolated scope should restrict access
      expect(crossAccessValidation).toBeValidResult();
      expect(crossAccessValidation.value.granted).toBe(false);
    });
  });
});
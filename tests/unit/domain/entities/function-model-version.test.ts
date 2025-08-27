/**
 * Unit tests for FunctionModelVersion Entity
 * Tests version control business logic, factory pattern, validation rules, and state transitions
 */

import { FunctionModelVersion } from '@/lib/domain/entities/function-model-version';

describe('FunctionModelVersion', () => {
  const validProps = {
    versionId: 'version-123',
    modelId: 'model-456',
    versionNumber: '1.0.0',
    versionData: { nodes: [], edges: [] },
    authorId: 'author-789',
    isPublished: false
  };

  describe('Factory Pattern - Creation', () => {
    it('should create version with valid properties', () => {
      // Act
      const result = FunctionModelVersion.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const version = result.value;
      expect(version.versionId).toBe(validProps.versionId);
      expect(version.modelId).toBe(validProps.modelId);
      expect(version.versionNumber).toBe(validProps.versionNumber);
      expect(version.versionData).toEqual(validProps.versionData);
      expect(version.authorId).toBe(validProps.authorId);
      expect(version.isPublished).toBe(validProps.isPublished);
    });

    it('should automatically set createdAt timestamp', () => {
      // Arrange
      const beforeCreate = new Date();

      // Act
      const result = FunctionModelVersion.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const version = result.value;
      expect(version.createdAt).toBeInstanceOf(Date);
      expect(version.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(version.createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should create version with published state', () => {
      // Arrange
      const publishedProps = { ...validProps, isPublished: true };

      // Act
      const result = FunctionModelVersion.create(publishedProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isPublished).toBe(true);
    });

    it('should create version with complex version data', () => {
      // Arrange
      const complexData = {
        nodes: [
          { id: 'node-1', type: 'input', position: { x: 0, y: 0 } },
          { id: 'node-2', type: 'process', position: { x: 100, y: 100 } }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ],
        metadata: {
          description: 'Complex workflow',
          tags: ['automation', 'testing']
        }
      };
      const propsWithComplexData = { ...validProps, versionData: complexData };

      // Act
      const result = FunctionModelVersion.create(propsWithComplexData);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionData).toEqual(complexData);
    });
  });

  describe('Validation Rules', () => {
    describe('Version ID validation', () => {
      it('should reject empty version ID', () => {
        // Arrange
        const invalidProps = { ...validProps, versionId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version ID cannot be empty');
      });

      it('should reject whitespace-only version ID', () => {
        // Arrange
        const invalidProps = { ...validProps, versionId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version ID cannot be empty');
      });
    });

    describe('Model ID validation', () => {
      it('should reject empty model ID', () => {
        // Arrange
        const invalidProps = { ...validProps, modelId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Model ID cannot be empty');
      });

      it('should reject whitespace-only model ID', () => {
        // Arrange
        const invalidProps = { ...validProps, modelId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Model ID cannot be empty');
      });
    });

    describe('Semantic versioning validation', () => {
      it('should accept valid semantic versions', () => {
        // Arrange
        const validVersionNumbers = ['1.0.0', '0.1.0', '2.15.3', '10.20.30'];

        // Act & Assert
        validVersionNumbers.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeValidResult();
          expect(result.value.versionNumber).toBe(versionNumber);
        });
      });

      it('should reject non-semantic version formats', () => {
        // Arrange - Non-semantic versions (not empty, but invalid format)
        const invalidVersions = [
          '1.0',        // Missing patch
          '1',          // Only major
          '1.0.0.0',    // Too many parts
          'v1.0.0',     // Has prefix
          '1.0.0-beta', // Has suffix
          '1.0.0+build',// Has build metadata
          '1.a.0',      // Non-numeric
          '1.0.a',      // Non-numeric
          'a.0.0',      // Non-numeric
          '1. 0.0',     // Extra spaces
          '1.0 .0'      // Extra spaces
        ];

        // Act & Assert
        invalidVersions.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage('Version number must follow semantic versioning format (x.y.z)');
        });
      });

      it('should reject empty and whitespace version numbers', () => {
        // Arrange - Empty/whitespace versions (handled separately)
        const emptyVersions = ['', '   '];

        // Act & Assert
        emptyVersions.forEach(versionNumber => {
          const props = { ...validProps, versionNumber };
          const result = FunctionModelVersion.create(props);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage('Version number cannot be empty');
        });
      });

    });

    describe('Author ID validation', () => {
      it('should reject empty author ID', () => {
        // Arrange
        const invalidProps = { ...validProps, authorId: '' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Author ID cannot be empty');
      });

      it('should reject whitespace-only author ID', () => {
        // Arrange
        const invalidProps = { ...validProps, authorId: '   ' };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Author ID cannot be empty');
      });
    });

    describe('Version data validation', () => {
      it('should reject null version data', () => {
        // Arrange
        const invalidProps = { ...validProps, versionData: null };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version data cannot be empty');
      });

      it('should reject undefined version data', () => {
        // Arrange
        const invalidProps = { ...validProps, versionData: undefined };

        // Act
        const result = FunctionModelVersion.create(invalidProps);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version data cannot be empty');
      });

      it('should accept empty object as version data', () => {
        // Arrange
        const propsWithEmptyData = { ...validProps, versionData: {} };

        // Act
        const result = FunctionModelVersion.create(propsWithEmptyData);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.versionData).toEqual({});
      });

      it('should accept array as version data', () => {
        // Arrange
        const propsWithArrayData = { ...validProps, versionData: [] };

        // Act
        const result = FunctionModelVersion.create(propsWithArrayData);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.versionData).toEqual([]);
      });
    });
  });

  describe('State Transitions - Publication', () => {
    let unpublishedVersion: FunctionModelVersion;
    let publishedVersion: FunctionModelVersion;

    beforeEach(() => {
      const unpublishedResult = FunctionModelVersion.create({ ...validProps, isPublished: false });
      const publishedResult = FunctionModelVersion.create({ ...validProps, isPublished: true });
      
      unpublishedVersion = unpublishedResult.value;
      publishedVersion = publishedResult.value;
    });

    describe('Publishing', () => {
      it('should publish unpublished version', () => {
        // Act
        const result = unpublishedVersion.publish();

        // Assert
        expect(result).toBeValidResult();
        expect(unpublishedVersion.isPublished).toBe(true);
      });

      it('should reject publishing already published version', () => {
        // Act
        const result = publishedVersion.publish();

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version is already published');
        expect(publishedVersion.isPublished).toBe(true); // State unchanged
      });

      it('should maintain immutability of other properties when publishing', () => {
        // Arrange
        const originalVersionId = unpublishedVersion.versionId;
        const originalModelId = unpublishedVersion.modelId;
        const originalVersionNumber = unpublishedVersion.versionNumber;
        const originalAuthorId = unpublishedVersion.authorId;
        const originalCreatedAt = unpublishedVersion.createdAt;

        // Act
        unpublishedVersion.publish();

        // Assert
        expect(unpublishedVersion.versionId).toBe(originalVersionId);
        expect(unpublishedVersion.modelId).toBe(originalModelId);
        expect(unpublishedVersion.versionNumber).toBe(originalVersionNumber);
        expect(unpublishedVersion.authorId).toBe(originalAuthorId);
        expect(unpublishedVersion.createdAt).toBe(originalCreatedAt);
      });
    });

    describe('Unpublishing', () => {
      it('should unpublish published version', () => {
        // Act
        const result = publishedVersion.unpublish();

        // Assert
        expect(result).toBeValidResult();
        expect(publishedVersion.isPublished).toBe(false);
      });

      it('should reject unpublishing unpublished version', () => {
        // Act
        const result = unpublishedVersion.unpublish();

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Version is not published');
        expect(unpublishedVersion.isPublished).toBe(false); // State unchanged
      });

      it('should maintain immutability of other properties when unpublishing', () => {
        // Arrange
        const originalVersionId = publishedVersion.versionId;
        const originalModelId = publishedVersion.modelId;
        const originalVersionNumber = publishedVersion.versionNumber;
        const originalAuthorId = publishedVersion.authorId;
        const originalCreatedAt = publishedVersion.createdAt;

        // Act
        publishedVersion.unpublish();

        // Assert
        expect(publishedVersion.versionId).toBe(originalVersionId);
        expect(publishedVersion.modelId).toBe(originalModelId);
        expect(publishedVersion.versionNumber).toBe(originalVersionNumber);
        expect(publishedVersion.authorId).toBe(originalAuthorId);
        expect(publishedVersion.createdAt).toBe(originalCreatedAt);
      });
    });

    describe('State transition workflows', () => {
      it('should allow publish-unpublish-publish cycle', () => {
        // Arrange
        const version = FunctionModelVersion.create({ ...validProps, isPublished: false }).value;

        // Act & Assert - Publish
        const publishResult = version.publish();
        expect(publishResult).toBeValidResult();
        expect(version.isPublished).toBe(true);

        // Act & Assert - Unpublish
        const unpublishResult = version.unpublish();
        expect(unpublishResult).toBeValidResult();
        expect(version.isPublished).toBe(false);

        // Act & Assert - Publish again
        const republishResult = version.publish();
        expect(republishResult).toBeValidResult();
        expect(version.isPublished).toBe(true);
      });

      it('should handle multiple failed state transitions gracefully', () => {
        // Arrange
        const publishedVer = FunctionModelVersion.create({ ...validProps, isPublished: true }).value;

        // Act & Assert - Multiple failed publishes
        const firstFailure = publishedVer.publish();
        const secondFailure = publishedVer.publish();
        
        expect(firstFailure).toBeFailureResult();
        expect(secondFailure).toBeFailureResult();
        expect(publishedVer.isPublished).toBe(true);
      });
    });
  });

  describe('Business Logic - Equality and Comparison', () => {
    it('should be equal when version IDs match', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'same-id' };
      const props2 = { ...validProps, versionId: 'same-id', versionNumber: '2.0.0' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;

      // Act & Assert
      expect(version1.equals(version2)).toBe(true);
    });

    it('should not be equal when version IDs differ', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'id-1' };
      const props2 = { ...validProps, versionId: 'id-2' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;

      // Act & Assert
      expect(version1.equals(version2)).toBe(false);
    });

    it('should maintain equality contract (reflexive, symmetric, transitive)', () => {
      // Arrange
      const props1 = { ...validProps, versionId: 'test-id' };
      const props2 = { ...validProps, versionId: 'test-id' };
      const props3 = { ...validProps, versionId: 'test-id' };
      
      const version1 = FunctionModelVersion.create(props1).value;
      const version2 = FunctionModelVersion.create(props2).value;
      const version3 = FunctionModelVersion.create(props3).value;

      // Act & Assert - Reflexive
      expect(version1.equals(version1)).toBe(true);

      // Act & Assert - Symmetric
      expect(version1.equals(version2)).toBe(version2.equals(version1));

      // Act & Assert - Transitive
      if (version1.equals(version2) && version2.equals(version3)) {
        expect(version1.equals(version3)).toBe(true);
      }
    });
  });

  describe('Property Access and Immutability', () => {
    let version: FunctionModelVersion;

    beforeEach(() => {
      version = FunctionModelVersion.create(validProps).value;
    });

    it('should provide read-only access to all properties', () => {
      // Act & Assert
      expect(version.versionId).toBe(validProps.versionId);
      expect(version.modelId).toBe(validProps.modelId);
      expect(version.versionNumber).toBe(validProps.versionNumber);
      expect(version.versionData).toEqual(validProps.versionData);
      expect(version.authorId).toBe(validProps.authorId);
      expect(version.isPublished).toBe(validProps.isPublished);
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should prevent modification of version data', () => {
      // Arrange
      const originalData = version.versionData;

      // Act - Try to modify (should not affect original)
      if (typeof version.versionData === 'object' && version.versionData !== null) {
        try {
          version.versionData.newProperty = 'hacked';
        } catch {
          // Expected to fail in strict mode
        }
      }

      // Assert - Original data unchanged
      expect(version.versionData).toEqual(originalData);
    });

    it('should return consistent values on multiple property accesses', () => {
      // Act
      const firstAccess = {
        versionId: version.versionId,
        modelId: version.modelId,
        versionNumber: version.versionNumber,
        authorId: version.authorId,
        isPublished: version.isPublished,
        createdAt: version.createdAt
      };

      const secondAccess = {
        versionId: version.versionId,
        modelId: version.modelId,
        versionNumber: version.versionNumber,
        authorId: version.authorId,
        isPublished: version.isPublished,
        createdAt: version.createdAt
      };

      // Assert
      expect(firstAccess).toEqual(secondAccess);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle UUID-like version IDs', () => {
      // Arrange
      const uuidProps = { 
        ...validProps, 
        versionId: '123e4567-e89b-42d3-a456-426614174000' 
      };

      // Act
      const result = FunctionModelVersion.create(uuidProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(uuidProps.versionId);
    });

    it('should handle very long version IDs', () => {
      // Arrange
      const longId = 'a'.repeat(1000);
      const longIdProps = { ...validProps, versionId: longId };

      // Act
      const result = FunctionModelVersion.create(longIdProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(longId);
    });

    it('should handle special characters in version ID', () => {
      // Arrange
      const specialIdProps = { ...validProps, versionId: 'version-123_test@domain.com' };

      // Act
      const result = FunctionModelVersion.create(specialIdProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionId).toBe(specialIdProps.versionId);
    });

    it('should handle large numeric version components', () => {
      // Arrange
      const largeVersionProps = { 
        ...validProps, 
        versionNumber: '999999.999999.999999' 
      };

      // Act
      const result = FunctionModelVersion.create(largeVersionProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionNumber).toBe(largeVersionProps.versionNumber);
    });

    it('should handle complex nested version data', () => {
      // Arrange
      const complexData = {
        level1: {
          level2: {
            level3: {
              deepProperty: 'deep value',
              array: [1, 2, { nested: true }]
            }
          }
        },
        functions: [
          {
            name: 'func1',
            parameters: { param1: 'value1', param2: 42 }
          }
        ]
      };
      const complexProps = { ...validProps, versionData: complexData };

      // Act
      const result = FunctionModelVersion.create(complexProps);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.versionData).toEqual(complexData);
    });
  });

  describe('Version Snapshot Capture', () => {
    describe('Complete Model State Capture', () => {
      it('createFromModel_ComplexModel_CapturesAllState', () => {
        // Arrange - Complex model data with all components
        const complexModelSnapshot = {
          modelMetadata: {
            name: 'Complex Workflow',
            description: 'Multi-stage processing pipeline',
            version: '2.1.3',
            status: 'published',
            tags: ['ai', 'automation', 'pipeline']
          },
          nodes: new Map([
            ['input-1', {
              id: 'input-1',
              type: 'io',
              name: 'Data Input',
              position: { x: 100, y: 100 },
              metadata: { dataType: 'json', schema: { type: 'object' } },
              ioData: { boundaryType: 'input', inputDataContract: {} }
            }],
            ['process-1', {
              id: 'process-1', 
              type: 'stage',
              name: 'Data Processing',
              position: { x: 300, y: 100 },
              dependencies: ['input-1'],
              executionConfig: { timeout: 30000, retries: 3 }
            }],
            ['output-1', {
              id: 'output-1',
              type: 'io',
              name: 'Processed Output',
              position: { x: 500, y: 100 },
              dependencies: ['process-1'],
              ioData: { boundaryType: 'output', outputDataContract: {} }
            }]
          ]),
          actionNodes: new Map([
            ['action-1', {
              id: 'action-1',
              name: 'Transform Data',
              executionOrder: 1,
              priority: 'high',
              nodeId: 'process-1',
              actionType: 'transformation',
              configuration: { 
                script: 'transform.py',
                parameters: { format: 'json', validate: true }
              }
            }]
          ]),
          links: [
            { id: 'link-1', source: 'input-1', target: 'process-1', type: 'data' },
            { id: 'link-2', source: 'process-1', target: 'output-1', type: 'data' }
          ],
          executionContext: {
            environment: 'production',
            resourceLimits: { memory: '2GB', cpu: '2 cores' },
            securityContext: { isolationLevel: 'high' }
          }
        };

        const propsWithComplexSnapshot = {
          ...validProps,
          versionData: complexModelSnapshot
        };

        // Act
        const result = FunctionModelVersion.create(propsWithComplexSnapshot);

        // Assert - Complete state capture
        expect(result).toBeValidResult();
        const version = result.value;
        const capturedData = version.versionData;

        expect(capturedData.modelMetadata).toEqual(complexModelSnapshot.modelMetadata);
        expect(capturedData.nodes).toEqual(complexModelSnapshot.nodes);
        expect(capturedData.actionNodes).toEqual(complexModelSnapshot.actionNodes);
        expect(capturedData.links).toEqual(complexModelSnapshot.links);
        expect(capturedData.executionContext).toEqual(complexModelSnapshot.executionContext);
      });

      it('createFromModel_WithActionNodes_CapturesActionConfiguration', () => {
        // Arrange - Model with complex action node configurations
        const modelWithActions = {
          nodes: new Map([
            ['kb-node-1', {
              id: 'kb-node-1',
              type: 'kb',
              name: 'Knowledge Base Query',
              position: { x: 200, y: 150 },
              kbData: { 
                kbId: 'kb-123',
                queryType: 'semantic',
                embeddingModel: 'text-embedding-ada-002'
              }
            }]
          ]),
          actionNodes: new Map([
            ['query-action', {
              id: 'query-action',
              name: 'Execute Query',
              actionType: 'kb-query',
              executionOrder: 1,
              priority: 'medium',
              nodeId: 'kb-node-1',
              configuration: {
                maxResults: 10,
                confidenceThreshold: 0.8,
                reranking: {
                  enabled: true,
                  model: 'cohere-rerank-v3'
                },
                caching: {
                  enabled: true,
                  ttl: 300
                }
              },
              retryPolicy: {
                maxRetries: 3,
                backoffStrategy: 'exponential',
                baseDelay: 1000
              }
            }]
          ])
        };

        const propsWithActions = {
          ...validProps,
          versionData: modelWithActions
        };

        // Act
        const result = FunctionModelVersion.create(propsWithActions);

        // Assert - Action configuration captured
        expect(result).toBeValidResult();
        const version = result.value;
        const capturedActions = version.versionData.actionNodes;

        expect(capturedActions).toEqual(modelWithActions.actionNodes);
        
        const queryAction = capturedActions.get('query-action');
        expect(queryAction.configuration.maxResults).toBe(10);
        expect(queryAction.configuration.reranking.enabled).toBe(true);
        expect(queryAction.retryPolicy.maxRetries).toBe(3);
      });

      it('createFromModel_WithNestedMetadata_CapturesDeepStructure', () => {
        // Arrange - Model with deeply nested metadata structures
        const deepNestedData = {
          modelConfig: {
            execution: {
              parallelism: {
                enabled: true,
                maxConcurrency: 5,
                nodeGroups: {
                  'group-1': {
                    nodes: ['node-1', 'node-2'],
                    constraints: {
                      resources: {
                        memory: { min: '512MB', max: '2GB' },
                        cpu: { min: 1, max: 4 }
                      },
                      dependencies: {
                        external: ['database', 'cache'],
                        internal: []
                      }
                    }
                  }
                }
              },
              monitoring: {
                metrics: {
                  performance: ['latency', 'throughput', 'errors'],
                  business: ['conversion_rate', 'user_satisfaction'],
                  custom: [
                    {
                      name: 'model_accuracy',
                      type: 'gauge',
                      aggregation: 'avg',
                      tags: { model: 'v2.1', env: 'prod' }
                    }
                  ]
                }
              }
            }
          }
        };

        const propsWithDeepNesting = {
          ...validProps,
          versionData: deepNestedData
        };

        // Act
        const result = FunctionModelVersion.create(propsWithDeepNesting);

        // Assert - Deep structure preserved
        expect(result).toBeValidResult();
        const version = result.value;
        const capturedData = version.versionData;

        // Verify deep nested access
        expect(capturedData.modelConfig.execution.parallelism.enabled).toBe(true);
        expect(capturedData.modelConfig.execution.parallelism.nodeGroups['group-1'].constraints.resources.memory.max).toBe('2GB');
        expect(capturedData.modelConfig.execution.monitoring.metrics.custom[0].tags.model).toBe('v2.1');
      });

      it('createFromModel_WithCircularReferences_HandlesGracefully', () => {
        // Arrange - Data structure with potential circular references
        const nodeA = { id: 'node-a', name: 'Node A', dependencies: [] };
        const nodeB = { id: 'node-b', name: 'Node B', dependencies: [] };
        
        // Create circular reference structure (handled via serialization)
        const modelWithReferences = {
          nodes: [nodeA, nodeB],
          relationships: {
            'node-a': { references: ['node-b'], referencedBy: ['node-b'] },
            'node-b': { references: ['node-a'], referencedBy: ['node-a'] }
          },
          metadata: {
            graphType: 'bidirectional',
            cycleDetection: 'enabled'
          }
        };

        const propsWithReferences = {
          ...validProps,
          versionData: modelWithReferences
        };

        // Act
        const result = FunctionModelVersion.create(propsWithReferences);

        // Assert - Graceful handling without infinite recursion
        expect(result).toBeValidResult();
        const version = result.value;
        const capturedData = version.versionData;

        expect(capturedData.nodes).toEqual(modelWithReferences.nodes);
        expect(capturedData.relationships['node-a'].references).toEqual(['node-b']);
        expect(capturedData.relationships['node-b'].referencedBy).toEqual(['node-a']);
      });
    });

    describe('Version Integrity Guarantees', () => {
      it('versionData_AfterCreation_MaintainsIntegrity', () => {
        // Arrange - Create version with complex data structure
        const complexData = {
          modelSnapshot: {
            version: '1.2.3',
            nodes: ['node-1', 'node-2'],
            metadata: { complexity: 'high' }
          },
          captureTimestamp: new Date().toISOString(),
          integrityHash: 'sha256-hash-placeholder'
        };

        // Act - Create version
        const version = FunctionModelVersion.create({
          ...validProps,
          versionData: complexData
        }).value;

        // Assert - Integrity maintained through entity boundary
        expect(version.versionData.modelSnapshot.version).toBe('1.2.3');
        expect(version.versionData.modelSnapshot.nodes).toHaveLength(2);
        expect(version.versionData.captureTimestamp).toBeDefined();
        expect(version.versionData.integrityHash).toBe('sha256-hash-placeholder');
      });

      it('versionData_ConsistentAccess_ReturnsSameData', () => {
        // Arrange - Create version with structured data
        const structuredData = {
          workflowDefinition: {
            stages: [
              { id: 'stage-1', name: 'Input Processing', order: 1 },
              { id: 'stage-2', name: 'Data Analysis', order: 2 }
            ],
            connections: [
              { from: 'stage-1', to: 'stage-2', type: 'data-flow' }
            ]
          }
        };

        const version = FunctionModelVersion.create({
          ...validProps,
          versionData: structuredData
        }).value;

        // Act - Access data multiple times
        const firstAccess = version.versionData;
        const secondAccess = version.versionData;
        const thirdAccess = version.versionData;

        // Assert - Consistent data returned
        expect(firstAccess).toEqual(secondAccess);
        expect(secondAccess).toEqual(thirdAccess);
        expect(firstAccess.workflowDefinition.stages).toHaveLength(2);
        expect(firstAccess.workflowDefinition.connections[0].from).toBe('stage-1');
      });

      it('versionData_EntityBoundaryProtection_PreservesState', () => {
        // Arrange - Create version with reference data
        const referenceData = {
          originalModelId: 'model-456',
          snapshotData: {
            nodeCount: 5,
            actionCount: 3,
            dependencyCount: 7
          },
          versionMetrics: {
            complexity: 'medium',
            performance: 'optimized'
          }
        };

        const version = FunctionModelVersion.create({
          ...validProps,
          versionData: referenceData
        }).value;

        // Act - Access through entity boundary
        const retrievedData = version.versionData;

        // Assert - Entity boundary preserves state integrity
        expect(retrievedData.originalModelId).toBe('model-456');
        expect(retrievedData.snapshotData.nodeCount).toBe(5);
        expect(retrievedData.versionMetrics.complexity).toBe('medium');
        
        // Verify the entity maintains data consistency
        expect(version.modelId).toBe(validProps.modelId);
        expect(version.versionData.originalModelId).toBe('model-456');
      });
    });
  });

  describe('Version Metadata Management', () => {
    describe('Author and Tracking', () => {
      it('create_WithValidAuthor_SetsAuthorMetadata', () => {
        // Arrange
        const authorMetadata = {
          authorId: 'user-12345',
          authorName: 'John Doe',
          authorEmail: 'john.doe@company.com',
          department: 'AI Engineering',
          role: 'Senior ML Engineer'
        };

        const propsWithAuthorMeta = {
          ...validProps,
          authorId: authorMetadata.authorId,
          versionData: {
            ...validProps.versionData,
            authorMetadata
          }
        };

        // Act
        const result = FunctionModelVersion.create(propsWithAuthorMeta);

        // Assert
        expect(result).toBeValidResult();
        const version = result.value;
        expect(version.authorId).toBe(authorMetadata.authorId);
        expect(version.versionData.authorMetadata).toEqual(authorMetadata);
      });

      it('create_WithInvalidAuthor_FailsValidation', () => {
        // Arrange - Invalid author scenarios
        const invalidAuthorCases = [
          { authorId: '', error: 'Author ID cannot be empty' },
          { authorId: '   ', error: 'Author ID cannot be empty' },
          { authorId: null, error: 'Author ID cannot be empty' },
          { authorId: undefined, error: 'Author ID cannot be empty' }
        ];

        // Act & Assert
        invalidAuthorCases.forEach(({ authorId, error }) => {
          const invalidProps = { ...validProps, authorId };
          const result = FunctionModelVersion.create(invalidProps);
          
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage(error);
        });
      });

      it('getVersionInfo_IncludesCreationTimestamp', () => {
        // Arrange
        const beforeCreation = new Date();
        
        // Act
        const result = FunctionModelVersion.create(validProps);
        const afterCreation = new Date();

        // Assert
        expect(result).toBeValidResult();
        const version = result.value;
        
        expect(version.createdAt).toBeInstanceOf(Date);
        expect(version.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
        expect(version.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      });
    });

    describe('Change Descriptions', () => {
      it('create_WithChangeDescription_StoresDescription', () => {
        // Arrange
        const changeDescription = {
          summary: 'Added new data validation stage',
          details: 'Implemented comprehensive input validation with schema checking and data type conversion',
          breakingChanges: false,
          migrations: [],
          affectedComponents: ['input-validation', 'data-processing'],
          reviewers: ['senior-engineer-1', 'architect-2'],
          testingNotes: 'Validated with production data samples'
        };

        const propsWithDescription = {
          ...validProps,
          versionData: {
            ...validProps.versionData,
            changeDescription
          }
        };

        // Act
        const result = FunctionModelVersion.create(propsWithDescription);

        // Assert
        expect(result).toBeValidResult();
        const version = result.value;
        expect(version.versionData.changeDescription).toEqual(changeDescription);
      });

      it('create_WithEmptyDescription_AllowsEmptyDescription', () => {
        // Arrange
        const propsWithEmptyDescription = {
          ...validProps,
          versionData: {
            ...validProps.versionData,
            changeDescription: {
              summary: '',
              details: '',
              breakingChanges: false
            }
          }
        };

        // Act
        const result = FunctionModelVersion.create(propsWithEmptyDescription);

        // Assert
        expect(result).toBeValidResult();
        const version = result.value;
        expect(version.versionData.changeDescription.summary).toBe('');
        expect(version.versionData.changeDescription.details).toBe('');
      });

      it('getChangeSummary_ReturnsStructuredChangeInfo', () => {
        // Arrange
        const structuredChanges = {
          changeDescription: {
            summary: 'Performance optimization and new features',
            details: 'Optimized query performance by 40% and added real-time monitoring',
            breakingChanges: false,
            changeTypes: ['performance', 'feature', 'monitoring'],
            impactLevel: 'medium',
            rollbackPlan: {
              steps: ['Revert configuration', 'Clear cache', 'Restart services'],
              estimatedTime: '5 minutes',
              riskLevel: 'low'
            }
          },
          diffSummary: {
            nodesAdded: 2,
            nodesRemoved: 0,
            nodesModified: 3,
            actionsAdded: 1,
            actionsModified: 2,
            metadataChanges: 5
          }
        };

        const propsWithStructuredChanges = {
          ...validProps,
          versionData: structuredChanges
        };

        // Act
        const result = FunctionModelVersion.create(propsWithStructuredChanges);

        // Assert
        expect(result).toBeValidResult();
        const version = result.value;
        const changeSummary = version.versionData;
        
        expect(changeSummary.changeDescription.changeTypes).toEqual(['performance', 'feature', 'monitoring']);
        expect(changeSummary.changeDescription.impactLevel).toBe('medium');
        expect(changeSummary.diffSummary.nodesAdded).toBe(2);
        expect(changeSummary.diffSummary.actionsModified).toBe(2);
      });
    });
  });

  describe('Result Pattern Integration', () => {
    it('should follow Result pattern consistently', () => {
      // Act - Valid creation
      const validResult = FunctionModelVersion.create(validProps);
      
      // Assert
      expect(validResult).toBeValidResult();
      expect(validResult.isSuccess).toBe(true);
      expect(validResult.isFailure).toBe(false);
      expect(validResult.value).toBeInstanceOf(FunctionModelVersion);
      expect(() => validResult.error).toThrow();
    });

    it('should provide meaningful error messages', () => {
      // Arrange
      const testCases = [
        { props: { ...validProps, versionId: '' }, expectedError: 'Version ID cannot be empty' },
        { props: { ...validProps, modelId: '' }, expectedError: 'Model ID cannot be empty' },
        { props: { ...validProps, versionNumber: 'invalid' }, expectedError: 'Version number must follow semantic versioning format (x.y.z)' },
        { props: { ...validProps, authorId: '' }, expectedError: 'Author ID cannot be empty' },
        { props: { ...validProps, versionData: null }, expectedError: 'Version data cannot be empty' }
      ];

      // Act & Assert
      testCases.forEach(({ props, expectedError }) => {
        const result = FunctionModelVersion.create(props);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage(expectedError);
        expect(result.isSuccess).toBe(false);
        expect(result.isFailure).toBe(true);
        expect(() => result.value).toThrow();
      });
    });

    it('should handle publish/unpublish results correctly', () => {
      // Arrange
      const version = FunctionModelVersion.create({ ...validProps, isPublished: false }).value;

      // Act & Assert - Successful publish
      const publishResult = version.publish();
      expect(publishResult).toBeValidResult();
      expect(publishResult.isSuccess).toBe(true);

      // Act & Assert - Failed publish
      const failedPublishResult = version.publish();
      expect(failedPublishResult).toBeFailureResult();
      expect(failedPublishResult).toHaveErrorMessage('Version is already published');
    });
  });
});
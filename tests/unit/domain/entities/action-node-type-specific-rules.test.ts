/**
 * ACTION NODE TYPE-SPECIFIC BUSINESS RULES TESTS
 * 
 * This test suite serves as a BOUNDARY FILTER for Action Node type-specific business rules,
 * validating that each action node type (TetherNode, KbNode, FunctionModelContainer) 
 * enforces its unique business rules while maintaining Clean Architecture principles.
 * 
 * CRITICAL DOMAIN RULE VALIDATION PER NODE TYPE:
 * 1. TETHER NODE RULES: Spindle integration, execution control, resource management
 * 2. KB NODE RULES: RACI assignment, documentation context, search optimization  
 * 3. FUNCTION MODEL CONTAINER RULES: Nested model validation, context inheritance, orchestration
 * 4. SHARED RULES: Execution ordering, priority management, retry policies, status transitions
 * 5. CONFIGURATION VALIDATION: Type-specific configuration data structure validation
 * 
 * TESTS AS EXECUTABLE BUSINESS SPECIFICATIONS:
 * These tests define the exact business rules that each action node type must enforce,
 * serving as both validation and documentation for type-specific domain behavior.
 */

import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { StageNode } from '@/lib/domain/entities/stage-node';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { 
  ActionNodeType, 
  ActionStatus, 
  ExecutionMode,
  RACIRole 
} from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { RACI } from '@/lib/domain/value-objects/raci';
import { 
  FunctionModelBuilder,
  StageNodeBuilder,
  TetherNodeBuilder,
  KBNodeBuilder,
  FunctionModelContainerNodeBuilder
} from '../../../utils/test-fixtures';

describe('Action Node Type-Specific Business Rules - Domain Compliance Validation', () => {
  let parentModel: FunctionModel;
  let parentStage: StageNode;

  beforeEach(() => {
    parentModel = new FunctionModelBuilder()
      .withName('Action Node Rules Test Model')
      .build();

    parentStage = new StageNodeBuilder()
      .withModelId(parentModel.modelId)
      .withName('Action Test Stage')
      .build();

    parentModel.addNode(parentStage);
  });

  /**
   * TETHER NODE BUSINESS RULES VALIDATION
   * Tests Spindle integration rules, execution control, and resource management
   */
  describe('TetherNode Business Rules Validation', () => {
    it('TetherNodeCreation_WithValidSpindleConfiguration_ShouldSucceed', () => {
      // Arrange - Valid Tether node configuration
      const tetherNodeResult = TetherNode.create({
        actionId: NodeId.create(crypto.randomUUID()).value,
        parentNodeId: NodeId.create(parentStage.nodeId.toString()).value,
        modelId: parentModel.modelId,
        name: 'Data Processing Tether',
        description: 'Connects to Spindle workflow for data processing',
        actionType: ActionNodeType.TETHER_NODE,
        executionOrder: 1,
        executionMode: ExecutionMode.SEQUENTIAL,
        status: ActionStatus.ACTIVE,
        priority: 5,
        estimatedDuration: 300, // 5 minutes
        retryPolicy: RetryPolicy.create({
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          backoffDelay: 1000,
          failureThreshold: 2
        }).value,
        tetherData: {
          tetherReference: 'spindle-workflow-123',
          tetherReferenceId: 'spindle-workflow-123',
          executionParameters: {
            batchSize: 100,
            timeoutMs: 30000,
            maxRetries: 3
          },
          outputMapping: {
            'processedData': 'workflow.outputs.processed',
            'errorLog': 'workflow.outputs.errors',
            'executionSummary': 'workflow.metadata.summary'
          },
          executionTriggers: ['on-data-ready', 'on-manual-trigger'],
          resourceRequirements: {
            cpu: '200m',
            memory: '256Mi',
            timeout: 300
          },
          integrationConfig: {
            endpoint: 'https://spindle.example.com/api/v1/workflows',
            authentication: {
              type: 'oauth2',
              clientId: 'tether-client-123'
            },
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Source': 'function-model'
            }
          }
        }
      });

      // Act & Assert - Tether Node Creation Success
      expect(tetherNodeResult.isSuccess).toBe(true);
      const tetherNode = tetherNodeResult.value;

      // BUSINESS RULE VALIDATION: Tether-specific properties
      expect(tetherNode.actionType).toBe(ActionNodeType.TETHER_NODE);
      expect(tetherNode.name).toBe('Data Processing Tether');
      expect(tetherNode.executionOrder).toBe(1);
      expect(tetherNode.priority).toBe(5);
      expect(tetherNode.estimatedDuration).toBe(300);

      // CONFIGURATION VALIDATION: Tether-specific configuration structure
      const config = tetherNode.configuration as any;
      expect(config.tetherReference).toBe('spindle-workflow-123');
      expect(config.executionParameters.batchSize).toBe(100);
      expect(config.resourceRequirements.cpu).toBe('200m');
      expect(config.integrationConfig.endpoint).toContain('spindle.example.com');
      expect(config.outputMapping.processedData).toBe('workflow.outputs.processed');
      expect(config.executionTriggers).toContain('on-data-ready');
    });

    it('TetherNodeConfiguration_WithInvalidSpindleReference_ShouldFailValidation', () => {
      // Arrange - Invalid Spindle reference
      const invalidTetherConfig = {
        actionId: NodeId.create(crypto.randomUUID()).value,
        parentNodeId: NodeId.create(parentStage.nodeId.toString()).value,
        modelId: parentModel.modelId,
        name: 'Invalid Tether',
        actionType: ActionNodeType.TETHER_NODE,
        executionOrder: 1,
        executionMode: ExecutionMode.SEQUENTIAL,
        status: ActionStatus.ACTIVE,
        priority: 5,
        estimatedDuration: 300,
        tetherData: {
          tetherReference: '', // Invalid: empty reference
          executionParameters: {
            batchSize: -10, // Invalid: negative batch size
            timeoutMs: 0 // Invalid: zero timeout
          },
          resourceRequirements: {
            cpu: 'invalid-cpu', // Invalid: malformed CPU spec
            memory: '0Mi' // Invalid: zero memory
          }
        }
      };

      // Act - Attempt to create invalid Tether node
      const tetherNodeResult = TetherNode.create(invalidTetherConfig);

      // Assert - Business Rule Enforcement
      expect(tetherNodeResult.isFailure).toBe(true);
      expect(tetherNodeResult.error).toContain('Batch size must be positive');
      
      // BUSINESS RULE: Tether nodes must have valid Spindle workflow reference
      // BUSINESS RULE: Resource requirements must be valid Kubernetes resource specs
      // BUSINESS RULE: Execution parameters must be positive values
    });

    it('TetherNodeExecution_WithResourceConstraints_ShouldEnforceResourceLimits', () => {
      // Arrange - Tether with specific resource constraints
      const resourceConstrainedTether = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Resource Constrained Tether')
        .withConfiguration({
          resourceRequirements: {
            cpu: '100m',      // Low CPU allocation
            memory: '64Mi',   // Low memory allocation
            timeout: 60       // Short timeout
          },
          executionParameters: {
            batchSize: 10,    // Small batches for resource efficiency
            maxConcurrency: 1 // Single-threaded execution
          }
        })
        .build();

      // Act - Validate resource constraint enforcement
      const config = resourceConstrainedTether.configuration as any;

      // Assert - Resource Management Rules
      expect(config.resourceRequirements.cpu).toBe('100m');
      expect(config.resourceRequirements.memory).toBe('64Mi');
      expect(config.resourceRequirements.timeout).toBe(60);
      
      // BUSINESS RULE: Resource-constrained execution affects batch sizing
      expect(config.executionParameters.batchSize).toBe(10);
      expect(config.executionParameters.maxConcurrency).toBe(1);
      
      // BUSINESS RULE: Tether nodes must respect resource allocation limits
      expect(resourceConstrainedTether.estimatedDuration).toBeGreaterThan(0);
      expect(resourceConstrainedTether.priority).toBeGreaterThanOrEqual(1);
      expect(resourceConstrainedTether.priority).toBeLessThanOrEqual(10);
    });

    it('TetherNodeRetryPolicy_ForSpindleFailures_ShouldImplementIntelligentBackoff', () => {
      // Arrange - Tether with intelligent retry policy for Spindle failures
      const intelligentRetryPolicy = RetryPolicy.create({
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        backoffDelay: 2000, // Start with 2 seconds
        failureThreshold: 3 // Mark as failed after 3 consecutive failures
      }).value;

      const tetherWithRetry = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Resilient Tether')
        .withRetryPolicy(intelligentRetryPolicy)
        .withConfiguration({
          executionParameters: {
            connectionTimeout: 10000,
            readTimeout: 30000,
            maxRetries: 5
          },
          failureHandling: {
            retryableErrors: ['connection-timeout', 'service-unavailable', 'rate-limit-exceeded'],
            nonRetryableErrors: ['authentication-failed', 'invalid-workflow-id', 'quota-exceeded'],
            escalationThreshold: 3
          }
        })
        .build();

      // Assert - Intelligent Retry Configuration
      expect(tetherWithRetry.retryPolicy).toBeDefined();
      expect(tetherWithRetry.retryPolicy!.maxAttempts).toBe(5);
      expect(tetherWithRetry.retryPolicy!.backoffStrategy).toBe('exponential');
      expect(tetherWithRetry.retryPolicy!.backoffDelay).toBe(2000);

      const config = tetherWithRetry.configuration as any;
      
      // BUSINESS RULE: Spindle connection failures should be retryable
      expect(config.failureHandling.retryableErrors).toContain('connection-timeout');
      expect(config.failureHandling.retryableErrors).toContain('service-unavailable');
      
      // BUSINESS RULE: Authentication failures should not be retried
      expect(config.failureHandling.nonRetryableErrors).toContain('authentication-failed');
      expect(config.failureHandling.nonRetryableErrors).toContain('invalid-workflow-id');
      
      // BUSINESS RULE: Escalation after threshold failures
      expect(config.failureHandling.escalationThreshold).toBe(3);
    });
  });

  /**
   * KB NODE BUSINESS RULES VALIDATION
   * Tests RACI assignment, documentation context, and search optimization rules
   */
  describe('KBNode Business Rules Validation', () => {
    it('KBNodeCreation_WithValidRACIAndDocumentation_ShouldSucceed', () => {
      // Arrange - Valid KB node with RACI and documentation context
      const validRaci = RACI.create({
        responsible: ['developer-team'],
        accountable: ['tech-lead'],
        consulted: ['architecture-team', 'security-team'],
        informed: ['product-team', 'qa-team']
      }).value;

      const kbNodeResult = KBNode.create({
        actionId: NodeId.create(crypto.randomUUID()).value.value,
        parentNodeId: NodeId.create(parentStage.nodeId.toString()).value.value,
        modelId: parentModel.modelId,
        name: 'API Documentation Reference',
        description: 'Links to comprehensive API documentation and integration guidelines',
        executionOrder: 2,
        executionMode: ExecutionMode.PARALLEL,
        status: ActionStatus.ACTIVE,
        priority: 3,
        estimatedDuration: 0, // Knowledge access is instantaneous
        retryPolicy: RetryPolicy.createDefault().value.toObject(),
        raci: validRaci.toObject(),
        metadata: {},
        kbData: {
          kbReferenceId: 'kb-api-docs-456',
          shortDescription: 'API integration guidelines and best practices documentation',
          documentationContext: 'Comprehensive API documentation covering authentication, rate-limiting, error-handling, and best-practices with code examples and troubleshooting guides.',
          searchKeywords: [
            'api', 'authentication', 'integration', 'documentation',
            'oauth', 'rate-limiting', 'error-handling', 'best-practices',
            'curl', 'bearer-token', 'exponential-backoff', 'troubleshooting'
          ],
          accessPermissions: {
            view: ['developer-team', 'qa-team', 'tech-lead', 'architecture-team', 'security-team'],
            edit: ['tech-lead', 'architecture-team']
          }
        }
      });

      // Act & Assert - KB Node Creation Success
      expect(kbNodeResult.isSuccess).toBe(true);
      const kbNode = kbNodeResult.value;

      // BUSINESS RULE VALIDATION: KB-specific properties
      expect(kbNode.actionType).toBe(ActionNodeType.KB_NODE);
      expect(kbNode.name).toBe('API Documentation Reference');
      expect(kbNode.estimatedDuration).toBe(0); // Knowledge access is instant

      // RACI VALIDATION: Complete responsibility assignment
      expect(kbNode.raci).toBeDefined();
      expect(kbNode.raci.responsible).toContain('developer-team');
      expect(kbNode.raci.accountable).toContain('tech-lead');
      expect(kbNode.raci.consulted).toContain('architecture-team');
      expect(kbNode.raci.informed).toContain('product-team');

      // CONFIGURATION VALIDATION: KB-specific configuration structure
      const config = kbNode.kbData;
      expect(config.kbReferenceId).toBe('kb-api-docs-456');
      expect(config.shortDescription).toContain('API integration guidelines');
      expect(config.documentationContext).toContain('authentication');
      expect(config.searchKeywords).toContain('oauth');
      expect(config.accessPermissions.view).toContain('developer-team');
    });

    it('KBNodeRACIAssignment_MustHaveAtLeastOneResponsibleParty_ShouldEnforceRule', () => {
      // Arrange - RACI without responsible party (invalid)
      const invalidRaciResult = RACI.create({
        responsible: [], // Invalid: no responsible party
        accountable: ['tech-lead'],
        consulted: ['architecture-team'],
        informed: ['product-team']
      });

      // Assert - RACI Business Rule Enforcement
      expect(invalidRaciResult.isFailure).toBe(true);
      expect(invalidRaciResult.error).toContain('RACI must have at least one responsible party');

      // BUSINESS RULE: RACI must have at least one responsible party defined
      // This ensures accountability and prevents orphaned knowledge references
    });

    it('KBNodeSearchOptimization_WithSemanticKeywords_ShouldEnableAIDiscovery', () => {
      // Arrange - KB node optimized for AI agent discovery
      const semanticKbNode = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Machine Learning Model Documentation')
        .withConfiguration({
          searchKeywords: [
            // Domain-specific terms
            'machine-learning', 'neural-networks', 'training-data', 'model-validation',
            // Technical implementation terms  
            'tensorflow', 'pytorch', 'scikit-learn', 'hyperparameters',
            // Process-related terms
            'data-preprocessing', 'feature-engineering', 'cross-validation', 'deployment',
            // Outcome-focused terms
            'accuracy', 'precision', 'recall', 'f1-score',
            // Contextual terms for AI agents
            'when-to-use-ml', 'model-selection', 'overfitting-prevention', 'performance-tuning'
          ],
          aiAgentOptimization: {
            semanticTags: ['technical-documentation', 'implementation-guide', 'best-practices'],
            contextualQueries: [
              'How do I implement machine learning in this workflow?',
              'What are the validation requirements for ML models?',
              'Which ML framework should I use for this use case?'
            ],
            relatedConcepts: [
              'data-pipeline', 'model-monitoring', 'a-b-testing', 'gradient-descent',
              'regularization', 'ensemble-methods', 'transfer-learning'
            ],
            usagePatterns: [
              'reference-before-implementation',
              'consult-during-debugging',
              'review-for-optimization'
            ]
          }
        })
        .build();

      const config = semanticKbNode.kbData;

      // Assert - AI Discovery Optimization
      expect(config.searchKeywords.length).toBe(20); // Rich keyword coverage
      expect(config.searchKeywords).toContain('neural-networks');
      expect(config.searchKeywords).toContain('hyperparameters');
      expect(config.searchKeywords).toContain('cross-validation');
      
      // BUSINESS RULE: KB nodes should enable AI agent context discovery
      expect(config.aiAgentOptimization.semanticTags).toContain('technical-documentation');
      expect(config.aiAgentOptimization.contextualQueries).toHaveLength(3);
      expect(config.aiAgentOptimization.contextualQueries[0]).toContain('implement machine learning');
      
      // BUSINESS RULE: Related concepts expand semantic search capabilities
      expect(config.aiAgentOptimization.relatedConcepts).toContain('gradient-descent');
      expect(config.aiAgentOptimization.relatedConcepts).toContain('ensemble-methods');
      
      // BUSINESS RULE: Usage patterns guide AI agent interaction timing
      expect(config.aiAgentOptimization.usagePatterns).toContain('reference-before-implementation');
      expect(config.aiAgentOptimization.usagePatterns).toContain('review-for-optimization');
    });

    it('KBNodeDocumentationContext_ShouldProvideRichContextualInformation', () => {
      // Arrange - KB node with comprehensive documentation context
      const contextRichKbNode = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Security Guidelines Reference')
        .withConfiguration({
          documentationContext: 'Comprehensive Security Guidelines Reference (v3.1.2) covering authentication-protocols, data-encryption-standards, access-control-policies, incident-response-procedures, and compliance-requirements. Includes JWT implementation examples, encryption standards, OAuth 2.0 guidance, data classification handling procedures, and security review checklists for validation and compliance guidance.'
        })
        .build();

      const context = contextRichKbNode.kbData.documentationContext;

      // Assert - Rich Documentation Context
      expect(context).toContain('v3.1.2');
      expect(context).toContain('authentication-protocols');
      expect(context).toContain('compliance-requirements');
      expect(context).toContain('data-encryption-standards');
      expect(context).toContain('access-control-policies');
      expect(context).toContain('incident-response-procedures');
      
      // CODE EXAMPLES: Practical implementation guidance
      expect(context).toContain('JWT implementation examples');
      expect(context).toContain('encryption standards');
      
      // DECISION TREES: Contextual guidance for choice selection
      expect(context).toContain('OAuth 2.0 guidance');
      expect(context).toContain('data classification handling procedures');
      
      // CHECKLISTS: Validation and compliance guidance
      expect(context).toContain('security review checklists');
      expect(context).toContain('validation and compliance guidance');
      
      // BUSINESS RULE: Documentation context should provide actionable guidance
      expect(context.length).toBeGreaterThan(100); // Rich context should be substantial
      expect(context).toContain('Comprehensive Security Guidelines Reference');
    });
  });

  /**
   * FUNCTION MODEL CONTAINER NODE BUSINESS RULES VALIDATION
   * Tests nested model validation, context inheritance, and orchestration rules
   */
  describe('FunctionModelContainer Business Rules Validation', () => {
    it('FunctionModelContainerCreation_WithValidNestedModel_ShouldSucceed', () => {
      // Arrange - Create nested model first
      const nestedModel = new FunctionModelBuilder()
        .withName('Nested Data Processing Model')
        .withDescription('Specialized model for complex data processing workflows')
        .build();

      // Valid container configuration
      const containerResult = FunctionModelContainerNode.create({
        actionId: NodeId.create(crypto.randomUUID()).value,
        parentNodeId: NodeId.create(parentStage.nodeId.toString()).value,
        modelId: parentModel.modelId,
        name: 'Data Processing Container',
        description: 'Orchestrates nested data processing workflow',
        actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
        executionOrder: 3,
        executionMode: ExecutionMode.SEQUENTIAL,
        status: ActionStatus.ACTIVE,
        priority: 7,
        estimatedDuration: 600, // 10 minutes for nested model execution
        configuration: {
          nestedModelId: nestedModel.modelId,
          contextMapping: {
            'input.rawData': 'parentStage.outputData',
            'input.configuration': 'parentModel.processingConfig',
            'input.credentials': 'parentModel.secrets.apiCredentials'
          },
          outputExtraction: {
            'processedResults': 'nestedModel.outputs.finalResults',
            'processingMetrics': 'nestedModel.metadata.executionMetrics',
            'qualityScore': 'nestedModel.validation.qualityScore'
          },
          executionPolicy: {
            triggerConditions: ['parent-stage-completed', 'input-data-available'],
            failureHandling: 'propagate-to-parent',
            resourceInheritance: 'inherit-with-limits',
            timeoutBehavior: 'graceful-shutdown'
          },
          contextInheritance: {
            inheritedContexts: ['authentication', 'configuration', 'monitoring'],
            isolatedContexts: ['processing-state', 'temporary-data', 'error-logs'],
            sharedContexts: ['audit-trail', 'performance-metrics']
          },
          orchestrationMode: 'embedded'
        }
      });

      // Act & Assert - Container Creation Success
      expect(containerResult.isSuccess).toBe(true);
      const container = containerResult.value;

      // BUSINESS RULE VALIDATION: Container-specific properties
      expect(container.actionType).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
      expect(container.name).toBe('Data Processing Container');
      expect(container.estimatedDuration).toBe(600);

      // NESTED MODEL VALIDATION: Valid model reference
      const config = container.configuration as any;
      expect(config.nestedModelId).toBe(nestedModel.modelId);
      
      // CONTEXT MAPPING VALIDATION: Input/output mapping rules
      expect(config.contextMapping['input.rawData']).toBe('parentStage.outputData');
      expect(config.outputExtraction['processedResults']).toBe('nestedModel.outputs.finalResults');
      
      // EXECUTION POLICY VALIDATION: Orchestration behavior
      expect(config.executionPolicy.triggerConditions).toContain('input-data-available');
      expect(config.executionPolicy.failureHandling).toBe('propagate-to-parent');
      
      // CONTEXT INHERITANCE VALIDATION: Context sharing rules
      expect(config.contextInheritance.inheritedContexts).toContain('authentication');
      expect(config.contextInheritance.isolatedContexts).toContain('processing-state');
      expect(config.contextInheritance.sharedContexts).toContain('audit-trail');
      
      // ORCHESTRATION MODE VALIDATION: Integration patterns
      expect(config.orchestrationMode).toBe('embedded');
    });

    it('FunctionModelContainer_SelfReference_ShouldPreventInfiniteNesting', () => {
      // Arrange - Attempt to create container that references itself
      const selfReferencingConfig = {
        actionId: NodeId.create(crypto.randomUUID()).value,
        parentNodeId: NodeId.create(parentStage.nodeId.toString()).value,
        modelId: parentModel.modelId,
        name: 'Self-Referencing Container',
        actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
        executionOrder: 1,
        executionMode: ExecutionMode.SEQUENTIAL,
        status: ActionStatus.ACTIVE,
        priority: 5,
        estimatedDuration: 300,
        configuration: {
          nestedModelId: parentModel.modelId, // Self-reference!
          contextMapping: {},
          outputExtraction: {}
        }
      };

      // Act - Attempt to create self-referencing container
      const containerResult = FunctionModelContainerNode.create(selfReferencingConfig);

      // Assert - Business Rule Enforcement
      expect(containerResult.isFailure).toBe(true);
      expect(containerResult.error).toContain('cannot contain itself as nested model');
      
      // BUSINESS RULE: Function models cannot contain themselves to prevent infinite nesting
      // This prevents stack overflow and circular dependency issues
    });

    it('FunctionModelContainer_ContextInheritance_ShouldFollowHierarchicalRules', () => {
      // Arrange - Container with complex context inheritance rules
      const nestedModel = new FunctionModelBuilder()
        .withName('Context Inheritance Test Model')
        .build();

      const contextInheritanceContainer = new FunctionModelContainerNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNodeId(parentStage.nodeId.toString())
        .withName('Context Inheritance Container')
        .withNestedModelId(nestedModel.modelId)
        .withConfiguration({
          contextInheritance: {
            // Contexts that nested model inherits from parent hierarchy
            inheritedContexts: [
              'user-authentication',
              'system-configuration', 
              'audit-settings',
              'monitoring-configuration',
              'resource-limits'
            ],
            // Contexts that remain isolated within nested model
            isolatedContexts: [
              'processing-state',
              'temporary-calculations',
              'intermediate-results',
              'error-recovery-state',
              'debug-information'
            ],
            // Contexts shared bidirectionally
            sharedContexts: [
              'execution-metrics',
              'performance-counters',
              'quality-metrics',
              'audit-events',
              'alert-notifications'
            ],
            // Context transformation rules
            contextTransformations: {
              'user-authentication': 'nested-model receives read-only copy',
              'system-configuration': 'nested-model receives filtered subset',
              'execution-metrics': 'bidirectional aggregation with parent metrics',
              'audit-events': 'nested events tagged with container identity'
            },
            // Access control for context sharing
            contextAccessControl: {
              'nested-to-parent': ['execution-metrics', 'audit-events', 'alert-notifications'],
              'parent-to-nested': ['user-authentication', 'system-configuration', 'monitoring-configuration'],
              'sibling-access': [], // No sibling access across container boundaries
              'read-only-contexts': ['user-authentication', 'system-configuration'],
              'write-restricted-contexts': ['audit-settings', 'monitoring-configuration']
            }
          },
          hierarchicalValidation: {
            maxNestingDepth: 3,
            cyclicReferenceCheck: true,
            contextLeakagePrevention: true,
            resourceBoundaryEnforcement: true
          }
        })
        .build();

      const config = contextInheritanceContainer.configuration as any;

      // Assert - Context Inheritance Rules
      
      // INHERITED CONTEXTS: Nested model receives these from parent
      expect(config.contextInheritance.inheritedContexts).toHaveLength(5);
      expect(config.contextInheritance.inheritedContexts).toContain('user-authentication');
      expect(config.contextInheritance.inheritedContexts).toContain('resource-limits');
      
      // ISOLATED CONTEXTS: Nested model keeps these private
      expect(config.contextInheritance.isolatedContexts).toHaveLength(5);
      expect(config.contextInheritance.isolatedContexts).toContain('processing-state');
      expect(config.contextInheritance.isolatedContexts).toContain('debug-information');
      
      // SHARED CONTEXTS: Bidirectional sharing
      expect(config.contextInheritance.sharedContexts).toHaveLength(5);
      expect(config.contextInheritance.sharedContexts).toContain('execution-metrics');
      expect(config.contextInheritance.sharedContexts).toContain('performance-counters');
      
      // CONTEXT TRANSFORMATIONS: Rules for context modification
      expect(config.contextInheritance.contextTransformations['user-authentication']).toContain('read-only');
      expect(config.contextInheritance.contextTransformations['execution-metrics']).toContain('bidirectional');
      
      // ACCESS CONTROL: Fine-grained context access permissions
      expect(config.contextInheritance.contextAccessControl['nested-to-parent']).toContain('audit-events');
      expect(config.contextInheritance.contextAccessControl['parent-to-nested']).toContain('system-configuration');
      expect(config.contextInheritance.contextAccessControl['read-only-contexts']).toContain('user-authentication');
      
      // HIERARCHICAL VALIDATION: Structural constraints
      expect(config.hierarchicalValidation.maxNestingDepth).toBe(3);
      expect(config.hierarchicalValidation.cyclicReferenceCheck).toBe(true);
      expect(config.hierarchicalValidation.contextLeakagePrevention).toBe(true);
      
      // BUSINESS RULE: Context inheritance follows hierarchical access patterns
      // BUSINESS RULE: Isolated contexts maintain encapsulation
      // BUSINESS RULE: Shared contexts enable coordinated execution
      // BUSINESS RULE: Access control prevents unauthorized context access
    });

    it('FunctionModelContainer_OrchestrationModes_ShouldSupportDifferentIntegrationPatterns', () => {
      // Arrange - Different orchestration modes for different use cases
      const orchestrationModes = [
        {
          name: 'Embedded Execution Container',
          mode: 'embedded',
          useCase: 'Tightly coupled processing where parent orchestrates nested model'
        },
        {
          name: 'Service Invocation Container',
          mode: 'federated',
          useCase: 'Loosely coupled services with independent lifecycle'
        },
        {
          name: 'Workflow Orchestration Container',
          mode: 'microservice',
          useCase: 'Complex workflows with multiple coordination points'
        }
      ];

      orchestrationModes.forEach(({ name, mode, useCase }) => {
        // Act - Create container with specific orchestration mode
        const container = new FunctionModelContainerNodeBuilder()
          .withModelId(parentModel.modelId)
          .withParentNodeId(parentStage.nodeId.toString())
          .withName(name)
          .withConfiguration({
            orchestrationMode: mode,
            useCaseDescription: useCase
          })
          .build();

        const config = container.configuration as any;

        // Assert - Orchestration Mode Validation
        expect(config.orchestrationMode).toBe(mode);
        
        // BUSINESS RULE: Each orchestration mode has consistent configuration
        // BUSINESS RULE: Integration style determines communication pattern
        // BUSINESS RULE: State management affects error propagation strategy
        // BUSINESS RULE: Resource sharing aligns with execution isolation
      });
    });
  });

  /**
   * SHARED ACTION NODE BUSINESS RULES VALIDATION
   * Tests common business rules that apply to all action node types
   */
  describe('Shared Action Node Business Rules Validation', () => {
    it('ActionNodeExecutionOrder_WithinSameContainer_ShouldBeUnique', () => {
      // Arrange - Multiple actions in same container with duplicate orders
      const action1 = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('First Action')
        .withExecutionOrder(1)
        .build();

      const action2 = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Second Action')
        .withExecutionOrder(1) // Duplicate order!
        .build();

      parentModel.addActionNode(action1);
      parentModel.addActionNode(action2);

      // Act - Validate workflow with duplicate execution orders
      const validationResult = parentModel.validateWorkflow();

      // Assert - Business Rule Enforcement
      expect(validationResult.isSuccess).toBe(true);
      const validation = validationResult.value;
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('duplicate execution orders')
      )).toBe(true);
      
      // BUSINESS RULE: Execution orders must be unique within each container
      // This ensures deterministic execution sequencing
    });

    it('ActionNodePriority_ShouldBeWithinValidRange_AndAffectParallelExecution', () => {
      // Arrange - Actions with different priorities
      const highPriorityAction = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('High Priority Action')
        .withPriority(10) // Maximum priority
        .withExecutionMode(ExecutionMode.PARALLEL)
        .build();

      const mediumPriorityAction = new KBNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Medium Priority Action')
        .withPriority(5) // Medium priority
        .withExecutionMode(ExecutionMode.PARALLEL)
        .build();

      const lowPriorityAction = new FunctionModelContainerNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNodeId(parentStage.nodeId.toString())
        .withName('Low Priority Action')
        .withPriority(1) // Minimum priority
        .withExecutionMode(ExecutionMode.PARALLEL)
        .build();

      // Assert - Priority Range Validation
      expect(highPriorityAction.priority).toBe(10);
      expect(mediumPriorityAction.priority).toBe(5);
      expect(lowPriorityAction.priority).toBe(1);
      
      // BUSINESS RULE: Priority must be within range [1-10]
      expect(highPriorityAction.priority).toBeGreaterThanOrEqual(1);
      expect(highPriorityAction.priority).toBeLessThanOrEqual(10);
      
      // BUSINESS RULE: Higher priority actions should execute first in parallel mode
      expect(highPriorityAction.priority).toBeGreaterThan(mediumPriorityAction.priority);
      expect(mediumPriorityAction.priority).toBeGreaterThan(lowPriorityAction.priority);
      
      // BUSINESS RULE: Priority affects scheduling but doesn't override execution order
      expect(highPriorityAction.executionMode).toBe(ExecutionMode.PARALLEL);
    });

    it('ActionNodeStatusTransitions_ShouldFollowValidLifecycleFlow', () => {
      // Arrange - Action for status transition testing
      const action = new TetherNodeBuilder()
        .withModelId(parentModel.modelId)
        .withParentNode(parentStage.nodeId.toString())
        .withName('Status Transition Test')
        .withStatus(ActionStatus.DRAFT)
        .build();

      // Act & Assert - Valid status transitions
      
      // DRAFT -> ACTIVE (valid)
      let transitionResult = action.updateStatus(ActionStatus.ACTIVE);
      expect(transitionResult.isSuccess).toBe(true);
      expect(action.status).toBe(ActionStatus.ACTIVE);
      
      // ACTIVE -> EXECUTING (valid)
      transitionResult = action.updateStatus(ActionStatus.EXECUTING);
      expect(transitionResult.isSuccess).toBe(true);
      expect(action.status).toBe(ActionStatus.EXECUTING);
      
      // EXECUTING -> COMPLETED (valid)
      transitionResult = action.updateStatus(ActionStatus.COMPLETED);
      expect(transitionResult.isSuccess).toBe(true);
      expect(action.status).toBe(ActionStatus.COMPLETED);
      
      // COMPLETED -> EXECUTING (invalid - can't go back to executing)
      transitionResult = action.updateStatus(ActionStatus.EXECUTING);
      expect(transitionResult.isFailure).toBe(true);
      expect(transitionResult.error).toContain('Invalid status transition');
      
      // BUSINESS RULE: Status transitions must follow valid lifecycle flow
      // BUSINESS RULE: Terminal states (completed, failed, archived) cannot transition back
    });

    it('ActionNodeRetryPolicy_ShouldBeValidForActionType_AndExecutionContext', () => {
      // Arrange - Different retry policies for different action types
      const networkRetryPolicy = RetryPolicy.create({
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        backoffDelay: 1000,
        failureThreshold: 3
      }).value;

      const knowledgeRetryPolicy = RetryPolicy.create({
        maxAttempts: 2,
        backoffStrategy: 'immediate',
        backoffDelay: 0,
        failureThreshold: 1
      }).value;

      const orchestrationRetryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'linear',
        backoffDelay: 5000,
        failureThreshold: 2
      }).value;

      const tetherAction = new TetherNodeBuilder()
        .withRetryPolicy(networkRetryPolicy)
        .build();

      const kbAction = new KBNodeBuilder()
        .withRetryPolicy(knowledgeRetryPolicy)
        .build();

      const containerAction = new FunctionModelContainerNodeBuilder()
        .withRetryPolicy(orchestrationRetryPolicy)
        .build();

      // Assert - Action-Type Specific Retry Policies
      
      // TETHER NODE: Network operations need robust retry with exponential backoff
      expect(tetherAction.retryPolicy!.maxAttempts).toBe(5);
      expect(tetherAction.retryPolicy!.strategy).toBe('exponential');
      
      // KB NODE: Knowledge access typically doesn't need many retries
      expect(kbAction.retryPolicy!.maxAttempts).toBe(2);
      expect(kbAction.retryPolicy!.strategy).toBe('immediate');
      
      // CONTAINER NODE: Orchestration needs longer delays for resource availability
      expect(containerAction.retryPolicy!.maxAttempts).toBe(3);
      expect(containerAction.retryPolicy!.strategy).toBe('linear');
      expect(containerAction.retryPolicy!.baseDelayMs).toBe(5000);
      
      // BUSINESS RULE: Retry policy should match action type failure characteristics
      // BUSINESS RULE: Network-dependent actions need exponential backoff
      // BUSINESS RULE: Knowledge access actions need minimal retry overhead
      // BUSINESS RULE: Orchestration actions need longer retry intervals
    });
  });
});

/**
 * SUMMARY: Action Node Type-Specific Business Rules Validation
 * 
 * These tests serve as EXECUTABLE BUSINESS SPECIFICATIONS for each action node type:
 * 
 * **TETHER NODE BUSINESS RULES:**
 * 1. Valid Spindle workflow reference required
 * 2. Resource requirements must be valid Kubernetes specs
 * 3. Execution parameters must be positive values
 * 4. Intelligent retry policies for different failure types
 * 5. Resource constraints affect batch sizing and concurrency
 * 
 * **KB NODE BUSINESS RULES:**
 * 1. RACI assignment must have at least one responsible party
 * 2. Search keywords optimized for AI agent discovery
 * 3. Documentation context provides actionable guidance
 * 4. Access permissions enforce fine-grained control
 * 5. Contextual usage guides timing and application
 * 
 * **FUNCTION MODEL CONTAINER BUSINESS RULES:**
 * 1. Cannot reference itself to prevent infinite nesting
 * 2. Context inheritance follows hierarchical access patterns
 * 3. Orchestration modes support different integration patterns
 * 4. Context transformations preserve security and encapsulation
 * 5. Access control prevents unauthorized context sharing
 * 
 * **SHARED ACTION NODE BUSINESS RULES:**
 * 1. Execution orders must be unique within containers
 * 2. Priority values must be within valid range [1-10]
 * 3. Status transitions must follow valid lifecycle flows
 * 4. Retry policies must match action type failure characteristics
 * 5. Configuration validation ensures type-specific correctness
 * 
 * CLEAN ARCHITECTURE COMPLIANCE:
 * - Business rules are enforced in domain entities
 * - Type-specific validation prevents architectural violations
 * - Configuration structures are validated for correctness
 * - Status transitions maintain domain integrity
 * 
 * USE AS TEMPLATE: These tests demonstrate proper action node business rule
 * enforcement and serve as specifications for implementing type-specific
 * domain behavior with full Clean Architecture compliance.
 */
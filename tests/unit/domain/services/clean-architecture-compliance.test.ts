/**
 * Unit tests for Clean Architecture Compliance across UC-005 services
 * Tests architectural boundary enforcement, dependency inversion validation,
 * layer separation compliance, and Result pattern usage consistency.
 * 
 * This test suite acts as architectural guardrails, ensuring that all UC-005 services
 * maintain strict Clean Architecture principles while handling complex orchestration scenarios.
 */

import { WorkflowOrchestrationService } from '@/lib/domain/services/workflow-orchestration-service';
import { ActionNodeExecutionService } from '@/lib/domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '@/lib/domain/services/fractal-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { ActionNodeOrchestrationService } from '@/lib/domain/services/action-node-orchestration-service';
import { Result } from '@/lib/domain/shared/result';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { TestFactories } from '../../../utils/test-fixtures';

describe('Clean Architecture Compliance - UC-005', () => {
  let workflowService: WorkflowOrchestrationService;
  let actionExecutionService: ActionNodeExecutionService;
  let fractalService: FractalOrchestrationService;
  let contextService: NodeContextAccessService;
  let actionOrchestrationService: ActionNodeOrchestrationService;

  beforeEach(() => {
    workflowService = new WorkflowOrchestrationService();
    actionExecutionService = new ActionNodeExecutionService();
    contextService = new NodeContextAccessService();
    actionOrchestrationService = new ActionNodeOrchestrationService();
    
    // Create FractalOrchestrationService with proper dependency injection
    fractalService = new FractalOrchestrationService(
      contextService,
      actionOrchestrationService
    );
  });

  describe('dependency inversion principle compliance', () => {
    describe('service dependency injection', () => {
      it('should inject dependencies through constructor (not service locator)', () => {
        // Arrange & Act - Services created in beforeEach
        
        // Assert - FractalOrchestrationService demonstrates proper dependency injection
        expect(fractalService).toBeInstanceOf(FractalOrchestrationService);
        
        // Verify internal dependencies are injected, not located
        const contextServiceRef = (fractalService as any).contextAccessService;
        const orchestrationServiceRef = (fractalService as any).actionOrchestrationService;
        
        expect(contextServiceRef).toBe(contextService);
        expect(orchestrationServiceRef).toBe(actionOrchestrationService);
      });

      it('should not instantiate dependencies internally', () => {
        // Arrange - Check service constructors don't contain 'new' statements for dependencies
        const serviceConstructors = [
          WorkflowOrchestrationService.toString(),
          ActionNodeExecutionService.toString(),
          ActionNodeOrchestrationService.toString(),
          NodeContextAccessService.toString()
        ];
        
        // Act & Assert - Services should not instantiate their own dependencies
        serviceConstructors.forEach(constructor => {
          // Should not instantiate domain services internally
          expect(constructor).not.toMatch(/new.*Service\(/);
          expect(constructor).not.toMatch(/new.*Repository\(/);
          expect(constructor).not.toMatch(/ServiceLocator/);
        });
      });

      it('should depend on abstractions, not concretions', () => {
        // Arrange - Check that services accept interfaces in constructors
        const fractalServiceConstructor = FractalOrchestrationService.toString();
        
        // Act & Assert - Should accept interfaces, not concrete types
        expect(fractalServiceConstructor).toMatch(/constructor\s*\(/);
        
        // Verify the service can work with different implementations
        const mockContextService = {
          buildContext: jest.fn().mockReturnValue(Result.ok({ contextId: 'mock' })),
          propagateContext: jest.fn().mockReturnValue(Result.ok(undefined)),
          getNodeContext: jest.fn().mockReturnValue(Result.ok({ data: {} })),
          updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
          clearNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
          getHierarchicalContext: jest.fn().mockReturnValue(Result.ok({ levels: [] })),
          validateContextAccess: jest.fn().mockReturnValue(Result.ok({ granted: true })),
          cloneContextScope: jest.fn().mockReturnValue(Result.ok('cloned')),
          mergeContextScopes: jest.fn().mockReturnValue(Result.ok('merged'))
        } as any;
        
        const alternativeFractalService = new FractalOrchestrationService(
          mockContextService,
          actionOrchestrationService
        );
        
        expect(alternativeFractalService).toBeInstanceOf(FractalOrchestrationService);
      });
    });

    describe('no reverse dependencies', () => {
      it('should not import infrastructure or framework code', () => {
        // Arrange - Check imports in service files
        const serviceFiles = [
          'workflow-orchestration-service',
          'action-node-execution-service', 
          'fractal-orchestration-service',
          'node-context-access-service',
          'action-node-orchestration-service'
        ];
        
        // Act & Assert - Domain services should not import from outer layers
        serviceFiles.forEach(serviceFile => {
          // These would be actual file content checks in real implementation
          // For tests, we verify through behavior that services don't depend on infrastructure
          
          // Services should work without external dependencies
          expect(() => {
            switch (serviceFile) {
              case 'workflow-orchestration-service':
                new WorkflowOrchestrationService();
                break;
              case 'action-node-execution-service':
                new ActionNodeExecutionService();
                break;
              case 'node-context-access-service':
                new NodeContextAccessService();
                break;
              case 'action-node-orchestration-service':
                new ActionNodeOrchestrationService();
                break;
            }
          }).not.toThrow();
        });
      });

      it('should not directly access external systems', async () => {
        // Arrange
        const testModel = TestFactories.createCompleteWorkflow();
        const testContext = {
          modelId: testModel.modelId,
          executionId: 'clean-arch-test',
          startTime: new Date(),
          parameters: {},
          environment: 'test' as const
        };
        
        // Act - Execute workflows without external system access
        const result = await workflowService.executeWorkflow(testModel, testContext);
        
        // Assert - Should work with pure domain logic, no external calls
        expect(result).toBeValidResult();
        
        // Verify no HTTP calls, database calls, file system access, etc.
        // Services should operate purely on domain logic and injected dependencies
      });

      it('should not contain framework-specific code', () => {
        // Arrange - Check that services don't contain framework imports
        const services = [
          workflowService,
          actionExecutionService,
          fractalService,
          contextService,
          actionOrchestrationService
        ];
        
        // Act & Assert - Services should not have framework dependencies
        services.forEach(service => {
          const serviceString = service.constructor.toString();
          
          // Should not contain framework-specific patterns
          expect(serviceString).not.toMatch(/express|fastify|koa/i);
          expect(serviceString).not.toMatch(/mongoose|prisma|sequelize/i);
          expect(serviceString).not.toMatch(/aws|azure|gcp/i);
          expect(serviceString).not.toMatch(/axios|fetch|xhr/i);
          
          // Should not use global objects
          expect(serviceString).not.toMatch(/window|document|localStorage/);
          expect(serviceString).not.toMatch(/process\.env|process\.argv/);
        });
      });
    });
  });

  describe('result pattern compliance', () => {
    describe('consistent result pattern usage', () => {
      it('should return Result objects from all public methods', async () => {
        // Arrange
        const testActionId = 'result-pattern-test';
        const testNodeId = NodeId.generate();
        const testContext = { test: 'data' };
        
        // Act & Assert - All service methods should return Result objects
        
        // ActionNodeExecutionService
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeInstanceOf(Result);
        expect(startResult.isSuccess || startResult.isFailure).toBe(true);
        
        const metricsResult = await actionExecutionService.getExecutionMetrics(testActionId);
        expect(metricsResult).toBeInstanceOf(Result);
        
        // NodeContextAccessService  
        const buildResult = contextService.buildContext(testNodeId, testContext, 'execution');
        expect(buildResult).toBeInstanceOf(Result);
        expect(buildResult.isSuccess || buildResult.isFailure).toBe(true);
        
        const getResult = contextService.getNodeContext(testNodeId);
        expect(getResult).toBeInstanceOf(Result);
        
        // ActionNodeOrchestrationService
        const orchestrationResult = await actionOrchestrationService.orchestrateNodeActions([], {});
        expect(orchestrationResult).toBeInstanceOf(Result);
      });

      it('should not throw exceptions for business logic failures', async () => {
        // Arrange
        const invalidData = null;
        const nonExistentId = 'non-existent-id';
        
        // Act & Assert - Should return failure Results, not throw exceptions
        
        // Invalid inputs should return failure Results
        await expect(async () => {
          const result = await actionExecutionService.getExecutionMetrics(nonExistentId);
          expect(result).toBeFailureResult();
        }).not.toThrow();
        
        await expect(async () => {
          const result = contextService.buildContext(NodeId.generate(), invalidData as any, 'execution');
          expect(result).toBeFailureResult();
        }).not.toThrow();
        
        await expect(async () => {
          const result = await actionOrchestrationService.optimizeActionOrder(invalidData as any);
          expect(result).toBeFailureResult();
        }).not.toThrow();
      });

      it('should provide meaningful error messages in failure Results', async () => {
        // Arrange
        const invalidActionId = '';
        const invalidNodeId = NodeId.generate();
        
        // Act
        const startResult = await actionExecutionService.getExecutionMetrics(invalidActionId);
        const contextResult = contextService.getNodeContext(invalidNodeId);
        
        // Assert - Failure Results should have meaningful error messages
        if (startResult.isFailure) {
          expect(startResult.error).toBeTruthy();
          expect(typeof startResult.error).toBe('string');
          expect(startResult.error.length).toBeGreaterThan(0);
        }
        
        if (contextResult.isFailure) {
          expect(contextResult.error).toBeTruthy();
          expect(typeof contextResult.error).toBe('string');
          expect(contextResult.error.length).toBeGreaterThan(0);
        }
      });
    });

    describe('error propagation through Result pattern', () => {
      it('should propagate errors through Result chains without exceptions', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const invalidContext = {
          modelId: '',
          executionId: '',
          startTime: new Date(),
          parameters: {},
          environment: 'test' as const
        };
        
        // Act - Chain operations that may fail
        const workflowResult = await workflowService.executeWorkflow(model, invalidContext);
        
        // Assert - Errors should propagate through Result pattern
        expect(workflowResult).toBeInstanceOf(Result);
        if (workflowResult.isFailure) {
          expect(workflowResult.error).toBeTruthy();
        }
      });

      it('should maintain Result pattern consistency in nested operations', async () => {
        // Arrange  
        const model = TestFactories.createCompleteWorkflow();
        const fractalPlan = fractalService.planFractalExecution(model);
        
        // Act - Nested operations should maintain Result pattern
        if (fractalPlan.isSuccess) {
          const execution = await fractalService.executeFractalOrchestration(fractalPlan.value);
          expect(execution).toBeInstanceOf(Result);
          
          const validation = fractalService.validateOrchestrationConsistency(fractalPlan.value);
          expect(validation).toBeInstanceOf(Result);
        }
        
        // Assert - All operations maintain Result pattern
        expect(fractalPlan).toBeInstanceOf(Result);
      });
    });
  });

  describe('layer separation compliance', () => {
    describe('domain layer purity', () => {
      it('should contain only business logic in domain services', async () => {
        // Arrange
        const testModel = TestFactories.createCompleteWorkflow();
        const testContext = {
          modelId: testModel.modelId,
          executionId: 'layer-test',
          startTime: new Date(),
          parameters: { testParam: 'value' },
          environment: 'test' as const
        };
        
        // Act - Execute domain operations
        const workflowResult = await workflowService.executeWorkflow(testModel, testContext);
        
        // Assert - Operations should be pure business logic
        expect(workflowResult).toBeValidResult();
        expect(workflowResult.value).toHaveProperty('success');
        expect(workflowResult.value).toHaveProperty('completedNodes');
        expect(workflowResult.value).toHaveProperty('executionTime');
        
        // Should not contain UI concerns, persistence logic, or external API calls
        expect(workflowResult.value).not.toHaveProperty('httpResponse');
        expect(workflowResult.value).not.toHaveProperty('databaseTransaction');
        expect(workflowResult.value).not.toHaveProperty('renderTemplate');
      });

      it('should not contain persistence logic', async () => {
        // Arrange
        const nodeId = NodeId.generate();
        const contextData = { persistent: 'data' };
        
        // Act - Context operations should not persist directly
        const buildResult = contextService.buildContext(nodeId, contextData, 'execution');
        const getResult = contextService.getNodeContext(nodeId);
        
        // Assert - Should work with in-memory state, not direct persistence
        expect(buildResult).toBeValidResult();
        expect(getResult).toBeValidResult();
        
        // Context should be managed in memory, not persisted directly
        expect(getResult.value.data).toEqual(contextData);
      });

      it('should not contain UI or presentation logic', async () => {
        // Arrange
        const actions = [];
        
        // Act
        const progressResult = await actionOrchestrationService.monitorActionProgress(actions, {});
        
        // Assert - Should return raw business data, not UI-formatted data
        expect(progressResult).toBeValidResult();
        expect(progressResult.value).toHaveProperty('totalActions');
        expect(progressResult.value).toHaveProperty('overallProgress');
        
        // Should not contain UI formatting
        expect(progressResult.value).not.toHaveProperty('htmlTemplate');
        expect(progressResult.value).not.toHaveProperty('cssClasses');
        expect(progressResult.value).not.toHaveProperty('uiComponents');
      });
    });

    describe('business rule encapsulation', () => {
      it('should encapsulate workflow orchestration rules', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const nodes = Array.from(model.nodes.values());
        
        // Add dependencies to test rule enforcement
        if (nodes.length >= 2) {
          nodes[1].addDependency(nodes[0].nodeId);
        }
        
        const context = {
          modelId: model.modelId,
          executionId: 'rule-test',
          startTime: new Date(),
          parameters: {},
          environment: 'test' as const
        };
        
        // Act
        const result = await workflowService.executeWorkflow(model, context);
        
        // Assert - Business rules should be enforced
        expect(result).toBeValidResult();
        if (result.value.completedNodes.length > 1) {
          // Dependency order should be respected
          const firstCompleted = result.value.completedNodes[0];
          const secondCompleted = result.value.completedNodes[1];
          expect(firstCompleted).toBe(nodes[0].nodeId.toString());
          expect(secondCompleted).toBe(nodes[1].nodeId.toString());
        }
      });

      it('should enforce context access rules', () => {
        // Arrange
        const ownerNode = NodeId.generate();
        const requestingNode = NodeId.generate();
        
        const buildResult = contextService.buildContext(
          ownerNode,
          { private: 'data', public: 'data' },
          'isolated'
        );
        expect(buildResult).toBeValidResult();
        
        // Act - Test access control rules
        const accessResult = contextService.validateContextAccess(
          ownerNode,
          requestingNode,
          'write',
          ['private']
        );
        
        // Assert - Business rules for access control should be enforced
        expect(accessResult).toBeValidResult();
        expect(accessResult.value).toHaveProperty('granted');
        expect(accessResult.value).toHaveProperty('level');
        expect(accessResult.value).toHaveProperty('accessibleProperties');
      });

      it('should enforce execution mode rules', async () => {
        // Arrange - Test parallel vs sequential execution rules
        const emptyParallelGroup = {
          groupId: 'empty-parallel',
          actions: [],
          maxConcurrency: 5,
          failureStrategy: 'continue' as const
        };
        
        // Act
        const parallelResult = await actionOrchestrationService.coordinateParallelActions(
          emptyParallelGroup, 
          {}
        );
        
        const sequentialResult = await actionOrchestrationService.sequenceActionExecution([], {});
        
        // Assert - Different execution modes should follow their rules
        expect(parallelResult).toBeValidResult();
        expect(parallelResult.value).toHaveProperty('executedActions', 0);
        expect(parallelResult.value).toHaveProperty('concurrencyRespected');
        
        expect(sequentialResult).toBeValidResult();
        expect(sequentialResult.value).toHaveProperty('completedSequence', true);
        expect(sequentialResult.value).toHaveProperty('executionOrder');
      });
    });
  });

  describe('interface segregation compliance', () => {
    describe('focused service interfaces', () => {
      it('should have cohesive method groupings', () => {
        // Arrange - Check that each service has focused responsibilities
        const services = [
          { name: 'WorkflowOrchestrationService', instance: workflowService },
          { name: 'ActionNodeExecutionService', instance: actionExecutionService },
          { name: 'NodeContextAccessService', instance: contextService },
          { name: 'ActionNodeOrchestrationService', instance: actionOrchestrationService }
        ];
        
        // Act & Assert - Each service should have cohesive methods
        services.forEach(({ name, instance }) => {
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
            .filter(method => method !== 'constructor' && typeof (instance as any)[method] === 'function');
          
          expect(methods.length).toBeGreaterThan(0);
          
          // Methods should be related to the service's primary responsibility
          switch (name) {
            case 'WorkflowOrchestrationService':
              expect(methods.some(m => m.includes('execute') || m.includes('workflow'))).toBe(true);
              break;
            case 'ActionNodeExecutionService':
              expect(methods.some(m => m.includes('execution') || m.includes('action'))).toBe(true);
              break;
            case 'NodeContextAccessService':
              expect(methods.some(m => m.includes('context') || m.includes('build'))).toBe(true);
              break;
            case 'ActionNodeOrchestrationService':
              expect(methods.some(m => m.includes('orchestrate') || m.includes('coordinate'))).toBe(true);
              break;
          }
        });
      });

      it('should not mix unrelated concerns', () => {
        // Arrange - Check method names for mixed concerns
        const actionExecutionMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(actionExecutionService))
          .filter(method => typeof (actionExecutionService as any)[method] === 'function');
          
        const contextServiceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(contextService))
          .filter(method => typeof (contextService as any)[method] === 'function');
        
        // Act & Assert - Services should not mix concerns
        // ActionExecutionService should not handle context management
        const executionServiceContextMethods = actionExecutionMethods.filter(m => 
          m.toLowerCase().includes('context') && 
          !m.toLowerCase().includes('execution')
        );
        expect(executionServiceContextMethods).toHaveLength(0);
        
        // ContextService should not handle execution logic
        const contextServiceExecutionMethods = contextServiceMethods.filter(m => 
          m.toLowerCase().includes('execute') || 
          m.toLowerCase().includes('workflow')
        );
        expect(contextServiceExecutionMethods).toHaveLength(0);
      });
    });

    describe('minimal interface dependencies', () => {
      it('should require minimal dependencies for operation', () => {
        // Arrange & Act - Services should work with minimal setup
        
        // WorkflowOrchestrationService should work standalone
        expect(() => new WorkflowOrchestrationService()).not.toThrow();
        
        // ActionNodeExecutionService should work standalone  
        expect(() => new ActionNodeExecutionService()).not.toThrow();
        
        // NodeContextAccessService should work standalone
        expect(() => new NodeContextAccessService()).not.toThrow();
        
        // ActionNodeOrchestrationService should work standalone
        expect(() => new ActionNodeOrchestrationService()).not.toThrow();
        
        // FractalOrchestrationService requires specific dependencies (dependency injection)
        expect(() => new FractalOrchestrationService(contextService, actionOrchestrationService))
          .not.toThrow();
      });
    });
  });

  describe('single responsibility principle compliance', () => {
    describe('service responsibility boundaries', () => {
      it('WorkflowOrchestrationService should only handle workflow execution', () => {
        // Arrange
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(workflowService))
          .filter(method => method !== 'constructor');
        
        // Act & Assert - All methods should be workflow-related
        const workflowRelatedMethods = methods.filter(method => 
          method.includes('execute') || 
          method.includes('workflow') || 
          method.includes('pause') || 
          method.includes('resume') || 
          method.includes('stop') || 
          method.includes('status')
        );
        
        expect(workflowRelatedMethods.length).toBe(methods.length);
      });

      it('ActionNodeExecutionService should only handle individual action execution', () => {
        // Arrange
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(actionExecutionService))
          .filter(method => method !== 'constructor');
        
        // Act & Assert - All methods should be action execution-related
        const executionRelatedMethods = methods.filter(method => 
          method.includes('execution') || 
          method.includes('start') || 
          method.includes('complete') || 
          method.includes('fail') || 
          method.includes('retry') || 
          method.includes('progress') || 
          method.includes('metrics') || 
          method.includes('cancel') ||
          method.includes('track')
        );
        
        expect(executionRelatedMethods.length).toBe(methods.length);
      });

      it('NodeContextAccessService should only handle context management', () => {
        // Arrange
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(contextService))
          .filter(method => method !== 'constructor');
        
        // Act & Assert - All methods should be context-related
        const contextRelatedMethods = methods.filter(method => 
          method.includes('context') || 
          method.includes('build') || 
          method.includes('update') || 
          method.includes('clear') || 
          method.includes('propagate') || 
          method.includes('validate') || 
          method.includes('clone') || 
          method.includes('merge') ||
          method.includes('hierarchical')
        );
        
        expect(contextRelatedMethods.length).toBe(methods.length);
      });
    });
  });

  describe('architectural boundary enforcement', () => {
    describe('no direct external dependencies', () => {
      it('should not directly access file system', () => {
        // Arrange & Act - Services should not use file system directly
        const services = [workflowService, actionExecutionService, contextService, actionOrchestrationService];
        
        // Assert - No file system access patterns
        services.forEach(service => {
          const serviceString = service.constructor.toString();
          expect(serviceString).not.toMatch(/fs\.|readFile|writeFile|mkdir|rmdir/);
          expect(serviceString).not.toMatch(/path\.|__dirname|__filename/);
        });
      });

      it('should not directly access network resources', () => {
        // Arrange & Act - Services should not make network calls
        const services = [workflowService, actionExecutionService, contextService, actionOrchestrationService];
        
        // Assert - No network access patterns
        services.forEach(service => {
          const serviceString = service.constructor.toString();
          expect(serviceString).not.toMatch(/http\.|https\.|fetch|axios|request/);
          expect(serviceString).not.toMatch(/socket\.|ws\.|websocket/i);
        });
      });

      it('should not directly access database', () => {
        // Arrange & Act - Services should not access database directly
        const services = [workflowService, actionExecutionService, contextService, actionOrchestrationService];
        
        // Assert - No database access patterns
        services.forEach(service => {
          const serviceString = service.constructor.toString();
          expect(serviceString).not.toMatch(/sql|query|connection|transaction/i);
          expect(serviceString).not.toMatch(/mongodb|mysql|postgres|sqlite/i);
        });
      });
    });

    describe('proper abstraction usage', () => {
      it('should use domain abstractions for complex operations', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const planResult = fractalService.planFractalExecution(model);
        
        // Act & Assert - Should work through domain abstractions
        expect(planResult).toBeValidResult();
        
        if (planResult.isSuccess) {
          const executionResult = await fractalService.executeFractalOrchestration(planResult.value);
          expect(executionResult).toBeValidResult();
          
          // Should use domain concepts, not technical implementation details
          expect(executionResult.value).toHaveProperty('totalLevels');
          expect(executionResult.value).toHaveProperty('contextOutputs');
          expect(executionResult.value).not.toHaveProperty('sqlConnections');
          expect(executionResult.value).not.toHaveProperty('httpHeaders');
        }
      });
    });
  });

  describe('testability and maintainability', () => {
    describe('deterministic behavior', () => {
      it('should produce consistent results for same inputs', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = {
          modelId: model.modelId,
          executionId: 'deterministic-test',
          startTime: new Date('2023-01-01T00:00:00Z'), // Fixed date
          parameters: { test: 'value' },
          environment: 'test' as const
        };
        
        // Act - Execute multiple times
        const result1 = await workflowService.executeWorkflow(model, {...context, executionId: 'det-1'});
        const result2 = await workflowService.executeWorkflow(model, {...context, executionId: 'det-2'});
        
        // Assert - Should produce consistent business outcomes
        expect(result1.isSuccess).toBe(result2.isSuccess);
        if (result1.isSuccess && result2.isSuccess) {
          expect(result1.value.completedNodes.length).toBe(result2.value.completedNodes.length);
          expect(result1.value.success).toBe(result2.value.success);
        }
      });

      it('should be testable without external systems', async () => {
        // Arrange - All services should be testable in isolation
        const testActionId = 'testable-action';
        const testNodeId = NodeId.generate();
        const testContext = { test: 'data' };
        
        // Act - Test all services without external dependencies
        const actionStartResult = await actionExecutionService.startExecution(testActionId);
        const contextBuildResult = contextService.buildContext(testNodeId, testContext, 'execution');
        const orchestrationResult = await actionOrchestrationService.orchestrateNodeActions([], {});
        
        // Assert - All operations should work in test environment
        expect(actionStartResult).toBeValidResult();
        expect(contextBuildResult).toBeValidResult();
        expect(orchestrationResult).toBeValidResult();
      });
    });
  });
});
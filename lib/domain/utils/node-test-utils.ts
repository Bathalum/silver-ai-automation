// Node Test Utilities
// This file contains comprehensive test utilities for all domain layer components

import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { BaseNode } from '../entities/base-node-types'
import type { CrossFeatureLink } from '../entities/cross-feature-link-types'
import type { AIAgentConfig } from '../entities/ai-integration-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { NodeValidationRules } from '../rules/node-validation-rules'
import { CrossFeatureLinkValidator } from '../services/cross-feature-link-validator'
import { AIAgentRules } from '../rules/ai-agent-rules'
import { LinkValidationRules } from '../rules/link-validation-rules'

export class NodeTestUtils {
  // Test Node Creation Methods
  static createTestProcessNode(): FunctionModelNode {
    return {
      nodeId: 'test-process-node-1',
      featureType: 'function-model',
      entityId: 'test-model-1',
      nodeType: 'stageNode',
      name: 'Test Process Node',
      description: 'A test process node for unit testing',
      position: { x: 100, y: 100 },
      visualProperties: {
        color: '#3b82f6',
        icon: '📊',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'process', 'stage'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'process', 'node'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      functionModelData: {
        stage: {
          id: 'test-stage-1',
          name: 'Test Stage',
          description: 'A test stage',
          position: { x: 0, y: 0 },
          actions: ['action1', 'action2'],
          dataChange: ['change1'],
          boundaryCriteria: ['criteria1'],
          raci: {
            responsible: ['user1'],
            accountable: ['user2'],
            consulted: ['user3'],
            informed: ['user4']
          }
        },
        action: undefined,
        io: undefined,
        container: undefined
      },
      processBehavior: {
        executionType: 'sequential' as any,
        dependencies: [],
        timeout: 5000,
        retryPolicy: {
          maxRetries: 3,
          backoff: 'exponential',
          initialDelay: 1000,
          maxDelay: 10000
        } as any
      },
      businessLogic: {
        raciMatrix: {
          responsible: ['user1'],
          accountable: ['user2'],
          consulted: ['user3'],
          informed: ['user4']
        } as any,
        sla: {
          responseTime: 5000,
          availability: 99.9,
          uptime: 99.5
        },
        kpis: [
          {
            name: 'Execution Time',
            target: 5000,
            current: 4500,
            unit: 'ms'
          }
        ]
      },
      nodeLinks: []
    }
  }

  static createTestIntegrationNode(): any {
    return {
      nodeId: 'test-integration-node-1',
      featureType: 'spindle',
      entityId: 'test-spindle-1',
      nodeType: 'integrationNode',
      name: 'Test Integration Node',
      description: 'A test integration node for unit testing',
      position: { x: 200, y: 200 },
      visualProperties: {
        color: '#10b981',
        icon: '🔗',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'integration', 'api'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'integration', 'api'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static createTestContentNode(): any {
    return {
      nodeId: 'test-content-node-1',
      featureType: 'knowledge-base',
      entityId: 'test-kb-1',
      nodeType: 'contentNode',
      name: 'Test Content Node',
      description: 'A test content node for unit testing',
      position: { x: 300, y: 300 },
      visualProperties: {
        color: '#f59e0b',
        icon: '📄',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'content', 'document'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'content', 'document'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static createTestEventNode(): any {
    return {
      nodeId: 'test-event-node-1',
      featureType: 'event-storm',
      entityId: 'test-event-1',
      nodeType: 'eventNode',
      name: 'Test Event Node',
      description: 'A test event node for unit testing',
      position: { x: 400, y: 400 },
      visualProperties: {
        color: '#ef4444',
        icon: '⚡',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'event', 'storm'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'event', 'storm'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static createTestCrossFeatureLink(): CrossFeatureLink {
    return {
      linkId: 'test-link-1',
      sourceFeature: 'function-model',
      sourceEntityId: 'test-model-1',
      sourceNodeId: 'test-process-node-1',
      targetFeature: 'knowledge-base',
      targetEntityId: 'test-kb-1',
      targetNodeId: 'test-content-node-1',
      linkType: 'references',
      linkStrength: 0.8,
      linkContext: {
        description: 'Test link between process and content',
        reason: 'Process references documentation'
      },
      visualProperties: {
        color: '#8b5cf6',
        icon: '🔗',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      createdBy: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static createTestAIAgentConfig(): AIAgentConfig {
    return {
      enabled: true,
      instructions: 'You are a test AI agent for unit testing purposes.',
      tools: [
        {
          name: 'test-tool-1',
          description: 'A test tool for unit testing',
          parameters: { param1: 'string', param2: 'number' },
          mcpServer: undefined
        }
      ],
      capabilities: {
        reasoning: true,
        toolUse: true,
        memory: false,
        learning: false
      },
      metadata: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        contextWindow: 8000
      }
    }
  }

  static createTestBaseNode(): BaseNode {
    return {
      nodeId: 'test-base-node-1',
      featureType: 'function-model',
      entityId: 'test-entity-1',
      nodeType: 'testNode',
      name: 'Test Base Node',
      description: 'A test base node for unit testing',
      position: { x: 500, y: 500 },
      visualProperties: {
        color: '#6b7280',
        icon: '🔧',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'base', 'node'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'base', 'node'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Test Node Variations
  static createTestNodeWithAI(): FunctionModelNode {
    const node = this.createTestProcessNode()
    node.metadata.aiAgent = this.createTestAIAgentConfig()
    return node
  }

  static createTestNodeWithLinks(): FunctionModelNode {
    const node = this.createTestProcessNode()
    node.nodeLinks = [
      {
        linkId: 'test-link-1',
        sourceNodeId: node.nodeId,
        targetNodeId: 'test-target-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        linkType: 'parent-child',
        sourceNodeType: 'stageNode',
        targetNodeType: 'actionTableNode',
        linkStrength: 0.9,
        linkContext: { description: 'Test link' },
        createdAt: new Date(),
        createdBy: 'test-user'
      }
    ]
    return node
  }

  static createTestInvalidNode(): Partial<FunctionModelNode> {
    return {
      nodeId: 'test-invalid-node-1',
      featureType: 'function-model',
      entityId: 'test-model-1',
      nodeType: 'stageNode',
      name: '', // Invalid: empty name
      description: 'A test invalid node for unit testing',
      position: { x: -100, y: -100 }, // Invalid: negative coordinates
      visualProperties: {
        color: '#3b82f6',
        icon: '📊',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'invalid', 'node'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'invalid', 'node'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      functionModelData: {},
      processBehavior: {
        executionType: 'sequential' as any,
        dependencies: [],
        timeout: -5000, // Invalid: negative timeout
        retryPolicy: {
          maxRetries: 15, // Invalid: too many retries
          backoff: 'exponential',
          initialDelay: 1000,
          maxDelay: 10000
        } as any
      },
      businessLogic: {
        raciMatrix: {
          responsible: [], // Invalid: empty responsible
          accountable: [], // Invalid: empty accountable
          consulted: ['user3'],
          informed: ['user4']
        } as any,
        sla: {
          responseTime: 5000,
          availability: 99.9,
          uptime: 99.5
        },
        kpis: []
      },
      nodeLinks: []
    }
  }

  static createTestNodeForValidation(): FunctionModelNode {
    return {
      nodeId: 'test-validation-node-1',
      featureType: 'function-model',
      entityId: 'test-model-1',
      nodeType: 'stageNode',
      name: 'Test Validation Node',
      description: 'A test node for validation testing',
      position: { x: 100, y: 100 },
      visualProperties: {
        color: '#3b82f6',
        icon: '📊',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: ['test', 'validation', 'node'],
        aiAgent: undefined,
        vectorEmbedding: undefined,
        searchKeywords: ['test', 'validation', 'node'],
        crossFeatureLinks: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      functionModelData: {
        stage: {
          id: 'test-stage-1',
          name: 'Test Stage',
          description: 'A test stage',
          position: { x: 0, y: 0 },
          actions: ['action1', 'action2'],
          dataChange: ['change1'],
          boundaryCriteria: ['criteria1'],
          raci: {
            responsible: ['user1'],
            accountable: ['user2'],
            consulted: ['user3'],
            informed: ['user4']
          }
        }
      },
      processBehavior: {
        executionType: 'sequential' as any,
        dependencies: ['dep1', 'dep2'],
        timeout: 5000,
        retryPolicy: {
          maxRetries: 3,
          backoff: 'exponential',
          initialDelay: 1000,
          maxDelay: 10000
        } as any
      },
      businessLogic: {
        raciMatrix: {
          responsible: ['user1'],
          accountable: ['user2'],
          consulted: ['user3'],
          informed: ['user4']
        } as any,
        sla: {
          responseTime: 5000,
          availability: 99.9,
          uptime: 99.5
        },
        kpis: [
          {
            name: 'Execution Time',
            target: 5000,
            current: 4500,
            unit: 'ms'
          }
        ]
      },
      nodeLinks: []
    }
  }

  static createTestNodeForExecution(): FunctionModelNode {
    const node = this.createTestProcessNode()
    node.nodeId = 'test-execution-node-1'
    node.name = 'Test Execution Node'
    return node
  }

  static createTestExecutionContext(): any {
    return {
      nodeId: 'test-execution-node-1',
      featureType: 'function-model',
      entityId: 'test-model-1',
      userId: 'test-user',
      sessionId: 'test-session-1',
      timestamp: new Date(),
      parameters: {
        input: 'test input',
        config: { timeout: 5000 }
      },
      environment: 'development'
    }
  }

  // Validation Test Methods
  static testNodeValidation(node: BaseNode): ValidationResult {
    return NodeValidationRules.validateNode(node)
  }

  static testNodeCreationValidation(node: Partial<BaseNode>): ValidationResult {
    return NodeValidationRules.validateNodeCreation(node)
  }

  static testNodeUpdateValidation(node: Partial<BaseNode>): ValidationResult {
    return NodeValidationRules.validateNodeUpdate(node)
  }

  static testCrossFeatureLinkValidation(link: CrossFeatureLink): ValidationResult {
    return CrossFeatureLinkValidator.validateLink(link)
  }

  static testAIAgentValidation(agent: AIAgentConfig): ValidationResult {
    return AIAgentRules.validateAgent(agent)
  }

  static testLinkValidation(link: CrossFeatureLink): ValidationResult {
    return LinkValidationRules.validateLink(link)
  }

  // Performance Test Methods
  static testNodeValidationPerformance(nodes: BaseNode[]): { totalTime: number; avgTime: number; results: ValidationResult[] } {
    const startTime = performance.now()
    const results: ValidationResult[] = []
    
    for (const node of nodes) {
      results.push(this.testNodeValidation(node))
    }
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    const avgTime = totalTime / nodes.length
    
    return { totalTime, avgTime, results }
  }

  static testLinkValidationPerformance(links: CrossFeatureLink[]): { totalTime: number; avgTime: number; results: ValidationResult[] } {
    const startTime = performance.now()
    const results: ValidationResult[] = []
    
    for (const link of links) {
      results.push(this.testCrossFeatureLinkValidation(link))
    }
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    const avgTime = totalTime / links.length
    
    return { totalTime, avgTime, results }
  }

  // Stress Test Methods
  static createStressTestNodes(count: number): BaseNode[] {
    const nodes: BaseNode[] = []
    
    for (let i = 0; i < count; i++) {
      const node = this.createTestBaseNode()
      node.nodeId = `stress-test-node-${i}`
      node.name = `Stress Test Node ${i}`
      nodes.push(node)
    }
    
    return nodes
  }

  static createStressTestLinks(count: number): CrossFeatureLink[] {
    const links: CrossFeatureLink[] = []
    
    for (let i = 0; i < count; i++) {
      const link = this.createTestCrossFeatureLink()
      link.linkId = `stress-test-link-${i}`
      link.sourceNodeId = `stress-test-node-${i}`
      link.targetNodeId = `stress-test-node-${i + 1}`
      links.push(link)
    }
    
    return links
  }

  // Memory Test Methods
  static testMemoryUsage(testFunction: () => void): { beforeMemory: number; afterMemory: number; difference: number } {
    const beforeMemory = process.memoryUsage().heapUsed
    testFunction()
    const afterMemory = process.memoryUsage().heapUsed
    const difference = afterMemory - beforeMemory
    
    return { beforeMemory, afterMemory, difference }
  }

  // Integration Test Methods
  static testFullNodeLifecycle(): { 
    creation: ValidationResult; 
    update: ValidationResult; 
    validation: ValidationResult; 
    execution: boolean 
  } {
    // Create node
    const node = this.createTestProcessNode()
    const creationResult = this.testNodeCreationValidation(node)
    
    // Update node
    const updatedNode = { ...node, name: 'Updated Test Node' }
    const updateResult = this.testNodeUpdateValidation(updatedNode)
    
    // Validate node
    const validationResult = this.testNodeValidation(node)
    
    // Simulate execution
    const executionResult = true // Mock execution success
    
    return {
      creation: creationResult,
      update: updateResult,
      validation: validationResult,
      execution: executionResult
    }
  }

  // Error Test Methods
  static testErrorHandling(): { 
    invalidNode: ValidationResult; 
    invalidLink: ValidationResult; 
    invalidAgent: ValidationResult 
  } {
    const invalidNode = this.createTestInvalidNode()
    const invalidLink = this.createTestCrossFeatureLink()
    invalidLink.linkStrength = 1.5 // Invalid strength
    
    const invalidAgent = this.createTestAIAgentConfig()
    invalidAgent.instructions = '' // Invalid empty instructions
    
    return {
      invalidNode: this.testNodeValidation(invalidNode as BaseNode),
      invalidLink: this.testCrossFeatureLinkValidation(invalidLink),
      invalidAgent: this.testAIAgentValidation(invalidAgent)
    }
  }

  // Edge Case Test Methods
  static testEdgeCases(): {
    emptyNode: ValidationResult;
    maxLengthNode: ValidationResult;
    specialCharactersNode: ValidationResult;
    unicodeNode: ValidationResult;
  } {
    const emptyNode = this.createTestBaseNode()
    emptyNode.name = ''
    
    const maxLengthNode = this.createTestBaseNode()
    maxLengthNode.name = 'a'.repeat(255)
    
    const specialCharactersNode = this.createTestBaseNode()
    specialCharactersNode.name = 'Test Node with !@#$%^&*()'
    
    const unicodeNode = this.createTestBaseNode()
    unicodeNode.name = 'Test Node with 🚀 emoji and 中文 characters'
    
    return {
      emptyNode: this.testNodeValidation(emptyNode),
      maxLengthNode: this.testNodeValidation(maxLengthNode),
      specialCharactersNode: this.testNodeValidation(specialCharactersNode),
      unicodeNode: this.testNodeValidation(unicodeNode)
    }
  }

  // Benchmark Methods
  static benchmarkValidationRules(): {
    nodeValidation: { time: number; memory: number };
    linkValidation: { time: number; memory: number };
    agentValidation: { time: number; memory: number };
  } {
    const testNodes = this.createStressTestNodes(100)
    const testLinks = this.createStressTestLinks(100)
    const testAgents = Array(100).fill(null).map(() => this.createTestAIAgentConfig())
    
    const nodeResult = this.testMemoryUsage(() => {
      testNodes.forEach(node => this.testNodeValidation(node))
    })
    
    const linkResult = this.testMemoryUsage(() => {
      testLinks.forEach(link => this.testCrossFeatureLinkValidation(link))
    })
    
    const agentResult = this.testMemoryUsage(() => {
      testAgents.forEach(agent => this.testAIAgentValidation(agent))
    })
    
    return {
      nodeValidation: { time: 0, memory: nodeResult.difference },
      linkValidation: { time: 0, memory: linkResult.difference },
      agentValidation: { time: 0, memory: agentResult.difference }
    }
  }
} 
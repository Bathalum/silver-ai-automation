import {
  createFunctionModel,
  isValidFunctionModel,
  type FunctionModel,
  type FunctionModelNode,
  type FunctionModelEdge,
  type Viewport,
  type NodeData,
  type Stage,
  type ActionItem,
  type DataPort,
  type RACIMatrix,
  type FunctionModelMetadata,
  type FunctionModelPermissions
} from '../../../lib/domain/entities/function-model-types'

describe('Function Model Domain Entities', () => {
  describe('createFunctionModel', () => {
    it('should create a valid Function Model with default values', () => {
      const model = createFunctionModel('Test Model', 'Test Description')

      expect(model.name).toBe('Test Model')
      expect(model.description).toBe('Test Description')
      expect(model.version).toBe('1.0.0')
      expect(model.status).toBe('draft')
      expect(model.nodesData).toEqual([])
      expect(model.edgesData).toEqual([])
      expect(model.viewportData).toEqual({ x: 0, y: 0, zoom: 1 })
      expect(model.tags).toEqual([])
      expect(model.metadata).toBeDefined()
      expect(model.permissions).toBeDefined()
      expect(model.versionHistory).toEqual([])
      expect(model.currentVersion).toBe('1.0.0')
    })

    it('should create a Function Model with custom options', () => {
      const customOptions = {
        processType: 'business-process',
        complexityLevel: 'moderate' as const,
        estimatedDuration: 120,
        tags: ['test', 'business'],
        metadata: {
          category: 'test-category',
          dependencies: ['dep1', 'dep2'],
          references: ['ref1'],
          exportSettings: {
            includeMetadata: true,
            includeRelationships: true,
            format: 'json' as const,
            resolution: 'high' as const
          },
          collaboration: {
            allowComments: true,
            allowSuggestions: true,
            requireApproval: false,
            autoSave: true,
            saveInterval: 60
          }
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: false,
          canShare: true,
          canExport: true,
          canVersion: true,
          canCollaborate: false
        }
      }

      const model = createFunctionModel('Custom Model', 'Custom Description', customOptions)

      expect(model.processType).toBe('business-process')
      expect(model.complexityLevel).toBe('moderate')
      expect(model.estimatedDuration).toBe(120)
      expect(model.tags).toEqual(['test', 'business'])
      expect(model.metadata.category).toBe('test-category')
      expect(model.permissions.canDelete).toBe(false)
    })
  })

  describe('isValidFunctionModel', () => {
    it('should return true for a valid Function Model', () => {
      const validModel: FunctionModel = {
        modelId: 'test-id',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        nodesData: [],
        edgesData: [],
        viewportData: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {
          category: '',
          dependencies: [],
          references: [],
          exportSettings: {
            includeMetadata: true,
            includeRelationships: true,
            format: 'json',
            resolution: 'medium'
          },
          collaboration: {
            allowComments: true,
            allowSuggestions: true,
            requireApproval: false,
            autoSave: true,
            saveInterval: 30
          }
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canExport: true,
          canVersion: true,
          canCollaborate: true
        },
        versionHistory: [],
        currentVersion: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSavedAt: new Date()
      }

      expect(isValidFunctionModel(validModel)).toBe(true)
    })

    it('should return false for invalid Function Model', () => {
      const invalidModels = [
        null,
        undefined,
        {},
        { name: 'Test' }, // Missing required fields
        { modelId: 'test', name: 'Test' }, // Missing more required fields
        { modelId: 'test', name: 'Test', description: 'Test', version: '1.0.0', status: 'invalid-status' } // Invalid status
      ]

      invalidModels.forEach(model => {
        expect(isValidFunctionModel(model)).toBe(false)
      })
    })

    it('should return false for Function Model with invalid status', () => {
      const modelWithInvalidStatus = {
        modelId: 'test-id',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'invalid-status',
        nodesData: [],
        edgesData: [],
        viewportData: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        versionHistory: [],
        currentVersion: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSavedAt: new Date()
      }

      expect(isValidFunctionModel(modelWithInvalidStatus)).toBe(false)
    })
  })

  describe('FunctionModelNode', () => {
    it('should have correct structure', () => {
      const node: FunctionModelNode = {
        id: 'node-1',
        type: 'stageNode',
        position: { x: 100, y: 200 },
        data: {
          label: 'Test Node',
          type: 'stage',
          description: 'Test node description',
          stageData: {
            id: 'stage-1',
            name: 'Test Stage',
            description: 'Test stage description',
            position: { x: 100, y: 200 },
            actions: ['action1', 'action2'],
            dataChange: ['change1'],
            boundaryCriteria: ['criteria1'],
            raci: {
              inform: ['user1'],
              consult: ['user2'],
              accountable: ['user3'],
              responsible: ['user4']
            }
          }
        },
        draggable: true,
        selectable: true,
        deletable: true,
        width: 200,
        height: 100
      }

      expect(node.id).toBe('node-1')
      expect(node.type).toBe('stageNode')
      expect(node.position).toEqual({ x: 100, y: 200 })
      expect(node.data.label).toBe('Test Node')
      expect(node.data.type).toBe('stage')
      expect(node.draggable).toBe(true)
      expect(node.selectable).toBe(true)
      expect(node.deletable).toBe(true)
      expect(node.width).toBe(200)
      expect(node.height).toBe(100)
    })
  })

  describe('FunctionModelEdge', () => {
    it('should have correct structure', () => {
      const edge: FunctionModelEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
        type: 'default',
        animated: true,
        style: { stroke: '#333', strokeWidth: 2 }
      }

      expect(edge.id).toBe('edge-1')
      expect(edge.source).toBe('node-1')
      expect(edge.target).toBe('node-2')
      expect(edge.sourceHandle).toBe('output')
      expect(edge.targetHandle).toBe('input')
      expect(edge.type).toBe('default')
      expect(edge.animated).toBe(true)
      expect(edge.style).toEqual({ stroke: '#333', strokeWidth: 2 })
    })
  })

  describe('Viewport', () => {
    it('should have correct structure', () => {
      const viewport: Viewport = {
        x: 100,
        y: 200,
        zoom: 1.5
      }

      expect(viewport.x).toBe(100)
      expect(viewport.y).toBe(200)
      expect(viewport.zoom).toBe(1.5)
    })
  })

  describe('NodeData', () => {
    it('should support different node types', () => {
      const stageNodeData: NodeData = {
        label: 'Stage Node',
        type: 'stage',
        description: 'Stage node description',
        stageData: {
          id: 'stage-1',
          name: 'Test Stage',
          description: 'Test stage description',
          position: { x: 100, y: 200 },
          actions: ['action1'],
          dataChange: ['change1'],
          boundaryCriteria: ['criteria1'],
          raci: {
            inform: [],
            consult: [],
            accountable: ['user1'],
            responsible: ['user2']
          }
        }
      }

      const actionNodeData: NodeData = {
        label: 'Action Node',
        type: 'action',
        description: 'Action node description',
        actionData: {
          id: 'action-1',
          name: 'Test Action',
          description: 'Test action description',
          type: 'action'
        }
      }

      const inputNodeData: NodeData = {
        label: 'Input Node',
        type: 'input',
        description: 'Input node description',
        portData: {
          id: 'input-1',
          name: 'Test Input',
          description: 'Test input description',
          mode: 'input',
          masterData: ['data1'],
          referenceData: ['ref1'],
          transactionData: ['trans1']
        }
      }

      expect(stageNodeData.type).toBe('stage')
      expect(stageNodeData.stageData).toBeDefined()
      expect(actionNodeData.type).toBe('action')
      expect(actionNodeData.actionData).toBeDefined()
      expect(inputNodeData.type).toBe('input')
      expect(inputNodeData.portData).toBeDefined()
    })
  })

  describe('Stage', () => {
    it('should have correct structure', () => {
      const stage: Stage = {
        id: 'stage-1',
        name: 'Test Stage',
        description: 'Test stage description',
        position: { x: 100, y: 200 },
        actions: ['action1', 'action2'],
        dataChange: ['change1', 'change2'],
        boundaryCriteria: ['criteria1'],
        raci: {
          inform: ['user1'],
          consult: ['user2'],
          accountable: ['user3'],
          responsible: ['user4']
        }
      }

      expect(stage.id).toBe('stage-1')
      expect(stage.name).toBe('Test Stage')
      expect(stage.description).toBe('Test stage description')
      expect(stage.position).toEqual({ x: 100, y: 200 })
      expect(stage.actions).toEqual(['action1', 'action2'])
      expect(stage.dataChange).toEqual(['change1', 'change2'])
      expect(stage.boundaryCriteria).toEqual(['criteria1'])
      expect(stage.raci).toBeDefined()
    })
  })

  describe('ActionItem', () => {
    it('should have correct structure', () => {
      const action: ActionItem = {
        id: 'action-1',
        name: 'Test Action',
        description: 'Test action description',
        type: 'action'
      }

      expect(action.id).toBe('action-1')
      expect(action.name).toBe('Test Action')
      expect(action.description).toBe('Test action description')
      expect(action.type).toBe('action')
    })
  })

  describe('DataPort', () => {
    it('should have correct structure', () => {
      const dataPort: DataPort = {
        id: 'port-1',
        name: 'Test Port',
        description: 'Test port description',
        mode: 'input',
        masterData: ['master1', 'master2'],
        referenceData: ['ref1'],
        transactionData: ['trans1', 'trans2']
      }

      expect(dataPort.id).toBe('port-1')
      expect(dataPort.name).toBe('Test Port')
      expect(dataPort.description).toBe('Test port description')
      expect(dataPort.mode).toBe('input')
      expect(dataPort.masterData).toEqual(['master1', 'master2'])
      expect(dataPort.referenceData).toEqual(['ref1'])
      expect(dataPort.transactionData).toEqual(['trans1', 'trans2'])
    })
  })

  describe('RACIMatrix', () => {
    it('should have correct structure', () => {
      const raci: RACIMatrix = {
        inform: ['user1', 'user2'],
        consult: ['user3'],
        accountable: ['user4'],
        responsible: ['user5', 'user6']
      }

      expect(raci.inform).toEqual(['user1', 'user2'])
      expect(raci.consult).toEqual(['user3'])
      expect(raci.accountable).toEqual(['user4'])
      expect(raci.responsible).toEqual(['user5', 'user6'])
    })
  })

  describe('FunctionModelMetadata', () => {
    it('should have correct structure', () => {
      const metadata: FunctionModelMetadata = {
        category: 'business-process',
        dependencies: ['dep1', 'dep2'],
        references: ['ref1'],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'high'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      }

      expect(metadata.category).toBe('business-process')
      expect(metadata.dependencies).toEqual(['dep1', 'dep2'])
      expect(metadata.references).toEqual(['ref1'])
      expect(metadata.exportSettings).toBeDefined()
      expect(metadata.collaboration).toBeDefined()
    })
  })

  describe('FunctionModelPermissions', () => {
    it('should have correct structure', () => {
      const permissions: FunctionModelPermissions = {
        canView: true,
        canEdit: true,
        canDelete: false,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: false
      }

      expect(permissions.canView).toBe(true)
      expect(permissions.canEdit).toBe(true)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canShare).toBe(true)
      expect(permissions.canExport).toBe(true)
      expect(permissions.canVersion).toBe(true)
      expect(permissions.canCollaborate).toBe(false)
    })
  })
}) 
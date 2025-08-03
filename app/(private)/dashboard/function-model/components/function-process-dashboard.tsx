"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ReactFlowProvider, ReactFlow, Controls, Background, useNodesState, useEdgesState } from "reactflow"
import "reactflow/dist/style.css"
import { Layers, Zap, Hammer, ArrowLeftRight, Settings, Save, Link, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { StageNodeModal } from "@/components/composites/stage-node-modal"
import { ActionModal } from "@/components/composites/action-modal"
import { FunctionModelModal } from "@/components/composites/function-model-modal"
import { StageNode, IONode, ActionTableNode, FunctionModelContainerNode } from "./flow-nodes"
// SaveLoadPanel removed - using node-based persistence instead
import { CrossFeatureLinkingModal } from "@/components/composites/cross-feature-linking-modal"
import { NodeBehaviorPanel } from "@/components/composites/function-model/node-behavior-panel"
import { UnifiedOperationsPanel } from "@/components/composites/function-model/unified-operations-panel"
import type { FunctionModelNode, FunctionModelNodeRelationship, Stage, ActionItem, DataPort } from "@/lib/domain/entities/function-model-node-types"
import type { BackgroundVariant } from "reactflow"
import { addEdge, type Connection, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Edge, type Node } from "reactflow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { IONodeModal } from "@/components/composites/io-node-modal"

interface Flow {
  name: string
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

// Helper function to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper functions to convert between data formats
const convertToReactFlowNode = (nodeData: FunctionModelNode): Node => {
  return {
    id: nodeData.nodeId,
    type: nodeData.nodeType,
    position: nodeData.position,
    data: {
      label: nodeData.name,
      type: nodeData.nodeType,
      description: nodeData.description,
      stageData: nodeData.functionModelData.stage,
      actionData: nodeData.functionModelData.action,
      portData: nodeData.functionModelData.io,
      containerData: nodeData.functionModelData.container
    },
    ...(nodeData.reactFlowData.draggable !== undefined && { draggable: nodeData.reactFlowData.draggable }),
    ...(nodeData.reactFlowData.selectable !== undefined && { selectable: nodeData.reactFlowData.selectable }),
    ...(nodeData.reactFlowData.deletable !== undefined && { deletable: nodeData.reactFlowData.deletable })
  };
};

const convertToReactFlowEdge = (edgeData: FunctionModelNodeRelationship): Edge => {
  return {
    id: edgeData.id,
    source: edgeData.sourceNodeId,
    target: edgeData.targetNodeId,
    ...(edgeData.sourceHandle && { sourceHandle: edgeData.sourceHandle }),
    ...(edgeData.targetHandle && { targetHandle: edgeData.targetHandle }),
    ...(edgeData.type && { type: edgeData.type })
  };
};

// Sample data for initial state using node-based architecture
const sampleFunctionModelNodes: FunctionModelNode[] = [
  {
    nodeId: 'stage-1',
    modelId: 'sample-model-id',
    type: 'function-model',
    nodeType: 'stageNode',
    name: 'Sample Stage',
    description: 'This is a sample stage',
    position: { x: 100, y: 100 },
    metadata: {
      feature: 'function-model',
      version: '1.0',
      tags: ['stage', 'function-model'],
      aiAgent: undefined,
      vectorEmbedding: undefined
    },
    functionModelData: {
      stage: {
        id: 'stage-1',
        name: 'Sample Stage',
        description: 'This is a sample stage',
        position: { x: 100, y: 100 },
        actions: [],
        dataChange: [],
        boundaryCriteria: [],
        raci: {
          inform: [],
          consult: [],
          accountable: [],
          responsible: []
        }
      },
      action: undefined,
      io: undefined,
      container: undefined
    },
    businessLogic: {
      complexity: 'simple',
      estimatedDuration: 0,
      sla: undefined,
      kpis: []
    },
    processBehavior: {
      executionType: 'sequential',
      dependencies: [],
      triggers: []
    },
    reactFlowData: {
      draggable: true,
      selectable: true,
      deletable: true
    },
    relationships: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

interface FunctionProcessDashboardProps {
  modelId?: string
  functionModelNodes?: FunctionModelNode[]
}

export function FunctionProcessDashboard({
  modelId,
  functionModelNodes: initialNodes = sampleFunctionModelNodes,
}: FunctionProcessDashboardProps) {
  const router = useRouter()
  const [functionModelNodes, setFunctionModelNodes] = useState<FunctionModelNode[]>(initialNodes)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [activePersistenceTab, setActivePersistenceTab] = useState<'save' | 'load' | 'links' | 'behavior' | 'operations'>('save')
  const [persistenceSidebarOpen, setPersistenceSidebarOpen] = useState(false)
  const [crossFeatureModalOpen, setCrossFeatureModalOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [selectedIONode, setSelectedIONode] = useState<any>(null)
  const [ioNodeModalOpen, setIONodeModalOpen] = useState(false)
  const [functionModelModalOpen, setFunctionModelModalOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModelNode | Stage | ActionItem | DataPort
    context?: { previousModal?: string; stageId?: string }
  }>>([])

  // Load saved model on mount
  useEffect(() => {
    const loadSavedModel = async () => {
      // Only try to load if we have a valid modelId (not the sample one)
      if (modelId && modelId !== 'sample-model-id') {
        setIsLoading(true)
        setLoadError(null)
        
        try {
          console.log('Loading saved model:', modelId)
          // Use the node-based use cases instead of legacy persistence
          const { getFunctionModelNodes } = await import('@/lib/application/use-cases/function-model-use-cases')
          const loadedNodes = await getFunctionModelNodes(modelId)
          console.log('Model loaded successfully:', loadedNodes)
          setFunctionModelNodes(loadedNodes)
          
          // Update flow data with loaded model
          const reactFlowNodes = loadedNodes.map(convertToReactFlowNode)
          setFlow(prev => ({
            ...prev,
            name: loadedNodes[0]?.name || 'Untitled Flow',
            nodes: reactFlowNodes,
            edges: [], // Convert relationships to edges if needed
            viewport: { x: 0, y: 0, zoom: 1 }
          }))
        } catch (error) {
          console.error('Failed to load model:', error)
          setLoadError(error instanceof Error ? error.message : 'Failed to load model')
        } finally {
          setIsLoading(false)
        }
      } else {
        console.log('No saved models found, using sample model')
        // Ensure the flow state is properly set with sample model data
        console.log('Setting flow with sample model data:', initialNodes)
        const reactFlowNodes = initialNodes.map(convertToReactFlowNode)
        setFlow(prev => ({
          ...prev,
          name: initialNodes[0]?.name || 'Untitled Flow',
          nodes: reactFlowNodes,
          edges: [], // No edges for sample model
          viewport: { x: 0, y: 0, zoom: 1 }
        }))
      }
    }

    loadSavedModel()
  }, [modelId, initialNodes])

  // Get connected actions for a stage using NodeRelationships
  const getConnectedActions = useCallback((stageId: string): ActionItem[] => {
    if (!functionModelNodes) {
      return []
    }
    
    // Find all parent-child relationships where stage is the parent OR target
    const stageRelationships = functionModelNodes.flatMap(node => 
      node.relationships.filter(
        rel => rel.relationshipType === 'parent-child' && 
              ((rel.sourceNodeId === stageId) ||
               (rel.targetNodeId === stageId))
      )
    )
    
    // Get action IDs from relationships
    const actionIds = stageRelationships.map(rel => 
      rel.sourceNodeId === stageId ? rel.targetNodeId : rel.sourceNodeId
    )
    
    // Find action nodes
    const actions: ActionItem[] = []
    functionModelNodes.forEach(node => {
      if (actionIds.includes(node.nodeId) && node.functionModelData.action) {
        actions.push(node.functionModelData.action)
      }
    })
    
    return actions;
  }, [functionModelNodes])

  // Open action modal from stage modal
  const openActionModal = useCallback((action: ActionItem, stageId: string) => {
    setModalStack(prev => [...prev, {
      type: 'action',
      data: action,
      context: { previousModal: 'stage', stageId }
    }])
  }, [])

  const nodeTypes = useMemo(
    () => ({
      stageNode: StageNode,
      ioNode: IONode,
      actionTableNode: ActionTableNode,
      functionModelContainer: FunctionModelContainerNode,
    }),
    [],
  )

  // Open StageNodeModal for stages
  const handleStageClick = useCallback((stage: Stage) => {
    setSelectedStage(stage)
    setStageModalOpen(true)
  }, [])

  const [flow, setFlow] = useState<Flow>({
    name: functionModelNodes[0]?.name || 'Untitled Flow',
    nodes: functionModelNodes.map(convertToReactFlowNode),
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  })

  // Sync flow state with functionModel
  useEffect(() => {
    setFunctionModelNodes(prev => prev.map(node => ({
      ...node,
      position: node.position, // Keep position from node
      data: {
        label: node.name,
        type: node.nodeType,
        description: node.description,
        stageData: node.functionModelData.stage,
        actionData: node.functionModelData.action,
        portData: node.functionModelData.io,
        containerData: node.functionModelData.container
      },
      reactFlowData: {
        draggable: node.reactFlowData.draggable,
        selectable: node.reactFlowData.selectable,
        deletable: node.reactFlowData.deletable
      }
    })))
  }, [functionModelNodes])

  // Navigate back to stage modal from action modal
  const navigateBackToStage = useCallback((stageId: string) => {
    // Look for the stage in flow nodes (for dynamically created stages)
    const stageNode = flow.nodes.find(n => n.id === stageId && n.type === 'stageNode')
    if (stageNode && stageNode.data.stage) {
      const stage = stageNode.data.stage
      setModalStack(prev => prev.filter(modal => modal.context?.stageId !== stageId))
      setSelectedStage(stage)
      setStageModalOpen(true)
    }
  }, [flow.nodes])

  // Helper to get node by id and type
  const getNodeById = (id: string) => flow.nodes.find((n) => n.id === id)

  // onConnect: handle all node connections and relationships
  const onConnect = useCallback((params: Connection) => {
    setFlow((f) => ({
      ...f,
      edges: addEdge(params, f.edges),
    }))
    
    // Find source and target nodes
    const sourceNode = getNodeById(params.source!)
    const targetNode = getNodeById(params.target!)
    if (!sourceNode || !targetNode) {
      return
    }
    
    // Get the specific handles being connected
    const sourceHandle = params.sourceHandle;
    const targetHandle = params.targetHandle;
    
    // Create relationship record using unified structure
    const relationship = {
      relationshipId: `${params.source}-${params.target}-${Date.now()}`,
      sourceNodeId: params.source!,
      targetNodeId: params.target!,
      relationshipType: 'sibling' as const, // default to sibling
      metadata: {
        sourceHandle: sourceHandle || '',
        targetHandle: targetHandle || '',
        strength: 1.0,
        bidirectional: false
      },
      createdAt: new Date()
    };
    
    // Handle Parent-Child relationships (StageNode/IONode ↔ ActionTableNode)
    if ((sourceHandle === 'header-source' && targetHandle === 'bottom-target') ||
        (sourceHandle === 'bottom-target' && targetHandle === 'header-source')) {
      
      const parentChildRelationship = {
        ...relationship,
        relationshipType: 'parent-child' as const,
      };
      
      let parentNode: Node | undefined, actionNode: Node | undefined
      // Support both StageNode and IONode as parent
      if ((sourceNode.type === "stageNode" || sourceNode.type === "ioNode") && targetNode.type === "actionTableNode") {
        parentNode = sourceNode
        actionNode = targetNode
      } else if (sourceNode.type === "actionTableNode" && (targetNode.type === "stageNode" || targetNode.type === "ioNode")) {
        parentNode = targetNode
        actionNode = sourceNode
      }
      
      if (parentNode && actionNode) {
        // Create TWO relationships: one in each direction for easier querying
        const parentToActionRelationship = {
          ...parentChildRelationship,
          relationshipId: `${parentNode.id}-${actionNode.id}-${Date.now()}`,
          sourceNodeId: parentNode.id,
          targetNodeId: actionNode.id,
        }
        
        const actionToParentRelationship = {
          ...parentChildRelationship,
          relationshipId: `${actionNode.id}-${parentNode.id}-${Date.now()}`,
          sourceNodeId: actionNode.id,
          targetNodeId: parentNode.id,
        }
        
        // Add both relationships to function model
        setFunctionModelNodes((fm) => {
          const updatedNodes = fm.map(node => {
            if (node.nodeId === parentNode!.id) {
              return {
                ...node,
                relationships: [...node.relationships, parentToActionRelationship, actionToParentRelationship]
              };
            }
            return node;
          });
          return updatedNodes;
        })
        
        // Update parent node data in flow.nodes if it's a dynamically created stage or io node
        setFlow((f) => {
          const updatedNodes = f.nodes.map((node) => {
            if (node.id === parentNode!.id && (node.type === 'stageNode' || node.type === 'ioNode')) {
              // For stageNode, update stage.actions; for ioNode, update io.actions
              if (node.type === 'stageNode' && node.data.stage) {
                const actions = node.data.stage.actions || []
                if (!actions.includes(actionNode!.id)) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      stage: {
                        ...node.data.stage,
                        actions: [...actions, actionNode!.id]
                      }
                    }
                  }
                }
              } else if (node.type === 'ioNode' && node.data.io) {
                const actions = node.data.io.actions || []
                if (!actions.includes(actionNode!.id)) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      io: {
                        ...node.data.io,
                        actions: [...actions, actionNode!.id]
                      }
                    }
                  }
                }
              }
            }
            return node
          })
          
          return { ...f, nodes: updatedNodes }
        })
      }
    }
    
    // Handle Sibling relationships (IONode ↔ StageNode, StageNode ↔ StageNode, IONode ↔ IONode)
    if ((sourceHandle === 'right-source' && targetHandle === 'left-target') ||
        (sourceHandle === 'left-target' && targetHandle === 'right-source')) {
      
      // Add relationship to function model
      setFunctionModelNodes((fm) => {
        const updatedNodes = fm.map(node => {
          if (node.nodeId === relationship.sourceNodeId) {
            return {
              ...node,
              relationships: [...node.relationships, relationship]
            };
          }
          return node;
        });
        return updatedNodes;
      })
      

    }
  }, [flow.nodes])

  // Single function to handle all edge changes including relationship cleanup
  const onEdgesChange = useCallback((changes: import('reactflow').EdgeChange[]) => {
    // Apply edge changes to flow state
    setFlow((f) => ({
      ...f,
      edges: applyEdgeChanges(changes, f.edges),
    }))
    
    // Handle relationship cleanup for removed edges
    changes.forEach((change: import('reactflow').EdgeChange) => {
      if (change.type === "remove") {
        const edge = flow.edges.find((e) => e.id === change.id)
        if (!edge) return
        
        const sourceNode = getNodeById(edge.source)
        const targetNode = getNodeById(edge.target)
        if (!sourceNode || !targetNode) return
        
        // Remove relationship from function model
        setFunctionModelNodes((fm) => {
          const updatedNodes = fm.map(node => {
            if (node.nodeId === sourceNode.id) {
              return {
                ...node,
                relationships: node.relationships.filter(rel => 
                  !(rel.sourceNodeId === edge.source && rel.targetNodeId === edge.target) &&
                  !(rel.sourceNodeId === edge.target && rel.targetNodeId === edge.source)
                )
              };
            }
            return node;
          });
          return updatedNodes;
        })
      }
    })
  }, [flow.edges, flow.nodes])

  // Add Stage Node handler
  const handleAddStageNode = useCallback(() => {
    const timestamp = Date.now()
    const stageId = `stage-${timestamp}`
    const nodeId = `stage-node-${timestamp}`
    
    setFlow((f) => ({
      ...f,
      nodes: [
        ...f.nodes,
        {
          id: nodeId,
          type: "stageNode",
          position: { x: 300, y: 200 },
          data: {
            stage: {
              id: nodeId, // Use the same ID as the node
              name: "New Stage",
              actions: [],
              dataChange: [],
              boundaryCriteria: [],
            },
            // No onStageClick
          },
        },
      ],
    }))
  }, [])

  // Add Action Node handler (new structure, no legacy)
  const handleAddActionNode = useCallback(() => {
    setFlow((f) => {
      const nodeId = `action-table-node-${Date.now()}`;
      const nodes = [
        ...f.nodes,
        {
          id: nodeId,
          type: "actionTableNode",
          position: { x: 200, y: 200 },
          data: {
            label: 'Actions',
            mode: 'actions',
            modes: {
              actions: {
                label: "Actions",
                rows: [
                  { 
                    title: 'Row 1', 
                    type: 'Type A',
                    actionRowId: 'action-001',
                    description: 'Description for action 1',
                    raci: {
                      responsible: 'IT Department',
                      accountable: 'Project Manager',
                      consult: 'Business Analyst',
                      inform: 'Stakeholders'
                    }
                  },
                  { 
                    title: 'Row 2', 
                    type: 'Type B',
                    actionRowId: 'action-002',
                    description: 'Description for action 2',
                    raci: {
                      responsible: 'Development Team',
                      accountable: 'Tech Lead',
                      consult: 'Architect',
                      inform: 'Product Owner'
                    }
                  },
                  { 
                    title: 'Row 3', 
                    type: 'Type C',
                    actionRowId: 'action-003',
                    description: 'Description for action 3',
                    raci: {
                      responsible: 'QA Team',
                      accountable: 'QA Lead',
                      consult: 'Test Engineer',
                      inform: 'Development Team'
                    }
                  }
                ]
              },
              dataChanges: {
                label: "Data Changes",
                rows: [
                  { 
                    title: 'Change 1', 
                    type: 'String',
                    actionRowId: 'change-001',
                    description: 'Description for data change 1',
                    raci: {
                      responsible: 'Data Team',
                      accountable: 'Data Manager',
                      consult: 'Data Analyst',
                      inform: 'Business Users'
                    }
                  },
                  { 
                    title: 'Change 2', 
                    type: 'Number',
                    actionRowId: 'change-002',
                    description: 'Description for data change 2',
                    raci: {
                      responsible: 'Backend Team',
                      accountable: 'Backend Lead',
                      consult: 'Database Admin',
                      inform: 'Frontend Team'
                    }
                  },
                  { 
                    title: 'Change 3', 
                    type: 'Date',
                    actionRowId: 'change-003',
                    description: 'Description for data change 3',
                    raci: {
                      responsible: 'System Admin',
                      accountable: 'Infrastructure Lead',
                      consult: 'DevOps Engineer',
                      inform: 'Development Team'
                    }
                  }
                ]
              },
              boundaryCriteria: {
                label: "Boundary Criteria",
                rows: [
                  { 
                    title: 'Criteria 1', 
                    type: 'Boolean',
                    actionRowId: 'criteria-001',
                    description: 'Description for boundary criteria 1',
                    raci: {
                      responsible: 'Business Analyst',
                      accountable: 'Product Manager',
                      consult: 'Stakeholders',
                      inform: 'Development Team'
                    }
                  },
                  { 
                    title: 'Criteria 2', 
                    type: 'Enum',
                    actionRowId: 'criteria-002',
                    description: 'Description for boundary criteria 2',
                    raci: {
                      responsible: 'UX Designer',
                      accountable: 'Design Lead',
                      consult: 'User Researcher',
                      inform: 'Product Team'
                    }
                  },
                  { 
                    title: 'Criteria 3', 
                    type: 'Number',
                    actionRowId: 'criteria-003',
                    description: 'Description for boundary criteria 3',
                    raci: {
                      responsible: 'Performance Engineer',
                      accountable: 'Performance Lead',
                      consult: 'System Architect',
                      inform: 'Development Team'
                    }
                  }
                ]
              }
            }
          },
          draggable: true,
        },
      ];
      return { ...f, nodes };
    });
  }, [setFlow])

  const handleIONodeClick = (io: any) => {
    // Example: open a modal, log, or any other action
    console.log('IONode clicked:', io);
  };

  const handleAddIONode = useCallback(() => {
    setFlow((f) => {
      const nodeId = `io-node-${Date.now()}`;
      const nodes = [
        ...f.nodes,
        {
          id: nodeId,
          type: "ioNode",
          position: { x: 100, y: 200 },
          data: {
            io: { 
              name: 'I/O', 
              id: nodeId,
              mode: 'input' // Default to input mode
            },
            // No onIOClick
          },
          draggable: true,
        },
      ];
      return { ...f, nodes };
    });
  }, [setFlow]);

  const inputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  // Focus textarea when entering description edit mode
  useEffect(() => {
    if (isEditingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
      descriptionRef.current.select()
    }
  }, [isEditingDescription])

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setFlow((f) => ({ ...f, name: newName }))
    // Also update the function model name
    setFunctionModelNodes(prev => prev.map(node => ({
      ...node,
      name: newName
    })))
  }

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value
    // Also update the function model description
    setFunctionModelNodes(prev => prev.map(node => ({
      ...node,
      description: newDescription
    })))
  }

  // Handle blur or Enter to finish editing
  const finishEditing = () => setIsEditingName(false)
  const finishDescriptionEditing = () => setIsEditingDescription(false)
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') finishEditing()
  }
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) finishDescriptionEditing()
  }

  // Handle back to list navigation
  const handleBackToList = () => {
    router.push('/dashboard/function-model/list')
  }

  // Make nodes moveable
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setFlow((f) => ({ ...f, nodes: applyNodeChanges(changes, f.nodes) }))
  }, [])

  // Make edges removable


  // Handle-specific connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = flow.nodes.find(n => n.id === connection.source);
    const targetNode = flow.nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) {
      return false;
    }
    
    // Get the specific handles being connected
    const sourceHandle = connection.sourceHandle;
    const targetHandle = connection.targetHandle;
    
    // Allow ActionTableNode to connect to StageNode or IONode bottom-target (parent-child)
    if (targetHandle === 'bottom-target' && sourceHandle === 'header-source') {
      return sourceNode.type === 'actionTableNode' && 
             (targetNode.type === 'stageNode' || targetNode.type === 'ioNode');
    }
    
    if (sourceHandle === 'header-source' && targetHandle === 'bottom-target') {
      return sourceNode.type === 'actionTableNode' && 
             (targetNode.type === 'stageNode' || targetNode.type === 'ioNode');
    }
    
    // StageNode right-source can only connect to StageNode left-target or IONode left-target (siblings)
    if (sourceHandle === 'right-source' && targetHandle === 'left-target') {
      return (sourceNode.type === 'stageNode' && targetNode.type === 'stageNode') ||
             (sourceNode.type === 'stageNode' && targetNode.type === 'ioNode') ||
             (sourceNode.type === 'ioNode' && targetNode.type === 'stageNode') ||
             (sourceNode.type === 'ioNode' && targetNode.type === 'ioNode');
    }
    
    // StageNode left-target can only receive from StageNode right-source or IONode right-source (siblings)
    if (targetHandle === 'left-target' && sourceHandle === 'right-source') {
      return (targetNode.type === 'stageNode' && sourceNode.type === 'stageNode') ||
             (targetNode.type === 'stageNode' && sourceNode.type === 'ioNode') ||
             (targetNode.type === 'ioNode' && sourceNode.type === 'stageNode') ||
             (targetNode.type === 'ioNode' && sourceNode.type === 'ioNode');
    }
    
    // Prevent ActionTableNodes from connecting as siblings
    if (sourceNode.type === 'actionTableNode' || targetNode.type === 'actionTableNode') {
      // Only allow parent-child connections (already handled above)
      return false;
    }
    
    return false; // Block all other connections
  }, [flow.nodes]);

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    // Create a remove change and let onEdgesChange handle it
    const change = { type: 'remove' as const, id: edge.id }
    onEdgesChange([change])
  }, [onEdgesChange])

  // Add a central onNodeClick handler
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // Set selected node for behavior panel
    setSelectedNodeId(node.id);
    
    if (node.type === 'stageNode') {
      // Open the stage modal with the correct stage data
      const stageData = node.data.stage;
      setSelectedStage(stageData);
      setStageModalOpen(true);
    } else if (node.type === 'ioNode') {
      // Handle IONode click (e.g., log or open modal)
      const ioData = node.data.io;
      setSelectedIONode(ioData);
      setIONodeModalOpen(true);
    } else if (node.type === 'actionTableNode') {
      // Handle ActionTableNode click if needed
      // Example: open action modal, etc.
      // const actionData = node.data;
      // ...
    }
  }, []);

  // Handle node selection for behavior panel
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setActivePersistenceTab('behavior')
  }, []);

  // Utility: Get all ActionTableNodes connected to a given IONode (similar to getConnectedActions for StageNode)
  const getConnectedActionsForIONode = useCallback((ioNodeId: string): ActionItem[] => {
    if (!functionModelNodes) {
      return []
    }
    
    // Find all parent-child relationships where IONode is the parent OR target
    const ioRelationships = functionModelNodes.flatMap(node => 
      node.relationships.filter(
        rel => rel.relationshipType === 'parent-child' && 
              ((rel.sourceNodeId === ioNodeId) ||
               (rel.targetNodeId === ioNodeId))
      )
    )
    
    // Deduplicate by action node ID
    const actionNodeIds = Array.from(new Set(
      ioRelationships.map(rel =>
        rel.sourceNodeId === ioNodeId ? rel.targetNodeId : rel.sourceNodeId
      )
    ));
    
    // Map to ActionItem objects
    const actions = actionNodeIds.map(actionNodeId => ({
      id: actionNodeId,
      name: `Action ${actionNodeId}`,
      description: `Action connected to I/O node ${ioNodeId}`,
      type: 'action' as const
    }));
    
    return actions;
  }, [functionModelNodes])

  return (
    <div className="w-full h-full relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading function model...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {loadError && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg">
          <p className="text-sm">Failed to load model: {loadError}</p>
          <button 
            onClick={() => setLoadError(null)}
            className="text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Floating, inline-editable flow name with back arrow */}
      <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2 min-w-[180px]">
        {/* Name row with back arrow */}
        <div className="flex items-center gap-2">
          {/* Back arrow */}
          <button
            onClick={handleBackToList}
            className="p-1.5 rounded hover:bg-primary/10 group bg-white/80 shadow border border-gray-200 backdrop-blur-sm"
            title="Back to List"
          >
            <ArrowLeft className="w-4 h-4 text-primary group-hover:scale-110" />
          </button>
          
          {/* Function name */}
          <div className="flex-1">
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={flow.name}
            onChange={handleNameChange}
            onBlur={finishEditing}
            onKeyDown={handleNameKeyDown}
            className="text-2xl font-sans font-semibold tracking-tight bg-white/80 rounded px-2 py-1 border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ minWidth: 180, maxWidth: 320 }}
          />
        ) : (
          <h2
            className="text-2xl font-sans font-semibold tracking-tight bg-white/80 rounded px-2 py-1 cursor-pointer select-none border border-transparent hover:border-gray-300 shadow"
            style={{ minWidth: 180, maxWidth: 320 }}
            title="Click to edit flow name"
            onClick={() => setIsEditingName(true)}
          >
            {flow.name || 'Untitled Flow'}
          </h2>
        )}
          </div>
        </div>
        
        {/* Description editing */}
        {isEditingDescription ? (
          <textarea
            ref={descriptionRef}
            value={functionModelNodes[0]?.description || ''}
            onChange={handleDescriptionChange}
            onBlur={finishDescriptionEditing}
            onKeyDown={handleDescriptionKeyDown}
            className="text-sm text-gray-600 bg-white/80 rounded px-2 py-1 border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            style={{ minWidth: 180, maxWidth: 320, minHeight: 60 }}
            placeholder="Add description..."
          />
        ) : (
          <p
            className="text-sm text-gray-600 bg-white/80 rounded px-2 py-1 cursor-pointer select-none border border-transparent hover:border-gray-300 shadow"
            style={{ minWidth: 180, maxWidth: 320, minHeight: 20 }}
            title="Click to edit description"
            onClick={() => setIsEditingDescription(true)}
          >
            {functionModelNodes[0]?.description || 'Click to add description...'}
          </p>
        )}
        {/* Floating horizontal icon bar for node types */}
        <TooltipProvider delayDuration={0}>
          <div className="mt-2 flex flex-row items-center gap-2 bg-white/80 rounded-lg shadow px-3 py-2 border border-gray-200 backdrop-blur-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setFunctionModelModalOpen(true)}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <Settings className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Function Model Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPersistenceSidebarOpen(!persistenceSidebarOpen)}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <Save className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Save & Load</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {}}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <Zap className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Show Event Storm</TooltipContent>
            </Tooltip>
            {/* Stage Node (Layers) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleAddStageNode}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <Layers className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Add Stage Node</TooltipContent>
            </Tooltip>
            {/* Action Node (Hammer) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleAddActionNode}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <Hammer className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Add Action Node</TooltipContent>
            </Tooltip>
            {/* I/O Node (ArrowLeftRight) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleAddIONode}
                  className="p-1.5 rounded hover:bg-primary/10 group"
                >
                  <ArrowLeftRight className="w-4 h-4 text-primary group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>Add I/O Node</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>


      <ReactFlowProvider>
        <div className="w-full h-full">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            className="w-full h-full"
            onEdgeContextMenu={onEdgeContextMenu}
            onNodeClick={handleNodeClick}
            onInit={(instance) => {
              console.log('ReactFlow initialized')
            }}
          >
            <Controls />
            <Background variant={"dots" as BackgroundVariant} gap={12} size={1} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>

      {/* Persistence Sidebar */}
      <div className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-transform duration-300 z-40 ${
        persistenceSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ width: '400px' }}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Persistence</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPersistenceSidebarOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActivePersistenceTab('save')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activePersistenceTab === 'save'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Save className="h-4 w-4 inline mr-2" />
              Save & Load
            </button>
            <button
              onClick={() => setActivePersistenceTab('links')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activePersistenceTab === 'links'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Link className="h-4 w-4 inline mr-2" />
              Cross-Links
            </button>
            <button
              onClick={() => setActivePersistenceTab('behavior')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activePersistenceTab === 'behavior'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Zap className="h-4 w-4 inline mr-2" />
              Behavior
            </button>
            <button
              onClick={() => setActivePersistenceTab('operations')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activePersistenceTab === 'operations'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Operations
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePersistenceTab === 'save' && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Save/Load functionality has been migrated to node-based architecture.
                  Use the node operations panel for persistence.
                </p>
              </div>
            )}
            {activePersistenceTab === 'links' && (
              <div className="p-4">
                <Button
                  onClick={() => setCrossFeatureModalOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Manage Cross-Feature Links
                </Button>
              </div>
            )}
            {activePersistenceTab === 'behavior' && selectedNodeId && (
              <NodeBehaviorPanel
                featureType="function-model"
                entityId={modelId || 'default-model-id'}
                nodeId={selectedNodeId}
                onExecutionComplete={(result) => {
                  console.log('Node execution completed:', result)
                  // Handle execution result
                }}
                onValidationComplete={(result) => {
                  console.log('Node validation completed:', result)
                  // Handle validation result
                }}
              />
            )}
            {activePersistenceTab === 'operations' && (
              <UnifiedOperationsPanel
                featureType="function-model"
                entityId={modelId || 'default-model-id'}
                onNodeCreated={(node) => {
                  console.log('Node created:', node)
                  // Handle node creation
                }}
                onNodeUpdated={(node) => {
                  console.log('Node updated:', node)
                  // Handle node update
                }}
                onNodeDeleted={(nodeId) => {
                  console.log('Node deleted:', nodeId)
                  // Handle node deletion
                }}
                onLinkCreated={(link) => {
                  console.log('Link created:', link)
                  // Handle link creation
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Persistence Sidebar Toggle Button */}
      <Button
        onClick={() => setPersistenceSidebarOpen(!persistenceSidebarOpen)}
        className="fixed right-4 top-20 z-30 shadow-lg"
        variant="outline"
        size="sm"
      >
        {persistenceSidebarOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Render StageNodeModal with enhanced functionality */}
      {selectedStage && (
        <StageNodeModal
          isOpen={stageModalOpen}
          onClose={() => setStageModalOpen(false)}
          stage={selectedStage}
          allActions={flow.nodes
            .filter((n) => n.type === 'actionTableNode')
            .map((n) => ({
              id: n.id,
              modes: n.data?.modes || {
                actions: { rows: n.data?.rows || [] },
                dataChanges: { rows: n.data?.rows || [] },
                boundaryCriteria: { rows: n.data?.rows || [] },
              },
            }))}
          allActionNodes={flow.nodes.filter((n) => n.type === 'actionTableNode')}
          connectedActions={getConnectedActions(selectedStage.id) as any}
          onActionClick={(action) => openActionModal(action as any, selectedStage.id)}
          showBackButton={false}
          onUpdateStage={(updatedStage) => {
            setFlow((prevFlow) => {
              const updatedNodes = prevFlow.nodes.map((node) => {
                if (node.id === updatedStage.id && node.type === 'stageNode') {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      stage: {
                        ...node.data.stage,
                        name: updatedStage.name,
                        description: updatedStage.description,
                      },
                      // Optionally, update label/description at node level if used
                      label: updatedStage.name,
                      description: updatedStage.description,
                    },
                  };
                }
                return node;
              });
              // Also update selectedStage so modal stays in sync
              if (selectedStage && selectedStage.id === updatedStage.id) {
                setSelectedStage((prev) => prev ? { ...prev, name: updatedStage.name, description: updatedStage.description } : prev);
              }
              return { ...prevFlow, nodes: updatedNodes };
            });
          }}
          modelId={modelId || 'default-model-id'}
        />
      )}
      
      {/* Render ActionModal from modal stack */}
      {modalStack.map((modal, index) => (
        <ActionModal
          key={`${modal.type}-${index}-${Date.now()}`}
          isOpen={true}
          onClose={() => {
            if (modal.context?.previousModal === 'stage' && modal.context?.stageId) {
              navigateBackToStage(modal.context.stageId)
            } else {
              setModalStack(prev => prev.filter((_, i) => i !== index))
            }
          }}
          action={modal.data as any}
          showBackButton={modal.context?.previousModal === 'stage'}
          onBackClick={() => {
            if (modal.context?.stageId) {
              navigateBackToStage(modal.context.stageId)
            }
          }}
        />
      ))}

      {/* Render IONodeModal */}
      {selectedIONode && (
        <IONodeModal
          isOpen={ioNodeModalOpen}
          onClose={() => setIONodeModalOpen(false)}
          port={selectedIONode}
          allActions={flow.nodes
            .filter((n) => n.type === 'actionTableNode')
            .map((n) => ({
              id: n.id,
              modes: n.data?.modes || {
                actions: { rows: n.data?.rows || [] },
                dataChanges: { rows: n.data?.rows || [] },
                boundaryCriteria: { rows: n.data?.rows || [] },
              },
            }))}
          allActionNodes={flow.nodes.filter((n) => n.type === 'actionTableNode')}
          connectedActions={getConnectedActionsForIONode(selectedIONode.id)}
          onActionClick={(action) => openActionModal(action as any, selectedIONode.id)}
          showBackButton={false}
          onUpdatePort={(updatedPort) => {
            setFlow((prevFlow) => {
              const updatedNodes = prevFlow.nodes.map((node) => {
                if (node.id === updatedPort.id && node.type === 'ioNode') {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      io: {
                        ...node.data.io,
                        name: updatedPort.name,
                        description: updatedPort.description,
                        mode: updatedPort.mode,
                      },
                      // Optionally, update label at node level if used
                      label: updatedPort.name,
                    },
                  };
                }
                return node;
              });
              // Also update selectedIONode so modal stays in sync
              if (selectedIONode && selectedIONode.id === updatedPort.id) {
                setSelectedIONode((prev: any) => prev ? { 
                  ...prev, 
                  name: updatedPort.name, 
                  description: updatedPort.description,
                  mode: updatedPort.mode 
                } : prev);
              }
              return { ...prevFlow, nodes: updatedNodes };
            });
          }}
        />
      )}

      {/* Render FunctionModelModal */}
      <FunctionModelModal
        isOpen={functionModelModalOpen}
        onClose={() => setFunctionModelModalOpen(false)}
        functionModel={functionModelNodes[0]} // Assuming the first node is the model
        onUpdateFunctionModel={(updatedModel) => {
          setFunctionModelNodes(prev => prev.map(node => ({
            ...node,
            name: updatedModel.name,
            description: updatedModel.description,
            functionModelData: updatedModel.functionModelData,
            metadata: updatedModel.metadata,
            businessLogic: updatedModel.businessLogic,
            processBehavior: updatedModel.processBehavior,
            updatedAt: new Date()
          })));
        }}
        onNavigateToEventStorm={() => {
          // TODO: Navigate to Event Storm page
          console.log('Navigate to Event Storm');
        }}
        onNavigateToSpindle={() => {
          // TODO: Navigate to Spindle page
          console.log('Navigate to Spindle');
        }}
        onNavigateToKnowledgeBase={() => {
          // TODO: Navigate to Knowledge Base page
          console.log('Navigate to Knowledge Base');
        }}
      />

      {/* Render Universal Cross-Feature Linking Modal */}
      <CrossFeatureLinkingModal
        open={crossFeatureModalOpen}
        onOpenChange={setCrossFeatureModalOpen}
        sourceFeature="function-model"
        sourceId={modelId || 'default-model-id'}
        onLinkCreated={(link) => {
          console.log('Cross-feature link created:', link)
        }}
        onLinkDeleted={(linkId) => {
          console.log('Cross-feature link deleted:', linkId)
        }}
      />

    </div>
  )
} 
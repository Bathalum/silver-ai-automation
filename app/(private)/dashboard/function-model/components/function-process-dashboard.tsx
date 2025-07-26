"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { ReactFlowProvider, ReactFlow, Controls, Background, useNodesState, useEdgesState, type Node } from "reactflow"
import "reactflow/dist/style.css"
import { Layers, Zap, Hammer, ArrowLeftRight, Settings } from "lucide-react"
import { StageNodeModal } from "@/components/composites/stage-node-modal"
import { ActionModal } from "@/components/composites/action-modal"
import { FunctionModelModal } from "@/components/composites/function-model-modal"
import { StageNode, IONode, ActionTableNode, FunctionModelContainerNode } from "./flow-nodes"
import type { FunctionModel, Stage, ActionItem, DataPort } from "@/lib/domain/entities/function-model-types"
import type { BackgroundVariant } from "reactflow"
import { addEdge, type Connection, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Edge } from "reactflow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { NodeRelationship } from "@/lib/domain/entities/function-model-types"
import { IONodeModal } from "@/components/composites/io-node-modal";

interface Flow {
  name: string
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

// Sample data for initial state
const sampleFunctionModel: FunctionModel = {
  id: "func-001",
  name: "Function / Process Name",
  description: "1 paragraph per goal that you want to achieve by the end of the process",
  input: {
    id: "input-001",
    name: "Input",
    description: "Input data port for the process",
    masterData: ["Master Data: (Customer, Employee, Team Member, Organization)"],
    referenceData: ["Reference Data: (The way they group the master data)"],
    transactionData: ["Transaction Data: (biz txn or event that you want to track)"],
  },
  output: {
    id: "output-001",
    name: "Output",
    description: "Output data port for the process",
    masterData: ["Master Data: (Customer, Employee, Team Member, Organization)"],
    referenceData: ["Reference Data: (The way they group the master data)"],
    transactionData: ["Transaction Data: (biz txn or event that you want to track)"],
  },
  relationships: [],
  stages: [],
}

interface FunctionProcessDashboardProps {
  functionModel?: FunctionModel
}

export function FunctionProcessDashboard({
  functionModel: initialModel = sampleFunctionModel,
}: FunctionProcessDashboardProps) {
  const [functionModel, setFunctionModel] = useState<FunctionModel>(initialModel)

  // Modal state management for nested modals
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModel | Stage | ActionItem | DataPort
    context?: { previousModal?: string; stageId?: string }
  }>>([])

  // State for StageNodeModal
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)

  // Add state for IONode modal
  const [ioNodeModalOpen, setIONodeModalOpen] = useState(false);
  const [selectedIONode, setSelectedIONode] = useState<any>(null);

  // Add state for Function Model modal
  const [functionModelModalOpen, setFunctionModelModalOpen] = useState(false);

  // Get connected actions for a stage using NodeRelationships
  const getConnectedActions = useCallback((stageId: string): ActionItem[] => {
    if (!functionModel.relationships) {
      return []
    }
    
    // Find all parent-child relationships where stage is the parent OR target
    const stageRelationships = functionModel.relationships.filter(
      rel => rel.type === 'parent-child' && 
            ((rel.sourceNodeId === stageId && rel.targetNodeType === 'actionTableNode') ||
             (rel.targetNodeId === stageId && rel.sourceNodeType === 'actionTableNode'))
    )
    
    // Deduplicate by action node ID
    const actionNodeIds = Array.from(new Set(
      stageRelationships.map(rel =>
        rel.sourceNodeId === stageId ? rel.targetNodeId : rel.sourceNodeId
      )
    ));
    
    // Map to ActionItem objects
    const actions = actionNodeIds.map(actionNodeId => ({
      id: actionNodeId,
      name: `Action ${actionNodeId}`,
      description: `Action connected to stage ${stageId}`,
      type: 'action' as const
    }));
    
    return actions;
  }, [functionModel.relationships])

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
    name: "My Function Model",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  })

  // Navigate back to stage modal from action modal
  const navigateBackToStage = useCallback((stageId: string) => {
    // First try to find the stage in functionModel.stages (for sample data)
    let stage = functionModel.stages.find(s => s.id === stageId)
    
    // If not found in functionModel, look for it in flow nodes (for dynamically created stages)
    if (!stage) {
      const stageNode = flow.nodes.find(n => n.id === stageId && n.type === 'stageNode')
      if (stageNode && stageNode.data.stage) {
        stage = stageNode.data.stage
      }
    }
    
    if (stage) {
      setModalStack(prev => prev.filter(modal => modal.context?.stageId !== stageId))
      setSelectedStage(stage)
      setStageModalOpen(true)
    }
  }, [functionModel.stages, flow.nodes])

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
    
    // Create relationship record
    const relationship: NodeRelationship = {
      id: `${params.source}-${params.target}-${Date.now()}`,
      sourceNodeId: params.source!,
      targetNodeId: params.target!,
      sourceHandle: sourceHandle || '',
      targetHandle: targetHandle || '',
      type: 'sibling', // default to sibling
      sourceNodeType: sourceNode.type as any,
      targetNodeType: targetNode.type as any,
      createdAt: new Date()
    };
    
    // Handle Parent-Child relationships (StageNode/IONode ↔ ActionTableNode)
    if ((sourceHandle === 'header-source' && targetHandle === 'bottom-target') ||
        (sourceHandle === 'bottom-target' && targetHandle === 'header-source')) {
      
      relationship.type = 'parent-child';
      
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
        const parentToActionRelationship: NodeRelationship = {
          ...relationship,
          id: `${parentNode.id}-${actionNode.id}-${Date.now()}`,
          sourceNodeId: parentNode.id,
          targetNodeId: actionNode.id,
          sourceNodeType: parentNode.type as any,
          targetNodeType: actionNode.type as any,
        }
        
        const actionToParentRelationship: NodeRelationship = {
          ...relationship,
          id: `${actionNode.id}-${parentNode.id}-${Date.now()}`,
          sourceNodeId: actionNode.id,
          targetNodeId: parentNode.id,
          sourceNodeType: actionNode.type as any,
          targetNodeType: parentNode.type as any,
        }
        
        // Add both relationships to function model
        setFunctionModel((fm) => {
          const relationships = fm.relationships || [];
          const updatedRelationships = [...relationships, parentToActionRelationship, actionToParentRelationship];
          
          return { ...fm, relationships: updatedRelationships }
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
      
      relationship.type = 'sibling';
      
      // Add relationship to function model
      setFunctionModel((fm) => {
        const relationships = fm.relationships || [];
        const updatedRelationships = [...relationships, relationship];
        
        return { ...fm, relationships: updatedRelationships }
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
        setFunctionModel((fm) => {
          const relationships = fm.relationships || [];
          
          const updatedRelationships = relationships.filter(rel => 
            !(rel.sourceNodeId === edge.source && rel.targetNodeId === edge.target) &&
            !(rel.sourceNodeId === edge.target && rel.targetNodeId === edge.source)
          )
          
          let updatedStages = fm.stages;
          
          // Handle Parent-Child relationship removal (StageNode ↔ ActionTableNode)
          let stageNode: Node | undefined, actionNode: Node | undefined
          if (sourceNode.type === "stageNode" && targetNode.type === "actionTableNode") {
            stageNode = sourceNode
            actionNode = targetNode
          } else if (sourceNode.type === "actionTableNode" && targetNode.type === "stageNode") {
            stageNode = targetNode
            actionNode = sourceNode
          }
          
          if (stageNode && actionNode) {
            // Remove action id from stage's actions array (for sample data stages)
            updatedStages = fm.stages.map((stage) => {
              if (stage.id === stageNode!.id) {
                const actions = (stage.actions || []).filter((id) => id !== actionNode!.id)
                return { ...stage, actions }
              }
              return stage
            })
            
            // Also update stage data in flow.nodes if it's a dynamically created stage
            setFlow((f) => {
              const updatedNodes = f.nodes.map((node) => {
                if (node.id === stageNode!.id && node.type === 'stageNode' && node.data.stage) {
                  const actions = (node.data.stage.actions || []).filter((id: string) => id !== actionNode!.id)
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      stage: {
                        ...node.data.stage,
                        actions
                      }
                    }
                  }
                }
                return node
              })
              
              return { ...f, nodes: updatedNodes }
            })
          }
          
          return { ...fm, stages: updatedStages, relationships: updatedRelationships }
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

  const [isEditingName, setIsEditingName] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlow((f) => ({ ...f, name: e.target.value }))
  }

  // Handle blur or Enter to finish editing
  const finishEditing = () => setIsEditingName(false)
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') finishEditing()
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

  // Utility: Get all ActionTableNodes connected to a given IONode (similar to getConnectedActions for StageNode)
  const getConnectedActionsForIONode = useCallback((ioNodeId: string): ActionItem[] => {
    if (!functionModel.relationships) {
      return []
    }
    
    // Find all parent-child relationships where IONode is the parent OR target
    const ioRelationships = functionModel.relationships.filter(
      rel => rel.type === 'parent-child' && 
            ((rel.sourceNodeId === ioNodeId && rel.targetNodeType === 'actionTableNode') ||
             (rel.targetNodeId === ioNodeId && rel.sourceNodeType === 'actionTableNode'))
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
  }, [functionModel.relationships])

  return (
    <div className="w-full h-full relative">
      {/* Floating, inline-editable flow name */}
      <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2 min-w-[180px]">
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
        >
          <Controls />
          <Background variant={"dots" as BackgroundVariant} gap={12} size={1} />
        </ReactFlow>
      </ReactFlowProvider>

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
          connectedActions={getConnectedActions(selectedStage.id)}
          onActionClick={(action) => openActionModal(action, selectedStage.id)}
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
        />
      )}
      
      {/* Render ActionModal from modal stack */}
      {modalStack.map((modal, index) => (
        <ActionModal
          key={`${modal.type}-${modal.data.id}-${index}`}
          isOpen={true}
          onClose={() => {
            if (modal.context?.previousModal === 'stage' && modal.context?.stageId) {
              navigateBackToStage(modal.context.stageId)
            } else {
              setModalStack(prev => prev.filter((_, i) => i !== index))
            }
          }}
          action={modal.data as ActionItem}
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
          onActionClick={(action) => openActionModal(action, selectedIONode.id)}
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
        functionModel={functionModel}
        onUpdateFunctionModel={(updatedModel) => {
          setFunctionModel(updatedModel);
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

    </div>
  )
} 
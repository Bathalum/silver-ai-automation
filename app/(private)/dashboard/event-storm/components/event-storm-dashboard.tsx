"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { ReactFlowProvider, ReactFlow, Controls, Background, useNodesState, useEdgesState, type Node } from "reactflow"
import "reactflow/dist/style.css"
import { Layers, Zap, Settings, FolderOpen, Calendar } from "lucide-react"
import { EventStormModal } from "@/components/composites/event-storm-modal"
import { DomainModal } from "@/components/composites/domain-modal"
import { EventModal } from "@/components/composites/event-modal"
import { DomainNode } from "./flow-nodes"
import { EventNode } from "./flow-nodes"
import type { EventStorm, Domain, Event, NodeRelationship } from "@/lib/domain/entities/event-storm"
import type { BackgroundVariant } from "reactflow"
import { addEdge, type Connection, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Edge } from "reactflow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FeedbackProvider } from "@/components/ui/feedback-toast"

interface Flow {
  name: string
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

// Sample data for initial state
const sampleEventStorm: EventStorm = {
  id: "event-storm-001",
  name: "Event Storm Name",
  description: "Description of the event storm process",
  domains: [],
  relationships: [],
}

interface EventStormDashboardProps {
  eventStorm?: EventStorm
}

// Inner component that can use the feedback context
function EventStormDashboardContent({
  eventStorm: initialModel = sampleEventStorm,
}: EventStormDashboardProps) {
  const [eventStorm, setEventStorm] = useState<EventStorm>(initialModel)

  // Modal state management for nested modals
  const [modalStack, setModalStack] = useState<Array<{
    type: "event-storm" | "domain" | "event"
    data: EventStorm | Domain | Event
    context?: { 
      previousModal?: string; 
      domainId?: string;
    }
  }>>([])

  // State for EventStormModal
  const [eventStormModalOpen, setEventStormModalOpen] = useState(false)

  // State for Domain modal
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)

  // State for Event modal
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Drag detection state
  const [draggingEventNode, setDraggingEventNode] = useState<Node | null>(null)
  const [dragOverDomainNode, setDragOverDomainNode] = useState<Node | null>(null)



  // Open event modal from domain modal
  const openEventModal = useCallback((event: Event, domainId: string) => {
    setModalStack(prev => [...prev, {
      type: 'event',
      data: event,
      context: { previousModal: 'domain', domainId }
    }])
  }, [])

  const nodeTypes = useMemo(
    () => ({
      domainNode: DomainNode,
      eventNode: EventNode,
    }),
    [],
  )

  // Open DomainModal for domains
  const handleDomainClick = useCallback((domain: Domain) => {
    setSelectedDomain(domain)
    setDomainModalOpen(true)
  }, [])

  const [flow, setFlow] = useState<Flow>({
    name: "My Event Storm",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  })

  // Get connected events for a domain using NodeRelationships
  const getConnectedEvents = useCallback((domainId: string): Event[] => {
    // First, try to get events from the domain node's data (for dynamically created domains)
    const domainNode = flow.nodes.find(n => n.id === domainId && n.type === 'domainNode')
    
    if (domainNode && domainNode.data.domainData?.events) {
      const eventIds = domainNode.data.domainData.events
      
      const events = eventIds.map((eventId: string) => {
        const eventNode = flow.nodes.find(n => n.id === eventId && n.type === 'eventNode')
        if (eventNode && eventNode.data.eventData) {
          return {
            id: eventId,
            name: eventNode.data.eventData.name || `Event ${eventId}`,
            description: eventNode.data.eventData.description || `Event connected to domain ${domainId}`,
            position: eventNode.data.eventData.position || { x: 0, y: 0 },
            parentDomainId: domainId,
            siblings: eventNode.data.eventData.siblings || [],
            metadata: eventNode.data.eventData.metadata || {},
          }
        }
        // Fallback if event node not found
        return {
          id: eventId,
          name: `Event ${eventId}`,
          description: `Event connected to domain ${domainId}`,
          position: { x: 0, y: 0 },
          parentDomainId: domainId,
          siblings: [],
          metadata: {},
        }
      })
      
      return events
    }
    
    // Fallback to relationships (for sample data domains)
    if (!eventStorm.relationships) {
      return []
    }
    
    // Find all parent-child relationships where domain is the parent
    const domainRelationships = eventStorm.relationships.filter(
      rel => rel.type === 'parent-child' && 
            rel.sourceNodeId === domainId && 
            rel.targetNodeType === 'eventNode'
    )
    
    // Get event IDs from relationships
    const eventIds = domainRelationships.map(rel => rel.targetNodeId)
    
    // Map to Event objects using actual event data from flow nodes
    const events = eventIds.map((eventId: string) => {
      const eventNode = flow.nodes.find(n => n.id === eventId && n.type === 'eventNode')
      if (eventNode && eventNode.data.eventData) {
        return {
          id: eventId,
          name: eventNode.data.eventData.name || `Event ${eventId}`,
          description: eventNode.data.eventData.description || `Event connected to domain ${domainId}`,
          position: eventNode.data.eventData.position || { x: 0, y: 0 },
          parentDomainId: domainId,
          siblings: eventNode.data.eventData.siblings || [],
          metadata: eventNode.data.eventData.metadata || {},
        }
      }
      // Fallback if event node not found
      return {
        id: eventId,
        name: `Event ${eventId}`,
        description: `Event connected to domain ${domainId}`,
        position: { x: 0, y: 0 },
        parentDomainId: domainId,
        siblings: [],
        metadata: {},
      }
    })
    
    return events
  }, [eventStorm.relationships, flow.nodes])

  // Navigate back to domain modal from event modal
  const navigateBackToDomain = useCallback((domainId: string) => {
    // First try to find the domain in eventStorm.domains
    let domain = eventStorm.domains.find(d => d.id === domainId)
    
    // If not found in eventStorm, look for it in flow nodes (for dynamically created domains)
    if (!domain) {
      const domainNode = flow.nodes.find(n => n.id === domainId && n.type === 'domainNode')
      if (domainNode && domainNode.data.domainData) {
        domain = domainNode.data.domainData
      }
    }
    
    if (domain) {
      setModalStack(prev => prev.filter(modal => modal.context?.domainId !== domainId))
      setSelectedDomain(domain)
      setDomainModalOpen(true)
    }
  }, [eventStorm.domains, flow.nodes])

  // Helper to get node by id and type
  const getNodeById = (id: string) => flow.nodes.find((n) => n.id === id)

  // Transform EventNode to row within DomainNode
  const transformEventToRow = useCallback((eventNode: Node, domainNode: Node) => {
    // 1. Update the EventNode to be a child of the domain (but keep it as a proper node)
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === eventNode.id && node.type === 'eventNode') {
          // Update the EventNode to indicate it's now a child of the domain
          return {
            ...node,
            data: {
              ...node.data,
              eventData: {
                ...node.data.eventData,
                parentDomainId: domainNode.id
              },
              isChildNode: true, // Flag to indicate this is a child node
              parentNodeId: domainNode.id
            }
          }
        }
        if (node.id === domainNode.id && node.type === 'domainNode') {
          // Add event reference to domain
          return {
            ...node,
            data: {
              ...node.data,
              domainData: {
                ...node.data.domainData,
                events: [...(node.data.domainData?.events || []), eventNode.id]
              }
            }
          }
        }
        return node
      })
    }))
    
    // 2. Create relationship in event storm state
    setEventStorm(prev => ({
      ...prev,
      relationships: [...(prev.relationships || []), {
        id: `${domainNode.id}-${eventNode.id}-${Date.now()}`,
        sourceNodeId: domainNode.id,
        targetNodeId: eventNode.id,
        sourceHandle: '',
        targetHandle: '',
        type: 'parent-child',
        sourceNodeType: 'domainNode',
        targetNodeType: 'eventNode',
        createdAt: new Date()
      }]
    }))
  }, [])

  // Remove event from domain and make it standalone
  const removeEventFromDomain = useCallback((eventNode: Node, domainId: string) => {
    
    // 1. Update the EventNode to remove child status
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === eventNode.id && node.type === 'eventNode') {
          return {
            ...node,
            data: {
              ...node.data,
              eventData: {
                ...node.data.eventData,
                parentDomainId: ""
              },
              isChildNode: false,
              parentNodeId: undefined
            }
          }
        }
        if (node.id === domainId && node.type === 'domainNode') {
          // Remove event reference from domain
          return {
            ...node,
            data: {
              ...node.data,
              domainData: {
                ...node.data.domainData,
                events: (node.data.domainData?.events || []).filter((id: string) => id !== eventNode.id)
              }
            }
          }
        }
        return node
      })
    }))
    
    // 2. Remove relationship from event storm state
    setEventStorm(prev => ({
      ...prev,
      relationships: (prev.relationships || []).filter(rel => 
        !(rel.sourceNodeId === domainId && rel.targetNodeId === eventNode.id)
      )
    }))
  }, [])


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
    
    // Handle Parent-Child relationships (DomainNode ↔ EventNode)
    if ((sourceHandle === 'content-source' && targetHandle === 'parent-target') ||
        (sourceHandle === 'parent-target' && targetHandle === 'content-source')) {
      
      relationship.type = 'parent-child';
      
      let domainNode: Node | undefined, eventNode: Node | undefined
      if (sourceNode.type === "domainNode" && targetNode.type === "eventNode") {
        domainNode = sourceNode
        eventNode = targetNode
      } else if (sourceNode.type === "eventNode" && targetNode.type === "domainNode") {
        domainNode = targetNode
        eventNode = sourceNode
      }
      
      if (domainNode && eventNode) {
        // Create TWO relationships: one in each direction for easier querying
        const domainToEventRelationship: NodeRelationship = {
          ...relationship,
          id: `${domainNode.id}-${eventNode.id}-${Date.now()}`,
          sourceNodeId: domainNode.id,
          targetNodeId: eventNode.id,
          sourceNodeType: domainNode.type as any,
          targetNodeType: eventNode.type as any,
        }
        
        const eventToDomainRelationship: NodeRelationship = {
          ...relationship,
          id: `${eventNode.id}-${domainNode.id}-${Date.now()}`,
          sourceNodeId: eventNode.id,
          targetNodeId: domainNode.id,
          sourceNodeType: eventNode.type as any,
          targetNodeType: domainNode.type as any,
        }
        
        // Add both relationships to event storm
        setEventStorm((es) => {
          const relationships = es.relationships || [];
          const updatedRelationships = [...relationships, domainToEventRelationship, eventToDomainRelationship];
          
          return { ...es, relationships: updatedRelationships }
        })
        
        // Update domain node data in flow.nodes if it's a dynamically created domain
        setFlow((f) => {
          const updatedNodes = f.nodes.map((node) => {
            if (node.id === domainNode!.id && node.type === 'domainNode') {
              const events = node.data.domainData?.events || []
              if (!events.includes(eventNode!.id)) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    domainData: {
                      ...node.data.domainData,
                      events: [...events, eventNode!.id]
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
    
    // Handle Sibling relationships (DomainNode ↔ DomainNode, EventNode ↔ EventNode)
    if ((sourceHandle === 'right-source' && targetHandle === 'left-target') ||
        (sourceHandle === 'left-target' && targetHandle === 'right-source')) {
      
      relationship.type = 'sibling';
      
      // Add relationship to event storm
      setEventStorm((es) => {
        const relationships = es.relationships || [];
        const updatedRelationships = [...relationships, relationship];
        
        return { ...es, relationships: updatedRelationships }
      })

      // Update domain nodes' siblings arrays for DomainNode ↔ DomainNode relationships
      if (sourceNode.type === 'domainNode' && targetNode.type === 'domainNode') {
        setFlow((f) => {
          const updatedNodes = f.nodes.map((node) => {
            if (node.id === sourceNode.id && node.type === 'domainNode') {
              const siblings = node.data.domainData?.siblings || []
              if (!siblings.includes(targetNode.id)) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    domainData: {
                      ...node.data.domainData,
                      siblings: [...siblings, targetNode.id]
                    }
                  }
                }
              }
            }
            if (node.id === targetNode.id && node.type === 'domainNode') {
              const siblings = node.data.domainData?.siblings || []
              if (!siblings.includes(sourceNode.id)) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    domainData: {
                      ...node.data.domainData,
                      siblings: [...siblings, sourceNode.id]
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
        
        // Remove relationship from event storm
        setEventStorm((es) => {
          const relationships = es.relationships || [];
          
          const updatedRelationships = relationships.filter(rel => 
            !(rel.sourceNodeId === edge.source && rel.targetNodeId === edge.target) &&
            !(rel.sourceNodeId === edge.target && rel.targetNodeId === edge.source)
          )
          
          let updatedDomains = es.domains;
          
          // Handle Parent-Child relationship removal (DomainNode ↔ EventNode)
          let domainNode: Node | undefined, eventNode: Node | undefined
          if (sourceNode.type === "domainNode" && targetNode.type === "eventNode") {
            domainNode = sourceNode
            eventNode = targetNode
          } else if (sourceNode.type === "eventNode" && targetNode.type === "domainNode") {
            domainNode = targetNode
            eventNode = sourceNode
          }
          
          if (domainNode && eventNode) {
            // Remove event id from domain's events array (for sample data domains)
            updatedDomains = es.domains.map((domain) => {
              if (domain.id === domainNode!.id) {
                const events = (domain.events || []).filter((id) => id !== eventNode!.id)
                return { ...domain, events }
              }
              return domain
            })
            
            // Also update domain data in flow.nodes if it's a dynamically created domain
            setFlow((f) => {
              const updatedNodes = f.nodes.map((node) => {
                if (node.id === domainNode!.id && node.type === 'domainNode' && node.data.domainData) {
                  const events = (node.data.domainData.events || []).filter((id: string) => id !== eventNode!.id)
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      domainData: {
                        ...node.data.domainData,
                        events
                      }
                    }
                  }
                }
                return node
              })
              
              return { ...f, nodes: updatedNodes }
            })
          }

          // Handle Sibling relationship removal (DomainNode ↔ DomainNode)
          if (sourceNode.type === "domainNode" && targetNode.type === "domainNode") {
            // Remove sibling references from both domain nodes
            setFlow((f) => {
              const updatedNodes = f.nodes.map((node) => {
                if (node.id === sourceNode.id && node.type === 'domainNode' && node.data.domainData) {
                  const siblings = (node.data.domainData.siblings || []).filter((id: string) => id !== targetNode.id)
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      domainData: {
                        ...node.data.domainData,
                        siblings
                      }
                    }
                  }
                }
                if (node.id === targetNode.id && node.type === 'domainNode' && node.data.domainData) {
                  const siblings = (node.data.domainData.siblings || []).filter((id: string) => id !== sourceNode.id)
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      domainData: {
                        ...node.data.domainData,
                        siblings
                      }
                    }
                  }
                }
                return node
              })
              
              return { ...f, nodes: updatedNodes }
            })
          }
          
          return { ...es, domains: updatedDomains, relationships: updatedRelationships }
        })
      }
    })
  }, [flow.edges, flow.nodes])

  // Add Domain Node handler
  const handleAddDomainNode = useCallback(() => {
    const timestamp = Date.now()
    const domainId = `domain-${timestamp}`
    const nodeId = `domain-node-${timestamp}`
    
    setFlow((f) => ({
      ...f,
      nodes: [
        ...f.nodes,
        {
          id: nodeId,
          type: "domainNode",
          position: { x: 300, y: 200 },
          data: {
            domainData: {
              id: nodeId,
              name: "New Domain",
              description: "Domain description",
              position: { x: 300, y: 200 },
              events: [],
              siblings: [],
            },
            label: "New Domain",
            type: "domain",
            onEventClick: (event: Event) => {
              // Open event modal for the clicked event
              setModalStack(prev => [...prev, {
                type: 'event',
                data: event,
                context: { 
                  previousModal: 'domain',
                  domainId: nodeId
                }
              }])
            },
            onEventRightClick: (eventNode: Node, parentDomainId: string) => {
              // Remove event from domain on right-click
              removeEventFromDomain(eventNode, parentDomainId)
            }
          },
        },
      ],
    }))
  }, [])





  // Add Event Node handler
  const handleAddEventNode = useCallback(() => {
    const timestamp = Date.now()
    const eventId = `event-${timestamp}`
    const nodeId = `event-node-${timestamp}`
    
    setFlow((f) => ({
      ...f,
      nodes: [
        ...f.nodes,
        {
          id: nodeId,
          type: "eventNode",
          position: { x: 200, y: 200 },
          data: {
            eventData: {
              id: nodeId,
              name: "New Event",
              description: "Event description",
              position: { x: 200, y: 200 },
              parentDomainId: "",
              siblings: [],
            },
            label: "New Event",
            type: "event",
          },
        },
      ],
    }))
  }, [])

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
    
    // Allow EventNode to connect to DomainNode content-source (parent-child)
    if (targetHandle === 'content-source' && sourceHandle === 'parent-target') {
      return sourceNode.type === 'eventNode' && targetNode.type === 'domainNode';
    }
    
    if (sourceHandle === 'content-source' && targetHandle === 'parent-target') {
      return sourceNode.type === 'eventNode' && targetNode.type === 'domainNode';
    }
    
    // DomainNode right-source can only connect to DomainNode left-target (siblings)
    if (sourceHandle === 'right-source' && targetHandle === 'left-target') {
      return sourceNode.type === 'domainNode' && targetNode.type === 'domainNode';
    }
    
    // DomainNode left-target can only receive from DomainNode right-source (siblings)
    if (targetHandle === 'left-target' && sourceHandle === 'right-source') {
      return targetNode.type === 'domainNode' && sourceNode.type === 'domainNode';
    }
    
    // EventNode right-source can only connect to EventNode left-target (siblings within same domain)
    if (sourceHandle === 'right-source' && targetHandle === 'left-target') {
      return sourceNode.type === 'eventNode' && targetNode.type === 'eventNode';
    }
    
    // EventNode left-target can only receive from EventNode right-source (siblings within same domain)
    if (targetHandle === 'left-target' && sourceHandle === 'right-source') {
      return targetNode.type === 'eventNode' && sourceNode.type === 'eventNode';
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
    // Don't handle node clicks if any modal is open
    if (eventStormModalOpen || domainModalOpen || modalStack.length > 0) {
      return
    }
    
    // Check if the click was on an event row within a DomainNode
    const target = event.target as Element
    const eventRow = target.closest('[data-event-row]')
    
    if (eventRow) {
      // Click was on an event row, don't open domain modal
      return
    }
    
    if (node.type === 'domainNode') {
      // Open the domain modal with the correct domain data
      const domainData = node.data.domainData;
      setSelectedDomain(domainData);
      setDomainModalOpen(true);
    } else if (node.type === 'eventNode') {
      // Handle EventNode click - use modal stack system
      const eventData = node.data.eventData;
      if (eventData) {
        setModalStack(prev => [...prev, {
          type: 'event',
          data: eventData,
          context: { 
            previousModal: node.data?.parentNodeId ? 'domain' : undefined,
            domainId: node.data?.parentNodeId
          }
        }])
      }
    }
  }, [eventStormModalOpen, domainModalOpen, modalStack.length])



  // Node drag start handler - track when EventNode dragging starts
  const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'eventNode') {
      setDraggingEventNode(node)
    }
  }, [])

  // Node drag stop handler - handle drop on DomainNode
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (draggingEventNode && node.type === 'eventNode') {
      // Get the current mouse position
      const mouseX = event.clientX
      const mouseY = event.clientY
      
      // Find domain nodes at this position
      const domainNodes = flow.nodes.filter(n => n.type === 'domainNode')
      
      for (const domainNode of domainNodes) {
        // Simple collision detection - check if mouse is within domain node bounds
        // This is a basic implementation - you might want to use a more sophisticated approach
        const nodeElement = document.querySelector(`[data-node-id="${domainNode.id}"]`)
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect()
          if (mouseX >= rect.left && mouseX <= rect.right && 
              mouseY >= rect.top && mouseY <= rect.bottom) {
            transformEventToRow(draggingEventNode, domainNode)
            break
          }
        }
      }
      
      // Reset drag state
      setDraggingEventNode(null)
      setDragOverDomainNode(null)
    }
  }, [draggingEventNode, flow.nodes])


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
              {flow.name || 'Untitled Event Storm'}
            </h2>
          )}
          {/* Floating horizontal icon bar for node types */}
          <TooltipProvider delayDuration={0}>
            <div className="mt-2 flex flex-row items-center gap-2 bg-white/80 rounded-lg shadow px-3 py-2 border border-gray-200 backdrop-blur-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setEventStormModalOpen(true)}
                    className="p-1.5 rounded hover:bg-primary/10 group"
                  >
                    <Settings className="w-4 h-4 text-primary group-hover:scale-110" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>Event Storm Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      // TODO: Navigate to Function Model page
                    }}
                    className="p-1.5 rounded hover:bg-primary/10 group"
                  >
                    <Zap className="w-4 h-4 text-primary group-hover:scale-110" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>Show Function Model</TooltipContent>
              </Tooltip>
              {/* Domain Node (FolderOpen) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAddDomainNode}
                    className="p-1.5 rounded hover:bg-primary/10 group"
                  >
                    <FolderOpen className="w-4 h-4 text-primary group-hover:scale-110" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>Add Domain Node</TooltipContent>
              </Tooltip>
              {/* Event Node (Calendar) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAddEventNode}
                    className="p-1.5 rounded hover:bg-primary/10 group"
                  >
                    <Calendar className="w-4 h-4 text-primary group-hover:scale-110" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>Add Event Node</TooltipContent>
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
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
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

        {/* Render EventStormModal */}
        <EventStormModal
          isOpen={eventStormModalOpen}
          onClose={() => setEventStormModalOpen(false)}
          eventStorm={eventStorm}
          flowName={flow.name}
          flowNodes={flow.nodes}
          flowEdges={flow.edges}
          onUpdateFlowName={(newName) => {
            setFlow(prev => ({ ...prev, name: newName }))
          }}
          onUpdateEventStorm={(updatedModel) => {
            setEventStorm(updatedModel);
          }}
          onNavigateToFunctionModel={() => {
            // TODO: Navigate to Function Model page
          }}
          onNavigateToSpindle={() => {
            // TODO: Navigate to Spindle page
          }}
          onNavigateToKnowledgeBase={() => {
            // TODO: Navigate to Knowledge Base page
          }}
        />

        {/* Render DomainModal */}
        {selectedDomain && (
          <DomainModal
            isOpen={domainModalOpen}
            onClose={() => setDomainModalOpen(false)}
            domain={selectedDomain}
            connectedEvents={getConnectedEvents(selectedDomain.id)}
            onEventClick={(event) => openEventModal(event, selectedDomain.id)}
            showBackButton={false}
            onUpdateDomain={(updatedDomain) => {
              setFlow((prevFlow) => {
                const updatedNodes = prevFlow.nodes.map((node) => {
                  if (node.id === updatedDomain.id && node.type === 'domainNode') {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        domainData: {
                          ...node.data.domainData,
                          name: updatedDomain.name,
                          description: updatedDomain.description,
                          metadata: updatedDomain.metadata,
                        },
                        label: updatedDomain.name,
                      },
                    };
                  }
                  return node;
                });
                // Also update selectedDomain so modal stays in sync
                if (selectedDomain && selectedDomain.id === updatedDomain.id) {
                  setSelectedDomain(updatedDomain);
                }
                return { ...prevFlow, nodes: updatedNodes };
              });
            }}
            onNavigateToFunctionModel={() => {
              window.location.href = "/dashboard/function-model"
            }}
            onNavigateToEventStorm={() => {
              window.location.href = "/dashboard/event-storm"
            }}
            onNavigateToSpindle={() => {
              window.location.href = "/dashboard/spindle"
            }}
            onNavigateToKnowledgeBase={() => {
              window.location.href = "/dashboard/knowledge-base"
            }}
            onReorderEvents={(reorderedEvents) => {
              // Update the domain's events array with the new order
              setFlow((prevFlow) => {
                const updatedNodes = prevFlow.nodes.map((node) => {
                  if (node.id === selectedDomain.id && node.type === 'domainNode') {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        domainData: {
                          ...node.data.domainData,
                          events: reorderedEvents.map(event => event.id),
                        },
                      },
                    };
                  }
                  return node;
                });
                return { ...prevFlow, nodes: updatedNodes };
              });
              
              // Also update selectedDomain to ensure the modal re-renders with the new order
              if (selectedDomain) {
                setSelectedDomain({
                  ...selectedDomain,
                  events: reorderedEvents.map(event => event.id)
                });
              }
            }}
          />
        )}

        {/* Render EventModal from modal stack */}
        {modalStack.map((modal, index) => (
          <EventModal
            key={`${modal.type}-${modal.data.id}-${index}`}
            isOpen={true}
            onClose={() => {
              // Remove this modal from the stack
              setModalStack(prev => prev.filter((_, i) => i !== index))
            }}
            event={modal.data as Event}
            showBackButton={modal.context?.previousModal === 'domain'}
            onBackClick={() => {
              if (modal.context?.domainId) {
                navigateBackToDomain(modal.context.domainId)
              }
            }}
            onUpdateEvent={(updatedEvent) => {
              setFlow((prevFlow) => {
                const updatedNodes = prevFlow.nodes.map((node) => {
                  if (node.id === updatedEvent.id && node.type === 'eventNode') {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        eventData: {
                          ...node.data.eventData,
                          name: updatedEvent.name,
                          description: updatedEvent.description,
                          metadata: updatedEvent.metadata,
                        },
                        label: updatedEvent.name,
                      },
                    };
                  }
                  return node;
                });
                return { ...prevFlow, nodes: updatedNodes };
              });
            }}
            onNavigateToFunctionModel={() => {
              // TODO: Navigate to Function Model page
            }}
            onNavigateToEventStorm={() => {
              // TODO: Navigate to Event Storm page
            }}
            onNavigateToSpindle={() => {
              // TODO: Navigate to Spindle page
            }}
            onNavigateToKnowledgeBase={() => {
              // TODO: Navigate to Knowledge Base page
            }}
          />
        )        )}
      </div>
  )
}

export function EventStormDashboard({
  eventStorm: initialModel = sampleEventStorm,
}: EventStormDashboardProps) {
  return (
    <FeedbackProvider>
      <EventStormDashboardContent
        eventStorm={initialModel}
      />
    </FeedbackProvider>
  )
}
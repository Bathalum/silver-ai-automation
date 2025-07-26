import { useReactFlow, Handle, Position, type NodeProps } from "reactflow"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, ChevronRight, ChevronLeft, Calendar, Database, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { type NodeData } from "@/lib/domain/entities/event-storm"
import './flow-nodes.css'

export function DomainNode(props: NodeProps) {
  const { data, isConnectable, id } = props
  const { domainData } = data
  const { getNodes } = useReactFlow()

  // Get event styling based on event type (same as EventNode)
  const getEventStyling = (eventData: any) => {
    const eventType = eventData?.type || eventData?.eventType || 'default'
    
    switch (eventType) {
      case 'command':
        return {
          row: 'bg-blue-50 hover:bg-blue-100',
          text: 'text-black'
        }
      case 'event':
        return {
          row: 'bg-green-50 hover:bg-green-100',
          text: 'text-black'
        }
      case 'query':
        return {
          row: 'bg-purple-50 hover:bg-purple-100',
          text: 'text-black'
        }
      case 'error':
        return {
          row: 'bg-red-50 hover:bg-red-100',
          text: 'text-black'
        }
      case 'warning':
        return {
          row: 'bg-yellow-50 hover:bg-yellow-100',
          text: 'text-black'
        }
      default:
        return {
          row: 'bg-green-50 hover:bg-green-100',
          text: 'text-black'
        }
    }
  }

  // Get all EventNodes that are children of this domain, ordered by the domain's events array
  const allChildEventNodes = getNodes().filter(node => 
    node.type === 'eventNode' && 
    node.data?.parentNodeId === id
  )
  
  // Sort child events according to the domain's events array order
  const childEventNodes = domainData?.events 
    ? domainData.events
        .map((eventId: string) => allChildEventNodes.find((node: any) => node.id === eventId))
        .filter((node: any): node is any => Boolean(node)) // Remove any undefined entries
    : allChildEventNodes



  return (
    <div 
      className="w-[300px] cursor-pointer"
      data-node-type="domainNode"
      data-node-id={id}
    >
      {/* Left target handle for sibling connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      {/* Right source handle for sibling connections */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      
      <Card className="mb-1 flex flex-col items-stretch p-0 border border-gray-200 bg-white">
        {/* Header Section */}
        <CardHeader className="p-3 flex flex-row items-center justify-center bg-gray-50 border-b border-gray-200">
          <span className="font-medium text-gray-900 text-sm">
            {domainData?.name || "New Domain"}
          </span>
        </CardHeader>
        
        {/* Table Content */}
        <CardContent className="p-0 bg-white">
          {childEventNodes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {childEventNodes.map((eventNode: any, index: number) => {
                const styling = getEventStyling(eventNode.data?.eventData)
                return (
                  <div 
                    key={eventNode.id}
                    data-event-row="true"
                    data-event-node-id={eventNode.id}
                    className={`flex items-center px-3 py-2 transition-colors cursor-pointer group ${styling.row}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Call the onEventClick callback if provided
                      if (data?.onEventClick && eventNode.data?.eventData) {
                        data.onEventClick(eventNode.data.eventData)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Call the onEventRightClick callback if provided
                      if (data?.onEventRightClick && eventNode.data?.parentNodeId) {
                        data.onEventRightClick(eventNode, eventNode.data.parentNodeId)
                      }
                    }}
                  >
                    <span className={`text-sm ${styling.text}`}>
                      {eventNode.data?.eventData?.name || `Event ${eventNode.id}`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-500">No events</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function EventNode(props: NodeProps) {
  const { data, isConnectable } = props
  const { eventData } = data

  // Get event styling based on event type or use default green
  const getEventStyling = (eventData: any) => {
    const eventType = eventData?.type || eventData?.eventType || 'default'
    
    switch (eventType) {
      case 'command':
        return {
          card: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
          header: 'bg-blue-200',
          text: 'text-blue-900'
        }
      case 'event':
        return {
          card: 'bg-green-100 hover:bg-green-200 border-green-300',
          header: 'bg-green-200',
          text: 'text-green-900'
        }
      case 'query':
        return {
          card: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
          header: 'bg-purple-200',
          text: 'text-purple-900'
        }
      case 'error':
        return {
          card: 'bg-red-100 hover:bg-red-200 border-red-300',
          header: 'bg-red-200',
          text: 'text-red-900'
        }
      case 'warning':
        return {
          card: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
          header: 'bg-yellow-200',
          text: 'text-yellow-900'
        }
      default:
        return {
          card: 'bg-green-100 hover:bg-green-200 border-green-300',
          header: 'bg-green-200',
          text: 'text-green-900'
        }
    }
  }

  const styling = getEventStyling(eventData)

  // If this is a child node, render it as a transparent but interactive node
  if (data?.isChildNode) {
    return (
      <div 
        className="w-[300px] pointer-events-auto"
        data-node-type="eventNode"
        data-child-node="true"
        data-parent-domain={data.parentNodeId}
        style={{ 
          opacity: 0.01, // Nearly invisible but still interactive
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 10 // Ensure it's above the domain node
        }}
      >
        {/* This node is nearly invisible but can receive right-click events */}
        <div className="w-full h-full bg-transparent" />
      </div>
    )
  }

  return (
    <div className="w-[300px] cursor-pointer">
      <Card className={`mb-1 flex flex-col items-stretch p-0 ${styling.card} transition-colors border-2`}>
        <CardHeader className={`p-2 flex flex-row items-center justify-center ${styling.header}`}>
          <span className={`font-semibold text-xs ${styling.text}`}>
            {eventData?.name || "New Event"}
          </span>
        </CardHeader>
      </Card>
    </div>
  )
} 
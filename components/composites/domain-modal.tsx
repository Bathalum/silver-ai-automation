"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar,
  ArrowRight,
  GripVertical,
  FolderOpen
} from "lucide-react"
import { SharedFeatureModal } from "./shared-feature-modal"
import { useModalForm } from "@/hooks/use-modal-form"
import type { Domain, Event } from "@/lib/domain/entities/event-storm"

interface DomainModalProps {
  isOpen: boolean
  onClose: () => void
  domain: Domain
  connectedEvents: Event[]
  onEventClick: (event: Event) => void
  showBackButton?: boolean
  onBackClick?: () => void
  onUpdateDomain: (updatedDomain: Domain) => void
  // New props for enhanced functionality
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
  // Event reordering functionality
  onReorderEvents?: (reorderedEvents: Event[]) => void
}

export function DomainModal({
  isOpen,
  onClose,
  domain,
  connectedEvents,
  onEventClick,
  showBackButton = false,
  onBackClick,
  onUpdateDomain,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase,
  onReorderEvents,
}: DomainModalProps) {
  // Event reordering state
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [reorderedEventIds, setReorderedEventIds] = useState<Set<string>>(new Set())
  

  
  // Use shared form hook
  const {
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    metadata,
    setMetadata,
    handleNameBlurOrEnter,
    handleDescriptionBlurOrEnter,
    handleMetadataBlurOrEnter
  } = useModalForm({
    entity: domain,
    onUpdate: onUpdateDomain
  })

  // Event reordering functions
  const handleEventDragStart = useCallback((event: Event, e: React.DragEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.setData('text/plain', event.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleEventDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleEventDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedEvent || !onReorderEvents) {
      setDraggedEvent(null)
      setDragOverIndex(null)
      return
    }
    
    const currentIndex = connectedEvents.findIndex(event => event.id === draggedEvent.id)
    
    if (currentIndex === -1) {
      setDraggedEvent(null)
      setDragOverIndex(null)
      return
    }
    
    // Don't reorder if dropping on the same position
    if (currentIndex === dropIndex) {
      setDraggedEvent(null)
      setDragOverIndex(null)
      return
    }
    
    // Create new array with reordered events
    const newEvents = [...connectedEvents]
    newEvents.splice(currentIndex, 1)
    newEvents.splice(dropIndex, 0, draggedEvent)
    
    // Call the callback to update the order
    onReorderEvents(newEvents)
    
    // Add visual feedback for reordered events
    setReorderedEventIds(new Set([draggedEvent.id]))
    setTimeout(() => setReorderedEventIds(new Set()), 2000) // Clear after 2 seconds
    
    // Reset drag state
    setDraggedEvent(null)
    setDragOverIndex(null)
  }, [draggedEvent, connectedEvents, onReorderEvents])

  const handleEventDragEnd = useCallback(() => {
    setDraggedEvent(null)
    setDragOverIndex(null)
  }, [])

  // Render Details Tab - Domain specific fields
  const renderDetailsTab = () => (
    <div className="space-y-6">
      <div>
        <Label>Domain Name</Label>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameBlurOrEnter}
          onKeyDown={e => { if (e.key === "Enter") handleNameBlurOrEnter() }}
          placeholder="Enter domain name"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onBlur={handleDescriptionBlurOrEnter}
          onKeyDown={e => { if (e.key === "Enter") handleDescriptionBlurOrEnter() }}
          placeholder="Enter domain description"
          rows={3}
        />
      </div>

      <div>
        <Label>Domain ID</Label>
        <Input value={domain.id} readOnly />
      </div>

      {/* Connected Events Section */}
      <div>
        <Label>Connected Events ({connectedEvents.length})</Label>
        

        
        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
          {connectedEvents.length === 0 ? (
            <div className="text-muted-foreground">No events connected to this domain</div>
          ) : (
            connectedEvents.map((event, index) => (
              <div
                key={event.id}
                draggable
                onDragStart={(e) => handleEventDragStart(event, e)}
                onDragOver={(e) => handleEventDragOver(e, index)}
                onDrop={(e) => handleEventDrop(e, index)}
                onDragEnd={handleEventDragEnd}
                className={`flex items-center justify-between p-3 border rounded-md cursor-move transition-all ${
                  draggedEvent?.id === event.id ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index ? 'border-blue-500 bg-blue-50' : ''
                } ${
                  reorderedEventIds.has(event.id) ? 'border-green-500 bg-green-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-gray-600">{event.description}</div>
                  </div>
                </div>
                                 <div className="flex items-center gap-2">
                   <Badge variant="outline">Event</Badge>
                   <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEventClick(event)}
                    className="flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Metadata Section */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div>
          <Label>Metadata</Label>
          <div className="border rounded-md p-4 space-y-2">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-medium">{key}:</span>
                <span className="text-gray-600">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // Render Statistics Tab
  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Domain Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {connectedEvents.length}
          </div>
          <div className="text-sm text-gray-600">Connected Events</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {domain.siblings?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Sibling Domains</div>
        </div>
      </div>
      
      {/* Event Type Breakdown */}
      {connectedEvents.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Event Types</h4>
          <div className="space-y-2">
            {connectedEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{event.name}</span>
                <span className="text-xs text-gray-500">{event.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <SharedFeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Domain: ${domain.name}`}
      featureType="event-storm"
      showBackButton={showBackButton}
      onBackClick={onBackClick}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToSpindle={onNavigateToSpindle}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
} 
"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FeedbackToast, useFeedback } from "@/components/ui/feedback-toast"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar,
  Plus
} from "lucide-react"
import { SharedFeatureModal } from "./shared-feature-modal"
import { useModalForm } from "@/hooks/use-modal-form"
import type { Event, Domain } from "@/lib/domain/entities/event-storm"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  parentDomain?: Domain
  showBackButton?: boolean
  onBackClick?: () => void
  onUpdateEvent: (updatedEvent: Event) => void
  // New props for enhanced functionality
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}

export function EventModal({
  isOpen,
  onClose,
  event,
  parentDomain,
  showBackButton = false,
  onBackClick,
  onUpdateEvent,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase,
}: EventModalProps) {
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
    entity: event,
    onUpdate: onUpdateEvent
  })

  // Render Details Tab - Event specific fields
  const renderDetailsTab = () => (
    <div className="space-y-6">
      <div>
        <Label>Event Name</Label>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameBlurOrEnter}
          onKeyDown={e => { if (e.key === "Enter") handleNameBlurOrEnter() }}
          placeholder="Enter event name"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onBlur={handleDescriptionBlurOrEnter}
          onKeyDown={e => { if (e.key === "Enter") handleDescriptionBlurOrEnter() }}
          placeholder="Enter event description"
          rows={3}
        />
      </div>

      <div>
        <Label>Event ID</Label>
        <Input value={event.id} readOnly />
      </div>

      {/* Parent Domain Section */}
      {parentDomain && (
        <div>
          <Label>Parent Domain</Label>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{parentDomain.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{parentDomain.description}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Position */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>X Position</Label>
          <Input value={event.position.x} readOnly />
        </div>
        <div>
          <Label>Y Position</Label>
          <Input value={event.position.y} readOnly />
        </div>
      </div>

      {/* Sibling Events */}
      {event.siblings && event.siblings.length > 0 && (
        <div>
          <Label>Sibling Events ({event.siblings.length})</Label>
          <div className="border rounded-md p-4 space-y-2">
            {event.siblings.map((siblingId, index) => (
              <div key={siblingId} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">Sibling Event {index + 1}</span>
                <span className="text-xs text-gray-500">{siblingId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <h3 className="text-lg font-semibold mb-4">Event Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {event.siblings?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Sibling Events</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {event.metadata ? Object.keys(event.metadata).length : 0}
          </div>
          <div className="text-sm text-gray-600">Metadata Fields</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {event.id.length}
          </div>
          <div className="text-sm text-gray-600">ID Length</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">
            {event.name.length}
          </div>
          <div className="text-sm text-gray-600">Name Length</div>
        </div>
      </div>
      
      {/* Position Information */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Position Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-3">
            <div className="text-lg font-bold text-blue-600">
              {event.position.x}
            </div>
            <div className="text-xs text-gray-600">X Coordinate</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-lg font-bold text-green-600">
              {event.position.y}
            </div>
            <div className="text-xs text-gray-600">Y Coordinate</div>
          </div>
        </div>
      </div>

      {/* Parent Domain Information */}
      {parentDomain && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Parent Domain</h4>
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-sm font-medium text-gray-900">{parentDomain.name}</div>
            <div className="text-xs text-gray-600 mt-1">{parentDomain.description}</div>
            <div className="text-xs text-gray-500 mt-2">Domain ID: {parentDomain.id}</div>
          </div>
        </div>
      )}

      {/* Sibling Events List */}
      {event.siblings && event.siblings.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sibling Events</h4>
          <div className="space-y-2">
            {event.siblings.map((siblingId, index) => (
              <div key={siblingId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Sibling {index + 1}</span>
                <span className="text-xs text-gray-500">{siblingId}</span>
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
      title={`Event: ${event.name}`}
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
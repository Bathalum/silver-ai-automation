"use client"

import { EventStormSharedModal } from "./shared-feature-modal"
import { EventStormFormFields } from "./feature-form-fields"
import { FlowStatistics } from "../ui/flow-statistics"
import type { Node, Edge } from "reactflow"
import type { EventStorm } from "@/lib/domain/entities/event-storm"

interface EventStormModalProps {
  isOpen: boolean
  onClose: () => void
  eventStorm: EventStorm
  flowName?: string
  flowNodes?: Node[]
  flowEdges?: Edge[]
  onUpdateFlowName?: (newName: string) => void
  onUpdateEventStorm?: (updatedModel: EventStorm) => void
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}

export function EventStormModal({ 
  isOpen, 
  onClose, 
  eventStorm,
  flowName,
  flowNodes = [],
  flowEdges = [],
  onUpdateFlowName,
  onUpdateEventStorm,
  onNavigateToFunctionModel,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: EventStormModalProps) {
  
  // Render Details Tab
  const renderDetailsTab = () => (
    <EventStormFormFields
      id={eventStorm.id}
      name={flowName || eventStorm.name}
      description={eventStorm.description}
      onUpdateName={(name) => onUpdateFlowName?.(name)}
      onUpdateDescription={(description) => 
        onUpdateEventStorm?.({ ...eventStorm, description })
      }
    />
  )

  // Render Stats Tab
  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Event Storm Statistics</h3>
      <FlowStatistics
        nodes={flowNodes}
        edges={flowEdges}
        title="Event Storm Statistics"
        variant="default"
        showSummary={true}
        showDetailedStats={true}
      />
    </div>
  )

  return (
    <EventStormSharedModal
      isOpen={isOpen}
      onClose={onClose}
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToSpindle={onNavigateToSpindle}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
} 
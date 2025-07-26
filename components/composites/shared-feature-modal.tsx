"use client"

import { useState, useEffect, ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { ArrowLeft } from "lucide-react"
import { FeatureSidebar } from "./feature-sidebar"
import { NavigationTabContent } from "./shared/navigation-tab-content"
import type { Node, Edge } from "reactflow"

export interface SharedFeatureModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  featureType: "event-storm" | "function-model" | "spindle" | "knowledge-base"
  // Flow data for statistics
  flowNodes?: Node[]
  flowEdges?: Edge[]
  // Content renderers for custom tabs
  renderDetailsTab?: () => ReactNode
  renderStatsTab?: () => ReactNode
  // Navigation handlers
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
  className?: string
  // Enhanced props for better abstraction
  showBackButton?: boolean
  onBackClick?: () => void
  customSidebarItems?: Array<{
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    description?: string
  }>
}

export function SharedFeatureModal({
  isOpen,
  onClose,
  title,
  featureType = "event-storm",
  flowNodes = [],
  flowEdges = [],
  renderDetailsTab,
  renderStatsTab,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase,
  className,
  showBackButton = false,
  onBackClick,
  customSidebarItems
}: SharedFeatureModalProps) {
  const [activeTab, setActiveTab] = useState("details")

  // Reset to details tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("details")
    }
  }, [isOpen])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  // Built-in tab content renderers
  const renderBuiltInDetailsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Details</h3>
      <p className="text-muted-foreground">
        View and edit basic information for this feature.
      </p>
    </div>
  )

  const renderBuiltInStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {flowNodes.length}
          </div>
          <div className="text-sm text-gray-600">Nodes</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {flowEdges.length}
          </div>
          <div className="text-sm text-gray-600">Connections</div>
        </div>
      </div>
    </div>
  )

  const renderFunctionModelTab = () => (
    <NavigationTabContent 
      tabType="function-model" 
      onNavigate={onNavigateToFunctionModel || (() => {})} 
    />
  )

  const renderEventStormTab = () => (
    <NavigationTabContent 
      tabType="event-storm" 
      onNavigate={onNavigateToEventStorm || (() => {})} 
    />
  )

  const renderSpindleTab = () => (
    <NavigationTabContent 
      tabType="spindle" 
      onNavigate={onNavigateToSpindle || (() => {})} 
    />
  )

  const renderKnowledgeBaseTab = () => (
    <NavigationTabContent 
      tabType="knowledge-base" 
      onNavigate={onNavigateToKnowledgeBase || (() => {})} 
    />
  )

  // Only return null after all hooks have been called
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-5xl max-h-[90vh] overflow-hidden ${className}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {showBackButton && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex h-[600px]">
          {/* Use existing FeatureSidebar component */}
          <FeatureSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            featureType={featureType}
            onNavigateToFunctionModel={onNavigateToFunctionModel}
            onNavigateToEventStorm={onNavigateToEventStorm}
            onNavigateToSpindle={onNavigateToSpindle}
            onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
          />

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "details" && (renderDetailsTab ? renderDetailsTab() : renderBuiltInDetailsTab())}
            {activeTab === "stats" && (renderStatsTab ? renderStatsTab() : renderBuiltInStatsTab())}
            {activeTab === "function-model" && renderFunctionModelTab()}
            {activeTab === "event-storm" && renderEventStormTab()}
            {activeTab === "spindle" && renderSpindleTab()}
            {activeTab === "knowledge-base" && renderKnowledgeBaseTab()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Pre-configured modals for common features
export function EventStormSharedModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  onNavigateToFunctionModel,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: {
  isOpen: boolean
  onClose: () => void
  flowNodes?: Node[]
  flowEdges?: Edge[]
  renderDetailsTab?: () => ReactNode
  renderStatsTab?: () => ReactNode
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}) {
  return (
    <SharedFeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Storm Settings"
      featureType="event-storm"
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

export function FunctionModelSharedModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: {
  isOpen: boolean
  onClose: () => void
  flowNodes?: Node[]
  flowEdges?: Edge[]
  renderDetailsTab?: () => ReactNode
  renderStatsTab?: () => ReactNode
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}) {
  return (
    <SharedFeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="Function Model Settings"
      featureType="function-model"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToSpindle={onNavigateToSpindle}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
}

export function SpindleSharedModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  onNavigateToEventStorm,
  onNavigateToFunctionModel,
  onNavigateToKnowledgeBase
}: {
  isOpen: boolean
  onClose: () => void
  flowNodes?: Node[]
  flowEdges?: Edge[]
  renderDetailsTab?: () => ReactNode
  renderStatsTab?: () => ReactNode
  onNavigateToEventStorm?: () => void
  onNavigateToFunctionModel?: () => void
  onNavigateToKnowledgeBase?: () => void
}) {
  return (
    <SharedFeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="Spindle Settings"
      featureType="spindle"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
}

export function KnowledgeBaseSharedModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  onNavigateToEventStorm,
  onNavigateToFunctionModel,
  onNavigateToSpindle
}: {
  isOpen: boolean
  onClose: () => void
  flowNodes?: Node[]
  flowEdges?: Edge[]
  renderDetailsTab?: () => ReactNode
  renderStatsTab?: () => ReactNode
  onNavigateToEventStorm?: () => void
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
}) {
  return (
    <SharedFeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="Knowledge Base Settings"
      featureType="knowledge-base"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToSpindle={onNavigateToSpindle}
    />
  )
} 
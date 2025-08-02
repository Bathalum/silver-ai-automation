import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import { ArrowLeft, ExternalLink, Link, GitBranch } from "lucide-react"
import { SIDEBAR_ITEMS } from "./shared/constants"
import { ModeSelector, getRowsForMode, ModeType } from "./shared/mode-selector"
import { useModalForm } from "@/hooks/use-modal-form"
import { NavigationTabContent } from "./shared/navigation-tab-content"

import type { Stage, ActionItem, NodeRelationship } from "@/lib/domain/entities/function-model-types"

// Define a minimal Action type inline
interface Action {
  id: string
  modes?: {
    actions?: { rows?: any[] }
    dataChanges?: { rows?: any[] }
    boundaryCriteria?: { rows?: any[] }
  }
}

interface StageNodeModalProps {
  isOpen: boolean
  onClose: () => void
  stage: Stage
  allActions: Action[] // Pass all actions in the flow
  allActionNodes: any[] // Node[] from React Flow, type as any for now
  // New props for enhanced functionality
  connectedActions?: ActionItem[]
  onActionClick?: (action: ActionItem) => void
  showBackButton?: boolean
  onBackClick?: () => void
  // New: handler to update stage node data
  onUpdateStage?: (updatedStage: Stage) => void
  // NEW: Props for node-level linking
  modelId?: string
}

export function StageNodeModal({ 
  isOpen, 
  onClose, 
  stage, 
  allActions,
  allActionNodes = [],
  connectedActions = [],
  onActionClick,
  showBackButton = false,
  onBackClick,
  onUpdateStage,
  modelId
}: StageNodeModalProps) {
  // All hooks must be called unconditionally
  const [activeSidebar, setActiveSidebar] = useState("details")
  const [activeMode, setActiveMode] = useState<ModeType>("actions")
  
  // Use shared form hook
  const {
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    handleNameBlurOrEnter,
    handleDescriptionBlurOrEnter
  } = useModalForm({
    entity: stage,
    onUpdate: onUpdateStage || (() => {})
  })

  // Handle action row click
  const handleActionClick = (action: ActionItem) => {
    if (onActionClick) {
      onActionClick(action)
    }
  }

  // Only return null after all hooks have been called
  if (!isOpen || !stage) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Stage Details</DialogTitle>
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
          {/* Sidebar Tabs with icons */}
          <div className="w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-2">
            {/* Details Tab */}
            <Button
              variant={activeSidebar === "details" ? "secondary" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0 flex flex-col items-center justify-center"
              onClick={() => setActiveSidebar("details")}
              title="Details"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            
            {/* Links Tab */}
            <Button
              variant={activeSidebar === "links" ? "secondary" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0 flex flex-col items-center justify-center"
              onClick={() => setActiveSidebar("links")}
              title="Links"
            >
              <Link className="w-5 h-5" />
            </Button>
            
            {/* Nested Models Tab */}
            <Button
              variant={activeSidebar === "nested-models" ? "secondary" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0 flex flex-col items-center justify-center"
              onClick={() => setActiveSidebar("nested-models")}
              title="Nested Models"
            >
              <GitBranch className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSidebar === "details" && (
              <div className="space-y-4">
                <div>
                  <Label>Stage Name</Label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={handleNameBlurOrEnter}
                    onKeyDown={e => { if (e.key === "Enter") handleNameBlurOrEnter() }}
                  />
                </div>
                <div>
                  <Label>Stage ID</Label>
                  <Input value={stage.id} readOnly />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    onBlur={handleDescriptionBlurOrEnter}
                    onKeyDown={e => { if (e.key === "Enter") handleDescriptionBlurOrEnter() }}
                  />
                </div>
                {/* Enhanced Child Actions Section */}
                <div>
                  <Label>Child Actions</Label>
                  <ModeSelector 
                    activeMode={activeMode}
                    onModeChange={setActiveMode}
                  />
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                    {/* Render rows for each connected action node, grouped by action node */}
                    {connectedActions.length === 0 ? (
                      <div className="text-muted-foreground">No actions connected</div>
                    ) : (
                      connectedActions.map((action) => {
                        const actionNode = allActionNodes.find((n) => n.id === action.id);
                        const rows = getRowsForMode(actionNode, activeMode);
                        return (
                          <div key={action.id} className="mb-4">
                            <div className="font-semibold mb-2">{actionNode?.data?.label || action.name}</div>
                            {rows.length === 0 ? (
                              <div className="text-muted-foreground">No items</div>
                            ) : (
                              <ul>
                                {rows.map((row: any, idx: number) => (
                                  <li key={idx} className="border-b py-2 flex justify-between">
                                    <span>{row.title || row}</span>
                                    {row.type && <span className="text-xs text-gray-500">{row.type}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeSidebar === "links" && modelId && (
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cross-Feature Linking</p>
                  <p className="text-sm">Use the universal linking modal for all cross-feature relationships</p>
                  <Button 
                    onClick={() => {
                      // TODO: Open universal modal for node-level linking
                      console.log('Open universal modal for node:', stage.id)
                    }}
                    className="mt-4"
                  >
                    Open Linking Modal
                  </Button>
                </div>
              </div>
            )}
            
            {activeSidebar === "nested-models" && modelId && (
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nested Models</p>
                  <p className="text-sm">Use the universal linking modal for nested model relationships</p>
                  <Button 
                    onClick={() => {
                      // TODO: Open universal modal for nested model linking
                      console.log('Open universal modal for nested model:', stage.id)
                    }}
                    className="mt-4"
                  >
                    Open Linking Modal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
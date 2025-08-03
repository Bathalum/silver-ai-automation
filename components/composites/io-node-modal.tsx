import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { SIDEBAR_ITEMS } from "./shared/constants"
import { ModeSelector, getRowsForMode, ModeType } from "./shared/mode-selector"
import { useModalForm } from "@/hooks/use-modal-form"
import { NavigationTabContent } from "./shared/navigation-tab-content"
import type { DataPort, NodeRelationship } from "@/lib/domain/entities/unified-node-types"

// Define a minimal Stage type inline
interface Stage {
  id: string
  name: string
  description?: string
  actions?: string[]
}

// Define Action types to match StageNodeModal
interface Action {
  id: string
  modes?: {
    actions?: { rows?: any[] }
    dataChanges?: { rows?: any[] }
    boundaryCriteria?: { rows?: any[] }
  }
}

interface ActionItem {
  id: string
  name: string
  description: string
  type: 'action' | 'action-group'
}

interface IONodeModalProps {
  isOpen: boolean
  onClose: () => void
  port: DataPort
  allActions: Action[] // Pass all actions in the flow
  allActionNodes: any[] // Node[] from React Flow, type as any for now
  // New props for enhanced functionality
  connectedActions?: ActionItem[]
  onActionClick?: (action: ActionItem) => void
  showBackButton?: boolean
  onBackClick?: () => void
  // New: handler to update port data
  onUpdatePort?: (updatedPort: DataPort) => void
}

export function IONodeModal({ 
  isOpen, 
  onClose, 
  port, 
  allActions = [],
  allActionNodes = [],
  connectedActions = [],
  onActionClick,
  showBackButton = false,
  onBackClick,
  onUpdatePort
}: IONodeModalProps) {
  // All hooks must be called unconditionally
  const [activeSidebar, setActiveSidebar] = useState("details")
  const [activeMode, setActiveMode] = useState<ModeType>("actions")
  const [portMode, setPortMode] = useState<"input" | "output">(port.mode || "input")
  
  // Use shared form hook
  const {
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    handleNameBlurOrEnter,
    handleDescriptionBlurOrEnter
  } = useModalForm({
    entity: port,
    onUpdate: onUpdatePort || (() => {})
  })

  // Handle action click
  const handleActionClick = (action: ActionItem) => {
    if (onActionClick) {
      onActionClick(action)
    }
  }

  // Only return null after all hooks have been called
  if (!isOpen || !port) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>I/O Port Details</DialogTitle>
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
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeSidebar === item.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-12 h-12 p-0 flex flex-col items-center justify-center"
                  onClick={() => setActiveSidebar(item.id)}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Button>
              )
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSidebar === "details" && (
              <div className="space-y-4">
                <div>
                  <Label>Port Name</Label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={handleNameBlurOrEnter}
                    onKeyDown={e => { if (e.key === "Enter") handleNameBlurOrEnter() }}
                  />
                </div>
                <div>
                  <Label>Port Mode</Label>
                  <Select value={portMode} onValueChange={(value: "input" | "output") => {
                    setPortMode(value);
                    if (onUpdatePort) {
                      onUpdatePort({ ...port, mode: value });
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select port mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="output">Output</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Port ID</Label>
                  <Input value={port.id} readOnly />
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

            {activeSidebar === "function-model" && (
              <NavigationTabContent 
                tabType="function-model" 
                onNavigate={() => {}} 
              />
            )}

            {activeSidebar === "event-storm" && (
              <NavigationTabContent 
                tabType="event-storm" 
                onNavigate={() => {}} 
              />
            )}

            {activeSidebar === "spindle" && (
              <NavigationTabContent 
                tabType="spindle" 
                onNavigate={() => {}} 
              />
            )}

            {activeSidebar === "knowledge-base" && (
              <NavigationTabContent 
                tabType="knowledge-base" 
                onNavigate={() => {}} 
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
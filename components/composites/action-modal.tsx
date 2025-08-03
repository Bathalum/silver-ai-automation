"use client"

import { useState } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"
import { SIDEBAR_ITEMS } from "./shared/constants"
import { ModeSelector, ModeType } from "./shared/mode-selector"
import { NavigationTabContent } from "./shared/navigation-tab-content"
import type { ActionItem, TabType } from "../../lib/domain/entities/unified-node-types"

interface ActionModalProps {
  isOpen: boolean
  onClose: () => void
  action: ActionItem
  showBackButton?: boolean
  onBackClick?: () => void
}

export function ActionModal({ 
  isOpen, 
  onClose, 
  action, 
  showBackButton = false, 
  onBackClick 
}: ActionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("details")
  const [activeMode, setActiveMode] = useState<ModeType>("actions")

  if (!isOpen) return null

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <div>
        <Label>Action Name</Label>
        <Input value={action.name} readOnly />
      </div>
      <div>
        <Label>Action ID</Label>
        <Input value={action.id} readOnly />
      </div>
      <div>
        <Label>Type</Label>
        <Input value={action.type} readOnly />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={action.description} readOnly />
      </div>
      
      {/* Action Modes Section */}
      <div>
        <Label>Action Modes</Label>
        <ModeSelector 
          activeMode={activeMode}
          onModeChange={setActiveMode}
        />
        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
          {activeMode === "actions" && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Action details for: {action.name}</div>
              <div className="flex items-center justify-between p-2 border rounded-md">
                <span>Sample Action Item</span>
                <Badge variant="default">action</Badge>
              </div>
            </div>
          )}
          {activeMode === "dataChange" && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Data changes for: {action.name}</div>
              <div className="flex items-center justify-between p-2 border rounded-md">
                <span>Sample Data Change</span>
                <Badge variant="outline">data change</Badge>
              </div>
            </div>
          )}
          {activeMode === "boundaryCriteria" && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Boundary criteria for: {action.name}</div>
              <div className="flex items-center justify-between p-2 border rounded-md">
                <span>Sample Boundary Criteria</span>
                <Badge variant="secondary">boundary</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "details":
        return renderDetailsTab()
      case "knowledge-base":
        return <NavigationTabContent tabType="knowledge-base" onNavigate={() => {}} />
      case "spindle":
        return <NavigationTabContent tabType="spindle" onNavigate={() => {}} />
      case "function-model":
        return <NavigationTabContent tabType="function-model" onNavigate={() => {}} />
      case "event-storm":
        return <NavigationTabContent tabType="event-storm" onNavigate={() => {}} />
      default:
        return renderDetailsTab()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Action Details</DialogTitle>
            {showBackButton && onBackClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Stage
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-12 h-12 p-0 flex flex-col items-center justify-center",
                    activeTab === item.id ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                  )}
                  onClick={() => setActiveTab(item.id as TabType)}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
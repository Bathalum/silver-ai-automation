"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  FileText, 
  BarChart3,
  Zap,
  GitBranch,
  Brain,
  Sparkles,
  BookOpen,
  Link,
  ExternalLink,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAVIGATION_TAB_CONFIG } from "@/components/composites/shared/constants"
import type { SOP, LinkedEntity } from "@/lib/domain/entities/knowledge-base-types"

export interface KnowledgeBaseFloatingSidebarProps {
  className?: string
  showTooltips?: boolean
  // Current SOP data for context
  currentSOP?: SOP | null
  // Navigation callbacks for other features
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  // Individual entity modal callbacks
  onOpenFunctionModelDetails?: (entity: LinkedEntity) => void
  onOpenEventStormDetails?: (entity: LinkedEntity) => void
  onOpenSpindleDetails?: (entity: LinkedEntity) => void
  // Linked entities data
  linkedFunctionModels?: LinkedEntity[]
  linkedEventStorms?: LinkedEntity[]
  linkedSpindles?: LinkedEntity[]
  // Statistics data
  statistics?: {
    totalSOPs: number
    totalViews: number
    totalLinkedEntities: number
    lastUpdated: Date
  }
  // Position and behavior
  position?: "left" | "right"
  variant?: "floating" | "sheet"
}

// Knowledge Base specific sidebar items - Main feature categories
const getKnowledgeBaseSidebarItems = () => [
  { 
    id: "details", 
    label: "Details", 
    icon: FileText,
    description: "View SOP information and metadata"
  },
  { 
    id: "stats", 
    label: "Statistics", 
    icon: BarChart3,
    description: "View usage statistics and metrics"
  },
  { 
    id: "function-model", 
    label: "Function Model", 
    icon: Zap,
    description: "Navigate to Function Model dashboard",
    color: "yellow"
  },
  { 
    id: "event-storm", 
    label: "Event Storm", 
    icon: Sparkles,
    description: "Navigate to Event Storm dashboard",
    color: "blue"
  },
  { 
    id: "spindle", 
    label: "Spindle", 
    icon: GitBranch,
    description: "Navigate to Spindle dashboard",
    color: "purple"
  },
]

export function KnowledgeBaseFloatingSidebar({
  className,
  showTooltips = true,
  currentSOP,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onOpenFunctionModelDetails,
  onOpenEventStormDetails,
  onOpenSpindleDetails,
  linkedFunctionModels = [],
  linkedEventStorms = [],
  linkedSpindles = [],
  statistics,
  position = "right",
  variant = "floating"
}: KnowledgeBaseFloatingSidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const sidebarItems = getKnowledgeBaseSidebarItems()
  const featureConfig = NAVIGATION_TAB_CONFIG["knowledge-base"]

  const handleItemClick = useCallback((item: any) => {
    setActiveTab(item.id)
    setIsModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const SidebarButton = ({ item }: { item: any }) => {
    const buttonContent = (
      <div
        className={cn(
          "w-12 h-12 p-0 flex flex-col items-center justify-center relative group transition-all duration-200 rounded-lg cursor-pointer bg-white shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105",
          variant === "floating" && "hover:bg-green-50"
        )}
        onClick={() => handleItemClick(item)}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-all duration-200",
          "text-gray-600 group-hover:text-green-600"
        )} />
      </div>
    )

    if (showTooltips) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent 
              side={position === "right" ? "left" : "right"}
              className="max-w-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>

                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return buttonContent
  }

  // Modal content renderers
  const renderDetailsTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className={cn(
          "w-16 h-16 bg-gradient-to-br rounded-lg flex items-center justify-center mx-auto mb-4",
          featureConfig.bgColor
        )}>
          <featureConfig.icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Knowledge Base</h3>
        <p className="text-gray-600">{featureConfig.description}</p>
      </div>
      
      {currentSOP && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900">Current SOP</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{currentSOP.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>• {currentSOP.readTime} min read</span>
              <span>• {currentSOP.category}</span>
              <span>• {currentSOP.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Statistics</h3>
      
      {statistics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalSOPs}</div>
            <div className="text-sm text-gray-600">Total SOPs</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.totalViews}</div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statistics.totalLinkedEntities}</div>
            <div className="text-sm text-gray-600">Linked Entities</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-sm font-semibold text-orange-600">
              {statistics.lastUpdated.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Last Updated</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderLinkedEntitiesTab = (entities: LinkedEntity[], type: string, IconComponent: React.ComponentType<{ className?: string }>, color: string) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          color === "yellow" ? "bg-yellow-100" : 
          color === "blue" ? "bg-blue-100" : "bg-purple-100"
        )}>
          <IconComponent className={cn(
            "w-6 h-6",
            color === "yellow" ? "text-yellow-600" : 
            color === "blue" ? "text-blue-600" : "text-purple-600"
          )} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{type} Links</h3>
          <p className="text-gray-600">{entities.length} linked entities</p>
        </div>
      </div>
      
      {entities.length > 0 ? (
        <div className="space-y-3">
          {entities.map((entity) => (
            <div 
              key={entity.id} 
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => {
                // Open individual entity's own details modal
                if (type === "Function Model") {
                  onOpenFunctionModelDetails?.(entity)
                } else if (type === "Event Storm") {
                  onOpenEventStormDetails?.(entity)
                } else if (type === "Spindle") {
                  onOpenSpindleDetails?.(entity)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{entity.title}</h4>
                  {entity.description && (
                    <p className="text-sm text-gray-600">{entity.description}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No linked {type} entities</p>
        </div>
      )}
    </div>
  )

  const renderFunctionModelTab = () => renderLinkedEntitiesTab(linkedFunctionModels, "Function Model", Zap, "yellow")
  const renderEventStormTab = () => renderLinkedEntitiesTab(linkedEventStorms, "Event Storm", Sparkles, "blue")
  const renderSpindleTab = () => renderLinkedEntitiesTab(linkedSpindles, "Spindle", GitBranch, "purple")

  if (variant === "sheet") {
    return (
      <>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "fixed z-50 shadow-lg border-2 border-green-200 bg-white hover:bg-green-50",
                position === "right" ? "right-4" : "left-4",
                "top-1/2 transform -translate-y-1/2"
              )}
            >
              <Brain className="w-5 h-5 text-green-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side={position} className="w-80 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Knowledge Base</h2>
                <p className="text-sm text-gray-600">Cross-feature navigation</p>
              </div>
              <div className="flex-1 p-4 space-y-3">
                {sidebarItems.map((item) => (
                  <SidebarButton key={item.id} item={item} />
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Content-only Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {activeTab === "details" && "Details"}
                {activeTab === "stats" && "Statistics"}
                {activeTab === "function-model" && "Function Model Links"}
                {activeTab === "event-storm" && "Event Storm Links"}
                {activeTab === "spindle" && "Spindle Links"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {activeTab === "details" && renderDetailsTab()}
              {activeTab === "stats" && renderStatsTab()}
              {activeTab === "function-model" && renderFunctionModelTab()}
              {activeTab === "event-storm" && renderEventStormTab()}
              {activeTab === "spindle" && renderSpindleTab()}
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      {/* Floating Sidebar - Joined Style */}
      <div className={cn(
        "fixed z-50 flex flex-col",
        position === "right" ? "right-4" : "left-4",
        "top-1/2 transform -translate-y-1/2",
        className
      )}>
        {/* Knowledge Base Indicator - Top with special styling */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-12 h-12 p-0 flex flex-col items-center justify-center relative group transition-all duration-200 rounded-t-lg cursor-pointer bg-white shadow-lg border-2 border-green-200 hover:shadow-xl hover:scale-105 hover:bg-green-50"
                onClick={() => handleItemClick({ id: "details", label: "Details" })}
              >
                <div className={cn(
                  "w-6 h-6 bg-gradient-to-br rounded-lg flex items-center justify-center",
                  featureConfig.bgColor
                )}>
                  <featureConfig.icon className="w-3 h-3 text-white" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side={position === "right" ? "left" : "right"}
              className="max-w-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Knowledge Base</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cross-feature navigation and connectivity
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Navigation Items - Joined together */}
        {sidebarItems.slice(1).map((item, index) => (
          <div key={item.id} className="relative">
            <div
              className={cn(
                "w-12 h-12 p-0 flex flex-col items-center justify-center relative group transition-all duration-200 cursor-pointer bg-white shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 hover:bg-gray-50",
                // Remove top border for joined effect
                index === 0 ? "border-t-0" : "",
                // Remove bottom border for joined effect
                index === sidebarItems.slice(1).length - 1 ? "rounded-b-lg" : "border-b-0"
              )}
              onClick={() => handleItemClick(item)}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all duration-200",
                "text-gray-600 group-hover:text-green-600"
              )} />
            </div>
          </div>
        ))}
      </div>

      {/* Content-only Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {activeTab === "details" && "Details"}
              {activeTab === "stats" && "Statistics"}
              {activeTab === "function-model" && "Function Model Links"}
              {activeTab === "event-storm" && "Event Storm Links"}
              {activeTab === "spindle" && "Spindle Links"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {activeTab === "details" && renderDetailsTab()}
            {activeTab === "stats" && renderStatsTab()}
            {activeTab === "function-model" && renderFunctionModelTab()}
            {activeTab === "event-storm" && renderEventStormTab()}
            {activeTab === "spindle" && renderSpindleTab()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Pre-configured floating sidebar for Knowledge Base
export function KnowledgeBaseFloatingSidebarRight({ ...props }: Omit<KnowledgeBaseFloatingSidebarProps, 'position'>) {
  return <KnowledgeBaseFloatingSidebar position="right" {...props} />
}

export function KnowledgeBaseFloatingSidebarLeft({ ...props }: Omit<KnowledgeBaseFloatingSidebarProps, 'position'>) {
  return <KnowledgeBaseFloatingSidebar position="left" {...props} />
} 
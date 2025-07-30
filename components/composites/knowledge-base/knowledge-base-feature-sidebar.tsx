"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  BarChart3,
  Settings, 
  Zap,
  GitBranch,
  Brain,
  ArrowRight,
  Sparkles,
  Layers,
  Workflow,
  Database,
  BookOpen,
  Users,
  Clock,
  Tag,
  Link,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAVIGATION_TAB_CONFIG } from "@/components/composites/shared/constants"
import type { SOP } from "@/lib/domain/entities/knowledge-base-types"

export interface KnowledgeBaseFeatureSidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  className?: string
  showTooltips?: boolean
  compact?: boolean
  // Current SOP data for context
  currentSOP?: SOP | null
  // Navigation callbacks for other features
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  // Linked entities data
  linkedFunctionModels?: Array<{ id: string; title: string; description?: string }>
  linkedEventStorms?: Array<{ id: string; title: string; description?: string }>
  linkedSpindles?: Array<{ id: string; title: string; description?: string }>
  // Statistics data
  statistics?: {
    totalSOPs: number
    totalViews: number
    totalLinkedEntities: number
    lastUpdated: Date
  }
}

// Knowledge Base specific sidebar items
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
    description: "Linked process flows and business functions",
    color: "yellow"
  },
  { 
    id: "event-storm", 
    label: "Event Storm", 
    icon: Sparkles,
    description: "Linked events and triggers",
    color: "blue"
  },
  { 
    id: "spindle", 
    label: "Spindle", 
    icon: GitBranch,
    description: "Linked decision flows and business logic",
    color: "purple"
  },
]

export function KnowledgeBaseFeatureSidebar({
  activeTab = "details",
  onTabChange,
  className,
  showTooltips = true,
  compact = false,
  currentSOP,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  linkedFunctionModels = [],
  linkedEventStorms = [],
  linkedSpindles = [],
  statistics
}: KnowledgeBaseFeatureSidebarProps) {
  const sidebarItems = getKnowledgeBaseSidebarItems()
  const featureConfig = NAVIGATION_TAB_CONFIG["knowledge-base"]

  const handleItemClick = useCallback((item: any) => {
    onTabChange?.(item.id)
  }, [onTabChange])

  const SidebarButton = ({ item }: { item: any }) => {
    const isActive = activeTab === item.id
    
    const buttonContent = (
      <div
        className={cn(
          "w-12 h-12 p-0 flex flex-col items-center justify-center relative group transition-all duration-200 rounded-lg cursor-pointer",
          compact && "w-10 h-10",
          isActive ? "bg-green-50 border border-green-200" : "hover:bg-gray-100"
        )}
        onClick={() => handleItemClick(item)}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-all duration-200",
          compact && "w-4 h-4",
          isActive ? "text-green-600" : "text-gray-600"
        )} />
        {/* Badge for linked entities count */}
        {item.id === "function-model" && linkedFunctionModels.length > 0 && (
          <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
            {linkedFunctionModels.length}
          </Badge>
        )}
        {item.id === "event-storm" && linkedEventStorms.length > 0 && (
          <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
            {linkedEventStorms.length}
          </Badge>
        )}
        {item.id === "spindle" && linkedSpindles.length > 0 && (
          <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
            {linkedSpindles.length}
          </Badge>
        )}
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
              side="right" 
              className="max-w-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  {item.id !== "details" && item.id !== "stats" && (
                    <Badge variant="outline" className="text-xs">
                      {item.id === "function-model" && linkedFunctionModels.length}
                      {item.id === "event-storm" && linkedEventStorms.length}
                      {item.id === "spindle" && linkedSpindles.length}
                    </Badge>
                  )}
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

  const renderDetailsContent = () => (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <div className={cn(
          "w-12 h-12 bg-gradient-to-br rounded-lg flex items-center justify-center mx-auto mb-3",
          featureConfig.bgColor
        )}>
          <featureConfig.icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900">Knowledge Base</h3>
        <p className="text-sm text-gray-600">{featureConfig.description}</p>
      </div>
      
      {currentSOP && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Current SOP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{currentSOP.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>{currentSOP.readTime} min read</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Tag className="w-3 h-3" />
              <span>{currentSOP.category}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderStatsContent = () => (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Statistics</h3>
      
      {statistics && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total SOPs</span>
            <span className="font-semibold">{statistics.totalSOPs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Views</span>
            <span className="font-semibold">{statistics.totalViews}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Linked Entities</span>
            <span className="font-semibold">{statistics.totalLinkedEntities}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="font-semibold text-xs">
              {statistics.lastUpdated.toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )

  const renderLinkedEntitiesContent = (entities: Array<{ id: string; title: string; description?: string }>, type: string) => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 capitalize">{type} Links</h3>
        <Badge variant="outline">{entities.length}</Badge>
      </div>
      
      {entities.length > 0 ? (
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {entities.map((entity) => (
              <Card key={entity.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {entity.title}
                      </h4>
                      {entity.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {entity.description}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No linked {type} entities</p>
        </div>
      )}
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return renderDetailsContent()
      case "stats":
        return renderStatsContent()
      case "function-model":
        return renderLinkedEntitiesContent(linkedFunctionModels, "Function Model")
      case "event-storm":
        return renderLinkedEntitiesContent(linkedEventStorms, "Event Storm")
      case "spindle":
        return renderLinkedEntitiesContent(linkedSpindles, "Spindle")
      default:
        return renderDetailsContent()
    }
  }

  return (
    <div className={cn(
      "flex h-full bg-white border-r border-gray-200",
      className
    )}>
      {/* Icon Sidebar */}
      <div className={cn(
        "w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-2 transition-all duration-300",
        compact && "w-12"
      )}>
        {/* Knowledge Base Feature Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "mb-4 flex flex-col items-center justify-center w-full cursor-pointer transition-all duration-200 rounded-lg p-2",
                  activeTab === "details" ? "bg-green-50 border border-green-200" : "hover:bg-gray-100"
                )}
                onClick={() => onTabChange?.("details")}
              >
                <div className={cn(
                  "w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center",
                  featureConfig.bgColor
                )}>
                  <featureConfig.icon className="w-4 h-4 text-white" />
                </div>
                {!compact && (
                  <div className="mt-2 text-center w-full">
                    <div className="text-xs font-medium text-gray-700">
                      Knowledge Base
                    </div>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              className="max-w-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Details</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  View SOP information and metadata
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Navigation Items */}
        <div className="flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <SidebarButton key={item.id} item={item} />
          ))}
        </div>

        {/* Footer */}
        {!compact && (
          <div className="mt-4 pt-4 border-t border-gray-200 w-full">
            <div className="text-center">
              <div className="text-xs text-gray-500">
                Silver AI
              </div>
              <div className="text-xs text-gray-400">
                Framework
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Panel */}
      {!compact && (
        <div className="flex-1 w-80 border-r border-gray-200">
          {renderTabContent()}
        </div>
      )}
    </div>
  )
}

// Pre-configured sidebar for Knowledge Base
export function KnowledgeBaseSidebar({ 
  activeTab,
  onTabChange,
  onNavigateToEventStorm,
  onNavigateToFunctionModel,
  onNavigateToSpindle,
  ...props
}: { 
  activeTab?: string
  onTabChange?: (tab: string) => void
  onNavigateToEventStorm?: () => void
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
} & Omit<KnowledgeBaseFeatureSidebarProps, 'featureType'>) {
  return (
    <KnowledgeBaseFeatureSidebar
      activeTab={activeTab}
      onTabChange={onTabChange}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToSpindle={onNavigateToSpindle}
      {...props}
    />
  )
} 
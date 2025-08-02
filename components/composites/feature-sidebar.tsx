"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
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
  Database
} from "lucide-react"

import { cn } from "@/lib/utils"

export interface FeatureSidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  featureType?: "event-storm" | "function-model" | "spindle" | "knowledge-base"
  className?: string
  showTooltips?: boolean
  compact?: boolean
  // Navigation callbacks for other features
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}

// Feature configuration for different feature types
const getFeatureConfig = (featureType: string) => {
  const configs = {
    "event-storm": {
      icon: Sparkles,
      label: "Event Storm",
      color: "from-blue-500 to-purple-600",
      description: "Design event-driven workflows"
    },
    "function-model": {
      icon: Zap,
      label: "Function Model", 
      color: "from-yellow-500 to-orange-600",
      description: "Design process flows and business functions"
    },
    "spindle": {
      icon: GitBranch,
      label: "Spindle",
      color: "from-purple-500 to-pink-600", 
      description: "Design decision flows and business logic"
    },
    "knowledge-base": {
      icon: Brain,
      label: "Knowledge Base",
      color: "from-green-500 to-teal-600",
      description: "Store documentation and procedures"
    }
  }
  
  return configs[featureType as keyof typeof configs] || configs["event-storm"]
}

// Navigation configuration for different feature types
const getSidebarItems = (featureType: string) => {
  const baseItems = [
    { 
      id: "stats", 
      label: "Statistics", 
      icon: BarChart3,
      description: "View flow statistics and metrics"
    },
  ]

  // Portal items that navigate to different tools
  const portalItems = {
    "event-storm": [
      { 
        id: "function-model", 
        label: "Function Model", 
        icon: Zap,
        description: "Design process flows and business functions",
        href: "/dashboard/function-model/list",
        color: "yellow"
      },
      { 
        id: "spindle", 
        label: "Spindle", 
        icon: GitBranch,
        description: "Design decision flows and business logic",
        href: "/dashboard/spindle",
        color: "purple"
      },
      { 
        id: "knowledge-base", 
        label: "Knowledge Base", 
        icon: Brain,
        description: "Store documentation and procedures",
        href: "/dashboard/knowledge-base",
        color: "green"
      },
    ],
    "function-model": [
      { 
        id: "event-storm", 
        label: "Event Storm", 
        icon: FileText,
        description: "Design event-driven workflows",
        href: "/dashboard/event-storm",
        color: "blue"
      },
      { 
        id: "spindle", 
        label: "Spindle", 
        icon: GitBranch,
        description: "Design decision flows and business logic",
        href: "/dashboard/spindle",
        color: "purple"
      },
      { 
        id: "knowledge-base", 
        label: "Knowledge Base", 
        icon: Brain,
        description: "Store documentation and procedures",
        href: "/dashboard/knowledge-base",
        color: "green"
      },
    ],
    "spindle": [
      { 
        id: "event-storm", 
        label: "Event Storm", 
        icon: FileText,
        description: "Design event-driven workflows",
        href: "/dashboard/event-storm",
        color: "blue"
      },
      { 
        id: "function-model", 
        label: "Function Model", 
        icon: Zap,
        description: "Design process flows and business functions",
        href: "/dashboard/function-model/list",
        color: "yellow"
      },
      { 
        id: "knowledge-base", 
        label: "Knowledge Base", 
        icon: Brain,
        description: "Store documentation and procedures",
        href: "/dashboard/knowledge-base",
        color: "green"
      },
    ],
    "knowledge-base": [
      { 
        id: "event-storm", 
        label: "Event Storm", 
        icon: FileText,
        description: "Design event-driven workflows",
        href: "/dashboard/event-storm",
        color: "blue"
      },
      { 
        id: "function-model", 
        label: "Function Model", 
        icon: Zap,
        description: "Design process flows and business functions",
        href: "/dashboard/function-model/list",
        color: "yellow"
      },
      { 
        id: "spindle", 
        label: "Spindle", 
        icon: GitBranch,
        description: "Design decision flows and business logic",
        href: "/dashboard/spindle",
        color: "purple"
      },
    ],
  }

  return [
    ...baseItems,
    ...(portalItems[featureType as keyof typeof portalItems] || [])
  ]
}

export function FeatureSidebar({
  activeTab = "details",
  onTabChange,
  featureType = "event-storm",
  className,
  showTooltips = true,
  compact = false,
  onNavigateToFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: FeatureSidebarProps) {
  const sidebarItems = getSidebarItems(featureType)
  const featureConfig = getFeatureConfig(featureType)

  const handleItemClick = useCallback((item: any) => {
    // For all items, handle as tab change to show content inside modal
    onTabChange?.(item.id)
  }, [onTabChange])

  const SidebarButton = ({ item }: { item: any }) => {
    const isActive = activeTab === item.id
    
    const buttonContent = (
      <div
        className={cn(
          "w-12 h-12 p-0 flex flex-col items-center justify-center relative group transition-all duration-200 rounded-lg cursor-pointer",
          compact && "w-10 h-10",
          isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
        )}
        onClick={() => handleItemClick(item)}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-all duration-200",
          compact && "w-4 h-4"
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
              side="right" 
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

  return (
    <div className={cn(
      "w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-2 transition-all duration-300",
      compact && "w-12",
      className
    )}>
      {/* Dynamic Feature Type Indicator - Clickable for Details */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "mb-4 flex flex-col items-center justify-center w-full cursor-pointer transition-all duration-200 rounded-lg p-2",
                activeTab === "details" ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
              )}
              onClick={() => onTabChange?.("details")}
            >
              <div className={cn(
                "w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center",
                featureConfig.color
              )}>
                <featureConfig.icon className="w-4 h-4 text-white" />
              </div>
              {!compact && (
                <div className="mt-2 text-center w-full">
                  <div className="text-xs font-medium text-gray-700">
                    {featureConfig.label}
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
                View and edit basic information
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
  )
}

// Pre-configured sidebars for common features
export function SpindleSidebar({ 
  activeTab,
  onTabChange,
  onNavigateToEventStorm,
  onNavigateToFunctionModel,
  onNavigateToKnowledgeBase,
  ...props
}: { 
  activeTab?: string
  onTabChange?: (tab: string) => void
  onNavigateToEventStorm?: () => void
  onNavigateToFunctionModel?: () => void
  onNavigateToKnowledgeBase?: () => void
} & Omit<FeatureSidebarProps, 'featureType'>) {
  return (
    <FeatureSidebar
      activeTab={activeTab}
      onTabChange={onTabChange}
      featureType="spindle"
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
      {...props}
    />
  )
}
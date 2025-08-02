'use client'

import { 
  Layers, 
  Table, 
  ArrowLeftRight, 
  GitBranch, 
  Zap, 
  Play, 
  Database, 
  Brain, 
  Globe, 
  Code, 
  MessageSquare, 
  Clock, 
  Users 
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const nodeTypeConfig = {
  stageNode: { icon: Layers, color: "#10b981", bg: "#d1fae5" },
  actionTableNode: { icon: Table, color: "#3b82f6", bg: "#dbeafe" },
  ioNode: { icon: ArrowLeftRight, color: "#f59e0b", bg: "#fef3c7" },
  functionModelNode: { icon: GitBranch, color: "#8b5cf6", bg: "#ede9fe" },
  trigger: { icon: Zap, color: "#10b981", bg: "#d1fae5" },
  action: { icon: Play, color: "#3b82f6", bg: "#dbeafe" },
  condition: { icon: GitBranch, color: "#f59e0b", bg: "#fef3c7" },
  data: { icon: Database, color: "#8b5cf6", bg: "#ede9fe" },
  ai: { icon: Brain, color: "#ec4899", bg: "#fce7f3" },
  webhook: { icon: Globe, color: "#f97316", bg: "#fed7aa" },
  code: { icon: Code, color: "#6b7280", bg: "#f3f4f6" },
  message: { icon: MessageSquare, color: "#06b6d4", bg: "#cffafe" },
  timer: { icon: Clock, color: "#6366f1", bg: "#e0e7ff" },
  user: { icon: Users, color: "#059669", bg: "#d1fae5" },
}

interface NodeTypeIndicatorProps {
  type: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
}

const iconSizes = {
  sm: 12,
  md: 16,
  lg: 20
}

export function NodeTypeIndicator({ type, size = 'md' }: NodeTypeIndicatorProps) {
  const config = nodeTypeConfig[type as keyof typeof nodeTypeConfig]
  
  if (!config) {
    // Fallback for unknown node types
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`${sizeClasses[size]} rounded flex items-center justify-center bg-gray-100`}
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <Layers size={iconSizes[size]} style={{ color: '#6b7280' }} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{type}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const Icon = config.icon

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`${sizeClasses[size]} rounded flex items-center justify-center`}
            style={{ backgroundColor: config.bg }}
          >
            <Icon size={iconSizes[size]} style={{ color: config.color }} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 
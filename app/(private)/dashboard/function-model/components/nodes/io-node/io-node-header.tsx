'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react'

interface IONodeHeaderProps {
  nodeType: 'input' | 'output'
  name: string
  status: 'idle' | 'active' | 'error' | 'completed'
  dataType?: string
  isRequired?: boolean
  className?: string
}

const statusConfig = {
  idle: { color: 'bg-gray-100 text-gray-700', icon: Activity },
  active: { color: 'bg-blue-100 text-blue-700', icon: Activity },
  error: { color: 'bg-red-100 text-red-700', icon: Activity },
  completed: { color: 'bg-green-100 text-green-700', icon: Activity }
}

const typeConfig = {
  input: { color: 'bg-purple-100 text-purple-700', icon: ArrowDownToLine },
  output: { color: 'bg-purple-100 text-purple-700', icon: ArrowUpFromLine }
}

export function IONodeHeader({
  nodeType,
  name,
  status,
  dataType,
  isRequired,
  className
}: IONodeHeaderProps) {
  const statusStyle = statusConfig[status]
  const typeStyle = typeConfig[nodeType]
  const StatusIcon = statusStyle.icon
  const TypeIcon = typeStyle.icon

  return (
    <div className={cn(
      "flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg",
      className
    )}>
      {/* Left side - Type and Name */}
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {/* Type Badge */}
        <Badge 
          variant="secondary" 
          className={cn("flex items-center space-x-1", typeStyle.color)}
        >
          <TypeIcon className="h-3 w-3" />
          <span className="text-xs font-medium capitalize">{nodeType}</span>
        </Badge>

        {/* Required Indicator */}
        {isRequired && (
          <Badge variant="destructive" className="text-xs">
            Required
          </Badge>
        )}

        {/* Node Name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate" title={name}>
            {name}
          </h3>
        </div>
      </div>

      {/* Right side - Status and Data Type */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Data Type */}
        {dataType && (
          <Badge variant="outline" className="text-xs">
            {dataType}
          </Badge>
        )}

        {/* Status Badge */}
        <Badge 
          variant="secondary" 
          className={cn("flex items-center space-x-1", statusStyle.color)}
        >
          <StatusIcon className="h-3 w-3" />
          <span className="text-xs font-medium capitalize">{status}</span>
        </Badge>
      </div>
    </div>
  )
}

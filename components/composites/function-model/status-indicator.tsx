'use client'

import { FileText, Play, Archive, Activity } from 'lucide-react'

interface StatusIndicatorProps {
  status: string
  showIcon?: boolean
}

const statusConfig = {
  draft: { 
    icon: FileText, 
    color: "#6b7280", 
    bg: "#f3f4f6",
    label: "Draft"
  },
  published: { 
    icon: Play, 
    color: "#10b981", 
    bg: "#d1fae5",
    label: "Published"
  },
  active: { 
    icon: Activity, 
    color: "#10b981", 
    bg: "#d1fae5",
    label: "Active"
  },
  archived: { 
    icon: Archive, 
    color: "#6b7280", 
    bg: "#f3f4f6",
    label: "Archived"
  },
  paused: { 
    icon: Play, 
    color: "#f59e0b", 
    bg: "#fef3c7",
    label: "Paused"
  }
}

export function StatusIndicator({ status, showIcon = true }: StatusIndicatorProps) {
  const config = statusConfig[status as keyof typeof statusConfig]
  
  if (!config) {
    // Fallback for unknown status
    return (
      <div className="flex items-center gap-2">
        {showIcon && <FileText size={14} style={{ color: '#6b7280' }} />}
        <span className="text-xs font-medium capitalize" style={{ color: '#6b7280' }}>
          {status}
        </span>
      </div>
    )
  }

  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      {showIcon && <Icon size={14} style={{ color: config.color }} />}
      <span className="text-xs font-medium capitalize" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  )
} 
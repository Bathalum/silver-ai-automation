import { FileText, Settings, Zap, GitBranch, Brain, Database, Shield } from "lucide-react"

// Shared sidebar items used across all modals
export const SIDEBAR_ITEMS = [
  { id: "details", label: "Details", icon: FileText },
  { id: "function-model", label: "Function Model", icon: Settings },
  { id: "event-storm", label: "Event Storm", icon: Zap },
  { id: "spindle", label: "Spindle", icon: GitBranch },
  { id: "knowledge-base", label: "Knowledge Base", icon: Brain },
]

// Mode configuration for function model features (stages, actions, I/O ports)
export const MODE_LIST = [
  { 
    key: "actions", 
    icon: Zap, 
    label: "Actions", 
    activeBg: "bg-yellow-100", 
    inactiveBg: "bg-gray-50", 
    iconColor: "text-yellow-600", 
    inactiveIcon: "text-gray-400" 
  },
  { 
    key: "dataChange", 
    icon: Database, 
    label: "Data Changes", 
    activeBg: "bg-blue-100", 
    inactiveBg: "bg-gray-50", 
    iconColor: "text-blue-600", 
    inactiveIcon: "text-gray-400" 
  },
  { 
    key: "boundaryCriteria", 
    icon: Shield, 
    label: "Boundary Criteria", 
    activeBg: "bg-green-100", 
    inactiveBg: "bg-gray-50", 
    iconColor: "text-green-600", 
    inactiveIcon: "text-gray-400" 
  },
]

// Navigation tab content configuration
export const NAVIGATION_TAB_CONFIG = {
  "function-model": {
    icon: Zap,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
    title: "Function Model",
    description: "Design process flows, stages, and business functions"
  },
  "event-storm": {
    icon: FileText,
    bgColor: "bg-blue-100", 
    iconColor: "text-blue-600",
    title: "Event Storm",
    description: "Create and manage process events, triggers, and business rules"
  },
  "spindle": {
    icon: GitBranch,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600", 
    title: "Spindle",
    description: "Design decision flows, business logic, and conditional paths"
  },
  "knowledge-base": {
    icon: Brain,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
    title: "Knowledge Base", 
    description: "Store documentation, procedures, and reference materials"
  }
}

// Helper function to get rows for a given action node and mode
export const getRowsForMode = (actionNode: any, mode: string) => {
  if (!actionNode || !actionNode.data || !actionNode.data.modes) return [];
  if (mode === 'actions') return actionNode.data.modes.actions?.rows || [];
  if (mode === 'dataChange') return actionNode.data.modes.dataChanges?.rows || [];
  if (mode === 'boundaryCriteria') return actionNode.data.modes.boundaryCriteria?.rows || [];
  return [];
} 
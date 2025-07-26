"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SidebarNav } from "@/components/ui/sidebar-nav"
import { SidebarNavCollapsed } from "@/components/ui/sidebar-nav-collapsed"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  LayoutDashboard,
  BarChart3,
  Zap,
  GitBranch,
  BookOpen,
  Users,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  BrainCircuit, // Add this import if available
  Aperture, // Fallback if BrainCircuit is not available
} from "lucide-react"

interface DashboardSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const navigationItems = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    children: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "D2 Function Model",
    icon: Zap,
    children: [
      {
        title: "Function Model",
        href: "/dashboard/function-model",
        icon: Zap,
      },
      {
        title: "Event Storm",
        href: "/dashboard/event-storm",
        icon: BrainCircuit, // Use BrainCircuit for mindmap/brainstorming if available
      },
      {
        title: "Spindle",
        href: "/dashboard/spindle",
        icon: GitBranch,
      },
      {
        title: "Knowledge Base",
        href: "/dashboard/knowledge-base",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Management",
    icon: Settings,
    children: [
      {
        title: "Clients",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        title: "Team Members",
        href: "/dashboard/team-members",
        icon: UserCheck,
      },
      {
        title: "Config",
        href: "/dashboard/config",
        icon: Settings,
      },
    ],
  },
]

// Flatten navigation items for collapsed view
const flatNavigationItems = navigationItems.flatMap((section) => section.children || [])

export function DashboardSidebar({ isCollapsed, onToggle }: DashboardSidebarProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r bg-white/95 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-gray-900/5",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Sparkles className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors duration-300 group-hover:rotate-12" />
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
              Silver AI
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        {isCollapsed ? (
          <SidebarNavCollapsed items={flatNavigationItems} />
        ) : (
          <SidebarNav items={navigationItems} isCollapsed={isCollapsed} />
        )}
      </div>

      {/* Toggle Button */}
      <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-blue-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-full hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 group hover:shadow-md",
            isCollapsed && "px-2",
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

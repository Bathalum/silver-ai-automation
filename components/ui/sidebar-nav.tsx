"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

interface SidebarNavProps {
  items: NavItem[]
  isCollapsed: boolean
}

export function SidebarNav({ items, isCollapsed }: SidebarNavProps) {
  const pathname = usePathname()

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isActive = item.href ? pathname === item.href : false

    // If it's a section header (has children but no href)
    if (hasChildren && !item.href) {
      return (
        <div key={item.title} className="space-y-1">
          {/* Section Header */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wide",
              isCollapsed ? "justify-center px-2" : "",
            )}
          >
            {item.icon && <item.icon className={cn("h-4 w-4", isCollapsed ? "h-5 w-5" : "")} />}
            {!isCollapsed && <span className="text-xs">{item.title}</span>}
          </div>

          {/* Section Items */}
          {!isCollapsed && (
            <div className="space-y-1">{item.children!.map((child) => renderNavItem(child, level + 1))}</div>
          )}
        </div>
      )
    }

    // Regular nav item
    return (
      <Link
        key={item.title}
        href={item.href || "#"}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 group",
          isActive && "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100",
          level > 0 && !isCollapsed && "ml-4",
          isCollapsed && "justify-center px-2 py-3",
        )}
        title={isCollapsed ? item.title : undefined}
      >
        {item.icon && (
          <item.icon
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors duration-300",
              isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
              isCollapsed && "h-5 w-5",
            )}
          />
        )}
        {!isCollapsed && (
          <span className="truncate whitespace-nowrap">{item.title}</span>
        )}
      </Link>
    )
  }

  return <nav className="space-y-2">{items.map((item) => renderNavItem(item))}</nav>
}

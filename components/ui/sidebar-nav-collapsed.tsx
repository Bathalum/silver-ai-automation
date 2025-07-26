"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarNavCollapsedProps {
  items: NavItem[]
}

export function SidebarNavCollapsed({ items }: SidebarNavCollapsedProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-lg px-2 py-3 text-sm transition-all hover:bg-gray-100 group",
              isActive && "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100",
            )}
            title={item.title}
          >
            <item.icon
              className={cn(
                "h-5 w-5 transition-colors duration-300",
                isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { DashboardSidebar } from "@/components/ui/dashboard-sidebar"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { FeedbackProvider } from "@/components/ui/feedback-toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <FeedbackProvider>
      <div className="flex h-screen bg-gray-50">
        <DashboardSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </FeedbackProvider>
  )
}

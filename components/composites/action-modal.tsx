"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface ActionItem {
  id: string
  name: string
  description: string
  type: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: string
  dueDate?: Date
  tags: string[]
  metadata?: Record<string, any>
}

export type TabType = 'all' | 'pending' | 'in-progress' | 'completed' | 'failed'

interface ActionModalProps {
  isOpen: boolean
  onClose: () => void
  actions: ActionItem[]
  onActionUpdate?: (actionId: string, updates: Partial<ActionItem>) => void
  onActionDelete?: (actionId: string) => void
}

export function ActionModal({
  isOpen,
  onClose,
  actions,
  onActionUpdate,
  onActionDelete
}: ActionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')

  if (!isOpen) return null

  const filteredActions = actions.filter(action => {
    if (activeTab === 'all') return true
    return action.status === activeTab
  })

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Action Management</h2>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({actions.length})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({actions.filter(a => a.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({actions.filter(a => a.status === 'in-progress').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({actions.filter(a => a.status === 'completed').length})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({actions.filter(a => a.status === 'failed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid gap-4">
                {filteredActions.map((action) => (
                  <Card key={action.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{action.name}</CardTitle>
                          <CardDescription className="mt-2">
                            {action.description}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Badge className={getStatusColor(action.status)}>
                            {action.status}
                          </Badge>
                          <Badge className={getPriorityColor(action.priority)}>
                            {action.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Type: {action.type}</span>
                          {action.assignedTo && (
                            <span>Assigned to: {action.assignedTo}</span>
                          )}
                          {action.dueDate && (
                            <span>Due: {action.dueDate.toLocaleDateString()}</span>
                          )}
                        </div>
                        
                        {action.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {action.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Separator />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onActionUpdate?.(action.id, { status: 'in-progress' })}
                            disabled={action.status === 'in-progress'}
                          >
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onActionUpdate?.(action.id, { status: 'completed' })}
                            disabled={action.status === 'completed'}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onActionDelete?.(action.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredActions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No actions found for the selected filter.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 
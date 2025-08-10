'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Eye, Settings, Workflow, Users, Shield, History } from 'lucide-react'
import Link from 'next/link'

// Import existing workflow components for editing
import { WorkflowContainer } from '@/components/composites/workflow/layout/workflow-container'
import { WorkflowCanvas } from '@/components/composites/workflow/workflow-canvas'
import { WorkflowSidebar } from '@/components/composites/workflow/workflow-sidebar'
import { WorkflowToolbar } from '@/components/composites/workflow/workflow-toolbar'

// Mock data for demonstration - replace with actual data fetching
const mockModel = {
  id: '1',
  name: 'Customer Onboarding Process',
  description: 'Complete workflow for new customer account setup and verification',
  status: 'active',
  version: '1.2.0',
  category: 'Customer Service',
  lastModified: '2025-01-15',
  nodeCount: 12,
  executionMode: 'sequential',
  contextAccess: 'hierarchical',
  createdBy: 'John Doe',
  lastExecuted: '2025-01-14',
  tags: ['customer', 'onboarding', 'verification'],
  permissions: {
    canEdit: true,
    canExecute: true,
    canShare: true,
    canDelete: false
  }
}

export default function WorkflowEditPage() {
  const params = useParams()
  const router = useRouter()
  const modelId = params.modelId as string
  const [activeTab, setActiveTab] = useState('designer')
  const [workflowData, setWorkflowData] = useState({
    name: mockModel.name,
    description: mockModel.description,
    category: mockModel.category,
    executionMode: mockModel.executionMode,
    contextAccess: mockModel.contextAccess,
    tags: mockModel.tags.join(', ')
  })

  const handleSave = () => {
    // Here you would typically save the workflow changes
    console.log('Saving workflow:', workflowData)
    // Redirect back to the workflow designer
    router.push(`/dashboard/function-model/${modelId}`)
  }

  const handlePreview = () => {
    // Open workflow in preview mode
    window.open(`/dashboard/function-model/${modelId}`, '_blank')
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/dashboard/function-model/${modelId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workflow
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit: {mockModel.name}</h1>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <span>v{mockModel.version}</span>
                <Badge variant="default">{mockModel.status}</Badge>
                <span>{mockModel.category}</span>
                <span>Last modified: {mockModel.lastModified}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b bg-gray-50 px-6">
            <TabsList className="bg-transparent">
              <TabsTrigger value="designer" className="flex items-center space-x-2">
                <Workflow className="h-4 w-4" />
                <span>Workflow Designer</span>
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Properties</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Permissions</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Designer Tab */}
          <TabsContent value="designer" className="h-full m-0">
            <div className="h-full">
              <WorkflowContainer>
                <WorkflowToolbar 
                  modelName={workflowData.name}
                  version={mockModel.version}
                  status={mockModel.status}
                  executionMode={workflowData.executionMode}
                  contextAccess={workflowData.contextAccess}
                />
                <div className="flex flex-1 overflow-hidden">
                  <WorkflowSidebar />
                  <div className="flex-1">
                    <WorkflowCanvas />
                  </div>
                </div>
              </WorkflowContainer>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="h-full m-0 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Update the basic properties of your workflow
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workflow Name *</Label>
                      <Input
                        id="name"
                        value={workflowData.name}
                        onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter workflow name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={workflowData.category}
                        onValueChange={(value) => setWorkflowData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Customer Service">Customer Service</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Analytics">Analytics</SelectItem>
                          <SelectItem value="Governance">Governance</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={workflowData.description}
                      onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="executionMode">Execution Mode</Label>
                      <Select
                        value={workflowData.executionMode}
                        onValueChange={(value) => setWorkflowData(prev => ({ ...prev, executionMode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential">Sequential</SelectItem>
                          <SelectItem value="parallel">Parallel</SelectItem>
                          <SelectItem value="conditional">Conditional</SelectItem>
                          <SelectItem value="priority">Priority-based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contextAccess">Context Access</Label>
                      <Select
                        value={workflowData.contextAccess}
                        onValueChange={(value) => setWorkflowData(prev => ({ ...prev, contextAccess: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hierarchical">Hierarchical</SelectItem>
                          <SelectItem value="shared">Shared</SelectItem>
                          <SelectItem value="isolated">Isolated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={workflowData.tags}
                      onChange={(e) => setWorkflowData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="text-sm text-gray-500">
                      Use tags to organize and categorize your workflows
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Statistics</CardTitle>
                  <CardDescription>
                    Current workflow information and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{mockModel.nodeCount}</div>
                      <div className="text-sm text-gray-600">Total Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{mockModel.version}</div>
                      <div className="text-sm text-gray-600">Version</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{mockModel.lastModified}</div>
                      <div className="text-sm text-gray-600">Last Modified</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{mockModel.lastExecuted}</div>
                      <div className="text-sm text-gray-600">Last Executed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="h-full m-0 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Access Control</span>
                  </CardTitle>
                  <CardDescription>
                    Manage who can view, edit, and execute this workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">View Workflow</h4>
                        <p className="text-sm text-gray-600">Allow users to view the workflow structure and properties</p>
                      </div>
                      <Badge variant="default">Public</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Edit Workflow</h4>
                        <p className="text-sm text-gray-600">Allow users to modify the workflow structure and properties</p>
                      </div>
                      <Badge variant="secondary">Team Members</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Execute Workflow</h4>
                        <p className="text-sm text-gray-600">Allow users to run and monitor workflow execution</p>
                      </div>
                      <Badge variant="secondary">Team Members</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Delete Workflow</h4>
                        <p className="text-sm text-gray-600">Allow users to permanently remove the workflow</p>
                      </div>
                      <Badge variant="outline">Owner Only</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Users with access to this workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                          JD
                        </div>
                        <div>
                          <div className="font-medium">John Doe</div>
                          <div className="text-sm text-gray-600">Owner</div>
                        </div>
                      </div>
                      <Badge variant="default">Full Access</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium">
                          JS
                        </div>
                        <div>
                          <div className="font-medium">Jane Smith</div>
                          <div className="text-sm text-gray-600">Team Member</div>
                        </div>
                      </div>
                      <Badge variant="secondary">Edit & Execute</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="h-full m-0 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                  <CardDescription>
                    Track changes and versions of your workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Version 1.2.0</h4>
                          <span className="text-sm text-gray-500">2025-01-15</span>
                        </div>
                        <p className="text-sm text-gray-600">Added customer verification step and improved error handling</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">Active</Badge>
                          <span className="text-sm text-gray-500">by John Doe</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Version 1.1.0</h4>
                          <span className="text-sm text-gray-500">2025-01-10</span>
                        </div>
                        <p className="text-sm text-gray-600">Optimized execution flow and added parallel processing</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">Archived</Badge>
                          <span className="text-sm text-gray-500">by John Doe</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Version 1.0.0</h4>
                          <span className="text-sm text-gray-500">2025-01-05</span>
                        </div>
                        <p className="text-sm text-gray-600">Initial workflow creation</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">Archived</Badge>
                          <span className="text-sm text-gray-500">by John Doe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Execution History</CardTitle>
                  <CardDescription>
                    Recent workflow executions and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Execution #1234</div>
                        <div className="text-sm text-gray-600">2025-01-14 14:30:00</div>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Execution #1233</div>
                        <div className="text-sm text-gray-600">2025-01-14 10:15:00</div>
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Execution #1232</div>
                        <div className="text-sm text-gray-600">2025-01-13 16:45:00</div>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

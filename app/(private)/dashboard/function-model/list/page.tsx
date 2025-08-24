'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Search, Filter, Edit, Trash2, Archive, Copy, Eye } from 'lucide-react'
import Link from 'next/link'

// Mock data for demonstration - replace with actual data fetching
const mockWorkflows = [
  {
    id: '1',
    name: 'Customer Onboarding Process',
    description: 'Complete workflow for new customer account setup and verification',
    status: 'active',
    nodeCount: 12,
    lastModified: '2025-01-15',
    version: '1.2.0',
    category: 'Customer Service',
    executionMode: 'sequential',
    contextAccess: 'hierarchical',
    createdBy: 'John Doe',
    lastExecuted: '2025-01-14'
  },
  {
    id: '2',
    name: 'Order Fulfillment Pipeline',
    description: 'Automated order processing from receipt to delivery',
    status: 'draft',
    nodeCount: 8,
    lastModified: '2025-01-10',
    version: '0.9.1',
    category: 'Operations',
    executionMode: 'parallel',
    contextAccess: 'shared',
    createdBy: 'Jane Smith',
    lastExecuted: '2025-01-08'
  },
  {
    id: '3',
    name: 'Data Processing Workflow',
    description: 'ETL pipeline for customer analytics and reporting',
    status: 'archived',
    nodeCount: 15,
    lastModified: '2024-12-20',
    version: '2.1.0',
    category: 'Analytics',
    executionMode: 'sequential',
    contextAccess: 'isolated',
    createdBy: 'Mike Johnson',
    lastExecuted: '2024-12-15'
  },
  {
    id: '4',
    name: 'Approval Workflow',
    description: 'Multi-level approval process with notifications',
    status: 'active',
    nodeCount: 6,
    lastModified: '2025-01-12',
    version: '1.0.0',
    category: 'Governance',
    executionMode: 'conditional',
    contextAccess: 'hierarchical',
    createdBy: 'Sarah Wilson',
    lastExecuted: '2025-01-13'
  },
  {
    id: '5',
    name: 'Incident Response',
    description: 'Automated incident detection and response workflow',
    status: 'active',
    nodeCount: 10,
    lastModified: '2025-01-08',
    version: '1.1.0',
    category: 'Operations',
    executionMode: 'priority',
    contextAccess: 'shared',
    createdBy: 'Alex Brown',
    lastExecuted: '2025-01-14'
  }
]

export default function WorkflowListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const filteredWorkflows = mockWorkflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || workflow.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'draft': return 'secondary'
      case 'archived': return 'outline'
      default: return 'outline'
    }
  }

  const handleAction = (action: string, workflowId: string) => {
    switch (action) {
      case 'view':
        window.open(`/dashboard/function-model/${workflowId}`, '_blank')
        break
      case 'edit':
        window.open(`/dashboard/function-model/${workflowId}/edit`, '_blank')
        break
      case 'duplicate':
        // Handle duplication logic
        console.log('Duplicate workflow:', workflowId)
        break
      case 'archive':
        // Handle archive logic
        console.log('Archive workflow:', workflowId)
        break
      case 'delete':
        // Handle delete logic
        console.log('Delete workflow:', workflowId)
        break
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Management</h1>
            <p className="text-gray-600">Manage and organize your function model workflows</p>
          </div>
          <Link href="/dashboard/function-model/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create New Workflow</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search workflows by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Customer Service">Customer Service</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Analytics">Analytics</SelectItem>
              <SelectItem value="Governance">Governance</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              Grid
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filteredWorkflows.length} of {mockWorkflows.length} workflows</span>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters applied: {[statusFilter !== 'all' && statusFilter, categoryFilter !== 'all' && categoryFilter].filter(Boolean).join(', ') || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Workflow List */}
      {viewMode === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-gray-500">{workflow.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{workflow.category}</TableCell>
                  <TableCell>{workflow.nodeCount}</TableCell>
                  <TableCell>v{workflow.version}</TableCell>
                  <TableCell>{workflow.lastModified}</TableCell>
                  <TableCell>{workflow.createdBy}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction('view', workflow.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('edit', workflow.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('duplicate', workflow.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('archive', workflow.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleAction('delete', workflow.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{workflow.name}</CardTitle>
                    <CardDescription className="mb-3">
                      {workflow.description}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Category: {workflow.category}</span>
                    <span>Nodes: {workflow.nodeCount}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>v{workflow.version}</span>
                    <span>By {workflow.createdBy}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Modified: {workflow.lastModified}
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAction('view', workflow.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAction('edit', workflow.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No workflows found</h3>
              <p className="mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first workflow'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Link href="/dashboard/function-model/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

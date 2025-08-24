'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Workflow, FileText, Settings, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
    category: 'Customer Service'
  },
  {
    id: '2',
    name: 'Order Fulfillment Pipeline',
    description: 'Automated order processing from receipt to delivery',
    status: 'draft',
    nodeCount: 8,
    lastModified: '2025-01-10',
    version: '0.9.1',
    category: 'Operations'
  },
  {
    id: '3',
    name: 'Data Processing Workflow',
    description: 'ETL pipeline for customer analytics and reporting',
    status: 'archived',
    nodeCount: 15,
    lastModified: '2024-12-20',
    version: '2.1.0',
    category: 'Analytics'
  }
]

export default function FunctionModelPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Function Models</h1>
            <p className="text-gray-600">Create and manage process workflows and business models</p>
          </div>
          <Link href="/dashboard/function-model/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create New Model</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search workflows..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {mockWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{workflow.name}</CardTitle>
                  <CardDescription className="mb-3">
                    {workflow.description}
                  </CardDescription>
                </div>
                <Badge 
                  variant={
                    workflow.status === 'active' ? 'default' : 
                    workflow.status === 'draft' ? 'secondary' : 'outline'
                  }
                >
                  {workflow.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Nodes: {workflow.nodeCount}</span>
                  <span>v{workflow.version}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{workflow.category}</span>
                  <span>Modified: {workflow.lastModified}</span>
                </div>
                <div className="flex space-x-2 pt-2">
                  <Link href={`/dashboard/function-model/${workflow.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Open
                    </Button>
                  </Link>
                  <Link href={`/dashboard/function-model/${workflow.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Workflow className="h-5 w-5 text-green-600" />
              <CardTitle>Browse Templates</CardTitle>
            </div>
            <CardDescription>
              Start with pre-built workflow templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Workflow className="h-4 w-4 mr-2" />
              View Templates
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <CardTitle>Documentation</CardTitle>
            </div>
            <CardDescription>
              Learn how to use the Function Model feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View Docs
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Settings</CardTitle>
            </div>
            <CardDescription>
              Configure Function Model preferences and options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



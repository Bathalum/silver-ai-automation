'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Play, Settings, Share, Archive } from 'lucide-react'
import Link from 'next/link'

// Import existing workflow components
import { WorkflowContainer } from '@/components/composites/workflow/layout/workflow-container'
import { WorkflowCanvas } from '@/components/composites/workflow/workflow-canvas'
import { WorkflowSidebar } from '@/components/composites/workflow/workflow-sidebar'
import { WorkflowToolbar } from '@/components/composites/workflow/workflow-toolbar'

// Mock data for demonstration - replace with actual data fetching
const mockModel = {
  id: '1',
  name: 'Customer Onboarding Process',
  description: 'Complete workflow for new customer account setup and verification',
  status: 'draft' as const,
  version: '1.2.0',
  category: 'Customer Service',
  lastModified: '2025-01-15',
  nodeCount: 12,
  executionMode: 'sequential',
  contextAccess: 'hierarchical'
}

export default function WorkflowDesignerPage() {
  const params = useParams()
  const modelId = params.modelId as string

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/function-model">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Models
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{mockModel.name}</h1>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <span>v{mockModel.version}</span>
                <Badge variant="default">{mockModel.status}</Badge>
                <span>{mockModel.category}</span>
                <span>Last modified: {mockModel.lastModified}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Link href={`/dashboard/function-model/${modelId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Execute
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Designer */}
      <div className="flex-1 overflow-hidden">
        <WorkflowContainer
          modelName={mockModel.name}
          version={mockModel.version}
          status={mockModel.status}
          initialNodes={[]}
          initialEdges={[]}
          onSave={() => console.log('Save workflow')}
          onPublish={() => console.log('Publish workflow')}
          onArchive={() => console.log('Archive workflow')}
          onSettings={() => console.log('Open settings')}
          onShare={() => console.log('Share workflow')}
          onHistory={() => console.log('View history')}
          onPreview={() => console.log('Preview workflow')}
          onRun={() => console.log('Run workflow')}
        />
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Sparkles, Workflow, Settings } from 'lucide-react'
import Link from 'next/link'

const workflowTemplates = [
  {
    id: 'customer-onboarding',
    name: 'Customer Onboarding',
    description: 'Complete workflow for new customer account setup and verification',
    category: 'Customer Service',
    complexity: 'Medium',
    estimatedNodes: 8-12,
    icon: '👤'
  },
  {
    id: 'order-fulfillment',
    name: 'Order Fulfillment',
    description: 'Automated order processing from receipt to delivery',
    category: 'Operations',
    complexity: 'High',
    estimatedNodes: 12-18,
    icon: '📦'
  },
  {
    id: 'data-processing',
    name: 'Data Processing',
    description: 'ETL pipeline for customer analytics and reporting',
    category: 'Analytics',
    complexity: 'High',
    estimatedNodes: 15-25,
    icon: '📊'
  },
  {
    id: 'approval-workflow',
    name: 'Approval Workflow',
    description: 'Multi-level approval process with notifications',
    category: 'Governance',
    complexity: 'Low',
    estimatedNodes: 5-8,
    icon: '✅'
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    description: 'Automated incident detection and response workflow',
    category: 'Operations',
    complexity: 'Medium',
    estimatedNodes: 10-15,
    icon: '🚨'
  },
  {
    id: 'custom',
    name: 'Custom Workflow',
    description: 'Start from scratch with a blank canvas',
    category: 'Custom',
    complexity: 'Variable',
    estimatedNodes: 'Variable',
    icon: '🎨'
  }
]

export default function NewWorkflowPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [workflowData, setWorkflowData] = useState({
    name: '',
    description: '',
    category: '',
    executionMode: 'sequential',
    contextAccess: 'hierarchical'
  })

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId !== 'custom') {
      const template = workflowTemplates.find(t => t.id === templateId)
      if (template) {
        setWorkflowData(prev => ({
          ...prev,
          name: template.name,
          description: template.description,
          category: template.category
        }))
      }
    }
  }

  const handleNext = () => {
    if (step === 1 && selectedTemplate) {
      setStep(2)
    } else if (step === 2 && workflowData.name && workflowData.description) {
      setStep(3)
    }
  }

  const handleCreate = () => {
    // Here you would typically save the workflow and redirect to the designer
    const newWorkflowId = 'new-' + Date.now()
    router.push(`/dashboard/function-model/${newWorkflowId}`)
  }

  const canProceed = () => {
    if (step === 1) return selectedTemplate
    if (step === 2) return workflowData.name && workflowData.description
    return true
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/function-model">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Models
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Workflow</h1>
            <p className="text-gray-600">Build a new process workflow or business model</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Choose Template</span>
          <span>Configure</span>
          <span>Review & Create</span>
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span>Choose a Workflow Template</span>
              </CardTitle>
              <CardDescription>
                Start with a pre-built template or create from scratch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id 
                        ? 'ring-2 ring-blue-600 border-blue-600' 
                        : ''
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{template.category}</Badge>
                        <div className="text-gray-600">
                          <span className="font-medium">{template.complexity}</span> complexity
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Estimated nodes: {template.estimatedNodes}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-green-600" />
                <span>Configure Your Workflow</span>
              </CardTitle>
              <CardDescription>
                Set the basic properties and execution settings
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Workflow className="h-5 w-5 text-purple-600" />
                <span>Review & Create</span>
              </CardTitle>
              <CardDescription>
                Review your workflow configuration before creating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="text-lg font-medium">{workflowData.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Category</Label>
                    <p className="text-lg font-medium">{workflowData.category}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="text-base">{workflowData.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Execution Mode</Label>
                    <Badge variant="outline">{workflowData.executionMode}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Context Access</Label>
                    <Badge variant="outline">{workflowData.contextAccess}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-4">
                    Ready to create your workflow? You'll be taken to the workflow designer where you can start building your nodes and connections.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div>
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
            >
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {step < 3 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleCreate}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workflow</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

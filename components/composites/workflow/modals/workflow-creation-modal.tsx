'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Zap, 
  Database, 
  GitBranch, 
  Clock,
  Layers,
  CheckCircle,
  Star,
  Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // in minutes
  nodeCount: number
  tags: string[]
  icon: React.ReactNode
  preview: {
    containers: Array<{ type: string; count: number }>
    actions: Array<{ type: string; count: number }>
  }
  isPopular?: boolean
  isFeatured?: boolean
}

interface WorkflowCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkflow: (data: {
    name: string
    description: string
    templateId?: string
    category: string
    executionMode: string
    priority: string
    settings: Record<string, any>
  }) => void
  templates?: WorkflowTemplate[]
}

const defaultTemplates: WorkflowTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Workflow',
    description: 'Start with an empty canvas and build from scratch',
    category: 'Basic',
    difficulty: 'beginner',
    estimatedTime: 5,
    nodeCount: 0,
    tags: ['empty', 'custom'],
    icon: <FileText className="h-6 w-6" />,
    preview: { containers: [], actions: [] }
  },
  {
    id: 'simple-etl',
    name: 'Simple ETL Process',
    description: 'Extract, Transform, Load data processing workflow',
    category: 'Data Processing',
    difficulty: 'intermediate',
    estimatedTime: 30,
    nodeCount: 5,
    tags: ['etl', 'data', 'processing'],
    icon: <Database className="h-6 w-6" />,
    preview: {
      containers: [{ type: 'IO', count: 2 }, { type: 'Stage', count: 1 }],
      actions: [{ type: 'Tether', count: 2 }, { type: 'KB', count: 1 }]
    },
    isPopular: true
  },
  {
    id: 'approval-workflow',
    name: 'Document Approval',
    description: 'Multi-stage document review and approval process',
    category: 'Business Process',
    difficulty: 'intermediate',
    estimatedTime: 45,
    nodeCount: 8,
    tags: ['approval', 'review', 'business'],
    icon: <CheckCircle className="h-6 w-6" />,
    preview: {
      containers: [{ type: 'IO', count: 2 }, { type: 'Stage', count: 3 }],
      actions: [{ type: 'KB', count: 3 }, { type: 'Tether', count: 2 }]
    },
    isFeatured: true
  },
  {
    id: 'parallel-processing',
    name: 'Parallel Data Processing',
    description: 'Concurrent data processing with synchronization',
    category: 'Advanced',
    difficulty: 'advanced',
    estimatedTime: 60,
    nodeCount: 12,
    tags: ['parallel', 'concurrent', 'performance'],
    icon: <GitBranch className="h-6 w-6" />,
    preview: {
      containers: [{ type: 'IO', count: 2 }, { type: 'Stage', count: 4 }],
      actions: [{ type: 'Tether', count: 6 }, { type: 'KB', count: 2 }, { type: 'Function Model', count: 2 }]
    }
  }
]

export function WorkflowCreationModal({
  isOpen,
  onClose,
  onCreateWorkflow,
  templates = defaultTemplates
}: WorkflowCreationModalProps) {
  const [activeTab, setActiveTab] = useState('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    executionMode: 'sequential',
    priority: 'medium',
    createDefaults: true,
    enableValidation: true,
    autoSave: true
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template && template.id !== 'blank') {
      handleInputChange('name', template.name + ' - Copy')
      handleInputChange('description', template.description)
      handleInputChange('category', template.category)
    }
  }

  const handleCreate = () => {
    onCreateWorkflow({
      ...formData,
      templateId: selectedTemplate || undefined,
      settings: {
        createDefaults: formData.createDefaults,
        enableValidation: formData.enableValidation,
        autoSave: formData.autoSave
      }
    })
    onClose()
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredTemplates = templates.filter(template => {
    // Add filtering logic here if needed
    return true
  })

  const featuredTemplates = filteredTemplates.filter(t => t.isFeatured)
  const popularTemplates = filteredTemplates.filter(t => t.isPopular)
  const categorizedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, WorkflowTemplate[]>)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Create New Function Model
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Choose Template</TabsTrigger>
            <TabsTrigger value="configure">Configure Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {/* Featured Templates */}
                {featuredTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Featured Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featuredTemplates.map(template => (
                        <Card 
                          key={template.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedTemplate === template.id && "ring-2 ring-blue-500 bg-blue-50"
                          )}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-blue-600">{template.icon}</div>
                                <div>
                                  <CardTitle className="text-base">{template.name}</CardTitle>
                                  <CardDescription className="text-sm">
                                    {template.description}
                                  </CardDescription>
                                </div>
                              </div>
                              {template.isFeatured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between mb-3">
                              <Badge 
                                variant="outline" 
                                className={getDifficultyColor(template.difficulty)}
                              >
                                {template.difficulty}
                              </Badge>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {template.estimatedTime}m
                                </div>
                                <div className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  {template.nodeCount} nodes
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Templates */}
                {popularTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Popular Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {popularTemplates.map(template => (
                        <Card 
                          key={template.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedTemplate === template.id && "ring-2 ring-blue-500 bg-blue-50"
                          )}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-blue-600">{template.icon}</div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  {template.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between mb-3">
                              <Badge 
                                variant="outline" 
                                className={getDifficultyColor(template.difficulty)}
                              >
                                {template.difficulty}
                              </Badge>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {template.estimatedTime}m
                                </div>
                                <div className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  {template.nodeCount} nodes
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categorized Templates */}
                {Object.entries(categorizedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTemplates.map(template => (
                        <Card 
                          key={template.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedTemplate === template.id && "ring-2 ring-blue-500 bg-blue-50"
                          )}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-blue-600">{template.icon}</div>
                              <div>
                                <CardTitle className="text-sm">{template.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {template.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                              >
                                {template.difficulty}
                              </Badge>
                              <div className="text-xs text-gray-600">
                                {template.nodeCount} nodes
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="configure" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Workflow Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Data Processing">Data Processing</SelectItem>
                        <SelectItem value="Business Process">Business Process</SelectItem>
                        <SelectItem value="Integration">Integration</SelectItem>
                        <SelectItem value="Analytics">Analytics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the workflow's purpose and functionality"
                    rows={3}
                  />
                </div>

                {/* Execution Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="executionMode">Default Execution Mode</Label>
                    <Select value={formData.executionMode} onValueChange={(value) => handleInputChange('executionMode', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="parallel">Parallel</SelectItem>
                        <SelectItem value="conditional">Conditional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Default Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Advanced Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="createDefaults">Create default nodes</Label>
                      <input
                        id="createDefaults"
                        type="checkbox"
                        checked={formData.createDefaults}
                        onChange={(e) => handleInputChange('createDefaults', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableValidation">Enable real-time validation</Label>
                      <input
                        id="enableValidation"
                        type="checkbox"
                        checked={formData.enableValidation}
                        onChange={(e) => handleInputChange('enableValidation', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoSave">Enable auto-save</Label>
                      <input
                        id="autoSave"
                        type="checkbox"
                        checked={formData.autoSave}
                        onChange={(e) => handleInputChange('autoSave', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Template Preview */}
                {selectedTemplate && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Selected Template</h4>
                    <Card>
                      <CardContent className="pt-4">
                        {(() => {
                          const template = templates.find(t => t.id === selectedTemplate)
                          return template ? (
                            <div className="flex items-center gap-3">
                              <div className="text-blue-600">{template.icon}</div>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-gray-600">{template.description}</div>
                              </div>
                            </div>
                          ) : null
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!formData.name || !selectedTemplate}
          >
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
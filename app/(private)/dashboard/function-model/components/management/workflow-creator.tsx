"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles, Zap, Layers, GitBranch } from "lucide-react";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodeCount: number;
  complexity: "simple" | "medium" | "complex";
  tags: string[];
  preview: string;
}

interface WorkflowCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkflow: (workflowData: CreateWorkflowData) => void;
}

interface CreateWorkflowData {
  name: string;
  description: string;
  templateId?: string;
  category: string;
  tags: string[];
  executionMode: "sequential" | "parallel" | "conditional";
  contextAccess: "private" | "shared" | "public";
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "data-processing",
    name: "Data Processing Pipeline",
    description: "A sequential workflow for processing and transforming data through multiple stages",
    category: "Data",
    nodeCount: 5,
    complexity: "medium",
    tags: ["data", "pipeline", "transformation"],
    preview: "IO → Stage → Stage → Stage → IO"
  },
  {
    id: "ai-inference",
    name: "AI Model Inference",
    description: "Parallel execution workflow for running multiple AI models simultaneously",
    category: "AI",
    nodeCount: 8,
    complexity: "complex",
    tags: ["ai", "inference", "parallel", "models"],
    preview: "IO → [Stage, Stage, Stage] → Stage → IO"
  },
  {
    id: "conditional-workflow",
    name: "Conditional Decision Tree",
    description: "Workflow with conditional logic and branching based on data conditions",
    category: "Logic",
    nodeCount: 6,
    complexity: "medium",
    tags: ["conditional", "logic", "branching", "decisions"],
    preview: "IO → Stage → [Condition] → [Stage A, Stage B] → IO"
  },
  {
    id: "simple-sequence",
    name: "Simple Sequence",
    description: "Basic sequential workflow with minimal complexity for simple tasks",
    category: "Basic",
    nodeCount: 3,
    complexity: "simple",
    tags: ["simple", "sequence", "basic"],
    preview: "IO → Stage → IO"
  },
  {
    id: "knowledge-integration",
    name: "Knowledge Base Integration",
    description: "Workflow that integrates with knowledge bases and external data sources",
    category: "Integration",
    nodeCount: 7,
    complexity: "complex",
    tags: ["knowledge", "integration", "external", "data"],
    preview: "IO → KB → Stage → Stage → KB → Stage → IO"
  },
  {
    id: "nested-container",
    name: "Nested Container Workflow",
    description: "Advanced workflow with nested function model containers for complex orchestration",
    category: "Advanced",
    nodeCount: 10,
    complexity: "complex",
    tags: ["nested", "container", "orchestration", "advanced"],
    preview: "IO → Container → [Stage, Container] → Stage → IO"
  }
];

export function WorkflowCreator({
  open,
  onOpenChange,
  onCreateWorkflow,
}: WorkflowCreatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [workflowData, setWorkflowData] = useState<CreateWorkflowData>({
    name: "",
    description: "",
    templateId: "",
    category: "",
    tags: [],
    executionMode: "sequential",
    contextAccess: "private"
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setWorkflowData(prev => ({
      ...prev,
      templateId: template.id,
      category: template.category,
      tags: template.tags
    }));
  };

  const handleCreate = () => {
    onCreateWorkflow(workflowData);
    onOpenChange(false);
    // Reset form
    setCurrentStep(1);
    setSelectedTemplate(null);
    setWorkflowData({
      name: "",
      description: "",
      templateId: "",
      category: "",
      tags: [],
      executionMode: "sequential",
      contextAccess: "private"
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return workflowData.name.trim() !== "" && workflowData.description.trim() !== "";
      case 2:
        return selectedTemplate !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "complex": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Workflow
          </DialogTitle>
          <DialogDescription>
            Create a new function model workflow using templates or start from scratch
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step <= currentStep 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "bg-background border-muted-foreground text-muted-foreground"
              }`}>
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step < currentStep ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Workflow Name</label>
                    <Input
                      placeholder="Enter workflow name"
                      value={workflowData.name}
                      onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe what this workflow does"
                      value={workflowData.description}
                      onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select value={workflowData.category} onValueChange={(value) => setWorkflowData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Data">Data</SelectItem>
                        <SelectItem value="AI">AI</SelectItem>
                        <SelectItem value="Logic">Logic</SelectItem>
                        <SelectItem value="Integration">Integration</SelectItem>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workflowTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id 
                          ? "ring-2 ring-primary border-primary" 
                          : "hover:border-muted-foreground"
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                          <Badge className={getComplexityColor(template.complexity)}>
                            {template.complexity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <span>{template.nodeCount} nodes</span>
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {template.preview}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Execution Mode</label>
                    <Select value={workflowData.executionMode} onValueChange={(value: any) => setWorkflowData(prev => ({ ...prev, executionMode: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Sequential - Execute nodes one after another
                          </div>
                        </SelectItem>
                        <SelectItem value="parallel">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Parallel - Execute nodes simultaneously
                          </div>
                        </SelectItem>
                        <SelectItem value="conditional">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Conditional - Execute based on conditions
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Context Access Level</label>
                    <Select value={workflowData.contextAccess} onValueChange={(value: any) => setWorkflowData(prev => ({ ...prev, contextAccess: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private - Only accessible within this workflow</SelectItem>
                        <SelectItem value="shared">Shared - Accessible by related workflows</SelectItem>
                        <SelectItem value="public">Public - Accessible by all workflows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Selected Template: {selectedTemplate.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{selectedTemplate.nodeCount} nodes</Badge>
                        <Badge variant="outline">{selectedTemplate.complexity} complexity</Badge>
                        <Badge variant="outline">{selectedTemplate.category}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentStep < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canProceed()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

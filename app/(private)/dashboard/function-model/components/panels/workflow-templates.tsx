"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Settings, Zap, Database, Workflow } from "lucide-react";

interface WorkflowTemplatesProps {
  workflow: any; // Will be properly typed when domain models are available
  onTemplateApply: (workflowId: string, template: any) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  settings: any;
}

export function WorkflowTemplates({ workflow, onTemplateApply }: WorkflowTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTemplate, setCustomTemplate] = useState({
    name: "",
    description: "",
    category: "general",
    settings: {}
  });

  // Predefined templates
  const predefinedTemplates: Template[] = [
    {
      id: "automation-basic",
      name: "Basic Automation",
      description: "Simple sequential workflow for basic automation tasks",
      category: "automation",
      icon: <Zap className="w-4 h-4" />,
      settings: {
        executionSettings: {
          defaultMode: "sequential",
          maxConcurrency: 1,
          timeout: 300,
          retryAttempts: 2,
          retryDelay: 30,
        },
        contextAccess: {
          globalContext: "isolated",
          allowCrossNodeSharing: false,
          contextValidation: true,
          contextEncryption: false,
        },
        securitySettings: {
          requireAuthentication: true,
          allowAnonymousExecution: false,
          auditLogging: true,
          dataRetention: 30,
        },
        performanceSettings: {
          enableCaching: true,
          cacheTTL: 1800,
          enableCompression: false,
          maxMemoryUsage: 256,
        },
      }
    },
    {
      id: "integration-api",
      name: "API Integration",
      description: "Workflow optimized for API integrations with retry logic",
      category: "integration",
      icon: <Database className="w-4 h-4" />,
      settings: {
        executionSettings: {
          defaultMode: "parallel",
          maxConcurrency: 10,
          timeout: 600,
          retryAttempts: 5,
          retryDelay: 120,
        },
        contextAccess: {
          globalContext: "shared",
          allowCrossNodeSharing: true,
          contextValidation: true,
          contextEncryption: true,
        },
        securitySettings: {
          requireAuthentication: true,
          allowAnonymousExecution: false,
          auditLogging: true,
          dataRetention: 90,
        },
        performanceSettings: {
          enableCaching: true,
          cacheTTL: 3600,
          enableCompression: true,
          maxMemoryUsage: 512,
        },
      }
    },
    {
      id: "reporting-batch",
      name: "Batch Reporting",
      description: "Workflow for batch processing and reporting tasks",
      category: "reporting",
      icon: <FileText className="w-4 h-4" />,
      settings: {
        executionSettings: {
          defaultMode: "sequential",
          maxConcurrency: 3,
          timeout: 1800,
          retryAttempts: 1,
          retryDelay: 300,
        },
        contextAccess: {
          globalContext: "hierarchical",
          allowCrossNodeSharing: true,
          contextValidation: true,
          contextEncryption: false,
        },
        securitySettings: {
          requireAuthentication: true,
          allowAnonymousExecution: false,
          auditLogging: true,
          dataRetention: 180,
        },
        performanceSettings: {
          enableCaching: true,
          cacheTTL: 7200,
          enableCompression: true,
          maxMemoryUsage: 1024,
        },
      }
    },
    {
      id: "workflow-complex",
      name: "Complex Workflow",
      description: "Advanced workflow with conditional execution and context sharing",
      category: "workflow",
      icon: <Workflow className="w-4 h-4" />,
      settings: {
        executionSettings: {
          defaultMode: "conditional",
          maxConcurrency: 5,
          timeout: 900,
          retryAttempts: 3,
          retryDelay: 60,
        },
        contextAccess: {
          globalContext: "hybrid",
          allowCrossNodeSharing: true,
          contextValidation: true,
          contextEncryption: true,
        },
        securitySettings: {
          requireAuthentication: true,
          allowAnonymousExecution: false,
          auditLogging: true,
          dataRetention: 365,
        },
        performanceSettings: {
          enableCaching: true,
          cacheTTL: 5400,
          enableCompression: true,
          maxMemoryUsage: 768,
        },
      }
    }
  ];

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowCustomForm(false);
  };

  const handleTemplateApply = () => {
    if (selectedTemplate) {
      onTemplateApply(workflow.id, selectedTemplate.settings);
      setSelectedTemplate(null);
    }
  };

  const handleCustomTemplateCreate = () => {
    if (customTemplate.name && customTemplate.description) {
      const newTemplate = {
        id: `custom-${Date.now()}`,
        ...customTemplate,
        icon: <Settings className="w-4 h-4" />
      };
      onTemplateApply(workflow.id, newTemplate.settings);
      setCustomTemplate({ name: "", description: "", category: "general", settings: {} });
      setShowCustomForm(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "automation":
        return "bg-blue-100 text-blue-800";
      case "integration":
        return "bg-green-100 text-green-800";
      case "reporting":
        return "bg-purple-100 text-purple-800";
      case "workflow":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Workflow Templates</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Custom
          </Button>
        </div>

        {/* Custom Template Form */}
        {showCustomForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Create Custom Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customName">Template Name</Label>
                <Input
                  id="customName"
                  value={customTemplate.name}
                  onChange={(e) => setCustomTemplate({ ...customTemplate, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customDescription">Description</Label>
                <Textarea
                  id="customDescription"
                  value={customTemplate.description}
                  onChange={(e) => setCustomTemplate({ ...customTemplate, description: e.target.value })}
                  placeholder="Describe the template"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customCategory">Category</Label>
                <Select 
                  value={customTemplate.category} 
                  onValueChange={(value) => setCustomTemplate({ ...customTemplate, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="reporting">Reporting</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCustomTemplateCreate}
                  size="sm"
                  className="flex-1"
                >
                  Create Template
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCustomForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Predefined Templates */}
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {predefinedTemplates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id 
                    ? "ring-2 ring-primary" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {template.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant="outline" className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Mode: {template.settings.executionSettings.defaultMode}</div>
                        <div>Concurrency: {template.settings.executionSettings.maxConcurrency}</div>
                        <div>Timeout: {template.settings.executionSettings.timeout}s</div>
                        <div>Retries: {template.settings.executionSettings.retryAttempts}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Selected Template Actions */}
        {selectedTemplate && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">Selected Template</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.name}
                </p>
              </div>
              <Badge variant="outline" className={getCategoryColor(selectedTemplate.category)}>
                {selectedTemplate.category}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleTemplateApply}
                className="w-full"
                size="sm"
              >
                Apply Template to Workflow
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setSelectedTemplate(null)}
                className="w-full"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

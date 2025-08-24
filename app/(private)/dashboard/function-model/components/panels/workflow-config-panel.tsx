"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkflowPropertiesForm } from "./workflow-properties-form";
import { WorkflowTemplates } from "./workflow-templates";

interface WorkflowConfigPanelProps {
  workflow: any; // Will be properly typed when domain models are available
  onWorkflowUpdate: (workflowId: string, updates: any) => void;
  className?: string;
}

export function WorkflowConfigPanel({ workflow, onWorkflowUpdate, className }: WorkflowConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("properties");

  if (!workflow) {
    return (
      <div className={`w-[350px] h-full bg-muted/50 flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a workflow to configure</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-[350px] h-full flex flex-col ${className}`}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Workflow Configuration</CardTitle>
            <Badge variant="outline" className="text-xs">
              v{workflow.version || "1.0"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {workflow.name || "Unnamed Workflow"}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="flex-1 mt-0">
              <WorkflowPropertiesForm 
                workflow={workflow}
                onUpdate={onWorkflowUpdate}
              />
            </TabsContent>
            
            <TabsContent value="templates" className="flex-1 mt-0">
              <WorkflowTemplates 
                workflow={workflow}
                onTemplateApply={onWorkflowUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

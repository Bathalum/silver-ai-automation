"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ContextVariables } from "./context-variables";
import { ContextValidation } from "./context-validation";
import { ContextAccess } from "./context-access";

interface ContextPanelProps {
  workflow: any; // Will be properly typed when domain models are available
  onContextUpdate: (workflowId: string, contextUpdates: any) => void;
  className?: string;
}

export function ContextPanel({ workflow, onContextUpdate, className }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState("variables");

  if (!workflow) {
    return (
      <div className={`w-[350px] h-full bg-muted/50 flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a workflow to manage context</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-[350px] h-full flex flex-col ${className}`}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Context Management</CardTitle>
            <Badge variant="outline" className="text-xs">
              {workflow.contextAccess?.globalContext || "isolated"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Manage workflow context variables and access patterns
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4">
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
            </TabsList>
            
            <TabsContent value="variables" className="flex-1 mt-0">
              <ContextVariables 
                workflow={workflow}
                onUpdate={onContextUpdate}
              />
            </TabsContent>
            
            <TabsContent value="validation" className="flex-1 mt-0">
              <ContextValidation 
                workflow={workflow}
                onUpdate={onContextUpdate}
              />
            </TabsContent>
            
            <TabsContent value="access" className="flex-1 mt-0">
              <ContextAccess 
                workflow={workflow}
                onUpdate={onContextUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

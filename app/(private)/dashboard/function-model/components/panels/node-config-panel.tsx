"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NodePropertiesForm } from "./node-properties-form";
import { NodePreview } from "./node-preview";

interface NodeConfigPanelProps {
  selectedNode: any; // Will be properly typed when domain models are available
  onNodeUpdate: (nodeId: string, updates: any) => void;
  className?: string;
}

export function NodeConfigPanel({ selectedNode, onNodeUpdate, className }: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("properties");

  if (!selectedNode) {
    return (
      <div className={`w-[350px] h-full bg-muted/50 flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a node to configure</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-[350px] h-full flex flex-col ${className}`}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Node Configuration</CardTitle>
            <Badge variant="outline" className="text-xs">
              {selectedNode.type}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedNode.name || "Unnamed Node"}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="flex-1 mt-0">
              <NodePropertiesForm 
                node={selectedNode}
                onUpdate={onNodeUpdate}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 mt-0">
              <NodePreview node={selectedNode} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

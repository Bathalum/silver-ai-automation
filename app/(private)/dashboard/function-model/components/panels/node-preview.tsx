"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface NodePreviewProps {
  node: any; // Will be properly typed when domain models are available
}

export function NodePreview({ node }: NodePreviewProps) {
  // Get node dimensions based on type
  const getNodeDimensions = (type: string) => {
    switch (type) {
      case "io":
        return "w-[200px] h-[120px]";
      case "stage":
        return "w-[250px] h-[150px]";
      case "tether":
      case "kb":
        return "w-[180px] h-[100px]";
      case "function-model-container":
        return "w-[200px] h-[120px]";
      default:
        return "w-[200px] h-[120px]";
    }
  };

  // Get node border color based on type
  const getNodeBorderColor = (type: string) => {
    switch (type) {
      case "io":
        return "border-purple-500";
      case "stage":
        return "border-blue-500";
      case "tether":
        return "border-orange-500";
      case "kb":
        return "border-green-500";
      case "function-model-container":
        return "border-blue-500";
      default:
        return "border-gray-500";
    }
  };

  // Get node background color based on type
  const getNodeBackgroundColor = (type: string) => {
    switch (type) {
      case "io":
        return "bg-purple-50";
      case "stage":
        return "bg-blue-50";
      case "tether":
        return "bg-orange-50";
      case "kb":
        return "bg-green-50";
      case "function-model-container":
        return "bg-blue-50";
      default:
        return "bg-gray-50";
    }
  };

  const dimensions = getNodeDimensions(node.type);
  const borderColor = getNodeBorderColor(node.type);
  const backgroundColor = getNodeBackgroundColor(node.type);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4">
        <h3 className="text-sm font-medium mb-4">Live Preview</h3>
        
        {/* Preview Container */}
        <div className="flex justify-center mb-6">
          <div className={`${dimensions} ${borderColor} ${backgroundColor} border-2 rounded-lg shadow-lg flex flex-col overflow-hidden`}>
            {/* Node Header */}
            <div className="px-3 py-2 bg-white/80 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {node.type?.toUpperCase() || "NODE"}
                  </Badge>
                  {node.visualProperties?.showPriority && node.priority && (
                    <Badge 
                      variant={node.priority === "critical" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {node.priority}
                    </Badge>
                  )}
                </div>
                {node.visualProperties?.showStatus && (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                )}
              </div>
              <div className="mt-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {node.name || "Unnamed Node"}
                </div>
              </div>
            </div>
            
            {/* Node Body */}
            <div className="flex-1 p-3">
              {node.description && (
                <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {node.description}
                </div>
              )}
              
              {/* Node-specific content preview */}
              {node.type === "stage" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Actions: {node.dependencies?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    Mode: {node.executionMode || "sequential"}
                  </div>
                </div>
              )}
              
              {node.type === "tether" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Status: Ready
                  </div>
                  <div className="text-xs text-gray-500">
                    Duration: ~5s
                  </div>
                </div>
              )}
              
              {node.type === "kb" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    KB: Reference
                  </div>
                  <div className="text-xs text-gray-500">
                    RACI: Owner
                  </div>
                </div>
              )}
              
              {node.type === "function-model-container" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Nested Model
                  </div>
                  <div className="text-xs text-gray-500">
                    Context: Mapped
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Configuration Summary */}
        <Card>
          <CardHeader className="pb-3">
            <h4 className="text-sm font-medium">Configuration Summary</h4>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <div className="font-medium">{node.type || "Unknown"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <div className="font-medium">{node.priority || "Normal"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Execution:</span>
                <div className="font-medium">{node.executionMode || "Sequential"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Context:</span>
                <div className="font-medium">{node.contextAccess || "Inherit"}</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dependencies:</span>
                <span className="font-medium">{node.dependencies?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Context Variables:</span>
                <span className="font-medium">{node.contextVariables?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

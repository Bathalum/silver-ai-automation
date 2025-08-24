"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  Undo, 
  Redo, 
  Settings, 
  Code, 
  GitBranch, 
  Zap, 
  Layers, 
  Eye, 
  EyeOff,
  Copy,
  Trash2,
  Plus,
  ArrowRight,
  Clock,
  Users,
  Activity
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: "input" | "output" | "stage" | "container" | "kb" | "tether";
  name: string;
  description: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  status: "idle" | "running" | "completed" | "error";
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: "default" | "conditional";
  label?: string;
  condition?: string;
}

interface WorkflowMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  executionMode: "sequential" | "parallel" | "conditional";
  contextAccess: "private" | "shared" | "public";
  autoSave: boolean;
  versioning: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastExecuted?: string;
  executionCount: number;
}

interface WorkflowEditorProps {
  workflow: WorkflowMetadata;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  onSave: (workflow: WorkflowMetadata, nodes: WorkflowNode[], connections: WorkflowConnection[]) => void;
  onClose: () => void;
}

export function WorkflowEditor({
  workflow,
  nodes,
  connections,
  onSave,
  onClose,
}: WorkflowEditorProps) {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowMetadata>(workflow);
  const [currentNodes, setCurrentNodes] = useState<WorkflowNode[]>(nodes);
  const [currentConnections, setCurrentConnections] = useState<WorkflowConnection[]>(connections);
  const [activeTab, setActiveTab] = useState("properties");
  const [hasChanges, setHasChanges] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{
    workflow: WorkflowMetadata;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{
    workflow: WorkflowMetadata;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  }>>([]);

  // Track changes
  useEffect(() => {
    const hasWorkflowChanges = JSON.stringify(currentWorkflow) !== JSON.stringify(workflow);
    const hasNodeChanges = JSON.stringify(currentNodes) !== JSON.stringify(nodes);
    const hasConnectionChanges = JSON.stringify(currentConnections) !== JSON.stringify(connections);
    
    setHasChanges(hasWorkflowChanges || hasNodeChanges || hasConnectionChanges);
  }, [currentWorkflow, currentNodes, currentConnections, workflow, nodes, connections]);

  const saveToHistory = () => {
    setUndoStack(prev => [...prev, { workflow, nodes, connections }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      
      setRedoStack(prev => [...prev, { workflow: currentWorkflow, nodes: currentNodes, connections: currentConnections }]);
      setUndoStack(newUndoStack);
      
      setCurrentWorkflow(previousState.workflow);
      setCurrentNodes(previousState.nodes);
      setCurrentConnections(previousState.connections);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      
      setUndoStack(prev => [...prev, { workflow: currentWorkflow, nodes: currentNodes, connections: currentConnections }]);
      setRedoStack(newRedoStack);
      
      setCurrentWorkflow(nextState.workflow);
      setCurrentNodes(nextState.nodes);
      setCurrentConnections(nextState.connections);
    }
  };

  const handleSave = () => {
    saveToHistory();
    onSave(currentWorkflow, currentNodes, currentConnections);
    setHasChanges(false);
  };

  const handleWorkflowChange = (field: keyof WorkflowMetadata, value: any) => {
    setCurrentWorkflow(prev => ({ ...prev, [field]: value }));
  };

  const handleNodeChange = (nodeId: string, field: keyof WorkflowNode, value: any) => {
    setCurrentNodes(prev => 
      prev.map(node => 
        node.id === nodeId ? { ...node, [field]: value } : node
      )
    );
  };

  const handleConnectionChange = (connectionId: string, field: keyof WorkflowConnection, value: any) => {
    setCurrentConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId ? { ...conn, [field]: value } : conn
      )
    );
  };

  const addNode = () => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: "stage",
      name: "New Stage",
      description: "A new workflow stage",
      position: { x: 100, y: 100 },
      config: {},
      status: "idle"
    };
    setCurrentNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    setCurrentNodes(prev => prev.filter(node => node.id !== nodeId));
    setCurrentConnections(prev => 
      prev.filter(conn => conn.source !== nodeId && conn.target !== nodeId)
    );
  };

  const duplicateNode = (nodeId: string) => {
    const nodeToDuplicate = currentNodes.find(node => node.id === nodeId);
    if (nodeToDuplicate) {
      const newNode: WorkflowNode = {
        ...nodeToDuplicate,
        id: `node-${Date.now()}`,
        name: `${nodeToDuplicate.name} (Copy)`,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50
        }
      };
      setCurrentNodes(prev => [...prev, newNode]);
    }
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case "input": return <ArrowRight className="h-4 w-4" />;
      case "output": return <ArrowRight className="h-4 w-4 rotate-180" />;
      case "stage": return <Zap className="h-4 w-4" />;
      case "container": return <Layers className="h-4 w-4" />;
      case "kb": return <Code className="h-4 w-4" />;
      case "tether": return <GitBranch className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle": return "bg-gray-100 text-gray-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            ← Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Edit Workflow: {currentWorkflow.name}</h2>
            <p className="text-sm text-muted-foreground">
              Last modified: {new Date(currentWorkflow.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={undoStack.length === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="min-w-[100px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Properties Tab */}
            <TabsContent value="properties" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Core workflow properties and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={currentWorkflow.name}
                        onChange={(e) => handleWorkflowChange("name", e.target.value)}
                        placeholder="Workflow name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={currentWorkflow.version}
                        onChange={(e) => handleWorkflowChange("version", e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={currentWorkflow.description}
                      onChange={(e) => handleWorkflowChange("description", e.target.value)}
                      placeholder="Describe what this workflow does"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={currentWorkflow.category} 
                        onValueChange={(value) => handleWorkflowChange("category", value)}
                      >
                        <SelectTrigger>
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
                    <div>
                      <Label htmlFor="executionMode">Execution Mode</Label>
                      <Select 
                        value={currentWorkflow.executionMode} 
                        onValueChange={(value: any) => handleWorkflowChange("executionMode", value)}
                      >
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
                  </div>

                  <div>
                    <Label htmlFor="contextAccess">Context Access Level</Label>
                    <Select 
                      value={currentWorkflow.contextAccess} 
                      onValueChange={(value: any) => handleWorkflowChange("contextAccess", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                  <CardDescription>
                    Workflow execution and usage statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currentWorkflow.executionCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Executions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currentNodes.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currentConnections.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Connections</div>
                    </div>
                  </div>
                  
                  {currentWorkflow.lastExecuted && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Last executed: {new Date(currentWorkflow.lastExecuted).toLocaleString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nodes Tab */}
            <TabsContent value="nodes" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Workflow Nodes</h3>
                <Button onClick={addNode} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Node
                </Button>
              </div>
              
              <div className="space-y-3">
                {currentNodes.map((node) => (
                  <Card key={node.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                          {getNodeTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              value={node.name}
                              onChange={(e) => handleNodeChange(node.id, "name", e.target.value)}
                              className="h-7 text-sm font-medium border-0 p-0 bg-transparent hover:bg-muted/50 focus:bg-muted/50 rounded px-2"
                            />
                            <Badge variant="outline" className="text-xs">
                              {node.type}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(node.status)}`}>
                              {node.status}
                            </Badge>
                          </div>
                          <Textarea
                            value={node.description}
                            onChange={(e) => handleNodeChange(node.id, "description", e.target.value)}
                            placeholder="Node description"
                            className="text-sm border-0 p-0 bg-transparent hover:bg-muted/50 focus:bg-muted/50 rounded px-2 resize-none"
                            rows={2}
                          />
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Position: ({node.position.x}, {node.position.y})</span>
                            <span>Config: {Object.keys(node.config).length} properties</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateNode(node.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNode(node.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {currentNodes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No nodes added yet</p>
                    <p className="text-sm">Click "Add Node" to create your first workflow node</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Connections Tab */}
            <TabsContent value="connections" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Workflow Connections</h3>
                
                {currentConnections.length > 0 ? (
                  <div className="space-y-3">
                    {currentConnections.map((connection) => (
                      <Card key={connection.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{connection.source}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{connection.target}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {connection.type}
                            </Badge>
                            {connection.label && (
                              <span className="text-sm text-muted-foreground">
                                "{connection.label}"
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              value={connection.label || ""}
                              onChange={(e) => handleConnectionChange(connection.id, "label", e.target.value)}
                              placeholder="Connection label"
                              className="h-7 text-xs w-32"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentConnections(prev => 
                                  prev.filter(conn => conn.id !== connection.id)
                                );
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {connection.condition && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Condition:</span>
                              <Input
                                value={connection.condition}
                                onChange={(e) => handleConnectionChange(connection.id, "condition", e.target.value)}
                                placeholder="Condition expression"
                                className="h-6 text-xs flex-1"
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No connections defined</p>
                    <p className="text-sm">Connections will appear here when you connect nodes in the canvas</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Settings</CardTitle>
                  <CardDescription>
                    Configure workflow behavior and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoSave">Auto Save</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically save changes as you work
                        </p>
                      </div>
                      <Switch
                        id="autoSave"
                        checked={currentWorkflow.autoSave}
                        onCheckedChange={(checked) => handleWorkflowChange("autoSave", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="versioning">Versioning</Label>
                        <p className="text-sm text-muted-foreground">
                          Keep track of workflow versions and changes
                        </p>
                      </div>
                      <Switch
                        id="versioning"
                        checked={currentWorkflow.versioning}
                        onCheckedChange={(checked) => handleWorkflowChange("versioning", checked)}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {currentWorkflow.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = currentWorkflow.tags.filter((_, i) => i !== index);
                                handleWorkflowChange("tags", newTags);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                              const newTag = e.currentTarget.value.trim();
                              if (!currentWorkflow.tags.includes(newTag)) {
                                handleWorkflowChange("tags", [...currentWorkflow.tags, newTag]);
                              }
                              e.currentTarget.value = "";
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.value.trim()) {
                              const newTag = input.value.trim();
                              if (!currentWorkflow.tags.includes(newTag)) {
                                handleWorkflowChange("tags", [...currentWorkflow.tags, newTag]);
                              }
                              input.value = "";
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

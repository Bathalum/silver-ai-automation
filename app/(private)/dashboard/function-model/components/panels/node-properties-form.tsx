"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodePropertiesFormProps {
  node: any; // Will be properly typed when domain models are available
  onUpdate: (nodeId: string, updates: any) => void;
}

export function NodePropertiesForm({ node, onUpdate }: NodePropertiesFormProps) {
  const [formData, setFormData] = useState({
    name: node.name || "",
    description: node.description || "",
    priority: node.priority || "normal",
    executionMode: node.executionMode || "sequential",
    contextAccess: node.contextAccess || "inherit",
    visualProperties: {
      showBadges: node.visualProperties?.showBadges ?? true,
      showStatus: node.visualProperties?.showStatus ?? true,
      showPriority: node.visualProperties?.showPriority ?? true,
    },
    dependencies: node.dependencies || [],
    contextVariables: node.contextVariables || [],
  });

  const handleInputChange = (field: string, value: any) => {
    const newData = { ...formData };
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      newData[parent] = { ...newData[parent], [child]: value };
    } else {
      newData[field] = value;
    }
    setFormData(newData);
  };

  const handleSave = () => {
    onUpdate(node.id, formData);
  };

  const addDependency = () => {
    const newDependency = { id: "", type: "required" };
    setFormData({
      ...formData,
      dependencies: [...formData.dependencies, newDependency],
    });
  };

  const removeDependency = (index: number) => {
    setFormData({
      ...formData,
      dependencies: formData.dependencies.filter((_, i) => i !== index),
    });
  };

  const addContextVariable = () => {
    const newVariable = { name: "", type: "string", required: false };
    setFormData({
      ...formData,
      contextVariables: [...formData.contextVariables, newVariable],
    });
  };

  const removeContextVariable = (index: number) => {
    setFormData({
      ...formData,
      contextVariables: formData.contextVariables.filter((_, i) => i !== index),
    });
  };

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-6 py-4">
        {/* General Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter node name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the node's purpose"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="executionMode">Execution Mode</Label>
              <Select value={formData.executionMode} onValueChange={(value) => handleInputChange("executionMode", value)}>
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
          </CardContent>
        </Card>

        {/* Visual Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Visual Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showBadges">Show Badges</Label>
              <Switch
                id="showBadges"
                checked={formData.visualProperties.showBadges}
                onCheckedChange={(checked) => handleInputChange("visualProperties.showBadges", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showStatus">Show Status</Label>
              <Switch
                id="showStatus"
                checked={formData.visualProperties.showStatus}
                onCheckedChange={(checked) => handleInputChange("visualProperties.showStatus", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showPriority">Show Priority</Label>
              <Switch
                id="showPriority"
                checked={formData.visualProperties.showPriority}
                onCheckedChange={(checked) => handleInputChange("visualProperties.showPriority", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Dependencies</CardTitle>
              <Button variant="outline" size="sm" onClick={addDependency}>
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.dependencies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No dependencies configured
              </p>
            ) : (
              formData.dependencies.map((dep: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Input
                    value={dep.id}
                    onChange={(e) => {
                      const newDeps = [...formData.dependencies];
                      newDeps[index].id = e.target.value;
                      setFormData({ ...formData, dependencies: newDeps });
                    }}
                    placeholder="Node ID"
                    className="flex-1"
                  />
                  <Select 
                    value={dep.type} 
                    onValueChange={(value) => {
                      const newDeps = [...formData.dependencies];
                      newDeps[index].type = value;
                      setFormData({ ...formData, dependencies: newDeps });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="blocking">Blocking</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDependency(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Context Access */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Context Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contextAccess">Access Level</Label>
              <Select value={formData.contextAccess} onValueChange={(value) => handleInputChange("contextAccess", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit from Parent</SelectItem>
                  <SelectItem value="readonly">Read Only</SelectItem>
                  <SelectItem value="readwrite">Read/Write</SelectItem>
                  <SelectItem value="isolated">Isolated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Context Variables</Label>
                <Button variant="outline" size="sm" onClick={addContextVariable}>
                  Add Variable
                </Button>
              </div>
              
              {formData.contextVariables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No context variables defined
                </p>
              ) : (
                formData.contextVariables.map((variable: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Input
                      value={variable.name}
                      onChange={(e) => {
                        const newVars = [...formData.contextVariables];
                        newVars[index].name = e.target.value;
                        setFormData({ ...formData, contextVariables: newVars });
                      }}
                      placeholder="Variable name"
                      className="flex-1"
                    />
                    <Select 
                      value={variable.type} 
                      onValueChange={(value) => {
                        const newVars = [...formData.contextVariables];
                        newVars[index].type = value;
                        setFormData({ ...formData, contextVariables: newVars });
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="object">Object</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContextVariable(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

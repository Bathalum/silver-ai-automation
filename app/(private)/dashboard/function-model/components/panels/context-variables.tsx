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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";

interface ContextVariablesProps {
  workflow: any; // Will be properly typed when domain models are available
  onUpdate: (workflowId: string, contextUpdates: any) => void;
}

interface ContextVariable {
  id: string;
  name: string;
  type: string;
  description: string;
  defaultValue: string;
  required: boolean;
  encrypted: boolean;
  scope: string;
  validation: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minValue?: number;
    maxValue?: number;
  };
}

export function ContextVariables({ workflow, onUpdate }: ContextVariablesProps) {
  const [variables, setVariables] = useState<ContextVariable[]>(
    workflow.contextVariables || []
  );
  const [editingVariable, setEditingVariable] = useState<ContextVariable | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVariable, setNewVariable] = useState<Partial<ContextVariable>>({
    name: "",
    type: "string",
    description: "",
    defaultValue: "",
    required: false,
    encrypted: false,
    scope: "workflow",
    validation: {}
  });

  const dataTypes = [
    { value: "string", label: "String", description: "Text data" },
    { value: "number", label: "Number", description: "Numeric data" },
    { value: "boolean", label: "Boolean", label: "True/false values" },
    { value: "array", label: "Array", description: "List of values" },
    { value: "object", label: "Object", description: "Key-value pairs" },
    { value: "date", label: "Date", description: "Date and time" },
    { value: "file", label: "File", description: "File reference" },
    { value: "json", label: "JSON", description: "JSON data" }
  ];

  const scopes = [
    { value: "workflow", label: "Workflow", description: "Available to entire workflow" },
    { value: "stage", label: "Stage", description: "Available within stage only" },
    { value: "node", label: "Node", description: "Available to specific node only" },
    { value: "global", label: "Global", description: "Available across all workflows" }
  ];

  const handleAddVariable = () => {
    if (newVariable.name && newVariable.type) {
      const variable: ContextVariable = {
        id: `var-${Date.now()}`,
        name: newVariable.name,
        type: newVariable.type,
        description: newVariable.description || "",
        defaultValue: newVariable.defaultValue || "",
        required: newVariable.required || false,
        encrypted: newVariable.encrypted || false,
        scope: newVariable.scope || "workflow",
        validation: newVariable.validation || {}
      };

      const updatedVariables = [...variables, variable];
      setVariables(updatedVariables);
      onUpdate(workflow.id, { contextVariables: updatedVariables });
      
      // Reset form
      setNewVariable({
        name: "",
        type: "string",
        description: "",
        defaultValue: "",
        required: false,
        encrypted: false,
        scope: "workflow",
        validation: {}
      });
      setShowAddForm(false);
    }
  };

  const handleEditVariable = (variable: ContextVariable) => {
    setEditingVariable(variable);
    setNewVariable(variable);
    setShowAddForm(true);
  };

  const handleUpdateVariable = () => {
    if (editingVariable && newVariable.name && newVariable.type) {
      const updatedVariables = variables.map(v => 
        v.id === editingVariable.id 
          ? { ...v, ...newVariable }
          : v
      );
      
      setVariables(updatedVariables);
      onUpdate(workflow.id, { contextVariables: updatedVariables });
      
      setEditingVariable(null);
      setShowAddForm(false);
      setNewVariable({
        name: "",
        type: "string",
        description: "",
        defaultValue: "",
        required: false,
        encrypted: false,
        scope: "workflow",
        validation: {}
      });
    }
  };

  const handleDeleteVariable = (variableId: string) => {
    const updatedVariables = variables.filter(v => v.id !== variableId);
    setVariables(updatedVariables);
    onUpdate(workflow.id, { contextVariables: updatedVariables });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "string":
        return "bg-blue-100 text-blue-800";
      case "number":
        return "bg-green-100 text-green-800";
      case "boolean":
        return "bg-purple-100 text-purple-800";
      case "array":
        return "bg-orange-100 text-orange-800";
      case "object":
        return "bg-red-100 text-red-800";
      case "date":
        return "bg-indigo-100 text-indigo-800";
      case "file":
        return "bg-gray-100 text-gray-800";
      case "json":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case "workflow":
        return "bg-blue-100 text-blue-800";
      case "stage":
        return "bg-green-100 text-green-800";
      case "node":
        return "bg-orange-100 text-orange-800";
      case "global":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Context Variables</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Variable
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {editingVariable ? "Edit Variable" : "Add New Variable"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="varName">Variable Name</Label>
                  <Input
                    id="varName"
                    value={newVariable.name}
                    onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                    placeholder="Enter variable name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="varType">Data Type</Label>
                  <Select 
                    value={newVariable.type} 
                    onValueChange={(value) => setNewVariable({ ...newVariable, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="varDescription">Description</Label>
                <Textarea
                  id="varDescription"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  placeholder="Describe the variable's purpose"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="varDefault">Default Value</Label>
                  <Input
                    id="varDefault"
                    value={newVariable.defaultValue}
                    onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                    placeholder="Enter default value"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="varScope">Scope</Label>
                  <Select 
                    value={newVariable.scope} 
                    onValueChange={(value) => setNewVariable({ ...newVariable, scope: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopes.map((scope) => (
                        <SelectItem key={scope.value} value={scope.value}>
                          {scope.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="varRequired"
                    checked={newVariable.required}
                    onCheckedChange={(checked) => setNewVariable({ ...newVariable, required: checked })}
                  />
                  <Label htmlFor="varRequired">Required</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="varEncrypted"
                    checked={newVariable.encrypted}
                    onCheckedChange={(checked) => setNewVariable({ ...newVariable, encrypted: checked })}
                  />
                  <Label htmlFor="varEncrypted">Encrypted</Label>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={editingVariable ? handleUpdateVariable : handleAddVariable}
                  size="sm"
                  className="flex-1"
                >
                  {editingVariable ? "Update Variable" : "Add Variable"}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingVariable(null);
                    setNewVariable({
                      name: "",
                      type: "string",
                      description: "",
                      defaultValue: "",
                      required: false,
                      encrypted: false,
                      scope: "workflow",
                      validation: {}
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Variables List */}
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {variables.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No context variables defined</p>
                <p className="text-xs">Add variables to share data between workflow nodes</p>
              </div>
            ) : (
              variables.map((variable) => (
                <Card key={variable.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm">{variable.name}</h4>
                          <Badge variant="outline" className={getTypeColor(variable.type)}>
                            {variable.type}
                          </Badge>
                          <Badge variant="outline" className={getScopeColor(variable.scope)}>
                            {variable.scope}
                          </Badge>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {variable.encrypted && (
                            <Badge variant="secondary" className="text-xs">
                              Encrypted
                            </Badge>
                          )}
                        </div>
                        
                        {variable.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {variable.description}
                          </p>
                        )}
                        
                        {variable.defaultValue && (
                          <div className="text-xs text-muted-foreground">
                            Default: {variable.defaultValue}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVariable(variable)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariable(variable.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

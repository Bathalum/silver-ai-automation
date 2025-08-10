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

interface WorkflowPropertiesFormProps {
  workflow: any; // Will be properly typed when domain models are available
  onUpdate: (workflowId: string, updates: any) => void;
}

export function WorkflowPropertiesForm({ workflow, onUpdate }: WorkflowPropertiesFormProps) {
  const [formData, setFormData] = useState({
    name: workflow.name || "",
    description: workflow.description || "",
    version: workflow.version || "1.0",
    category: workflow.category || "general",
    executionSettings: {
      defaultMode: workflow.executionSettings?.defaultMode || "sequential",
      maxConcurrency: workflow.executionSettings?.maxConcurrency || 5,
      timeout: workflow.executionSettings?.timeout || 300,
      retryAttempts: workflow.executionSettings?.retryAttempts || 3,
      retryDelay: workflow.executionSettings?.retryDelay || 60,
    },
    contextAccess: {
      globalContext: workflow.contextAccess?.globalContext || "isolated",
      allowCrossNodeSharing: workflow.contextAccess?.allowCrossNodeSharing ?? true,
      contextValidation: workflow.contextAccess?.contextValidation ?? true,
      contextEncryption: workflow.contextAccess?.contextEncryption ?? false,
    },
    securitySettings: {
      requireAuthentication: workflow.securitySettings?.requireAuthentication ?? true,
      allowAnonymousExecution: workflow.securitySettings?.allowAnonymousExecution ?? false,
      auditLogging: workflow.securitySettings?.auditLogging ?? true,
      dataRetention: workflow.securitySettings?.dataRetention || 90,
    },
    performanceSettings: {
      enableCaching: workflow.performanceSettings?.enableCaching ?? true,
      cacheTTL: workflow.performanceSettings?.cacheTTL || 3600,
      enableCompression: workflow.performanceSettings?.enableCompression ?? true,
      maxMemoryUsage: workflow.performanceSettings?.maxMemoryUsage || 512,
    },
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
    onUpdate(workflow.id, formData);
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
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter workflow name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the workflow's purpose"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleInputChange("version", e.target.value)}
                  placeholder="1.0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
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
            </div>
          </CardContent>
        </Card>

        {/* Execution Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Execution Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultMode">Default Execution Mode</Label>
              <Select value={formData.executionSettings.defaultMode} onValueChange={(value) => handleInputChange("executionSettings.defaultMode", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="parallel">Parallel</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="event-driven">Event-Driven</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxConcurrency">Max Concurrency</Label>
                <Input
                  id="maxConcurrency"
                  type="number"
                  value={formData.executionSettings.maxConcurrency}
                  onChange={(e) => handleInputChange("executionSettings.maxConcurrency", parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.executionSettings.timeout}
                  onChange={(e) => handleInputChange("executionSettings.timeout", parseInt(e.target.value))}
                  min="30"
                  max="3600"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retryAttempts">Retry Attempts</Label>
                <Input
                  id="retryAttempts"
                  type="number"
                  value={formData.executionSettings.retryAttempts}
                  onChange={(e) => handleInputChange("executionSettings.retryAttempts", parseInt(e.target.value))}
                  min="0"
                  max="10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  value={formData.executionSettings.retryDelay}
                  onChange={(e) => handleInputChange("executionSettings.retryDelay", parseInt(e.target.value))}
                  min="10"
                  max="300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Access Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Context Access Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalContext">Global Context Mode</Label>
              <Select value={formData.contextAccess.globalContext} onValueChange={(value) => handleInputChange("contextAccess.globalContext", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="isolated">Isolated</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allowCrossNodeSharing">Allow Cross-Node Context Sharing</Label>
                <Switch
                  id="allowCrossNodeSharing"
                  checked={formData.contextAccess.allowCrossNodeSharing}
                  onCheckedChange={(checked) => handleInputChange("contextAccess.allowCrossNodeSharing", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="contextValidation">Enable Context Validation</Label>
                <Switch
                  id="contextValidation"
                  checked={formData.contextAccess.contextValidation}
                  onCheckedChange={(checked) => handleInputChange("contextAccess.contextValidation", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="contextEncryption">Enable Context Encryption</Label>
                <Switch
                  id="contextEncryption"
                  checked={formData.contextAccess.contextEncryption}
                  onCheckedChange={(checked) => handleInputChange("contextAccess.contextEncryption", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireAuthentication">Require Authentication</Label>
                <Switch
                  id="requireAuthentication"
                  checked={formData.securitySettings.requireAuthentication}
                  onCheckedChange={(checked) => handleInputChange("securitySettings.requireAuthentication", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="allowAnonymousExecution">Allow Anonymous Execution</Label>
                <Switch
                  id="allowAnonymousExecution"
                  checked={formData.securitySettings.allowAnonymousExecution}
                  onCheckedChange={(checked) => handleInputChange("securitySettings.allowAnonymousExecution", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auditLogging">Enable Audit Logging</Label>
                <Switch
                  id="auditLogging"
                  checked={formData.securitySettings.auditLogging}
                  onCheckedChange={(checked) => handleInputChange("securitySettings.auditLogging", checked)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataRetention">Data Retention (days)</Label>
              <Input
                id="dataRetention"
                type="number"
                value={formData.securitySettings.dataRetention}
                onChange={(e) => handleInputChange("securitySettings.dataRetention", parseInt(e.target.value))}
                min="1"
                max="3650"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableCaching">Enable Caching</Label>
                <Switch
                  id="enableCaching"
                  checked={formData.performanceSettings.enableCaching}
                  onCheckedChange={(checked) => handleInputChange("performanceSettings.enableCaching", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableCompression">Enable Compression</Label>
                <Switch
                  id="enableCompression"
                  checked={formData.performanceSettings.enableCompression}
                  onCheckedChange={(checked) => handleInputChange("performanceSettings.enableCompression", checked)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cacheTTL">Cache TTL (seconds)</Label>
                <Input
                  id="cacheTTL"
                  type="number"
                  value={formData.performanceSettings.cacheTTL}
                  onChange={(e) => handleInputChange("performanceSettings.cacheTTL", parseInt(e.target.value))}
                  min="60"
                  max="86400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxMemoryUsage">Max Memory (MB)</Label>
                <Input
                  id="maxMemoryUsage"
                  type="number"
                  value={formData.performanceSettings.maxMemoryUsage}
                  onChange={(e) => handleInputChange("performanceSettings.maxMemoryUsage", parseInt(e.target.value))}
                  min="64"
                  max="4096"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            Save Workflow Settings
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

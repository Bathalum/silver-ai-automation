"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Filter, Grid, List } from "lucide-react";
import { WorkflowCard } from "./workflow-card";
import { WorkflowActions } from "./workflow-actions";

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "archived" | "error";
  lastModified: Date;
  nodeCount: number;
  executionCount: number;
  tags: string[];
  version: string;
  author: string;
}

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onWorkflowCreate: () => void;
  onWorkflowDelete: (workflowId: string) => void;
  onWorkflowDuplicate: (workflowId: string) => void;
  onWorkflowArchive: (workflowId: string) => void;
}

export function WorkflowList({
  workflows,
  onWorkflowSelect,
  onWorkflowCreate,
  onWorkflowDelete,
  onWorkflowDuplicate,
  onWorkflowArchive,
}: WorkflowListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("lastModified");

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "lastModified":
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      case "nodeCount":
        return b.nodeCount - a.nodeCount;
      case "executionCount":
        return b.executionCount - a.executionCount;
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "archived": return "bg-gray-100 text-gray-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Manage and organize your function model workflows
          </p>
        </div>
        <Button onClick={onWorkflowCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastModified">Last Modified</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="nodeCount">Node Count</SelectItem>
              <SelectItem value="executionCount">Execution Count</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredWorkflows.length} of {workflows.length} workflows
        </span>
        {searchTerm && (
          <span>
            Filtered by: "{searchTerm}"
          </span>
        )}
      </div>

      {/* Workflows Grid/List */}
      {sortedWorkflows.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" ? (
                <>
                  <p className="text-lg font-medium mb-2">No workflows found</p>
                  <p>Try adjusting your search or filter criteria</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No workflows yet</p>
                  <p>Create your first workflow to get started</p>
                  <Button onClick={onWorkflowCreate} className="mt-4">
                    Create Workflow
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {sortedWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              viewMode={viewMode}
              onSelect={() => onWorkflowSelect(workflow)}
              onDelete={() => onWorkflowDelete(workflow.id)}
              onDuplicate={() => onWorkflowDuplicate(workflow.id)}
              onArchive={() => onWorkflowArchive(workflow.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

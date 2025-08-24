"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, GitBranch, Activity, Play, Edit, MoreHorizontal, Copy, Archive, Trash2 } from "lucide-react";
import { Workflow } from "./workflow-list";
import { WorkflowActions } from "./workflow-actions";

interface WorkflowCardProps {
  workflow: Workflow;
  viewMode: "grid" | "list";
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

export function WorkflowCard({
  workflow,
  viewMode,
  onSelect,
  onDelete,
  onDuplicate,
  onArchive,
}: WorkflowCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "draft": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived": return "bg-gray-100 text-gray-800 border-gray-200";
      case "error": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold truncate">{workflow.name}</h3>
                <Badge className={getStatusColor(workflow.status)}>
                  {workflow.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  v{workflow.version}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                {workflow.description}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(workflow.lastModified)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  <span>{workflow.nodeCount} nodes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  <span>{workflow.executionCount} executions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{workflow.author}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <WorkflowActions
                workflow={workflow}
                onSelect={onSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                variant="horizontal"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate mb-2">{workflow.name}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(workflow.status)}>
                {workflow.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                v{workflow.version}
              </Badge>
            </div>
          </div>
          <WorkflowActions
            workflow={workflow}
            onSelect={onSelect}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            variant="vertical"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm mb-4 line-clamp-2">
          {workflow.description}
        </CardDescription>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Modified</span>
            <span className="font-medium">{formatDate(workflow.lastModified)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Nodes</span>
            <span className="font-medium">{workflow.nodeCount}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Executions</span>
            <span className="font-medium">{workflow.executionCount}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Author</span>
            <span className="font-medium truncate">{workflow.author}</span>
          </div>
        </div>

        {workflow.tags.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-1">
              {workflow.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{workflow.tags.length - 3}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

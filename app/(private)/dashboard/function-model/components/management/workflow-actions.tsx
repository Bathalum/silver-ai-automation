"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Archive, Copy, Edit, MoreHorizontal, Play, Settings, Trash2 } from "lucide-react";
import { Workflow } from "./workflow-list";

interface WorkflowActionsProps {
  workflow: Workflow;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  variant: "horizontal" | "vertical";
}

export function WorkflowActions({
  workflow,
  onSelect,
  onDelete,
  onDuplicate,
  onArchive,
  variant,
}: WorkflowActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  const handleArchive = () => {
    setShowArchiveDialog(false);
    onArchive();
  };

  const handleDuplicate = () => {
    onDuplicate();
  };

  const handleEdit = () => {
    onSelect();
  };

  const handleExecute = () => {
    // TODO: Implement workflow execution
    console.log("Execute workflow:", workflow.id);
  };

  const handleSettings = () => {
    // TODO: Implement workflow settings
    console.log("Open workflow settings:", workflow.id);
  };

  if (variant === "horizontal") {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleEdit(); }}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleExecute(); }}
          className="flex items-center gap-2"
          disabled={workflow.status === "archived" || workflow.status === "error"}
        >
          <Play className="h-4 w-4" />
          Execute
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
              <Archive className="h-4 w-4 mr-2" />
              {workflow.status === "archived" ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Vertical variant (for grid view)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExecute} disabled={workflow.status === "archived" || workflow.status === "error"}>
          <Play className="h-4 w-4 mr-2" />
          Execute
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettings}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
          <Archive className="h-4 w-4 mr-2" />
          {workflow.status === "archived" ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Delete Confirmation Dialog
  return (
    <>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Workflow
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{workflow.name}"? This action cannot be undone and will permanently remove the workflow and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {workflow.status === "archived" ? "Unarchive" : "Archive"} Workflow
            </DialogTitle>
            <DialogDescription>
              {workflow.status === "archived" 
                ? `Are you sure you want to unarchive "${workflow.name}"? This will make it active again.`
                : `Are you sure you want to archive "${workflow.name}"? Archived workflows cannot be executed but can be restored later.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleArchive}>
              {workflow.status === "archived" ? "Unarchive" : "Archive"} Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

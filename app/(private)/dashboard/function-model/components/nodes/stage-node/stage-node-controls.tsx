'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash2, Copy, Settings } from 'lucide-react';

interface StageNodeControlsProps {
  onEdit: () => void;
  onAddAction: () => void;
  onManageActions: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  disabled?: boolean;
}

export function StageNodeControls({
  onEdit,
  onAddAction,
  onManageActions,
  onDelete,
  onDuplicate,
  disabled = false
}: StageNodeControlsProps) {
  return (
    <div className="flex items-center gap-1 p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        disabled={disabled}
        className="h-6 w-6 p-0 hover:bg-blue-100"
        title="Edit Stage"
      >
        <Edit className="h-3 w-3 text-blue-600" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddAction}
        disabled={disabled}
        className="h-6 w-6 p-0 hover:bg-green-100"
        title="Add Action"
      >
        <Plus className="h-3 w-3 text-green-600" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onManageActions}
        disabled={disabled}
        className="h-6 w-6 p-0 hover:bg-purple-100"
        title="Manage Actions"
      >
        <Settings className="h-3 w-3 text-purple-600" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDuplicate}
        disabled={disabled}
        className="h-6 w-6 p-0 hover:bg-orange-100"
        title="Duplicate Stage"
      >
        <Copy className="h-3 w-3 text-orange-600" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={disabled}
        className="h-6 w-6 p-0 hover:bg-red-100"
        title="Delete Stage"
      >
        <Trash2 className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Plus, 
  Trash2, 
  Copy, 
  Settings,
  Eye,
  Download
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IONodeControlsProps {
  onEdit?: () => void;
  onAddAction?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onConfigure?: () => void;
  onView?: () => void;
  onExport?: () => void;
  disabled?: boolean;
  showAdvanced?: boolean;
}

export const IONodeControls: React.FC<IONodeControlsProps> = ({
  onEdit,
  onAddAction,
  onDelete,
  onDuplicate,
  onConfigure,
  onView,
  onExport,
  disabled = false,
  showAdvanced = false
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-t">
        {/* Primary Controls */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-700"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Node</TooltipContent>
            </Tooltip>
          )}

          {onAddAction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddAction}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Action</TooltipContent>
            </Tooltip>
          )}

          {onConfigure && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConfigure}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-purple-100 hover:text-purple-700"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configure</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* Secondary Controls */}
        <div className="flex items-center gap-1">
          {onView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
          )}

          {onExport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-orange-100 hover:text-orange-700"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Data</TooltipContent>
            </Tooltip>
          )}

          {onDuplicate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicate}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate Node</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* Destructive Controls */}
        <div className="flex items-center gap-1">
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={disabled}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Node</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

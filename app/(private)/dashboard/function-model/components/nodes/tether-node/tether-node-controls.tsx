import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Play, 
  Square, 
  FileText, 
  Trash2, 
  Copy, 
  RotateCcw,
  Eye,
  MoreHorizontal,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TetherNodeControlsProps {
  onConfigure?: () => void;
  onExecute?: () => void;
  onStop?: () => void;
  onViewLogs?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onViewDetails?: () => void;
  onRetry?: () => void;
  executionStatus?: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  retryCount?: number;
  maxRetries?: number;
  estimatedDuration?: string;
  canExecute?: boolean;
  canStop?: boolean;
  canConfigure?: boolean;
  canDelete?: boolean;
  isExecuting?: boolean;
}

export const TetherNodeControls: React.FC<TetherNodeControlsProps> = ({
  onConfigure,
  onExecute,
  onStop,
  onViewLogs,
  onDelete,
  onDuplicate,
  onViewDetails,
  onRetry,
  executionStatus = 'pending',
  retryCount = 0,
  maxRetries = 3,
  estimatedDuration = '5-10 min',
  canExecute = true,
  canStop = true,
  canConfigure = true,
  canDelete = true,
  isExecuting = false
}) => {
  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'retrying': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'running': return <Play className="h-3 w-3" />;
      case 'completed': return <Clock className="h-3 w-3" />;
      case 'failed': return <AlertTriangle className="h-3 w-3" />;
      case 'retrying': return <RotateCcw className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const canRetry = executionStatus === 'failed' && retryCount < maxRetries;

  return (
    <div className="p-3 space-y-3 bg-gray-50 border-t">
      {/* Execution Status and Retry Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${getExecutionStatusColor(executionStatus)}`}
          >
            {getExecutionStatusIcon(executionStatus)}
            <span className="ml-1 capitalize">{executionStatus}</span>
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {retryCount}/{maxRetries} Retries
          </Badge>
        </div>
      </div>

      {/* Estimated Duration */}
      {estimatedDuration && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="h-3 w-3" />
          <span>Est. Duration: {estimatedDuration}</span>
        </div>
      )}

      <Separator />

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {canConfigure && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            className="h-8 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Configure
          </Button>
        )}
        
        {canExecute && (
          <Button
            variant={isExecuting ? "secondary" : "default"}
            size="sm"
            onClick={onExecute}
            disabled={isExecuting}
            className="h-8 text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            {isExecuting ? 'Running' : 'Execute'}
          </Button>
        )}
      </div>

      {/* Secondary Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {canStop && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            disabled={!isExecuting}
            className="h-8 text-xs"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onViewLogs}
          className="h-8 text-xs"
        >
          <FileText className="h-3 w-3 mr-1" />
          View Logs
        </Button>
      </div>

      {/* Retry Button */}
      {canRetry && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 text-xs w-full"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry ({maxRetries - retryCount} remaining)
          </Button>
        </>
      )}

      <Separator />

      {/* Utility Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="h-7 w-7 p-0"
            title="View Details"
          >
            <Eye className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            className="h-7 w-7 p-0"
            title="Duplicate Tether"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete Tether"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="More Options"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onViewLogs}>
              <FileText className="h-4 w-4 mr-2" />
              View Logs
            </DropdownMenuItem>
            
            {canConfigure && (
              <DropdownMenuItem onClick={onConfigure}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Tether
            </DropdownMenuItem>
            
            {canRetry && (
              <DropdownMenuItem onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Execution
              </DropdownMenuItem>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tether
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

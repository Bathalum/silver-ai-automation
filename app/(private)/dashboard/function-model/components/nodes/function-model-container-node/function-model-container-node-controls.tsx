import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Stop, 
  Expand, 
  Minimize, 
  Settings, 
  Plus,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';

interface FunctionModelContainerNodeControlsProps {
  isExecuting: boolean;
  isExpanded: boolean;
  canAddModel: boolean;
  canDelete: boolean;
  canCopy: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleExpand: () => void;
  onSettings: () => void;
  onAddModel: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onRefresh: () => void;
}

export const FunctionModelContainerNodeControls: React.FC<FunctionModelContainerNodeControlsProps> = ({
  isExecuting,
  isExpanded,
  canAddModel,
  canDelete,
  canCopy,
  onPlay,
  onPause,
  onStop,
  onToggleExpand,
  onSettings,
  onAddModel,
  onDelete,
  onCopy,
  onRefresh,
}) => {
  return (
    <Card className="p-3 space-y-3">
      {/* Execution Controls */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPlay}
          disabled={isExecuting}
          className="h-8 px-3"
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onPause}
          disabled={!isExecuting}
          className="h-8 px-3"
        >
          <Pause className="w-4 h-4 mr-1" />
          Pause
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          disabled={!isExecuting}
          className="h-8 px-3"
        >
          <Stop className="w-4 h-4 mr-1" />
          Stop
        </Button>
      </div>

      {/* Container Management Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleExpand}
            className="h-8 px-3"
          >
            {isExpanded ? (
              <>
                <Minimize className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <Expand className="w-4 h-4 mr-1" />
                Expand
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onAddModel}
            disabled={!canAddModel}
            className="h-8 px-3"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Model
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onSettings}
          className="h-8 px-3"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Utility Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            disabled={!canCopy}
            className="h-8 px-3"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="h-8 px-3"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={!canDelete}
          className="h-8 px-3"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isExecuting ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-xs text-gray-500">
            {isExecuting ? 'Executing' : 'Ready'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Badge 
            variant={isExpanded ? "default" : "secondary"}
            className="text-xs"
          >
            {isExpanded ? 'Expanded' : 'Collapsed'}
          </Badge>
          {isExecuting && (
            <Badge variant="default" className="text-xs">
              Active
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

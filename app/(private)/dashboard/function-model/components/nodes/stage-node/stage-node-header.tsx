import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

interface StageNodeHeaderProps {
  name: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'sequential' | 'parallel' | 'conditional';
  executionMode?: string;
}

export const StageNodeHeader: React.FC<StageNodeHeaderProps> = ({
  name,
  status = 'idle',
  priority = 'medium',
  type = 'sequential',
  executionMode
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sequential':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'parallel':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'conditional':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
      {/* Left Section - Type and Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Badge 
          variant="outline" 
          className={`text-xs font-medium ${getTypeColor(type)}`}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {name}
          </h3>
          {executionMode && (
            <p className="text-xs text-gray-500 truncate">
              {executionMode}
            </p>
          )}
        </div>
      </div>

      {/* Right Section - Status and Priority */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={`text-xs font-medium ${getStatusColor(status)}`}
        >
          <div className="flex items-center gap-1">
            {getStatusIcon(status)}
            <span className="capitalize">{status}</span>
          </div>
        </Badge>

        {/* Priority Badge */}
        <Badge 
          variant="outline" 
          className={`text-xs font-medium ${getPriorityColor(priority)}`}
        >
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
      </div>
    </div>
  );
};

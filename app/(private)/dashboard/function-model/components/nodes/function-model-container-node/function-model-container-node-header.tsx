import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BoxIcon } from 'lucide-react';

interface FunctionModelContainerNodeHeaderProps {
  title: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  isSelected: boolean;
  modelCount: number;
  isExpanded: boolean;
}

export const FunctionModelContainerNodeHeader: React.FC<FunctionModelContainerNodeHeaderProps> = ({
  title,
  status,
  isSelected,
  modelCount,
  isExpanded,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  return (
    <Card className={`p-3 border-2 transition-all duration-200 ${
      isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BoxIcon className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-sm text-gray-900 truncate max-w-32">
              {title}
            </h3>
            <p className="text-xs text-gray-500">Function Model Container</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-1 h-5"
          >
            {getStatusText(status)}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-1 h-5"
          >
            {modelCount} Models
          </Badge>
          <Badge 
            variant={isExpanded ? "default" : "secondary"}
            className="text-xs px-2 py-1 h-5"
          >
            {isExpanded ? 'Expanded' : 'Collapsed'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

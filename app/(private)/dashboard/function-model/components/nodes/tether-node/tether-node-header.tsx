'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TetherIcon } from 'lucide-react';

interface TetherNodeHeaderProps {
  title: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  isSelected: boolean;
}

export const TetherNodeHeader: React.FC<TetherNodeHeaderProps> = ({
  title,
  status,
  isSelected,
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
          <TetherIcon className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-sm text-gray-900 truncate max-w-32">
              {title}
            </h3>
            <p className="text-xs text-gray-500">Tether Node</p>
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
        </div>
      </div>
    </Card>
  );
};

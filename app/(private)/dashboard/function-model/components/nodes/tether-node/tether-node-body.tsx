'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Target, Zap } from 'lucide-react';

interface TetherNodeBodyProps {
  description: string;
  targetNode: string;
  executionTime: number;
  progress: number;
  isExecuting: boolean;
}

export const TetherNodeBody: React.FC<TetherNodeBodyProps> = ({
  description,
  targetNode,
  executionTime,
  progress,
  isExecuting,
}) => {
  return (
    <Card className="p-4 space-y-4">
      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Description</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          {description || 'No description provided'}
        </p>
      </div>

      {/* Target Node */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-medium text-gray-700">Target Node</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {targetNode || 'No target specified'}
        </Badge>
      </div>

      {/* Execution Progress */}
      {isExecuting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Execution Progress</h4>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Execution Time */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-medium text-gray-700">Execution Time</h4>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-600">
            {executionTime > 0 ? `${executionTime}ms` : 'Not executed yet'}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isExecuting ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="text-xs text-gray-500">
            {isExecuting ? 'Executing...' : 'Ready'}
          </span>
        </div>
        
        <Badge 
          variant={isExecuting ? "default" : "secondary"}
          className="text-xs"
        >
          {isExecuting ? 'Active' : 'Standby'}
        </Badge>
      </div>
    </Card>
  );
};

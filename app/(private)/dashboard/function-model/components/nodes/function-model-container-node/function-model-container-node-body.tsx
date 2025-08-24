import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Box, 
  Layers, 
  Settings, 
  Clock, 
  User, 
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface FunctionModel {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  type: string;
  lastExecuted: string;
}

interface FunctionModelContainerNodeBodyProps {
  description: string;
  models: FunctionModel[];
  containerType: string;
  lastUpdated: string;
  owner: string;
  isExpanded: boolean;
  executionProgress: number;
  isExecuting: boolean;
}

export const FunctionModelContainerNodeBody: React.FC<FunctionModelContainerNodeBodyProps> = ({
  description,
  models,
  containerType,
  lastUpdated,
  owner,
  isExpanded,
  executionProgress,
  isExecuting,
}) => {
  const getModelStatusColor = (status: string) => {
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

  const getModelStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-3 h-3 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Description</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          {description || 'No description provided'}
        </p>
      </div>

      {/* Container Type */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-emerald-600" />
          <h4 className="text-sm font-medium text-gray-700">Container Type</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {containerType || 'Standard'}
        </Badge>
      </div>

      {/* Execution Progress */}
      {isExecuting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Execution Progress</h4>
            <span className="text-xs text-gray-500">{executionProgress}%</span>
          </div>
          <Progress value={executionProgress} className="h-2" />
        </div>
      )}

      {/* Models List */}
      {isExpanded && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-medium text-gray-700">Models ({models.length})</h4>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {models.map((model) => (
              <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  {getModelStatusIcon(model.status)}
                  <span className="text-xs font-medium text-gray-700">{model.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {model.type}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${getModelStatusColor(model.status)}`} />
                  <span className="text-xs text-gray-500">
                    {model.lastExecuted || 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-medium text-gray-700">Last Updated</h4>
          </div>
          <p className="text-xs text-gray-600">
            {lastUpdated || 'Never'}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-700">Owner</h4>
          </div>
          <p className="text-xs text-gray-600">
            {owner || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isExecuting ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-xs text-gray-500">
            {isExecuting ? 'Executing...' : 'Ready'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={isExpanded ? "default" : "secondary"}
            className="text-xs"
          >
            {isExpanded ? 'Expanded' : 'Collapsed'}
          </Badge>
          <Badge 
            variant={isExecuting ? "default" : "secondary"}
            className="text-xs"
          >
            {isExecuting ? 'Active' : 'Standby'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

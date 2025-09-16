/**
 * FunctionModelContainerNode - Action node for nested function model execution
 * Following React Flow patterns with Clean Architecture domain integration
 */

'use client';

import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';
import { Box, Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';

interface FunctionModelContainerData {
  label: string;
  containerData?: {
    nestedModelId?: string;
    nestedModelName?: string;
    executionMode?: 'synchronous' | 'asynchronous' | 'parallel';
    executionStatus?: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
    version?: string;
  };
}

interface FunctionModelContainerNodeProps {
  id: string;
  data: FunctionModelContainerData;
  selected?: boolean;
}

function FunctionModelContainerNode({ id, data, selected }: FunctionModelContainerNodeProps) {
  const { label, containerData } = data;
  const executionMode = containerData?.executionMode || 'synchronous';
  const executionStatus = containerData?.executionStatus || 'idle';
  const nestedModelName = containerData?.nestedModelName || 'Nested Model';

  // Status styling
  const getStatusColor = () => {
    switch (executionStatus) {
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'running': return <Play className="w-3 h-3" />;
      case 'completed': return <div className="w-3 h-3 rounded-full bg-current" />;
      case 'failed': return <AlertCircle className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      default: return <RotateCcw className="w-3 h-3" />;
    }
  };

  const getModeColor = () => {
    switch (executionMode) {
      case 'synchronous': return 'text-orange-600';
      case 'asynchronous': return 'text-blue-600';
      case 'parallel': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (executionStatus) {
      case 'running': return 'Executing';
      case 'completed': return 'Complete';
      case 'failed': return 'Failed';
      case 'paused': return 'Paused';
      default: return 'Ready';
    }
  };

  return (
    <div 
      className={`
        min-w-[200px] bg-white border-2 rounded-lg shadow-sm
        ${selected ? 'border-blue-500 shadow-lg' : 'border-orange-300'}
        ${selected ? 'ring-2 ring-blue-200' : ''}
      `}
    >
      {/* Top Input Handle - for connections from Stage nodes */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ background: '#f97316', width: '12px', height: '12px' }}
      />

      {/* Left Input Handle */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ background: '#f97316', width: '12px', height: '12px' }}
      />

      {/* Header */}
      <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-3 h-3" />
            <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
              Function Model
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-orange-600">
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 mb-2">
          {label}
        </div>
        
        {/* Nested Model Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Model:</span>
            <span className="text-xs font-medium text-orange-600 truncate max-w-[120px]">
              {nestedModelName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Mode:</span>
            <span className={`text-xs font-medium capitalize ${getModeColor()}`}>
              {executionMode}
            </span>
          </div>
          {containerData?.version && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Version:</span>
              <span className="text-xs text-gray-700">
                {containerData.version}
              </span>
            </div>
          )}
          
          {/* Execution Status Details */}
          {executionStatus === 'running' && (
            <div className="mt-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-600">
              Executing nested workflow...
            </div>
          )}
          {executionStatus === 'failed' && (
            <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-600">
              Execution failed
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ background: '#f97316', width: '12px', height: '12px' }}
      />
    </div>
  );
}

export default memo(FunctionModelContainerNode);
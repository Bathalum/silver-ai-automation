/**
 * TetherNode - Action node for connecting to external systems
 * Following React Flow patterns with Clean Architecture domain integration
 */

'use client';

import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';
import { Link, Zap } from 'lucide-react';

interface TetherNodeData {
  label: string;
  tetherData?: {
    endpoint?: string;
    method?: string;
    connectionType?: 'api' | 'webhook' | 'socket' | 'database';
    status?: 'connected' | 'disconnected' | 'error';
  };
}

interface TetherNodeProps {
  id: string;
  data: TetherNodeData;
  selected?: boolean;
}

function TetherNode({ id, data, selected }: TetherNodeProps) {
  const { label, tetherData } = data;
  const connectionType = tetherData?.connectionType || 'api';
  const status = tetherData?.status || 'disconnected';

  // Status styling
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'webhook': return <Zap className="w-3 h-3" />;
      case 'socket': return <Link className="w-3 h-3" />;
      case 'database': return <div className="w-3 h-3 rounded border border-current" />;
      default: return <Link className="w-3 h-3" />;
    }
  };

  return (
    <div 
      className={`
        min-w-[180px] bg-white border-2 rounded-lg shadow-sm
        ${selected ? 'border-blue-500 shadow-lg' : 'border-purple-300'}
        ${selected ? 'ring-2 ring-blue-200' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 !border-purple-600"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">
              Tether
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 mb-2">
          {label}
        </div>
        
        {/* Connection Details */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Type:</span>
            <span className="text-xs font-medium text-purple-600 capitalize">
              {connectionType}
            </span>
          </div>
          {tetherData?.endpoint && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Endpoint:</span>
              <span className="text-xs text-gray-700 truncate max-w-[100px]">
                {tetherData.endpoint}
              </span>
            </div>
          )}
          {tetherData?.method && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Method:</span>
              <span className="text-xs font-medium text-purple-600 uppercase">
                {tetherData.method}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 !border-purple-600"
      />
    </div>
  );
}

export default memo(TetherNode);
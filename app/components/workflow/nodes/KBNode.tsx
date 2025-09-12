/**
 * KBNode - Knowledge Base action node for AI-powered data retrieval and processing
 * Following React Flow patterns with Clean Architecture domain integration
 */

'use client';

import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';
import { Brain, Database, Search, FileText } from 'lucide-react';

interface KBNodeData {
  label: string;
  kbData?: {
    kbType?: 'vector' | 'semantic' | 'document' | 'graph';
    queryType?: 'similarity' | 'keyword' | 'hybrid' | 'contextual';
    dataSource?: string;
    embeddingModel?: string;
    status?: 'ready' | 'indexing' | 'error' | 'empty';
  };
}

interface KBNodeProps {
  id: string;
  data: KBNodeData;
  selected?: boolean;
}

function KBNode({ id, data, selected }: KBNodeProps) {
  const { label, kbData } = data;
  const kbType = kbData?.kbType || 'vector';
  const queryType = kbData?.queryType || 'similarity';
  const status = kbData?.status || 'ready';

  // Status styling
  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'indexing': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      case 'empty': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  const getKBIcon = () => {
    switch (kbType) {
      case 'vector': return <Brain className="w-3 h-3" />;
      case 'semantic': return <Search className="w-3 h-3" />;
      case 'document': return <FileText className="w-3 h-3" />;
      case 'graph': return <Database className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'indexing': return 'Indexing...';
      case 'error': return 'Error';
      case 'empty': return 'No Data';
      default: return 'Ready';
    }
  };

  return (
    <div 
      className={`
        min-w-[180px] bg-white border-2 rounded-lg shadow-sm
        ${selected ? 'border-blue-500 shadow-lg' : 'border-indigo-300'}
        ${selected ? 'ring-2 ring-blue-200' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-500 !border-indigo-600"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getKBIcon()}
            <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">
              Knowledge Base
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-indigo-600">
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
        
        {/* KB Configuration */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Type:</span>
            <span className="text-xs font-medium text-indigo-600 capitalize">
              {kbType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Query:</span>
            <span className="text-xs text-gray-700 capitalize">
              {queryType}
            </span>
          </div>
          {kbData?.dataSource && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Source:</span>
              <span className="text-xs text-gray-700 truncate max-w-[100px]">
                {kbData.dataSource}
              </span>
            </div>
          )}
          {kbData?.embeddingModel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Model:</span>
              <span className="text-xs text-indigo-600 truncate max-w-[100px]">
                {kbData.embeddingModel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-500 !border-indigo-600"
      />
    </div>
  );
}

export default memo(KBNode);
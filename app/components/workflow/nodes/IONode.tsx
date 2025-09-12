/**
 * Simple IO Node Component - Following React Flow Patterns
 * No over-engineering, just a simple React component with handles
 */

import { Handle, Position } from '@xyflow/react';

export default function IONode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-200 min-w-[120px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-blue-500" 
      />
      
      <div className="text-sm font-medium text-center">{data.label}</div>
      <div className="text-xs text-gray-500 text-center">IO Node</div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-blue-500" 
      />
    </div>
  );
}
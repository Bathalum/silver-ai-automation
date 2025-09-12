/**
 * Simple Stage Node Component - Following React Flow Patterns
 * No over-engineering, just a simple React component with handles
 */

import { Handle, Position } from '@xyflow/react';

export default function StageNode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-200 min-w-[120px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-green-500" 
      />
      
      <div className="text-sm font-medium text-center">{data.label}</div>
      <div className="text-xs text-gray-500 text-center">Stage Node</div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-green-500" 
      />
    </div>
  );
}
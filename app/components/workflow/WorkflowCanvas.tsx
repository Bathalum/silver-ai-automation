/**
 * Simple Workflow Canvas - Following React Flow Patterns
 * No over-engineering, just React Flow with basic setup
 */

'use client';

import { ReactFlow, Background, Controls, MiniMap, addEdge } from '@xyflow/react';
import { useCallback } from 'react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodeTypes';

interface WorkflowCanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect?: (params: any) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: any) => void;
  onNodeClick?: (event: React.MouseEvent, node: any) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
}

export default function WorkflowCanvas({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange,
  onConnect,
  onNodeContextMenu,
  onNodeClick,
  onPaneContextMenu,
  onPaneClick
}: WorkflowCanvasProps) {
  
  const handleConnect = useCallback(
    (params: any) => {
      if (onConnect) {
        onConnect(params);
      } else {
        // Default behavior - just add the edge
        onEdgesChange([addEdge(params, edges)]);
      }
    },
    [edges, onEdgesChange, onConnect]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeContextMenu={onNodeContextMenu}
        onNodeClick={onNodeClick}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
        style={{ zIndex: 1 }}
      >
        <Background 
          color="#e2e8f0" 
          gap={16}
          size={1}
          variant="dots"
        />
        <Controls 
          position="bottom-right"
          showFitView={true}
          showZoom={true}
          showInteractive={true}
          style={{ 
            bottom: '8px',
            right: '8px',
            zIndex: 10 
          }}
        />
        <MiniMap 
          nodeColor="#4f46e5"
          nodeStrokeWidth={3}
          nodeStrokeColor="#1e1b4b"
          maskColor="rgb(240, 240, 240, 0.8)"
          position="top-right"
          style={{
            top: '8px',
            right: '8px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            zIndex: 10
          }}
        />
      </ReactFlow>
    </div>
  );
}
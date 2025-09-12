/**
 * Function Model Page - Simple React Flow Implementation
 * Following React Flow patterns with mock data and adapter mounting points prepared
 */

'use client';

import { useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useState, useRef } from 'react';
import WorkflowCanvas from '@/app/components/workflow/WorkflowCanvas';
import FloatingToolbar from '@/app/components/workflow/FloatingToolbar';
import NodeContextMenu from '@/app/components/workflow/NodeContextMenu';
import CanvasContextMenu from '@/app/components/workflow/CanvasContextMenu';
import PropertiesPanel from '@/app/components/workflow/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getModelNodesAction, addNodeAction } from '@/app/actions/node-actions';
import { getModelAction, updateModelAction } from '@/app/actions/model-actions';
import Link from 'next/link';
import { ArrowLeft, Edit3 } from 'lucide-react';

interface FunctionModelPageProps {
  params: {
    modelId: string;
  };
}

// Initial empty state - 🔌 ADAPTER MOUNTING POINT (now loads real data)
const initialNodes: any[] = [];

const initialEdges: any[] = [];

// Inner component that has access to useReactFlow
function FunctionModelInner({ params }: FunctionModelPageProps) {
  const { modelId } = params;
  const { screenToFlowPosition } = useReactFlow();
  
  // React Flow state management - following their patterns
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [modelName, setModelName] = useState<string>('');
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  
  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Context menu and properties panel state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeType: string;
  } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [propertiesPanel, setPropertiesPanel] = useState<{
    isOpen: boolean;
    node: any;
  }>({ isOpen: false, node: null });

  // Load model details and nodes
  useEffect(() => {
    const loadModelData = async () => {
      try {
        // Load model details for the header
        const modelResult = await getModelAction(modelId);
        if (modelResult.success && modelResult.data) {
          setModelName(modelResult.data.name);
        }

        // Load model nodes for the canvas
        const nodesResult = await getModelNodesAction(modelId);
        if (nodesResult.success && nodesResult.data) {
          setNodes(nodesResult.data);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
      } finally {
        setIsLoadingModel(false);
      }
    };
    
    loadModelData();
  }, [modelId, setNodes]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle entering edit mode
  const handleEditClick = () => {
    setEditingName(modelName);
    setIsEditing(true);
  };

  // Handle saving the name
  const handleSaveName = async () => {
    if (editingName.trim() === modelName || !editingName.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    
    try {
      // Create FormData for Server Action
      const formData = new FormData();
      formData.append('name', editingName.trim());
      
      // Call existing update Server Action
      const result = await updateModelAction(modelId, formData);
      if (result.success) {
        setModelName(editingName.trim());
        setIsEditing(false);
      } else {
        console.error('Failed to update model name:', result.error);
        // Optionally show user error message
      }
    } catch (error) {
      console.error('Error updating model name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingName(modelName);
    setIsEditing(false);
  };

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle adding new nodes (from toolbar or context menu)
  const handleNodeAdd = useCallback(async (nodeType: string, customPosition?: { x: number; y: number }) => {
    let position;
    
    if (customPosition) {
      // Right-click context menu provides canvas coordinates
      position = customPosition;
      console.log('Node creation - Using custom position:', position);
    } else {
      // Floating toolbar: place at canvas center
      const offset = nodes.length * 50; // Offset to avoid overlap
      position = { 
        x: 100 + offset, // Start away from center to be visible
        y: 100 + offset 
      };
      console.log('Node creation - Using default position:', position);
    }
    
    // Validate coordinates before proceeding
    if (typeof position.x !== 'number' || typeof position.y !== 'number' || 
        isNaN(position.x) || isNaN(position.y)) {
      console.error('Invalid position coordinates:', position);
      return;
    }
    
    // Generate a descriptive name based on node type
    const typeMap: Record<string, string> = {
      ioNode: 'IO',
      stageNode: 'Stage',
      tetherNode: 'Tether',
      kbNode: 'KB',
      functionModelContainer: 'Container'
    };
    
    const name = `${typeMap[nodeType] || 'Node'} ${nodes.length + 1}`;
    
    // Create FormData for Server Action
    const formData = new FormData();
    formData.append('name', name);
    formData.append('nodeType', nodeType);
    formData.append('x', position.x.toString());
    formData.append('y', position.y.toString());
    
    try {
      console.log('Calling addNodeAction with:', { modelId, formData: Object.fromEntries(formData.entries()) });
      const result = await addNodeAction(modelId, formData);
      console.log('Received result from addNodeAction:', result);
      
      // Check if result is undefined or null
      if (!result) {
        console.error('Server action returned undefined/null result');
        window.location.reload();
        return;
      }
      
      // Check if result has expected structure
      if (typeof result !== 'object' || typeof result.success !== 'boolean') {
        console.error('Server action returned unexpected result structure:', result);
        window.location.reload();
        return;
      }
      
      if (result.success && result.nodeId) {
        console.log('Server action succeeded, refreshing data from server:', result.nodeId);
        
        // Instead of optimistic update, reload the data from server
        // This avoids the React Flow internal conflict entirely
        try {
          const nodesResult = await getModelNodesAction(modelId);
          if (nodesResult.success && nodesResult.data) {
            console.log('Successfully loaded updated nodes from server');
            setNodes(nodesResult.data);
          } else {
            console.error('Failed to reload nodes from server');
            window.location.reload();
          }
        } catch (reloadError) {
          console.error('Error reloading nodes from server:', reloadError);
          window.location.reload();
        }
        
      } else {
        console.error('Server action failed:', result.error || 'No nodeId returned');
        // Don't reload on validation errors, just log them
        if (!result.validationErrors) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error in handleNodeAdd:', error);
      // Fallback: refresh the page to show any nodes that might have been created
      window.location.reload();
    }
  }, [modelId, nodes.length, setNodes]);

  // Handle node context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setCanvasContextMenu(null); // Close canvas context menu
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeType: node.type
    });
  }, []);

  // Handle canvas context menu (right-click on empty space)
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(null); // Close node context menu
    
    // Convert screen coordinates to React Flow coordinates
    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    console.log('Canvas context menu - Proper React Flow conversion:', {
      screen: { x: event.clientX, y: event.clientY },
      flow: flowPosition
    });
    
    setCanvasContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasX: flowPosition.x,
      canvasY: flowPosition.y
    });
  }, [screenToFlowPosition]);

  // Handle canvas click (close context menus)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Close both context menus on canvas click
    setContextMenu(null);
    setCanvasContextMenu(null);
  }, []);

  // Handle node properties
  const handleNodeProperties = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setPropertiesPanel({ isOpen: true, node });
    }
  }, [nodes]);

  // Handle node update
  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    );
  }, [setNodes]);

  // Handle node delete
  const handleNodeDelete = useCallback((nodeId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this node?');
    if (confirmDelete) {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      // TODO: Add server action call to delete from database
    }
  }, [setNodes]);

  // Handle node click (for selection)
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Close context menus if open
    setContextMenu(null);
    setCanvasContextMenu(null);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full relative">
      {/* Floating Header - Top Left */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/function-model">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        
        {/* Editable Model Name */}
        {isLoadingModel ? (
          <div className="px-3 py-1 bg-gray-100 rounded-md animate-pulse">
            <span className="text-lg font-semibold text-gray-400">Loading...</span>
          </div>
        ) : isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              className="text-lg font-semibold border-2 border-blue-300 focus:border-blue-500"
              disabled={isSaving}
              placeholder="Enter model name"
            />
            {isSaving && (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            )}
          </div>
        ) : (
          <div 
            className="group flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors hover:bg-white/50"
            onClick={handleEditClick}
          >
            <h1 className="text-lg font-semibold text-gray-900">
              {modelName || 'Untitled Model'}
            </h1>
            <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Full Viewport Canvas with Toolbar */}
      <div className="absolute inset-0 w-full h-full">
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeClick={handleNodeClick}
          onPaneContextMenu={handleCanvasContextMenu}
          onPaneClick={handleCanvasClick}
        />
        
        {/* Floating Toolbar - Positioned within Canvas */}
        <FloatingToolbar 
          onNodeAdd={handleNodeAdd}
          disabled={isLoadingModel}
        />
      </div>

      {/* Node Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          onClose={() => setContextMenu(null)}
          onProperties={handleNodeProperties}
          onDelete={handleNodeDelete}
          onEdit={handleNodeProperties} // Same as properties for now
          onView={handleNodeProperties} // Same as properties for now
        />
      )}

      {/* Canvas Context Menu */}
      {canvasContextMenu && (
        <CanvasContextMenu
          x={canvasContextMenu.x}
          y={canvasContextMenu.y}
          canvasPosition={{
            x: canvasContextMenu.canvasX,
            y: canvasContextMenu.canvasY
          }}
          onClose={() => setCanvasContextMenu(null)}
          onNodeAdd={handleNodeAdd}
        />
      )}

      {/* Properties Panel */}
      <PropertiesPanel
        isOpen={propertiesPanel.isOpen}
        node={propertiesPanel.node}
        onClose={() => setPropertiesPanel({ isOpen: false, node: null })}
        onSave={handleNodeUpdate}
      />
    </div>
  );
}

// Main component wrapper with ReactFlowProvider
export default function FunctionModelPage({ params }: FunctionModelPageProps) {
  return (
    <ReactFlowProvider>
      <FunctionModelInner params={params} />
    </ReactFlowProvider>
  );
}
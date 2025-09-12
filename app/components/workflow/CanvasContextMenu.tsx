/**
 * Canvas Context Menu Component - Canvas Right-Click Interface
 * Following Clean Architecture - UI Component Layer
 */

'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  Database, 
  Layers3, 
  Link, 
  BookOpen, 
  Box
} from 'lucide-react';

interface NodeTypeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'container' | 'action';
}

const nodeTypes: NodeTypeOption[] = [
  // Container Nodes
  {
    id: 'ioNode',
    label: 'IO Node',
    description: 'Handle input/output boundaries',
    icon: Database,
    category: 'container'
  },
  {
    id: 'stageNode',
    label: 'Stage Node', 
    description: 'Organize workflow phases',
    icon: Layers3,
    category: 'container'
  },
  // Action Nodes
  {
    id: 'tetherNode',
    label: 'Tether Node',
    description: 'External system integrations',
    icon: Link,
    category: 'action'
  },
  {
    id: 'kbNode',
    label: 'KB Node',
    description: 'Knowledge base access',
    icon: BookOpen,
    category: 'action'
  },
  {
    id: 'functionModelContainer',
    label: 'Model Container',
    description: 'Nested workflow execution',
    icon: Box,
    category: 'action'
  }
];

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onNodeAdd: (nodeType: string, position: { x: number; y: number }) => void;
  canvasPosition: { x: number; y: number };
}

export default function CanvasContextMenu({
  x,
  y,
  onClose,
  onNodeAdd,
  canvasPosition
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // Calculate menu position to keep it on screen
  const menuStyle = {
    left: x,
    top: y,
    transform: `translate(${x > window.innerWidth - 300 ? '-100%' : '0'}, ${y > window.innerHeight - 400 ? '-100%' : '0'})`
  };

  const handleNodeSelect = (nodeType: string) => {
    onNodeAdd(nodeType, canvasPosition);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-30 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border py-2 min-w-[300px] animate-in fade-in-0 zoom-in-95"
      style={menuStyle}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Plus className="w-4 h-4" />
          Add New Node
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Click to add at ({Math.round(canvasPosition.x)}, {Math.round(canvasPosition.y)})
        </div>
      </div>

      {/* Container Nodes Section */}
      <div className="py-2">
        <div className="px-4 py-1">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Container Nodes
          </h3>
        </div>
        {nodeTypes
          .filter(node => node.category === 'container')
          .map(nodeType => {
            const Icon = nodeType.icon;
            return (
              <Button
                key={nodeType.id}
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-auto rounded-none hover:bg-blue-50 text-left"
                onClick={() => handleNodeSelect(nodeType.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                    <div className="text-xs text-gray-500">{nodeType.description}</div>
                  </div>
                </div>
              </Button>
            );
          })
        }
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-1" />

      {/* Action Nodes Section */}
      <div className="py-2">
        <div className="px-4 py-1">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Action Nodes
          </h3>
        </div>
        {nodeTypes
          .filter(node => node.category === 'action')
          .map(nodeType => {
            const Icon = nodeType.icon;
            return (
              <Button
                key={nodeType.id}
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-auto rounded-none hover:bg-green-50 text-left"
                onClick={() => handleNodeSelect(nodeType.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">
                    <Icon className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                    <div className="text-xs text-gray-500">{nodeType.description}</div>
                  </div>
                </div>
              </Button>
            );
          })
        }
      </div>
    </div>
  );
}
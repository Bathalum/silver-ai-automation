/**
 * Floating Toolbar Component - Node Creation Interface
 * Following Clean Architecture - UI Component Layer
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Database, 
  Layers3, 
  Link, 
  BookOpen, 
  Box,
  ChevronUp
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

interface FloatingToolbarProps {
  onNodeAdd: (nodeType: string) => void;
  disabled?: boolean;
}

export default function FloatingToolbar({ onNodeAdd, disabled = false }: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNodeSelect = (nodeType: string) => {
    onNodeAdd(nodeType);
    setIsExpanded(false);
  };

  return (
    <div className="absolute bottom-2 left-2 z-20 flex flex-col items-start gap-2 max-w-[calc(100%-1rem)]">
      {/* Node Type Menu - Expanded */}
      {isExpanded && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border p-2 mb-2 animate-in slide-in-from-bottom-4 max-w-[calc(100%-2rem)]">
          <div className="grid gap-1 w-full max-w-[280px]">
            {/* Container Nodes Section */}
            <div className="px-2 py-1">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Container Nodes
              </h3>
              {nodeTypes
                .filter(node => node.category === 'container')
                .map(nodeType => {
                  const Icon = nodeType.icon;
                  return (
                    <button
                      key={nodeType.id}
                      onClick={() => handleNodeSelect(nodeType.id)}
                      disabled={disabled}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-blue-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                        <div className="text-xs text-gray-500 truncate">{nodeType.description}</div>
                      </div>
                    </button>
                  );
                })
              }
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1" />

            {/* Action Nodes Section */}
            <div className="px-2 py-1">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Action Nodes
              </h3>
              {nodeTypes
                .filter(node => node.category === 'action')
                .map(nodeType => {
                  const Icon = nodeType.icon;
                  return (
                    <button
                      key={nodeType.id}
                      onClick={() => handleNodeSelect(nodeType.id)}
                      disabled={disabled}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-green-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex-shrink-0">
                        <Icon className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                        <div className="text-xs text-gray-500 truncate">{nodeType.description}</div>
                      </div>
                    </button>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* Main Add Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        size="lg"
        className={`rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 flex-shrink-0 ${
          isExpanded 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isExpanded ? (
          <ChevronUp className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-white" />
        )}
      </Button>
    </div>
  );
}
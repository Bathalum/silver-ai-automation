/**
 * Properties Panel Component - Node Configuration Interface
 * Following Clean Architecture - UI Component Layer
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Settings, Save } from 'lucide-react';

interface NodeProperties {
  id: string;
  type: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface PropertiesPanelProps {
  isOpen: boolean;
  node: NodeProperties | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<NodeProperties>) => void;
}

export default function PropertiesPanel({ 
  isOpen, 
  node, 
  onClose, 
  onSave 
}: PropertiesPanelProps) {
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    x: 0,
    y: 0
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when node changes
  useEffect(() => {
    if (node) {
      setFormData({
        label: node.data?.label || node.label || '',
        description: node.data?.description || '',
        x: Math.round(node.position.x),
        y: Math.round(node.position.y)
      });
      setHasChanges(false);
    }
  }, [node]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!node) return;

    const updates = {
      data: {
        ...node.data,
        label: formData.label,
        description: formData.description
      },
      position: {
        x: formData.x,
        y: formData.y
      }
    };

    onSave(node.id, updates);
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!isOpen || !node) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Node Properties</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Node Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Node Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">
                  {node.type.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-xs">{node.id}</span>
              </div>
            </div>
          </div>

          {/* Basic Properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Basic Properties
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="node-label">Label</Label>
              <Input
                id="node-label"
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                placeholder="Enter node label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-description">Description</Label>
              <Textarea
                id="node-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter node description"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Position */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Position
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="node-x">X Position</Label>
                <Input
                  id="node-x"
                  type="number"
                  value={formData.x}
                  onChange={(e) => handleInputChange('x', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="node-y">Y Position</Label>
                <Input
                  id="node-y"
                  type="number"
                  value={formData.y}
                  onChange={(e) => handleInputChange('y', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Type-specific properties could be added here */}
          {node.type === 'ioNode' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                IO Configuration
              </h3>
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                IO-specific properties will be implemented based on domain requirements.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
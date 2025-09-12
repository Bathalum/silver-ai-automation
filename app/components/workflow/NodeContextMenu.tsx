/**
 * Node Context Menu Component - Node Actions Interface
 * Following Clean Architecture - UI Component Layer
 */

'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Copy, 
  Trash2, 
  Settings, 
  Eye,
  Link2
} from 'lucide-react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeType: string;
  onClose: () => void;
  onEdit?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onProperties?: (nodeId: string) => void;
  onConnect?: (nodeId: string) => void;
  onView?: (nodeId: string) => void;
}

export default function NodeContextMenu({
  x,
  y,
  nodeId,
  nodeType,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onProperties,
  onConnect,
  onView
}: NodeContextMenuProps) {
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
    transform: `translate(${x > window.innerWidth - 200 ? '-100%' : '0'}, ${y > window.innerHeight - 300 ? '-100%' : '0'})`
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-30 bg-white/95 backdrop-blur-sm rounded-md shadow-lg border py-1 min-w-[140px] animate-in fade-in-0 zoom-in-95"
      style={menuStyle}
    >
      {/* Node Info Header - More Compact */}
      <div className="px-2 py-1 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-900 capitalize">
          {nodeType.replace(/([A-Z])/g, ' $1').trim()}
        </div>
      </div>

      {/* Actions - More Compact */}
      <div className="py-0.5">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-gray-50"
            onClick={() => handleAction(() => onView(nodeId))}
          >
            <Eye className="w-3 h-3 mr-1.5" />
            View
          </Button>
        )}
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-gray-50"
            onClick={() => handleAction(() => onEdit(nodeId))}
          >
            <Edit3 className="w-3 h-3 mr-1.5" />
            Edit
          </Button>
        )}

        {onProperties && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-gray-50"
            onClick={() => handleAction(() => onProperties(nodeId))}
          >
            <Settings className="w-3 h-3 mr-1.5" />
            Properties
          </Button>
        )}

        {onConnect && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-gray-50"
            onClick={() => handleAction(() => onConnect(nodeId))}
          >
            <Link2 className="w-3 h-3 mr-1.5" />
            Connect
          </Button>
        )}

        {(onDuplicate || onDelete) && <div className="border-t border-gray-100 my-0.5" />}

        {onDuplicate && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-gray-50"
            onClick={() => handleAction(() => onDuplicate(nodeId))}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Duplicate
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 py-1 h-7 text-xs rounded-none hover:bg-red-50 text-red-600 hover:text-red-700"
            onClick={() => handleAction(() => onDelete(nodeId))}
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
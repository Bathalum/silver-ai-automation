import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface IONodeBodyProps {
  description?: string;
  dataContract?: {
    input?: string[];
    output?: string[];
    format?: string;
  };
  position?: { x: number; y: number };
  metadata?: {
    created?: string;
    modified?: string;
    version?: string;
  };
}

export const IONodeBody: React.FC<IONodeBodyProps> = ({
  description = 'Input/Output node for data flow management',
  dataContract = { input: [], output: [], format: 'JSON' },
  position = { x: 0, y: 0 },
  metadata = {}
}) => {
  return (
    <div className="p-3 space-y-3">
      {/* Description Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Description</h4>
        <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
      </div>

      <Separator />

      {/* Data Contract Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Data Contract</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Input</Badge>
            <span className="text-xs text-gray-600">
              {dataContract.input?.length || 0} fields
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Output</Badge>
            <span className="text-xs text-gray-600">
              {dataContract.output?.length || 0} fields
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Format</Badge>
            <span className="text-xs text-gray-600">{dataContract.format}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Position Information */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Position</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>X: {position.x.toFixed(0)}</div>
          <div>Y: {position.y.toFixed(0)}</div>
        </div>
      </div>

      {/* Metadata */}
      {Object.keys(metadata).length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Metadata</h4>
            <div className="space-y-1 text-xs text-gray-600">
              {metadata.version && <div>Version: {metadata.version}</div>}
              {metadata.created && <div>Created: {metadata.created}</div>}
              {metadata.modified && <div>Modified: {metadata.modified}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, GitBranch, PlayCircle, AlertTriangle } from 'lucide-react';

interface StageNodeBodyProps {
  description?: string;
  dependencies?: string[];
  actionCount?: number;
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  estimatedDuration?: string;
  teamMembers?: string[];
  branch?: string;
  conditions?: string[];
  metadata?: {
    created?: string;
    modified?: string;
    version?: string;
    owner?: string;
  };
}

export const StageNodeBody: React.FC<StageNodeBodyProps> = ({
  description = 'Stage node for workflow orchestration',
  dependencies = [],
  actionCount = 0,
  executionMode = 'sequential',
  estimatedDuration = '5-10 min',
  teamMembers = [],
  branch = 'main',
  conditions = [],
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

      {/* Execution Information */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Execution</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-gray-600">Mode</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {executionMode.charAt(0).toUpperCase() + executionMode.slice(1)}
          </Badge>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-green-500" />
            <span className="text-xs text-gray-600">Duration</span>
          </div>
          <span className="text-xs text-gray-600">{estimatedDuration}</span>
        </div>
      </div>

      <Separator />

      {/* Dependencies Section */}
      {dependencies.length > 0 && (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Dependencies</h4>
            <div className="flex flex-wrap gap-1">
              {dependencies.map((dep, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Actions Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Actions</h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {actionCount} {actionCount === 1 ? 'Action' : 'Actions'}
          </Badge>
          {actionCount === 0 && (
            <span className="text-xs text-gray-500">No actions configured</span>
          )}
        </div>
      </div>

      {/* Team and Branch Information */}
      {(teamMembers.length > 0 || branch) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Team & Branch</h4>
            <div className="space-y-2">
              {teamMembers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-purple-500" />
                  <div className="flex flex-wrap gap-1">
                    {teamMembers.map((member, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {branch && (
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3 w-3 text-green-500" />
                  <Badge variant="outline" className="text-xs">
                    {branch}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Conditions Section */}
      {conditions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Conditions</h4>
            <div className="space-y-1">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  <span>{condition}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Metadata */}
      {Object.keys(metadata).length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Metadata</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {metadata.version && <div>Version: {metadata.version}</div>}
              {metadata.owner && <div>Owner: {metadata.owner}</div>}
              {metadata.created && <div>Created: {metadata.created}</div>}
              {metadata.modified && <div>Modified: {metadata.modified}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, FileText, Link, Calendar, User } from 'lucide-react';

interface KBNodeBodyProps {
  description: string;
  sources: string[];
  lastUpdated: string;
  author: string;
  documentCount: number;
  isIndexing: boolean;
  indexingProgress: number;
}

export const KBNodeBody: React.FC<KBNodeBodyProps> = ({
  description,
  sources,
  lastUpdated,
  author,
  documentCount,
  isIndexing,
  indexingProgress,
}) => {
  return (
    <Card className="p-4 space-y-4">
      {/* Description */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Description</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          {description || 'No description provided'}
        </p>
      </div>

      {/* Document Count */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-medium text-gray-700">Documents</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {documentCount} documents indexed
        </Badge>
      </div>

      {/* Indexing Progress */}
      {isIndexing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Indexing Progress</h4>
            <span className="text-xs text-gray-500">{indexingProgress}%</span>
          </div>
          <Progress value={indexingProgress} className="h-2" />
        </div>
      )}

      {/* Sources */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Link className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-medium text-gray-700">Sources</h4>
        </div>
        <div className="space-y-1">
          {sources.length > 0 ? (
            sources.map((source, index) => (
              <Badge key={index} variant="secondary" className="text-xs mr-2 mb-1">
                {source}
              </Badge>
            ))
          ) : (
            <p className="text-xs text-gray-500 italic">No sources specified</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-medium text-gray-700">Last Updated</h4>
          </div>
          <p className="text-xs text-gray-600">
            {lastUpdated || 'Never'}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-medium text-gray-700">Author</h4>
          </div>
          <p className="text-xs text-gray-600">
            {author || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isIndexing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-xs text-gray-500">
            {isIndexing ? 'Indexing...' : 'Ready'}
          </span>
        </div>
        
        <Badge 
          variant={isIndexing ? "default" : "secondary"}
          className="text-xs"
        >
          {isIndexing ? 'Processing' : 'Available'}
        </Badge>
      </div>
    </Card>
  );
};

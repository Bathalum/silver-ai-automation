import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Search, 
  Upload, 
  Download, 
  Settings, 
  Play,
  Pause,
  Stop
} from 'lucide-react';

interface KBNodeControlsProps {
  isIndexing: boolean;
  isSearching: boolean;
  canRefresh: boolean;
  canUpload: boolean;
  canDownload: boolean;
  onRefresh: () => void;
  onSearch: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onSettings: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export const KBNodeControls: React.FC<KBNodeControlsProps> = ({
  isIndexing,
  isSearching,
  canRefresh,
  canUpload,
  canDownload,
  onRefresh,
  onSearch,
  onUpload,
  onDownload,
  onSettings,
  onPlay,
  onPause,
  onStop,
}) => {
  return (
    <Card className="p-3 space-y-3">
      {/* Primary Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!canRefresh || isIndexing}
            className="h-8 px-3"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onSearch}
            disabled={isSearching}
            className="h-8 px-3"
          >
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onSettings}
          className="h-8 px-3"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Execution Controls */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPlay}
          disabled={isIndexing}
          className="h-8 px-3"
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onPause}
          disabled={!isIndexing}
          className="h-8 px-3"
        >
          <Pause className="w-4 h-4 mr-1" />
          Pause
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          disabled={!isIndexing}
          className="h-8 px-3"
        >
          <Stop className="w-4 h-4 mr-1" />
          Stop
        </Button>
      </div>

      {/* Data Transfer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <Button
          size="sm"
          variant="outline"
          onClick={onUpload}
          disabled={!canUpload || isIndexing}
          className="h-8 px-3"
        >
          <Upload className="w-4 h-4 mr-1" />
          Upload
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={!canDownload}
          className="h-8 px-3"
        >
          <Download className="w-4 h-4 mr-1" />
          Download
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isIndexing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-xs text-gray-500">
            {isIndexing ? 'Indexing' : 'Ready'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {isIndexing && (
            <Badge variant="default" className="text-xs">
              Processing
            </Badge>
          )}
          {isSearching && (
            <Badge variant="secondary" className="text-xs">
              Searching
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

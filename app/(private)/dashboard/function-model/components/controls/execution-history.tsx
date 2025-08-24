'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Square,
  Download,
  Trash2,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  nodeId?: string;
  nodeName?: string;
  duration?: number; // in milliseconds
  metadata?: Record<string, any>;
}

interface ExecutionHistoryProps {
  logs: ExecutionLogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => void;
  onRefresh: () => void;
  className?: string;
}

export function ExecutionHistory({
  logs,
  onClearLogs,
  onExportLogs,
  onRefresh,
  className
}: ExecutionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [activeTab, setActiveTab] = useState('logs');

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'success':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          color: 'bg-green-100 text-green-800 border-green-200',
          bgColor: 'bg-green-50'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          bgColor: 'bg-yellow-50'
        };
      case 'error':
        return {
          icon: <XCircle className="h-3 w-3" />,
          color: 'bg-red-100 text-red-800 border-red-200',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          bgColor: 'bg-blue-50'
        };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.nodeName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLogStatistics = () => {
    const total = logs.length;
    const success = logs.filter(log => log.level === 'success').length;
    const warning = logs.filter(log => log.level === 'warning').length;
    const error = logs.filter(log => log.level === 'error').length;
    const info = logs.filter(log => log.level === 'info').length;

    return { total, success, warning, error, info };
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const stats = getLogStatistics();

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Execution History</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportLogs}
              className="h-8 px-2"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearLogs}
              className="h-8 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics Overview */}
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-semibold text-green-600">{stats.success}</div>
            <div className="text-xs text-green-600">Success</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-semibold text-blue-600">{stats.info}</div>
            <div className="text-xs text-blue-600">Info</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-semibold text-yellow-600">{stats.warning}</div>
            <div className="text-xs text-yellow-600">Warning</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-semibold text-red-600">{stats.error}</div>
            <div className="text-xs text-red-600">Error</div>
          </div>
        </div>

        {/* Logs Display */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-2">
            <ScrollArea className="h-64">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const levelConfig = getLevelConfig(log.level);
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          levelConfig.bgColor
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1">
                            <Badge variant="outline" className={cn("mt-1", levelConfig.color)}>
                              {levelConfig.icon}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{log.message}</div>
                              {log.nodeName && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Node: {log.nodeName}
                                </div>
                              )}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-muted-foreground cursor-pointer">
                                    Metadata
                                  </summary>
                                  <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {log.duration && (
                              <span>{formatDuration(log.duration)}</span>
                            )}
                            <span>{formatTimestamp(log.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Performance Metrics</div>
              
              {/* Average Execution Time */}
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Execution Time</span>
                  <span className="text-sm font-medium">
                    {logs.length > 0 
                      ? formatDuration(
                          logs.reduce((acc, log) => acc + (log.duration || 0), 0) / logs.length
                        )
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>

              {/* Success Rate */}
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Success Rate</span>
                  <span className="text-sm font-medium">
                    {stats.total > 0 
                      ? `${((stats.success / stats.total) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>

              {/* Error Rate */}
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <span className="text-sm font-medium">
                    {stats.total > 0 
                      ? `${((stats.error / stats.total) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

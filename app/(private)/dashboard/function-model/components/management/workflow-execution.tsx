"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  Stop, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Clock, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  Layers,
  GitBranch,
  Terminal,
  BarChart3,
  Settings,
  Download,
  Share2
} from "lucide-react";

interface ExecutionNode {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress: number;
  error?: string;
  logs: string[];
  input?: any;
  output?: any;
}

interface ExecutionConnection {
  id: string;
  source: string;
  target: string;
  status: "pending" | "active" | "completed" | "error";
  data?: any;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  nodes: ExecutionNode[];
  connections: ExecutionConnection[];
  input: any;
  output?: any;
  error?: string;
  metadata: {
    executionMode: string;
    contextAccess: string;
    priority: string;
    timeout: number;
    maxRetries: number;
  };
}

interface WorkflowExecutionProps {
  execution: WorkflowExecution;
  onControl: (action: "play" | "pause" | "stop" | "restart") => void;
  onViewLogs: (nodeId: string) => void;
  onViewNodeDetails: (nodeId: string) => void;
}

export function WorkflowExecution({
  execution,
  onControl,
  onViewLogs,
  onViewNodeDetails,
}: WorkflowExecutionProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showLogs, setShowLogs] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);

  // Auto-refresh execution data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // This would typically trigger a refresh of execution data
      // For now, we'll just simulate it
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued": return "bg-gray-100 text-gray-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getNodeStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "running": return <Activity className="h-4 w-4 text-blue-500" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped": return <EyeOff className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "error": return "bg-red-100 text-red-800";
      case "skipped": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const canControl = (action: string) => {
    switch (action) {
      case "play":
        return execution.status === "paused" || execution.status === "queued";
      case "pause":
        return execution.status === "running";
      case "stop":
        return ["running", "paused", "queued"].includes(execution.status);
      case "restart":
        return ["completed", "failed", "cancelled"].includes(execution.status);
      default:
        return false;
    }
  };

  const getExecutionModeIcon = (mode: string) => {
    switch (mode) {
      case "sequential": return <Zap className="h-4 w-4" />;
      case "parallel": return <Layers className="h-4 w-4" />;
      case "conditional": return <GitBranch className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const completedNodes = execution.nodes.filter(n => n.status === "completed").length;
  const errorNodes = execution.nodes.filter(n => n.status === "error").length;
  const runningNodes = execution.nodes.filter(n => n.status === "running").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Workflow Execution</h2>
          <p className="text-sm text-muted-foreground">
            {execution.workflowName} • {execution.id}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showLogs ? "Hide Logs" : "Show Logs"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-blue-50 border-blue-200" : ""}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh
          </Button>
        </div>
      </div>

      {/* Execution Controls */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(execution.status)}>
                {execution.status}
              </Badge>
              {execution.duration && (
                <span className="text-sm text-muted-foreground">
                  Duration: {formatDuration(execution.duration)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Started: {new Date(execution.startTime).toLocaleTimeString()}
              {execution.endTime && (
                <>
                  • Ended: {new Date(execution.endTime).toLocaleTimeString()}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onControl("play")}
              disabled={!canControl("play")}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
            <Button
              onClick={() => onControl("pause")}
              disabled={!canControl("pause")}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button
              onClick={() => onControl("stop")}
              disabled={!canControl("stop")}
              variant="outline"
              size="sm"
            >
              <Stop className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              onClick={() => onControl("restart")}
              disabled={!canControl("restart")}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(execution.progress)}%</span>
          </div>
          <Progress value={execution.progress} className="h-2" />
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Completed: {completedNodes}/{execution.nodes.length}</span>
            <span>Running: {runningNodes}</span>
            <span>Errors: {errorNodes}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Execution Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Execution Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {execution.nodes.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Nodes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {execution.connections.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Connections</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Execution Mode</span>
                        <div className="flex items-center gap-2">
                          {getExecutionModeIcon(execution.metadata.executionMode)}
                          <span className="text-sm font-medium capitalize">
                            {execution.metadata.executionMode}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Context Access</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {execution.metadata.contextAccess}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Priority</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {execution.metadata.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Timeout</span>
                        <span className="text-sm font-medium">
                          {execution.metadata.timeout}s
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Max Retries</span>
                        <span className="text-sm font-medium">
                          {execution.metadata.maxRetries}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Node Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Node Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {["pending", "running", "completed", "error", "skipped"].map((status) => {
                        const count = execution.nodes.filter(n => n.status === status).length;
                        const percentage = execution.nodes.length > 0 ? (count / execution.nodes.length) * 100 : 0;
                        
                        return (
                          <div key={status} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize">{status}</span>
                              <span className="font-medium">{count}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  status === "completed" ? "bg-green-500" :
                                  status === "running" ? "bg-blue-500" :
                                  status === "error" ? "bg-red-500" :
                                  status === "pending" ? "bg-yellow-500" :
                                  "bg-gray-400"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Input/Output Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Execution Data</CardTitle>
                  <CardDescription>
                    Input data and execution results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="input" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="input">Input Data</TabsTrigger>
                      <TabsTrigger value="output" disabled={!execution.output}>
                        Output Data
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="input" className="mt-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(execution.input, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="output" className="mt-4">
                      {execution.output ? (
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-sm overflow-x-auto">
                            {JSON.stringify(execution.output, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Output data will appear here when execution completes</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nodes Tab */}
            <TabsContent value="nodes" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Execution Nodes</h3>
                
                <div className="space-y-3">
                  {execution.nodes.map((node) => (
                    <Card key={node.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                            {getNodeStatusIcon(node.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{node.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {node.type}
                              </Badge>
                              <Badge className={`text-xs ${getNodeStatusColor(node.status)}`}>
                                {node.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              {node.startTime && (
                                <span>Started: {new Date(node.startTime).toLocaleTimeString()}</span>
                              )}
                              {node.endTime && (
                                <span>Ended: {new Date(node.endTime).toLocaleTimeString()}</span>
                              )}
                              {node.duration && (
                                <span>Duration: {formatDuration(node.duration)}</span>
                              )}
                            </div>
                            
                            {node.status === "running" && (
                              <div className="w-full bg-muted rounded-full h-2 mb-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${node.progress}%` }}
                                />
                              </div>
                            )}
                            
                            {node.error && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                                <AlertTriangle className="h-4 w-4 inline mr-2" />
                                {node.error}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewLogs(node.id)}
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewNodeDetails(node.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Connections Tab */}
            <TabsContent value="connections" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Execution Connections</h3>
                
                {execution.connections.length > 0 ? (
                  <div className="space-y-3">
                    {execution.connections.map((connection) => (
                      <Card key={connection.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{connection.source}</span>
                              <div className={`w-2 h-2 rounded-full ${
                                connection.status === "active" ? "bg-blue-500" :
                                connection.status === "completed" ? "bg-green-500" :
                                connection.status === "error" ? "bg-red-500" :
                                "bg-gray-400"
                              }`} />
                              <span className="text-sm font-medium">{connection.target}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {connection.status}
                            </Badge>
                          </div>
                          
                          {connection.data && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Show connection data
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No connections to display</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Debug Tab */}
            <TabsContent value="debug" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Debug Information</h3>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Logs</CardTitle>
                    <CardDescription>
                      Real-time execution logs and debugging information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                      {execution.nodes.map((node) => (
                        <div key={node.id} className="mb-2">
                          <div className="text-blue-400">[{new Date(node.startTime || Date.now()).toISOString()}]</div>
                          <div className="ml-4">
                            <span className="text-yellow-400">[{node.status.toUpperCase()}]</span>
                            <span className="text-white"> {node.name}</span>
                            {node.logs.map((log, index) => (
                              <div key={index} className="ml-4 text-gray-300">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Logs */}
        {showLogs && (
          <div className="w-80 border-l bg-muted/30">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Live Logs</h3>
              <p className="text-sm text-muted-foreground">
                Real-time execution logs
              </p>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {execution.nodes.flatMap((node) => 
                  node.logs.map((log, index) => (
                    <div key={`${node.id}-${index}`} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-blue-600">{node.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {node.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground ml-4">{log}</div>
                    </div>
                  ))
                )}
                
                {execution.nodes.every(n => n.logs.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs available yet</p>
                    <p className="text-sm">Logs will appear here as nodes execute</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

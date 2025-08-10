'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  SkipForward, 
  SkipBack,
  Settings,
  Clock,
  Zap,
  Shield,
  Target,
  ArrowRight,
  ArrowDown,
  GitBranch,
  GitCommit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrchestrationControlsProps {
  executionMode: 'sequential' | 'parallel' | 'conditional' | 'priority';
  isExecuting: boolean;
  isPaused: boolean;
  canExecute: boolean;
  canPause: boolean;
  canStop: boolean;
  canReset: boolean;
  canStepForward: boolean;
  canStepBackward: boolean;
  maxConcurrency?: number;
  priorityThreshold?: number;
  conditionalLogic?: string;
  onExecute: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onExecutionModeChange: (mode: 'sequential' | 'parallel' | 'conditional' | 'priority') => void;
  onMaxConcurrencyChange: (value: number) => void;
  onPriorityThresholdChange: (value: number) => void;
  onConditionalLogicChange: (logic: string) => void;
  className?: string;
}

export function OrchestrationControls({
  executionMode,
  isExecuting,
  isPaused,
  canExecute,
  canPause,
  canStop,
  canReset,
  canStepForward,
  canStepBackward,
  maxConcurrency = 5,
  priorityThreshold = 3,
  conditionalLogic = '',
  onExecute,
  onPause,
  onStop,
  onReset,
  onStepForward,
  onStepBackward,
  onExecutionModeChange,
  onMaxConcurrencyChange,
  onPriorityThresholdChange,
  onConditionalLogicChange,
  className
}: OrchestrationControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'sequential':
        return {
          icon: <ArrowRight className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Execute nodes one after another in order'
        };
      case 'parallel':
        return {
          icon: <ArrowDown className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Execute multiple nodes simultaneously'
        };
      case 'conditional':
        return {
          icon: <GitBranch className="h-4 w-4" />,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Execute based on conditional logic'
        };
      case 'priority':
        return {
          icon: <Target className="h-4 w-4" />,
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          description: 'Execute based on priority levels'
        };
      default:
        return {
          icon: <ArrowRight className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Default execution mode'
        };
    }
  };

  const modeConfig = getModeConfig(executionMode);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Orchestration Controls</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Execution Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Execution Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['sequential', 'parallel', 'conditional', 'priority'] as const).map((mode) => {
              const config = getModeConfig(mode);
              const isActive = executionMode === mode;
              return (
                <Button
                  key={mode}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onExecutionModeChange(mode)}
                  disabled={isExecuting}
                  className={cn(
                    "h-auto p-3 flex flex-col items-center space-y-2",
                    isActive ? "bg-primary text-primary-foreground" : ""
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    isActive ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {config.icon}
                  </div>
                  <div className="text-xs font-medium capitalize">{mode}</div>
                </Button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {modeConfig.description}
          </div>
        </div>

        {/* Advanced Configuration */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            {/* Parallel Mode Settings */}
            {executionMode === 'parallel' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Parallel Execution Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Concurrency</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={maxConcurrency}
                      onChange={(e) => onMaxConcurrencyChange(parseInt(e.target.value) || 1)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Current Usage</Label>
                    <div className="h-8 flex items-center px-3 bg-muted rounded-md text-sm">
                      <div className="flex-1 bg-green-500 h-2 rounded-full" style={{ width: `${(maxConcurrency / 20) * 100}%` }} />
                      <span className="ml-2 text-xs">{maxConcurrency}/20</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Priority Mode Settings */}
            {executionMode === 'priority' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Priority Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Priority Threshold</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={priorityThreshold}
                      onChange={(e) => onPriorityThresholdChange(parseInt(e.target.value) || 1)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Priority Levels</Label>
                    <div className="h-8 flex items-center px-3 bg-muted rounded-md text-sm">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "w-3 h-3 rounded-full",
                              level <= priorityThreshold ? "bg-orange-500" : "bg-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Mode Settings */}
            {executionMode === 'conditional' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Conditional Logic</Label>
                <textarea
                  value={conditionalLogic}
                  onChange={(e) => onConditionalLogicChange(e.target.value)}
                  placeholder="Enter conditional logic (e.g., if node1.success && node2.data > 10)"
                  className="w-full h-20 p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-muted-foreground">
                  Use node names and conditions to control execution flow
                </div>
              </div>
            )}

            {/* Global Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Global Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Auto-retry on failure</Label>
                    <div className="text-xs text-muted-foreground">Automatically retry failed nodes</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Continue on error</Label>
                    <div className="text-xs text-muted-foreground">Continue execution even if some nodes fail</div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Performance monitoring</Label>
                    <div className="text-xs text-muted-foreground">Track execution performance metrics</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Controls */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-sm font-medium">Execution Controls</Label>
          
          {/* Step Controls */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onStepBackward}
              disabled={!canStepBackward || isExecuting}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onStepForward}
              disabled={!canStepForward || isExecuting}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="lg"
              onClick={onReset}
              disabled={!canReset || isExecuting}
              className="h-10 px-4"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            {!isExecuting ? (
              <Button
                onClick={onExecute}
                disabled={!canExecute}
                size="lg"
                className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Execute
              </Button>
            ) : isPaused ? (
              <Button
                onClick={onExecute}
                size="lg"
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={onPause}
                disabled={!canPause}
                size="lg"
                variant="outline"
                className="h-10 px-6"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            <Button
              onClick={onStop}
              disabled={!canStop || !isExecuting}
              size="lg"
              variant="destructive"
              className="h-10 px-6"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        </div>

        {/* Status Display */}
        <div className="flex items-center justify-center space-x-2 pt-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isExecuting 
              ? isPaused 
                ? "bg-yellow-500 animate-pulse" 
                : "bg-green-500 animate-pulse"
              : "bg-gray-400"
          )} />
          <span className="text-sm text-muted-foreground">
            {isExecuting 
              ? isPaused 
                ? "Paused" 
                : "Executing"
              : "Ready"
            }
          </span>
          <Badge variant="outline" className={cn("ml-2", modeConfig.color)}>
            {modeConfig.icon}
            <span className="ml-1 capitalize">{executionMode}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

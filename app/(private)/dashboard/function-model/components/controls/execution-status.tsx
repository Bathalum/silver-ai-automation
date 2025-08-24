'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, AlertCircle, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionStatusProps {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
  currentStep: number;
  totalSteps: number;
  activeNodeId?: string;
  activeNodeName?: string;
  startTime?: Date;
  estimatedDuration?: number; // in seconds
  errorMessage?: string;
  className?: string;
}

export function ExecutionStatus({
  status,
  currentStep,
  totalSteps,
  activeNodeId,
  activeNodeName,
  startTime,
  estimatedDuration,
  errorMessage,
  className
}: ExecutionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          icon: <Play className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800 border-green-200',
          text: 'Running'
        };
      case 'paused':
        return {
          icon: <Pause className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Paused'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          text: 'Completed'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800 border-red-200',
          text: 'Failed'
        };
      case 'stopped':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'Stopped'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'Idle'
        };
    }
  };

  const getProgressPercentage = () => {
    if (totalSteps === 0) return 0;
    return Math.round((currentStep / totalSteps) * 100);
  };

  const getElapsedTime = () => {
    if (!startTime) return '0s';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getEstimatedTimeRemaining = () => {
    if (!estimatedDuration || status !== 'running') return null;
    const elapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
    const remaining = estimatedDuration - elapsed;
    if (remaining <= 0) return null;
    if (remaining < 60) return `${remaining}s`;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}m ${seconds}s`;
  };

  const statusConfig = getStatusConfig();
  const progressPercentage = getProgressPercentage();
  const elapsedTime = getElapsedTime();
  const estimatedTimeRemaining = getEstimatedTimeRemaining();

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className={statusConfig.color}>
            {statusConfig.icon}
            <span className="ml-2">{statusConfig.text}</span>
          </Badge>
          
          {status === 'running' && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Elapsed: {elapsedTime}</span>
              {estimatedTimeRemaining && (
                <>
                  <span>•</span>
                  <span>Est. Remaining: {estimatedTimeRemaining}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress Display */}
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            Step {currentStep} of {totalSteps}
          </div>
          <div className="text-xs text-muted-foreground">
            {progressPercentage}% Complete
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started</span>
          <span>In Progress</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Active Node Information */}
      {activeNodeId && activeNodeName && status === 'running' && (
        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Currently executing:</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {activeNodeName}
          </Badge>
        </div>
      )}

      {/* Error Display */}
      {errorMessage && status === 'failed' && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <div className="font-medium">Execution Failed</div>
            <div className="mt-1">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Timing Information */}
      {startTime && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Started</div>
            <div className="font-medium">
              {startTime.toLocaleTimeString()}
            </div>
          </div>
          
          {estimatedDuration && (
            <div className="space-y-1">
              <div className="text-muted-foreground">Estimated Duration</div>
              <div className="font-medium">
                {Math.floor(estimatedDuration / 60)}m {estimatedDuration % 60}s
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

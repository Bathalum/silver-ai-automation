'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, Square, RotateCcw, SkipForward, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionControlsProps {
  isExecuting: boolean;
  isPaused: boolean;
  canExecute: boolean;
  canPause: boolean;
  canStop: boolean;
  canReset: boolean;
  canStepForward: boolean;
  canStepBackward: boolean;
  onExecute: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  className?: string;
}

export function ExecutionControls({
  isExecuting,
  isPaused,
  canExecute,
  canPause,
  canStop,
  canReset,
  canStepForward,
  canStepBackward,
  onExecute,
  onPause,
  onStop,
  onReset,
  onStepForward,
  onStepBackward,
  className
}: ExecutionControlsProps) {
  return (
    <Card className={cn(
      "flex items-center justify-between p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "border-t shadow-lg",
      className
    )}>
      {/* Left side - Step controls */}
      <div className="flex items-center space-x-2">
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

      {/* Center - Main execution controls */}
      <div className="flex items-center space-x-3">
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

      {/* Right side - Status indicator */}
      <div className="flex items-center space-x-2">
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
      </div>
    </Card>
  );
}

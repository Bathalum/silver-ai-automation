'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowDown, 
  GitBranch, 
  Target,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionModeSelectorProps {
  selectedMode: 'sequential' | 'parallel' | 'conditional' | 'priority';
  onModeChange: (mode: 'sequential' | 'parallel' | 'conditional' | 'priority') => void;
  disabled?: boolean;
  className?: string;
}

export function ExecutionModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
  className
}: ExecutionModeSelectorProps) {
  const modes = [
    {
      id: 'sequential' as const,
      name: 'Sequential',
      description: 'Execute nodes one after another',
      icon: <ArrowRight className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      activeColor: 'bg-blue-600 text-white border-blue-600'
    },
    {
      id: 'parallel' as const,
      name: 'Parallel',
      description: 'Execute multiple nodes simultaneously',
      icon: <ArrowDown className="h-5 w-5" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      activeColor: 'bg-green-600 text-white border-green-600'
    },
    {
      id: 'conditional' as const,
      name: 'Conditional',
      description: 'Execute based on conditions',
      icon: <GitBranch className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      activeColor: 'bg-purple-600 text-white border-purple-600'
    },
    {
      id: 'priority' as const,
      name: 'Priority',
      description: 'Execute based on priority levels',
      icon: <Target className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      activeColor: 'bg-orange-600 text-white border-orange-600'
    }
  ];

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-lg">Execution Mode</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Info className="h-3 w-3 mr-1" />
            Select execution strategy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {modes.map((mode) => {
            const isActive = selectedMode === mode.id;
            return (
              <Button
                key={mode.id}
                variant="outline"
                disabled={disabled}
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  "h-auto p-4 flex flex-col items-center space-y-3 transition-all duration-200",
                  "hover:scale-105 hover:shadow-md",
                  isActive 
                    ? mode.activeColor 
                    : mode.color,
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "p-3 rounded-full",
                  isActive 
                    ? "bg-white/20" 
                    : "bg-white/80"
                )}>
                  {mode.icon}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{mode.name}</div>
                  <div className={cn(
                    "text-xs mt-1",
                    isActive ? "text-white/80" : "text-current/70"
                  )}>
                    {mode.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Mode Description */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>Current Mode:</strong> {modes.find(m => m.id === selectedMode)?.name}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {modes.find(m => m.id === selectedMode)?.description}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

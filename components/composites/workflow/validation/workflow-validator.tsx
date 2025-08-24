'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  X,
  Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationIssue {
  id: string
  type: 'error' | 'warning' | 'info' | 'suggestion'
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  description?: string
  nodeId?: string
  nodeName?: string
  category: string
  suggestedFix?: string
  autoFixAvailable?: boolean
}

interface WorkflowValidatorProps {
  issues: ValidationIssue[]
  isValidating?: boolean
  onIssueClick?: (issue: ValidationIssue) => void
  onAutoFix?: (issueId: string) => void
  onDismiss?: (issueId: string) => void
  showSuggestions?: boolean
  className?: string
}

export function WorkflowValidator({
  issues,
  isValidating = false,
  onIssueClick,
  onAutoFix,
  onDismiss,
  showSuggestions = true,
  className
}: WorkflowValidatorProps) {
  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <AlertCircle className="h-4 w-4" />
      case 'info': return <Info className="h-4 w-4" />
      case 'suggestion': return <Lightbulb className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getIssueColor = (type: string, severity: string) => {
    if (type === 'error' || severity === 'critical') {
      return 'text-red-600 bg-red-50 border-red-200'
    }
    if (type === 'warning' || severity === 'high') {
      return 'text-orange-600 bg-orange-50 border-orange-200'
    }
    if (type === 'info' || severity === 'medium') {
      return 'text-blue-600 bg-blue-50 border-blue-200'
    }
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = []
    }
    acc[issue.category].push(issue)
    return acc
  }, {} as Record<string, ValidationIssue[]>)

  // Filter out suggestions if not enabled
  const filteredIssues = showSuggestions 
    ? issues 
    : issues.filter(issue => issue.type !== 'suggestion')

  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const infoCount = issues.filter(i => i.type === 'info').length
  const suggestionCount = issues.filter(i => i.type === 'suggestion').length

  if (isValidating) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Validating workflow...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (filteredIssues.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Workflow validation passed!</p>
              <p className="text-xs text-gray-500 mt-1">No issues found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Validation Results</CardTitle>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} errors
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">
                {warningCount} warnings
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                {infoCount} info
              </Badge>
            )}
            {suggestionCount > 0 && showSuggestions && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                {suggestionCount} suggestions
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {Object.entries(groupedIssues).map(([category, categoryIssues]) => {
              const filteredCategoryIssues = showSuggestions 
                ? categoryIssues 
                : categoryIssues.filter(issue => issue.type !== 'suggestion')

              if (filteredCategoryIssues.length === 0) return null

              return (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    {category}
                    <Badge variant="outline" className="text-xs">
                      {filteredCategoryIssues.length}
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {filteredCategoryIssues.map((issue) => (
                      <Alert 
                        key={issue.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-sm",
                          getIssueColor(issue.type, issue.severity)
                        )}
                        onClick={() => onIssueClick?.(issue)}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 mt-0.5">
                              {getIssueIcon(issue.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getSeverityBadgeColor(issue.severity)}`}
                                >
                                  {issue.severity}
                                </Badge>
                                {issue.nodeId && (
                                  <Badge variant="outline" className="text-xs">
                                    {issue.nodeName || issue.nodeId}
                                  </Badge>
                                )}
                              </div>
                              <AlertDescription className="text-sm">
                                <div className="font-medium mb-1">{issue.message}</div>
                                {issue.description && (
                                  <div className="text-xs opacity-80 mb-2">
                                    {issue.description}
                                  </div>
                                )}
                                {issue.suggestedFix && (
                                  <div className="text-xs bg-white/50 p-2 rounded border mt-2">
                                    <strong>Suggested fix:</strong> {issue.suggestedFix}
                                  </div>
                                )}
                              </AlertDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-2">
                            {issue.autoFixAvailable && onAutoFix && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAutoFix(issue.id)
                                }}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                Auto Fix
                              </button>
                            )}
                            {onDismiss && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDismiss(issue.id)
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                  {category !== Object.keys(groupedIssues)[Object.keys(groupedIssues).length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
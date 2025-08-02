'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GitBranch, Plus, ExternalLink, AlertCircle } from 'lucide-react'
import { useNodeLinking } from '@/lib/application/hooks/use-function-model-persistence'
import { CreateNestedModelDialog } from './create-nested-model-dialog'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

interface NestedModelsTabProps {
  modelId: string
  nodeId: string
  onCreateNestedLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<void>
}

export function NestedModelsTab({
  modelId,
  nodeId,
  onCreateNestedLink
}: NestedModelsTabProps) {
  const { links, loading, error, loadNodeLinks, clearError } = useNodeLinking(modelId, nodeId)
  const [createNestedDialogOpen, setCreateNestedDialogOpen] = useState(false)
  
  useEffect(() => {
    loadNodeLinks()
  }, [loadNodeLinks])
  
  // Filter for nested function model links
  const nestedModelLinks = links.filter(link => 
    link.linkType === 'nested' && link.targetFeature === 'function-model'
  )
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Nested Function Models</h3>
        <Button onClick={() => setCreateNestedDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Nested Model
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={clearError}
              className="p-0 h-auto ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {nestedModelLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No nested function models</p>
              <p className="text-sm">Click "Add Nested Model" to link another function model to this node</p>
            </div>
          ) : (
            nestedModelLinks.map(link => (
              <Card key={link.linkId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-6 w-6 text-indigo-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-100 text-indigo-800">
                            Nested Model
                          </Badge>
                          <span className="font-medium">Function Model</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {link.targetId}
                        </p>
                        {link.linkContext?.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {link.linkContext.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/function-model/${link.targetId}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      <CreateNestedModelDialog
        open={createNestedDialogOpen}
        onOpenChange={setCreateNestedDialogOpen}
        onCreateNestedLink={onCreateNestedLink}
        nodeId={nodeId}
      />
    </div>
  )
} 
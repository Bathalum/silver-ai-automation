'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link, Plus, Trash2, ExternalLink, AlertCircle } from 'lucide-react'
import { useNodeLinking } from '@/lib/application/hooks/use-function-model-persistence'
import { CreateNodeLinkDialog } from './create-node-link-dialog'
import type { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

interface NodeLinkingTabProps {
  modelId: string
  nodeId: string
  nodeType: string
  onCreateLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<void>
}

export function NodeLinkingTab({
  modelId,
  nodeId,
  nodeType,
  onCreateLink
}: NodeLinkingTabProps) {
  const { links, loading, error, loadNodeLinks, deleteNodeLink, clearError } = useNodeLinking(modelId, nodeId)
  const [createLinkDialogOpen, setCreateLinkDialogOpen] = useState(false)
  
  useEffect(() => {
    loadNodeLinks()
  }, [loadNodeLinks])
  
  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteNodeLink(linkId)
    } catch (err) {
      console.error('Failed to delete link:', err)
    }
  }
  
  const getLinkIcon = (linkType: string) => {
    const icons = {
      documents: '📄',
      implements: '⚙️',
      references: '🔗',
      supports: '🛠️',
      nested: '🔗'
    }
    return icons[linkType as keyof typeof icons] || '🔗'
  }
  
  const getLinkColor = (linkType: string) => {
    const colors = {
      documents: 'bg-blue-100 text-blue-800',
      implements: 'bg-green-100 text-green-800',
      references: 'bg-purple-100 text-purple-800',
      supports: 'bg-orange-100 text-orange-800',
      nested: 'bg-indigo-100 text-indigo-800'
    }
    return colors[linkType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Node Links</h3>
        <Button onClick={() => setCreateLinkDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Link
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
          {links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No links created yet</p>
              <p className="text-sm">Click "Add Link" to create your first node link</p>
            </div>
          ) : (
            links.map(link => (
              <Card key={link.linkId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getLinkIcon(link.linkType)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getLinkColor(link.linkType)}>
                            {link.linkType}
                          </Badge>
                          <span className="font-medium">{link.targetFeature}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {link.targetId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/${link.targetFeature}/${link.targetId}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLink(link.linkId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      <CreateNodeLinkDialog
        open={createLinkDialogOpen}
        onOpenChange={setCreateLinkDialogOpen}
        onCreateLink={onCreateLink}
        nodeType={nodeType}
        nodeId={nodeId}
      />
    </div>
  )
} 
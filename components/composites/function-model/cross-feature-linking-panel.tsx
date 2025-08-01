'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Link, Plus, ExternalLink, Trash2 } from 'lucide-react'
import { useCrossFeatureLinking } from '@/lib/application/hooks/use-function-model-persistence'
import { CreateCrossFeatureLinkDialog } from './create-cross-feature-link-dialog'
import { type CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

interface CrossFeatureLinkingPanelProps {
  modelId: string
  onLinkCreated?: (link: CrossFeatureLink) => void
  onLinkDeleted?: (linkId: string) => void
}

export function CrossFeatureLinkingPanel({ 
  modelId, 
  onLinkCreated, 
  onLinkDeleted 
}: CrossFeatureLinkingPanelProps) {
  const {
    links,
    loading,
    error,
    loadLinks,
    createLink,
    deleteLink,
    clearError
  } = useCrossFeatureLinking(modelId, 'function-model')

  const [createLinkDialogOpen, setCreateLinkDialogOpen] = useState(false)

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const handleCreateLink = async (linkData: any) => {
    try {
      const newLink = await createLink(linkData)
      onLinkCreated?.(newLink)
      setCreateLinkDialogOpen(false)
    } catch (err) {
      console.error('Failed to create link:', err)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteLink(linkId)
      onLinkDeleted?.(linkId)
    } catch (err) {
      console.error('Failed to delete link:', err)
    }
  }

  const getLinkIcon = (linkType: string) => {
    switch (linkType) {
      case 'documents': return '📄'
      case 'implements': return '⚙️'
      case 'references': return '🔗'
      case 'supports': return '💡'
      default: return '🔗'
    }
  }

  const getLinkColor = (linkType: string) => {
    switch (linkType) {
      case 'documents': return 'bg-blue-100 text-blue-800'
      case 'implements': return 'bg-green-100 text-green-800'
      case 'references': return 'bg-purple-100 text-purple-800'
      case 'supports': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'function-model': return '📊'
      case 'knowledge-base': return '📚'
      case 'spindle': return '⚡'
      default: return '📄'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Cross-Feature Links
          </div>
          <Button 
            onClick={() => setCreateLinkDialogOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading links...
          </div>
        )}

        {/* Links List */}
        {!loading && links.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cross-feature links yet</p>
            <p className="text-sm">Create links to connect this model with other features</p>
          </div>
        )}

        {!loading && links.length > 0 && (
          <div className="space-y-3">
            {links.map((link) => (
              <Card key={link.linkId} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getLinkIcon(link.linkType)}</span>
                      <Badge className={getLinkColor(link.linkType)}>
                        {link.linkType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Strength: {link.linkStrength}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{getFeatureIcon(link.sourceFeature)}</span>
                        <span className="font-medium">Source:</span>
                        <span className="text-muted-foreground">
                          {link.sourceFeature} ({link.sourceId})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span>{getFeatureIcon(link.targetFeature)}</span>
                        <span className="font-medium">Target:</span>
                        <span className="text-muted-foreground">
                          {link.targetFeature} ({link.targetId})
                        </span>
                      </div>
                    </div>

                    {/* Link Context */}
                    {link.linkContext && Object.keys(link.linkContext).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <div className="font-medium mb-1">Context:</div>
                        {Object.entries(link.linkContext).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Creation Info */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Created: {new Date(link.createdAt).toLocaleDateString()}
                      {link.createdBy && ` by ${link.createdBy}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Navigate to target entity
                        console.log('Navigate to:', link.targetFeature, link.targetId)
                      }}
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
              </Card>
            ))}
          </div>
        )}

        {/* Create Link Dialog */}
        <CreateCrossFeatureLinkDialog
          open={createLinkDialogOpen}
          onOpenChange={setCreateLinkDialogOpen}
          onCreateLink={handleCreateLink}
          sourceFeature="function-model"
          sourceId={modelId}
        />
      </CardContent>
    </Card>
  )
} 
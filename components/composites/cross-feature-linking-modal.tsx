'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  CrossFeatureLink, 
  FeatureType, 
  LinkType, 
  UniversalLinkContext,
  getFeatureIcon
} from '@/lib/domain/entities/cross-feature-link-types'
import { useUniversalCrossFeatureLinking } from '@/lib/application/hooks/use-universal-cross-feature-linking'
import { EntitySearchResult } from '@/lib/services/entity-search-service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link, Search, X } from 'lucide-react'
import { CreateLinkTab } from './cross-feature-linking-modal/create-link-tab'
import { ManageLinksTab } from './cross-feature-linking-modal/manage-links-tab'

interface CrossFeatureLinkingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceFeature: FeatureType
  sourceId: string
  context?: UniversalLinkContext
  onLinkCreated?: (link: CrossFeatureLink) => void
  onLinkDeleted?: (linkId: string) => void
}

export function CrossFeatureLinkingModal({
  open,
  onOpenChange,
  sourceFeature,
  sourceId,
  context,
  onLinkCreated,
  onLinkDeleted
}: CrossFeatureLinkingModalProps) {
  const {
    links,
    loading,
    error,
    searchResults,
    searchLoading,
    createUniversalLink,
    searchEntities,
    loadLinks,
    deleteLink,
    clearError
  } = useUniversalCrossFeatureLinking()

  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
  const [linkType, setLinkType] = useState<LinkType>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
  const [linkStrength, setLinkStrength] = useState(1.0)
  const [notes, setNotes] = useState('')

  // Load existing links on mount
  useEffect(() => {
    if (open) {
      loadLinks(sourceFeature, sourceId, context)
    }
  }, [open, sourceFeature, sourceId, context, loadLinks])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    await searchEntities(searchQuery, targetFeature)
  }, [searchQuery, targetFeature, searchEntities])

  // Handle link creation
  const handleCreateLink = useCallback(async () => {
    if (!selectedTarget) return

    try {
      const linkContext: UniversalLinkContext = {
        ...context,
        notes,
        priority: linkStrength > 0.7 ? 'high' : linkStrength > 0.4 ? 'medium' : 'low'
      }

      const newLink = await createUniversalLink(
        sourceFeature,
        sourceId,
        targetFeature,
        selectedTarget.id,
        linkType,
        linkContext
      )

      onLinkCreated?.(newLink)
      
      // Reset form
      setSelectedTarget(null)
      setSearchQuery('')
      setLinkStrength(1.0)
      setNotes('')
      
      // Switch to manage tab
      setActiveTab('manage')
    } catch (err) {
      console.error('Failed to create link:', err)
    }
  }, [selectedTarget, sourceFeature, sourceId, targetFeature, linkType, notes, linkStrength, context, createUniversalLink, onLinkCreated])

  // Handle link deletion
  const handleDeleteLink = useCallback(async (linkId: string) => {
    try {
      await deleteLink(linkId)
      onLinkDeleted?.(linkId)
    } catch (err) {
      console.error('Failed to delete link:', err)
    }
  }, [deleteLink, onLinkDeleted])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Cross-Feature Linking
            {context?.node && (
              <Badge variant="secondary">
                Node: {context.node.nodeType}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r p-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Link</TabsTrigger>
                <TabsTrigger value="manage">Manage Links</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Context Info */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Source</div>
              <div className="text-xs text-muted-foreground">
                {sourceFeature} ({sourceId})
              </div>
              {context?.node && (
                <div className="text-xs text-muted-foreground mt-1">
                  Node: {context.node.nodeId}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {activeTab === 'create' && (
              <CreateLinkTab
                targetFeature={targetFeature}
                setTargetFeature={setTargetFeature}
                linkType={linkType}
                setLinkType={setLinkType}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                searchLoading={searchLoading}
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                linkStrength={linkStrength}
                setLinkStrength={setLinkStrength}
                notes={notes}
                setNotes={setNotes}
                onSearch={handleSearch}
                onCreateLink={handleCreateLink}
              />
            )}

            {activeTab === 'manage' && (
              <ManageLinksTab
                links={links}
                loading={loading}
                error={error}
                onDeleteLink={handleDeleteLink}
                clearError={clearError}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
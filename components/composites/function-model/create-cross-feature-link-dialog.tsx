'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Search, Link } from 'lucide-react'
import { type FeatureType, type LinkType } from '@/lib/domain/entities/cross-feature-link-types'

interface CreateCrossFeatureLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLink: (linkData: any) => Promise<void>
  sourceFeature: FeatureType
  sourceId: string
}

export function CreateCrossFeatureLinkDialog({
  open,
  onOpenChange,
  onCreateLink,
  sourceFeature,
  sourceId
}: CreateCrossFeatureLinkDialogProps) {
  const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
  const [linkType, setLinkType] = useState<LinkType>('documents')
  const [targetId, setTargetId] = useState('')
  const [linkStrength, setLinkStrength] = useState(1.0)
  const [context, setContext] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const featureOptions: { value: FeatureType; label: string; icon: string }[] = [
    { value: 'function-model', label: 'Function Model', icon: '📊' },
    { value: 'knowledge-base', label: 'Knowledge Base', icon: '📚' },
    { value: 'spindle', label: 'Spindle', icon: '⚡' }
  ]

  const linkTypeOptions: { value: LinkType; label: string; description: string }[] = [
    { value: 'documents', label: 'Documents', description: 'Links to documentation or SOPs' },
    { value: 'implements', label: 'Implements', description: 'This model implements the target' },
    { value: 'references', label: 'References', description: 'This model references the target' },
    { value: 'supports', label: 'Supports', description: 'This model supports the target' }
  ]

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')

    try {
      // Mock search - in real implementation, this would call the repository
      const mockResults = [
        { id: 'kb-1', name: 'Customer Onboarding SOP', type: 'knowledge-base' },
        { id: 'kb-2', name: 'Data Processing Guidelines', type: 'knowledge-base' },
        { id: 'fm-1', name: 'Order Processing Model', type: 'function-model' },
        { id: 'sp-1', name: 'Email Automation', type: 'spindle' }
      ].filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        item.type === targetFeature
      )

      setSearchResults(mockResults)
    } catch (err) {
      setError('Failed to search for entities')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTarget = (item: any) => {
    setTargetId(item.id)
    setSearchResults([])
    setSearchQuery(item.name)
  }

  const handleCreateLink = async () => {
    if (!targetId || !targetFeature || !linkType) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const linkData = {
        sourceFeature,
        sourceId,
        targetFeature,
        targetId,
        linkType,
        linkStrength,
        linkContext: context ? JSON.parse(context) : {}
      }

      await onCreateLink(linkData)
      
      // Reset form
      setTargetFeature('knowledge-base')
      setLinkType('documents')
      setTargetId('')
      setLinkStrength(1.0)
      setContext('')
      setSearchQuery('')
      setSearchResults([])
      setError('')
    } catch (err) {
      setError('Failed to create link')
    }
  }

  const getFeatureIcon = (feature: FeatureType) => {
    const option = featureOptions.find(opt => opt.value === feature)
    return option?.icon || '📄'
  }

  const getLinkTypeDescription = (type: LinkType) => {
    const option = linkTypeOptions.find(opt => opt.value === type)
    return option?.description || ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Create Cross-Feature Link
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Source Info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getFeatureIcon(sourceFeature)}</span>
                <div>
                  <div className="font-medium">Source</div>
                  <div className="text-sm text-muted-foreground">
                    {sourceFeature} ({sourceId})
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Feature Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-feature">Target Feature</Label>
            <Select value={targetFeature} onValueChange={(value: FeatureType) => setTargetFeature(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {featureOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Entity Search */}
          <div className="space-y-2">
            <Label htmlFor="target-search">Search Target Entity</Label>
            <div className="flex gap-2">
              <Input
                id="target-search"
                placeholder={`Search ${targetFeature}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((item) => (
                  <Card 
                    key={item.id} 
                    className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectTarget(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getFeatureIcon(item.type as FeatureType)}</span>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.id}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Link Type */}
          <div className="space-y-2">
            <Label htmlFor="link-type">Link Type</Label>
            <Select value={linkType} onValueChange={(value: LinkType) => setLinkType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getLinkTypeDescription(linkType)}
            </p>
          </div>

          {/* Link Strength */}
          <div className="space-y-2">
            <Label htmlFor="link-strength">Link Strength</Label>
            <Select value={linkStrength.toString()} onValueChange={(value) => setLinkStrength(parseFloat(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.1">0.1 - Very Weak</SelectItem>
                <SelectItem value="0.3">0.3 - Weak</SelectItem>
                <SelectItem value="0.5">0.5 - Moderate</SelectItem>
                <SelectItem value="0.7">0.7 - Strong</SelectItem>
                <SelectItem value="1.0">1.0 - Very Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context (JSON)</Label>
            <Textarea
              id="context"
              placeholder='{"section": "process", "relevance": "high"}'
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Optional JSON object with additional context about this link
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateLink}
            disabled={!targetId || !targetFeature || !linkType}
            className="flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
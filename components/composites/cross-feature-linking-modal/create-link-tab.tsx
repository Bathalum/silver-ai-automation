'use client'

import { FeatureType, LinkType, getFeatureIcon } from '@/lib/domain/entities/cross-feature-link-types'
import { EntitySearchResult } from '@/lib/services/entity-search-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Search, X } from 'lucide-react'

interface CreateLinkTabProps {
  targetFeature: FeatureType
  setTargetFeature: (feature: FeatureType) => void
  linkType: LinkType
  setLinkType: (type: LinkType) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: EntitySearchResult[]
  searchLoading: boolean
  selectedTarget: EntitySearchResult | null
  setSelectedTarget: (target: EntitySearchResult | null) => void
  linkStrength: number
  setLinkStrength: (strength: number) => void
  notes: string
  setNotes: (notes: string) => void
  onSearch: () => void
  onCreateLink: () => void
}

export function CreateLinkTab({
  targetFeature,
  setTargetFeature,
  linkType,
  setLinkType,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  selectedTarget,
  setSelectedTarget,
  linkStrength,
  setLinkStrength,
  notes,
  setNotes,
  onSearch,
  onCreateLink
}: CreateLinkTabProps) {
  return (
    <div className="space-y-6">
      {/* Target Feature Selection */}
      <div className="space-y-2">
        <Label>Target Feature</Label>
        <Select value={targetFeature} onValueChange={(value: FeatureType) => setTargetFeature(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="function-model">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>Function Model</span>
              </div>
            </SelectItem>
            <SelectItem value="knowledge-base">
              <div className="flex items-center gap-2">
                <span>📚</span>
                <span>Knowledge Base</span>
              </div>
            </SelectItem>
            <SelectItem value="spindle">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>Spindle</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Link Type Selection */}
      <div className="space-y-2">
        <Label>Link Type</Label>
        <Select value={linkType} onValueChange={(value: LinkType) => setLinkType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="documents">📄 Documents</SelectItem>
            <SelectItem value="implements">⚙️ Implements</SelectItem>
            <SelectItem value="references">🔗 References</SelectItem>
            <SelectItem value="supports">🛠️ Supports</SelectItem>
            <SelectItem value="nested">🔗 Nested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Search */}
      <div className="space-y-2">
        <Label>Search Target Entity</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button onClick={onSearch} disabled={searchLoading}>
            {searchLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <Label>Search Results</Label>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.map((result) => (
              <Card
                key={result.id}
                className={`p-3 cursor-pointer hover:bg-muted ${
                  selectedTarget?.id === result.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTarget(result)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFeatureIcon(result.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    {result.description && (
                      <div className="text-sm text-muted-foreground">{result.description}</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Target */}
      {selectedTarget && (
        <div className="space-y-2">
          <Label>Selected Target</Label>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getFeatureIcon(selectedTarget.type)}</span>
              <div className="flex-1">
                <div className="font-medium">{selectedTarget.name}</div>
                {selectedTarget.description && (
                  <div className="text-sm text-muted-foreground">{selectedTarget.description}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTarget(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Link Strength */}
      <div className="space-y-2">
        <Label>Link Strength: {linkStrength}</Label>
        <Slider
          value={[linkStrength]}
          onValueChange={(value) => setLinkStrength(value[0])}
          max={1}
          min={0}
          step={0.1}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Add notes about this link..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Create Button */}
      <Button
        onClick={onCreateLink}
        disabled={!selectedTarget}
        className="w-full"
      >
        Create Link
      </Button>
    </div>
  )
} 
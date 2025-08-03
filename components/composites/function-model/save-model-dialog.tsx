'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { type FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

interface SaveModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (options: any) => Promise<void>
  model?: FunctionModelNode
  loading?: boolean
}

export function SaveModelDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  model, 
  loading = false 
}: SaveModelDialogProps) {
  const [changeSummary, setChangeSummary] = useState('')
  const [autoVersion, setAutoVersion] = useState(true)
  const [isMajorVersion, setIsMajorVersion] = useState(false)
  const [publishOnSave, setPublishOnSave] = useState(false)
  const [authorNotes, setAuthorNotes] = useState('')
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>(model?.tags || [])

  const handleSave = async () => {
    if (!model) return

    const options: any = {
      changeSummary: changeSummary || 'Manual save',
      autoVersion,
      isMajorVersion,
      publishOnSave,
      authorNotes: authorNotes || undefined,
      tags: tags.length > 0 ? tags : undefined
    }

    await onSave(options)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Function Model</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Change Summary */}
          <div className="space-y-2">
            <Label htmlFor="change-summary">Change Summary</Label>
            <Textarea
              id="change-summary"
              placeholder="Describe what changes you made..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              rows={3}
            />
          </div>

          {/* Version Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-version">Auto Versioning</Label>
              <Switch
                id="auto-version"
                checked={autoVersion}
                onCheckedChange={setAutoVersion}
              />
            </div>
            
            {autoVersion && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="major-version">Major Version</Label>
                  <Switch
                    id="major-version"
                    checked={isMajorVersion}
                    onCheckedChange={setIsMajorVersion}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {isMajorVersion ? 'Will increment major version (e.g., 1.0.0 → 2.0.0)' : 'Will increment minor version (e.g., 1.0.0 → 1.1.0)'}
                </p>
              </div>
            )}
          </div>

          {/* Publishing */}
          <div className="flex items-center justify-between">
            <Label htmlFor="publish">Publish on Save</Label>
            <Switch
              id="publish"
              checked={publishOnSave}
              onCheckedChange={setPublishOnSave}
            />
          </div>

          {/* Author Notes */}
          <div className="space-y-2">
            <Label htmlFor="author-notes">Author Notes (Optional)</Label>
            <Textarea
              id="author-notes"
              placeholder="Additional notes about this version..."
              value={authorNotes}
              onChange={(e) => setAuthorNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Current Model Info */}
          {model && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Current Model</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Name: {model.name}</div>
                <div>Version: {model.version}</div>
                <div>Status: {model.status}</div>
                {model.lastSavedAt && (
                  <div>Last Saved: {new Date(model.lastSavedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading || !model}
          >
            {loading ? 'Saving...' : 'Save Model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
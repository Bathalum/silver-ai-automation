'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface CreateNodeLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<void>
  nodeType: string
  nodeId: string
}

export function CreateNodeLinkDialog({
  open,
  onOpenChange,
  onCreateLink,
  nodeType,
  nodeId
}: CreateNodeLinkDialogProps) {
  const [targetFeature, setTargetFeature] = useState('')
  const [targetId, setTargetId] = useState('')
  const [linkType, setLinkType] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!targetFeature || !targetId || !linkType) {
      setError('Please fill in all required fields')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const context = notes ? { notes } : undefined
      await onCreateLink(targetFeature, targetId, linkType, context)
      
      // Reset form
      setTargetFeature('')
      setTargetId('')
      setLinkType('')
      setNotes('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = () => {
    setTargetFeature('')
    setTargetId('')
    setLinkType('')
    setNotes('')
    setError(null)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Node Link</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="targetFeature">Target Feature</Label>
            <Select value={targetFeature} onValueChange={setTargetFeature}>
              <SelectTrigger>
                <SelectValue placeholder="Select target feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="function-model">Function Model</SelectItem>
                <SelectItem value="knowledge-base">Knowledge Base</SelectItem>
                <SelectItem value="spindle">Spindle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="targetId">Target ID</Label>
            <Input
              id="targetId"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter target entity ID"
            />
          </div>
          
          <div>
            <Label htmlFor="linkType">Link Type</Label>
            <Select value={linkType} onValueChange={setLinkType}>
              <SelectTrigger>
                <SelectValue placeholder="Select link type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="implements">Implements</SelectItem>
                <SelectItem value="references">References</SelectItem>
                <SelectItem value="supports">Supports</SelectItem>
                <SelectItem value="nested">Nested</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this link"
              rows={3}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
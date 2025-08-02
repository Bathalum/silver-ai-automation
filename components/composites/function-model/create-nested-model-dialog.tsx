'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Search } from 'lucide-react'
import { getAllFunctionModels } from '@/lib/application/use-cases/function-model-persistence-use-cases'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

interface CreateNestedModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateNestedLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<void>
  nodeId: string
}

export function CreateNestedModelDialog({
  open,
  onOpenChange,
  onCreateNestedLink,
  nodeId
}: CreateNestedModelDialogProps) {
  const [availableModels, setAvailableModels] = useState<FunctionModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  useEffect(() => {
    if (open) {
      loadAvailableModels()
    }
  }, [open])
  
  const loadAvailableModels = async () => {
    try {
      const models = await getAllFunctionModels()
      setAvailableModels(models)
    } catch (err) {
      setError('Failed to load available function models')
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedModelId) {
      setError('Please select a function model')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const context = notes ? { notes } : undefined
      await onCreateNestedLink('function-model', selectedModelId, 'nested', context)
      
      // Reset form
      setSelectedModelId('')
      setNotes('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nested link')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = () => {
    setSelectedModelId('')
    setNotes('')
    setSearchQuery('')
    setError(null)
    onOpenChange(false)
  }
  
  const filteredModels = availableModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Nested Function Model</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search">Search Function Models</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or description..."
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label>Select Function Model</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {filteredModels.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No models found' : 'No function models available'}
                </div>
              ) : (
                filteredModels.map(model => (
                  <div
                    key={model.modelId}
                    className={`p-2 rounded cursor-pointer border transition-colors ${
                      selectedModelId === model.modelId
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedModelId(model.modelId)}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm opacity-80 truncate">
                      {model.description}
                    </div>
                    <div className="text-xs opacity-60">
                      Version: {model.version} • Status: {model.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this nested model"
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
            <Button type="submit" disabled={loading || !selectedModelId}>
              {loading ? 'Creating...' : 'Create Nested Link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
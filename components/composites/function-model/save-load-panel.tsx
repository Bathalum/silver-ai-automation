'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Download, Upload, Clock, AlertCircle } from 'lucide-react'
import { useFunctionModelPersistence } from '@/lib/application/hooks/use-function-model-persistence'
import { SaveModelDialog } from './save-model-dialog'
import { LoadModelDialog } from './load-model-dialog'
import { type FunctionModel } from '@/lib/domain/entities/function-model-types'

interface SaveLoadPanelProps {
  modelId: string
  model?: FunctionModel
  onModelUpdate?: (model: FunctionModel) => void
}

export function SaveLoadPanel({ modelId, model, onModelUpdate }: SaveLoadPanelProps) {
  const {
    model: persistedModel,
    loading,
    error,
    saveModel,
    autoSave,
    setAutoSave,
    saveInterval,
    setSaveInterval,
    clearError
  } = useFunctionModelPersistence(modelId)

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Use provided model or fall back to persisted model
  const currentModel = model || persistedModel

  useEffect(() => {
    if (persistedModel?.lastSavedAt) {
      setLastSaved(new Date(persistedModel.lastSavedAt))
    }
  }, [persistedModel])

  const handleSave = async (options?: any) => {
    if (!currentModel) {
      console.error('No current model to save')
      return
    }

    console.log('Attempting to save model:', currentModel)
    console.log('Save options:', options)

    try {
      // Import the use case directly instead of using the hook's saveModel
      const { saveFunctionModel } = await import('@/lib/application/use-cases/function-model-persistence-use-cases')
      const savedModel = await saveFunctionModel(currentModel, options)
      console.log('Model saved successfully:', savedModel)
      setLastSaved(new Date())
      onModelUpdate?.(savedModel)
      setSaveDialogOpen(false)
    } catch (err) {
      console.error('Failed to save model:', err)
      // Show error to user
      alert(`Failed to save model: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleLoad = (loadedModel: FunctionModel) => {
    onModelUpdate?.(loadedModel)
    setLoadDialogOpen(false)
  }

  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Save & Load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-save controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
            <span className="text-sm font-medium">Auto-save</span>
          </div>
          {autoSave && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Every {saveInterval}s
            </div>
          )}
        </div>

        {/* Manual save/load buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => setSaveDialogOpen(true)}
            disabled={loading || !currentModel}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Model
          </Button>
          
          <Button 
            onClick={() => setLoadDialogOpen(true)}
            variant="outline"
            disabled={loading}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Load Version
          </Button>
        </div>

        {/* Last saved indicator */}
        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last saved: {formatLastSaved(lastSaved)}
          </div>
        )}

        {/* Error display */}
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

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Saving...
          </div>
        )}

        {/* Save dialog */}
        <SaveModelDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          onSave={handleSave}
          model={currentModel}
          loading={loading}
        />

        {/* Load dialog */}
        <LoadModelDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
          modelId={modelId}
          onLoad={handleLoad}
        />
      </CardContent>
    </Card>
  )
} 
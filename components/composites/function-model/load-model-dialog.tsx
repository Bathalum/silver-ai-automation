'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, User, FileText, AlertCircle, Download } from 'lucide-react'
import { useFunctionModelVersionControl } from '@/lib/application/hooks/use-function-model-persistence'
import { type FunctionModel } from '@/lib/domain/entities/function-model-types'
import { type VersionEntry } from '@/lib/domain/entities/version-control-types'

interface LoadModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId: string
  onLoad: (model: FunctionModel) => void
}

export function LoadModelDialog({ 
  open, 
  onOpenChange, 
  modelId, 
  onLoad 
}: LoadModelDialogProps) {
  const {
    versions: versionHistory,
    loading,
    error,
    loadVersions: loadVersionHistory,
    getVersion
  } = useFunctionModelVersionControl(modelId)

  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [selectedVersionData, setSelectedVersionData] = useState<VersionEntry | null>(null)
  const [loadingVersion, setLoadingVersion] = useState(false)

  useEffect(() => {
    if (open && modelId) {
      loadVersionHistory()
    }
  }, [open, modelId, loadVersionHistory])

  const handleVersionSelect = async (version: string) => {
    setSelectedVersion(version)
    setLoadingVersion(true)
    
    try {
      // Find the version entry from the loaded versions
      const versionEntry = versionHistory?.find(v => v.version === version)
      if (versionEntry) {
        setSelectedVersionData(versionEntry)
      }
    } catch (err) {
      console.error('Failed to load version data:', err)
    } finally {
      setLoadingVersion(false)
    }
  }

  const handleLoad = async () => {
    if (!selectedVersion) return

    try {
      setLoadingVersion(true)
      const model = await getVersion(selectedVersion)
      if (model) {
        console.log('Loading version:', selectedVersion, model)
        onLoad(model)
      } else {
        console.error('No model returned for version:', selectedVersion)
        alert('Failed to load version: No model data returned')
      }
    } catch (err) {
      console.error('Failed to load model:', err)
      alert(`Failed to load version: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoadingVersion(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  const getChangeTypeDescription = (changeType: string) => {
    switch (changeType) {
      case 'node-added': return 'Node Added'
      case 'node-removed': return 'Node Removed'
      case 'node-modified': return 'Node Modified'
      case 'edge-added': return 'Connection Added'
      case 'edge-removed': return 'Connection Removed'
      case 'metadata-changed': return 'Metadata Changed'
      default: return changeType
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Function Model Version</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Version Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Version</label>
            <Select value={selectedVersion} onValueChange={handleVersionSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a version to load..." />
              </SelectTrigger>
              <SelectContent>
                {versionHistory && versionHistory.length > 0 ? (
                  versionHistory.map((version) => (
                    <SelectItem key={version.version} value={version.version}>
                      <div className="flex items-center gap-2">
                        <span>v{version.version}</span>
                        {version.isPublished && (
                          <Badge variant="default" className="text-xs">Published</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    No versions available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Loading version history...
            </div>
          )}

          {/* Selected Version Details */}
          {selectedVersionData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Version {selectedVersionData.version}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Version Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(selectedVersionData.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedVersionData.author}</span>
                  </div>
                </div>

                {/* Changes List */}
                {selectedVersionData.changes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Changes in this version:</h4>
                    <div className="space-y-1">
                      {selectedVersionData.changes.map((change, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {getChangeTypeDescription(change.changeType)}
                          </Badge>
                          <span className="text-muted-foreground">{change.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Snapshot Info */}
                {selectedVersionData.snapshot && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Snapshot Details</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Nodes: {selectedVersionData.snapshot.nodesData?.length || 0}</div>
                      <div>Connections: {selectedVersionData.snapshot.edgesData?.length || 0}</div>
                      {selectedVersionData.snapshot.metadata?.category && (
                        <div>Category: {selectedVersionData.snapshot.metadata.category}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Version History List */}
          {!selectedVersion && versionHistory && versionHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recent Versions</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {versionHistory.slice(0, 5).map((version) => (
                  <Card 
                    key={version.version} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleVersionSelect(version.version)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{version.version}</span>
                          {version.isPublished && (
                            <Badge variant="default" className="text-xs">Published</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(version.timestamp)}
                        </div>
                      </div>
                      {version.changes.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {version.changes[0]?.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loadingVersion}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLoad}
            disabled={!selectedVersion || loadingVersion}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {loadingVersion ? 'Loading...' : 'Load Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Save, Upload, Link, Search, Plus } from 'lucide-react'
import { createFunctionModel, updateFunctionModel, getFunctionModelById } from '@/lib/application/use-cases/function-model-use-cases'
import { createFunctionModelVersion, getFunctionModelVersions, loadFunctionModelVersion, restoreModelFromVersion } from '@/lib/application/use-cases/function-model-version-control'
import { createClient } from '@/lib/supabase/client'

interface PersistenceModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab: 'save' | 'links'
  onTabChange: (tab: 'save' | 'links') => void
  modelId: string
  onVersionLoaded?: () => void // Add callback for version loading
}

interface VersionHistoryItem {
  version: string
  timestamp: Date
  author: string
  changes: string[]
  snapshot: {
    modelId: string
    version: string
    name: string
    description: string
    status: string
    timestamp: Date
  }
  isPublished: boolean
}

export function PersistenceModal({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  modelId,
  onVersionLoaded
}: PersistenceModalProps) {
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLinks, setSelectedLinks] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedVersions, setSavedVersions] = useState<VersionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [versionError, setVersionError] = useState<string | null>(null)

  // Use application layer use cases instead of direct infrastructure instantiation

  // Load current model data when modal opens
  useEffect(() => {
    if (isOpen && modelId) {
      loadCurrentModel()
      loadVersionHistory()
    }
  }, [isOpen, modelId])

  const loadCurrentModel = async () => {
    console.log('Loading current model for modelId:', modelId)
    
    if (!modelId) {
      console.warn('No modelId provided')
      setSaveName('New Function Model')
      setSaveDescription('')
      return
    }
    
    setIsLoading(true)
    setLoadError(null)
    
    try {
      const currentModel = await getFunctionModelById(modelId)
      console.log('Current model result:', currentModel)
      if (currentModel) {
        setSaveName(currentModel.name || '')
        setSaveDescription(currentModel.description || '')
        console.log('Set save name to:', currentModel.name)
        console.log('Set save description to:', currentModel.description)
      } else {
        // Model doesn't exist, set default values
        setSaveName('New Function Model')
        setSaveDescription('')
        console.warn('Model not found, using default values')
        setLoadError('Model not found. Creating new model.')
      }
    } catch (error) {
      console.error('Failed to load current model:', error)
      // Set default values on error
      setSaveName('New Function Model')
      setSaveDescription('')
      setLoadError(error instanceof Error ? error.message : 'Failed to load model')
      // Could show a toast notification here if needed
    } finally {
      setIsLoading(false)
    }
  }

  const loadVersionHistory = async () => {
    if (!modelId) return
    
    setIsLoadingVersions(true)
    setVersionError(null)
    
    try {
      const versions = await getFunctionModelVersions(modelId)
      console.log('Loaded versions:', versions)
      // Transform VersionEntry[] to VersionHistoryItem[]
      const transformedVersions: VersionHistoryItem[] = versions.map(version => ({
        version: version.version,
        timestamp: version.createdAt,
        author: version.createdBy || 'Unknown',
        changes: [version.changeSummary],
        snapshot: {
          modelId: version.modelId,
          version: version.version,
          name: 'Model Snapshot', // This would need to be extracted from the version data
          description: version.changeSummary,
          status: 'draft',
          timestamp: version.createdAt
        },
        isPublished: false
      }))
      setSavedVersions(transformedVersions)
    } catch (error) {
      console.error('Failed to load version history:', error)
      setVersionError(error instanceof Error ? error.message : 'Failed to load versions')
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaveStatus('saving')
      setSaveError(null)
      
      // Get current user ID
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      
      if (!userId) {
        throw new Error('User not authenticated')
      }
      
      // Get current model state for comprehensive snapshot
      const currentModel = await getFunctionModelById(modelId)
      
      // Update the current model with new name and description
      await updateFunctionModel(modelId, {
        name: saveName || 'Unnamed Model',
        description: saveDescription || ''
      })
      
      // Create a comprehensive version snapshot including node data
      const versionData = {
        version: `v${Date.now()}`, // Simple versioning for now
        snapshot: {
          name: saveName || 'Unnamed Model',
          description: saveDescription || '',
          status: 'draft',
          timestamp: new Date().toISOString(),
          // Include model metadata for better versioning
          modelId: modelId,
          version: currentModel?.version || '1.0.0',
          lastSavedAt: new Date().toISOString(),
          // Note: Node data is preserved separately in the nodes table
          // This snapshot focuses on model-level metadata
          // Node and connection counts are calculated dynamically
        },
        author: userId, // Use actual user ID instead of hardcoded string
        isPublished: false,
        // Add metadata about what this version contains
        versionType: 'model-metadata', // Distinguish from node-only versions
        includesNodes: false, // Node data is handled separately
        includesConnections: false // Connection data is handled separately
      }
      
      console.log('Saving comprehensive version with data:', versionData)
      // Use the application layer use case for creating versions
      await createFunctionModelVersion(modelId, [], [], 'Model metadata updated', userId)
      
      setSaveStatus('success')
      // Refresh the saved versions list
      await loadVersionHistory()
      
      // Clear success status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save model:', error)
      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : 'Failed to save model')
      // Clear error status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveError(null)
      }, 5000)
    }
  }

  const handleLoad = async (version: string) => {
    try {
      console.log('Loading version:', version)
      setLoadError(null) // Clear any previous errors
      
      // Show confirmation dialog for version restoration
      const confirmed = window.confirm(
        `Are you sure you want to restore version "${version}"? This will replace the current model state with the version data.`
      )
      
      if (!confirmed) {
        return
      }

      console.log('Starting version restoration...')
      
      // Use the new complete restoration functionality
      const result = await restoreModelFromVersion(modelId, version)
      
      console.log('Version restoration result:', result)
      
      if (!result.success) {
        throw new Error(`Version restoration failed: ${result.errors.join(', ')}`)
      }
      
      console.log('Version restoration completed successfully')
      
      // Reload the current model to reflect changes
      await loadCurrentModel()
      
      // Show success message
      console.log('Version loaded successfully with complete state restoration')
      
      // Close the modal after successful load
      onClose()
      
      // Notify parent component that version was loaded
      onVersionLoaded?.()
    } catch (error) {
      console.error('Failed to load version:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load version'
      setLoadError(errorMessage)
      
      // Show error to user
      alert(`Failed to load version: ${errorMessage}`)
    }
  }

  const handleCreateLink = async () => {
    try {
      // TODO: Implement cross-feature linking
      console.log('Creating cross-feature link')
      // This would create a link to another feature in the system
    } catch (error) {
      console.error('Failed to create link:', error)
    }
  }

  const handleSearchLinks = async () => {
    try {
      // TODO: Implement link search
      console.log('Searching links:', searchTerm)
      // This would search for existing cross-feature links
    } catch (error) {
      console.error('Failed to search links:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Persistence & Links
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'save' | 'links')} className="h-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="save" className="text-sm font-medium">Save/Load</TabsTrigger>
              <TabsTrigger value="links" className="text-sm font-medium">Cross-Links</TabsTrigger>
            </TabsList>

            {/* Save/Load Tab with Proper Scrolling */}
            <TabsContent value="save" className="h-[calc(90vh-200px)] overflow-y-auto pr-2 space-y-6">
              {/* Enhanced Save Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Save className="w-5 h-5 text-blue-600" />
                    Save Model
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Save the current state of your function model
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <Input
                      value={isLoading ? 'Loading...' : saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Enter model name"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    {loadError && (
                      <p className="text-sm text-red-600">{loadError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <Textarea
                      value={isLoading ? 'Loading...' : saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="Enter description"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    onClick={handleSave} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={saveStatus === 'saving'}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Model'}
                  </Button>
                  {saveStatus === 'success' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">Model saved successfully!</p>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{saveError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Load Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="w-5 h-5 text-green-600" />
                    Load Model
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Load a previously saved version
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingVersions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading versions...</div>
                    </div>
                  ) : versionError ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{versionError}</p>
                    </div>
                  ) : savedVersions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No saved versions found</p>
                      <p className="text-sm mt-2">Save the model to create your first version</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedVersions.map((version) => (
                        <div
                          key={version.version}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-colors duration-200"
                          onClick={() => handleLoad(version.version)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {version.snapshot.name || 'Unnamed Model'}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {version.snapshot.description || 'No description'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {version.timestamp.toLocaleDateString()} at {version.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {version.isPublished && (
                                <Badge variant="default" className="text-xs">Published</Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">{version.version}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cross-Links Tab with Proper Scrolling */}
            <TabsContent value="links" className="h-[calc(90vh-200px)] overflow-y-auto pr-2 space-y-6">
              {/* Enhanced Search Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Search className="w-5 h-5 text-purple-600" />
                    Search Links
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Find and create cross-feature links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search for entities..."
                      className="flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <Button 
                      onClick={handleSearchLinks} 
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Create Link Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Link className="w-5 h-5 text-indigo-600" />
                    Create Link
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Link to other features in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleCreateLink} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Link
                  </Button>
                </CardContent>
              </Card>

              {/* Enhanced Existing Links Section */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Existing Links</CardTitle>
                  <CardDescription className="text-gray-600">
                    Currently linked entities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Mock existing links with enhanced styling */}
                    {[
                      { id: '1', type: 'knowledge-base', name: 'Customer SOP', description: 'Standard operating procedure' },
                      { id: '2', type: 'event-storm', name: 'Order Processing', description: 'Event storm diagram' },
                      { id: '3', type: 'spindle', name: 'Payment Flow', description: 'Spindle workflow' }
                    ].map((link) => (
                      <div
                        key={link.id}
                        className="p-4 border border-gray-200 rounded-lg bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{link.name}</h4>
                            <p className="text-sm text-gray-600">{link.description}</p>
                          </div>
                          <Badge variant="outline" className="ml-3 capitalize">{link.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
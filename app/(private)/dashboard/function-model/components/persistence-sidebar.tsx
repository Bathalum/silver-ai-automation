'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Save, Upload, Link, Search, Plus } from 'lucide-react'

interface PersistenceSidebarProps {
  isOpen: boolean
  onClose: () => void
  activeTab: 'save' | 'links'
  onTabChange: (tab: 'save' | 'links') => void
  modelId: string
}

export function PersistenceSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  modelId
}: PersistenceSidebarProps) {
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLinks, setSelectedLinks] = useState<string[]>([])

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving model:', { modelId, saveName, saveDescription })
  }

  const handleLoad = (versionId: string) => {
    // TODO: Implement load functionality
    console.log('Loading version:', versionId)
  }

  const handleCreateLink = () => {
    // TODO: Implement cross-feature linking
    console.log('Creating cross-feature link')
  }

  const handleSearchLinks = () => {
    // TODO: Implement link search
    console.log('Searching links:', searchTerm)
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Persistence & Links</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'save' | 'links')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="save">Save/Load</TabsTrigger>
            <TabsTrigger value="links">Cross-Links</TabsTrigger>
          </TabsList>

          {/* Save/Load Tab */}
          <TabsContent value="save" className="p-4 space-y-4">
            {/* Save Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Model
                </CardTitle>
                <CardDescription>
                  Save the current state of your function model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Enter model name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Enter description"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Model
                </Button>
              </CardContent>
            </Card>

            {/* Load Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Load Model
                </CardTitle>
                <CardDescription>
                  Load a previously saved version
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Mock saved versions */}
                  {[
                    { id: '1', name: 'Customer Onboarding v1.2', description: 'Latest version with improved flow', date: '2024-01-15' },
                    { id: '2', name: 'Customer Onboarding v1.1', description: 'Previous version with basic flow', date: '2024-01-10' },
                    { id: '3', name: 'Customer Onboarding v1.0', description: 'Initial version', date: '2024-01-05' }
                  ].map((version) => (
                    <div
                      key={version.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleLoad(version.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{version.name}</h4>
                          <p className="text-sm text-gray-600">{version.description}</p>
                          <p className="text-xs text-gray-500">{version.date}</p>
                        </div>
                        <Badge variant="secondary">v{version.id}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cross-Links Tab */}
          <TabsContent value="links" className="p-4 space-y-4">
            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search Links
                </CardTitle>
                <CardDescription>
                  Find and create cross-feature links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for entities..."
                    className="flex-1"
                  />
                  <Button onClick={handleSearchLinks} size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Create Link Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Create Link
                </CardTitle>
                <CardDescription>
                  Link to other features in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCreateLink} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Link
                </Button>
              </CardContent>
            </Card>

            {/* Existing Links Section */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Links</CardTitle>
                <CardDescription>
                  Currently linked entities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Mock existing links */}
                  {[
                    { id: '1', type: 'knowledge-base', name: 'Customer SOP', description: 'Standard operating procedure' },
                    { id: '2', type: 'event-storm', name: 'Order Processing', description: 'Event storm diagram' },
                    { id: '3', type: 'spindle', name: 'Payment Flow', description: 'Spindle workflow' }
                  ].map((link) => (
                    <div
                      key={link.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{link.name}</h4>
                          <p className="text-sm text-gray-600">{link.description}</p>
                        </div>
                        <Badge variant="outline">{link.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 
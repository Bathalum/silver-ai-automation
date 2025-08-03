'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ReactFlowProvider } from 'reactflow'
import { ArrowLeft, Settings, Save, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Import the new node-based canvas
import { FunctionModelCanvas } from './function-model-canvas'

// Import existing components for backward compatibility
// SaveLoadPanel removed - using node-based persistence instead
import { CrossFeatureLinkingModal } from '@/components/composites/cross-feature-linking-modal'

// Import new node-based components
import { FloatingToolbar } from './floating-toolbar'
import { PersistenceSidebar } from './persistence-sidebar'
import { ModalStack } from './modal-stack'

interface FunctionModelDashboardEnhancedProps {
  modelId: string
  initialModel?: any // For backward compatibility
}

export function FunctionModelDashboardEnhanced({ 
  modelId, 
  initialModel 
}: FunctionModelDashboardEnhancedProps) {
  const router = useRouter()
  
  // State management for UI components
  const [persistenceSidebarOpen, setPersistenceSidebarOpen] = useState(false)
  const [activePersistenceTab, setActivePersistenceTab] = useState<'save' | 'links'>('save')
  const [crossFeatureLinkingOpen, setCrossFeatureLinkingOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [modelName, setModelName] = useState(initialModel?.name || 'Function Model')
  const [modelDescription, setModelDescription] = useState(initialModel?.description || '')

  // Handle navigation back to list
  const handleBackToList = useCallback(() => {
    router.push('/dashboard/function-model/list')
  }, [router])

  // Handle name editing
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModelName(e.target.value)
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModelDescription(e.target.value)
  }, [])

  const finishEditing = useCallback(() => setIsEditingName(false), [])
  const finishDescriptionEditing = useCallback(() => setIsEditingDescription(false), [])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') finishEditing()
  }, [finishEditing])

  const handleDescriptionKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) finishDescriptionEditing()
  }, [finishDescriptionEditing])

  // Handle persistence sidebar
  const handleTogglePersistence = useCallback(() => {
    setPersistenceSidebarOpen(!persistenceSidebarOpen)
  }, [persistenceSidebarOpen])

  // Handle cross-feature linking
  const handleCrossFeatureLinking = useCallback(() => {
    setCrossFeatureLinkingOpen(true)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to List</span>
          </Button>
          
          <div className="flex flex-col space-y-1">
            {isEditingName ? (
              <input
                type="text"
                value={modelName}
                onChange={handleNameChange}
                onBlur={finishEditing}
                onKeyDown={handleNameKeyDown}
                className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                autoFocus
              />
            ) : (
              <h1 
                className="text-xl font-semibold cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                onClick={() => setIsEditingName(true)}
              >
                {modelName}
              </h1>
            )}
            
            {isEditingDescription ? (
              <textarea
                value={modelDescription}
                onChange={handleDescriptionChange}
                onBlur={finishDescriptionEditing}
                onKeyDown={handleDescriptionKeyDown}
                className="text-sm text-gray-600 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 resize-none"
                rows={2}
                autoFocus
              />
            ) : (
              <p 
                className="text-sm text-gray-600 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                onClick={() => setIsEditingDescription(true)}
              >
                {modelDescription || 'Click to add description'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCrossFeatureLinking}
                  className="flex items-center space-x-2"
                >
                  <Link className="h-4 w-4" />
                  <span>Cross-Link</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Link to other features</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePersistence}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save/Load</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save or load model</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Model settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <FunctionModelCanvas modelId={modelId} />
        </ReactFlowProvider>
      </div>

      {/* Persistence Sidebar */}
      <PersistenceSidebar
        isOpen={persistenceSidebarOpen}
        onClose={() => setPersistenceSidebarOpen(false)}
        activeTab={activePersistenceTab}
        onTabChange={setActivePersistenceTab}
        modelId={modelId}
      />

      {/* Cross-Feature Linking Modal */}
      <CrossFeatureLinkingModal
        isOpen={crossFeatureLinkingOpen}
        onClose={() => setCrossFeatureLinkingOpen(false)}
        modelId={modelId}
      />
    </div>
  )
} 
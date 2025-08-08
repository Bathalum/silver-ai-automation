'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FunctionModelList } from '@/components/composites/function-model/function-model-list'
import { getAllFunctionModelsWithNodeStats, createFunctionModel, deleteFunctionModelWithConfirmation, duplicateFunctionModelWithName } from '@/lib/application/use-cases/function-model-management-use-cases'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

export default function FunctionModelListPage() {
  const router = useRouter()
  const [models, setModels] = useState<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Load models using the correct function model approach with node stats
    const loadModels = async () => {
      try {
        setLoading(true)
        setError(null)
        const functionModelsWithStats = await getAllFunctionModelsWithNodeStats()
        setModels(functionModelsWithStats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [])

  const updateFilters = (newFilters: any) => {
    setFilters(newFilters)
  }

  const updateSearchQuery = (query: string) => {
    setSearchQuery(query)
  }

  const handleCreateNew = async () => {
    try {
      // Show loading state
      setLoading(true)
      
      // Create a new function model using the correct approach
      const newModel = await createFunctionModel({
        name: 'New Function Model',
        description: 'A new function model',
        status: 'draft'
      })
      
      // Navigate to the new model
      router.push(`/dashboard/function-model/${newModel.modelId}`)
    } catch (err) {
      console.error('Failed to create new model:', err)
      setError(err instanceof Error ? err.message : 'Failed to create new model')
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }
  
  const handleModelSelect = (modelId: string) => {
    router.push(`/dashboard/function-model/${modelId}`)
  }
  
  const handleModelDelete = async (modelId: string) => {
    try {
      await deleteFunctionModelWithConfirmation(modelId)
      // Reload models after deletion
      const functionModels = await getAllFunctionModelsWithNodeStats()
      setModels(functionModels)
    } catch (err) {
      console.error('Failed to delete model:', err)
      // You might want to show a toast notification here
    }
  }
  
  const handleModelDuplicate = async (modelId: string) => {
    try {
      const duplicatedModel = await duplicateFunctionModelWithName(modelId)
      // Reload models after duplication
      const functionModels = await getAllFunctionModelsWithNodeStats()
      setModels(functionModels)
      // Navigate to the new duplicated model
      router.push(`/dashboard/function-model/${duplicatedModel.modelId}`)
    } catch (err) {
      console.error('Failed to duplicate model:', err)
      // You might want to show a toast notification here
    }
  }
  
  return (
    <div className="w-full h-full">
      {/* Create New Button - Floating */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          onClick={handleCreateNew}
          disabled={loading}
          className="rounded-full shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {loading ? 'Creating...' : 'New Model'}
        </Button>
      </div>

      <FunctionModelList
        models={models}
        loading={loading}
        error={error}
        onModelSelect={handleModelSelect}
        onModelDelete={handleModelDelete}
        onModelDuplicate={handleModelDuplicate}
        onFiltersChange={updateFilters}
        onSearchChange={updateSearchQuery}
        filters={filters}
        searchQuery={searchQuery}
      />
    </div>
  )
} 
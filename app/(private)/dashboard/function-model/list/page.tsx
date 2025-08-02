'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FunctionModelList } from '@/components/composites/function-model/function-model-list'
import { useFunctionModelList } from '@/lib/application/hooks/use-function-model-persistence'
import { createNewFunctionModel } from '@/lib/application/use-cases/function-model-persistence-use-cases'

export default function FunctionModelListPage() {
  const router = useRouter()
  const {
    models,
    loading,
    error,
    filters,
    searchQuery,
    loadModels,
    duplicateModel,
    deleteModel,
    updateFilters,
    updateSearchQuery
  } = useFunctionModelList()
  
  useEffect(() => {
    loadModels()
  }, [loadModels])
  
  const handleCreateNew = async () => {
    try {
      // Create a new model with a default name
      const newModel = await createNewFunctionModel(
        'Untitled Function Model',
        'New function model - click to edit description'
      )
      
      // Navigate directly to the canvas
      router.push(`/dashboard/function-model/${newModel.modelId}`)
    } catch (err) {
      console.error('Failed to create new model:', err)
      // You might want to show a toast notification here
    }
  }
  
  const handleModelSelect = (modelId: string) => {
    router.push(`/dashboard/function-model/${modelId}`)
  }
  
  const handleModelDelete = async (modelId: string) => {
    try {
      await deleteModel(modelId)
    } catch (err) {
      console.error('Failed to delete model:', err)
      // You might want to show a toast notification here
    }
  }
  
  const handleModelDuplicate = async (modelId: string) => {
    try {
      const duplicatedModel = await duplicateModel(modelId)
      // Optionally navigate to the duplicated model
      router.push(`/dashboard/function-model/${duplicatedModel.modelId}`)
    } catch (err) {
      console.error('Failed to duplicate model:', err)
      // You might want to show a toast notification here
    }
  }
  
  return (
    <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Function Models</h1>
            <p className="text-muted-foreground mt-2">
              Create, manage, and organize your function models
            </p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Model
          </Button>
        </div>
        
        {/* List Component */}
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
    </div>
  )
} 
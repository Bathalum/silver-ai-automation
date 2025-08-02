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
    <div className="w-full h-full">
      {/* Create New Button - Floating */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          onClick={handleCreateNew}
          className="rounded-full shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Model
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
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FunctionModelList } from '@/components/composites/function-model/function-model-list'

export default function FunctionModelListPage() {
  const router = useRouter()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Load models using node-based approach
    const loadModels = async () => {
      try {
        setLoading(true)
        // TODO: Implement model loading using node-based use cases
        setModels([])
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
      // Use node-based use cases instead of legacy persistence
      const { createFunctionModelNode } = await import('@/lib/application/use-cases/function-model-use-cases')
      
      // Create a new model using node-based approach
      const newModelNode = await createFunctionModelNode(
        'functionModelContainerNode',
        'New Function Model',
        { x: 0, y: 0 },
        'new-model-id',
        {
          description: 'A new function model',
          businessLogic: {
            complexity: 'simple',
            estimatedDuration: 0,
            sla: undefined,
            kpis: []
          },
          processBehavior: {
            executionType: 'sequential',
            dependencies: [],
            triggers: []
          }
        }
      )
      
      // Navigate to the new model
      router.push(`/dashboard/function-model/${newModelNode.modelId}`)
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
      // TODO: Implement model deletion using node-based use cases
      console.log('Delete model:', modelId)
    } catch (err) {
      console.error('Failed to delete model:', err)
      // You might want to show a toast notification here
    }
  }
  
  const handleModelDuplicate = async (modelId: string) => {
    try {
      // TODO: Implement model duplication using node-based use cases
      console.log('Duplicate model:', modelId)
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
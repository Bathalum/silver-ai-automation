'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { FunctionProcessDashboard } from '../components/function-process-dashboard'
import { loadFunctionModel } from '@/lib/application/use-cases/function-model-persistence-use-cases'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

export default function FunctionModelCanvasPage() {
  const params = useParams()
  const router = useRouter()
  const modelId = params.modelId as string
  
  const [model, setModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const loadModel = async () => {
      if (!modelId) {
        setError('No model ID provided')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        const loadedModel = await loadFunctionModel(modelId)
        setModel(loadedModel)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model')
      } finally {
        setLoading(false)
      }
    }
    
    loadModel()
  }, [modelId])
  
  const handleBackToList = () => {
    router.push('/dashboard/function-model/list')
  }
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="w-full h-full p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }
  
  if (!model) {
    return (
      <div className="w-full h-full p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Model not found
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full">
      <FunctionProcessDashboard functionModel={model} />
    </div>
  )
} 
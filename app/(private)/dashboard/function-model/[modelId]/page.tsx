'use client'

import { useParams } from 'next/navigation'
import { FunctionModelDashboard } from '@/components/composites/function-model/function-model-dashboard'

export default function FunctionModelPage() {
  const params = useParams()
  const modelId = params.modelId as string
  
  if (!modelId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Model ID Provided</h2>
          <p className="text-gray-600">Please provide a valid model ID to view the function model.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full">
      <FunctionModelDashboard modelId={modelId} />
    </div>
  )
} 
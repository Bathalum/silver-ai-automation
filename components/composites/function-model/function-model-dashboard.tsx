'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { FunctionModelContainer } from '@/components/composites/function-model/function-model-container'

interface FunctionModelDashboardProps {
  modelId?: string
  readOnly?: boolean
}

export function FunctionModelDashboard({ 
  modelId: propModelId, 
  readOnly = false 
}: FunctionModelDashboardProps) {
  const params = useParams()
  const modelId = propModelId || (params.modelId as string)
  
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
      <FunctionModelContainer modelId={modelId} readOnly={readOnly} />
    </div>
  )
} 
'use client'

import React from 'react'
import { NodeProps } from '@xyflow/react'

export interface IONodeData extends Record<string, unknown> {
  id: string
  type: string
  name: string
  description: string
  status: 'idle' | 'active' | 'error' | 'completed'
  priority: 'low' | 'medium' | 'high'
  raci: {
    responsible: string
    accountable: string
    consulted: string
    informed: string
  }
  ioType: 'input' | 'output' | 'bidirectional'
  dataContract: string
  dataType: string
  isRequired: boolean
  defaultValue: string
  validationRules: string[]
  position: { x: number; y: number }
  // New properties for enhanced UI
  dataFlow?: 'inbound' | 'outbound' | 'bidirectional'
  throughput?: number
  lastProcessed?: string
  errorCount?: number
  isProcessing?: boolean
  processingProgress?: number
}

export function IONode({ id, data, selected = false }: { id: string; data: any; selected?: boolean }) {
  console.log('IONode rendering with data:', data)

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[280px] ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900">{data.name}</h3>
        <p className="text-xs text-gray-600">{data.description}</p>
        <div className="mt-2 text-xs text-gray-500">
          Type: {data.ioType} | Status: {data.status}
        </div>
      </div>
    </div>
  )
}

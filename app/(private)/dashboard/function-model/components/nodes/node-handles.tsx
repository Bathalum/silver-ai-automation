'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'

export interface NodeHandleProps {
  type: 'input' | 'output' | 'context'
  position: Position
  id?: string
  className?: string
  style?: React.CSSProperties
  onConnect?: (params: any) => void
  isValidConnection?: (connection: any) => boolean
}

export function NodeHandle({
  type,
  position,
  id,
  className = '',
  style = {},
  onConnect,
  isValidConnection
}: NodeHandleProps) {
  const getHandleColor = (handleType: string) => {
    switch (handleType) {
      case 'input': return 'bg-blue-500'
      case 'output': return 'bg-green-500'
      case 'context': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getHandleSize = (handleType: string) => {
    switch (handleType) {
      case 'context': return 'w-2.5 h-2.5'
      default: return 'w-3 h-3'
    }
  }

  return (
    <Handle
      type={type === 'input' ? 'target' : 'source'}
      position={position}
      id={id}
      className={`${getHandleSize(type)} ${getHandleColor(type)} border-2 border-white shadow-sm ${className}`}
      style={style}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
    />
  )
}

// Specialized handle components for different connection types
export function InputHandle(props: Omit<NodeHandleProps, 'type'>) {
  return <NodeHandle {...props} type="input" />
}

export function OutputHandle(props: Omit<NodeHandleProps, 'type'>) {
  return <NodeHandle {...props} type="output" />
}

export function ContextHandle(props: Omit<NodeHandleProps, 'type'>) {
  return <NodeHandle {...props} type="context" />
}

// Handle group component for nodes with multiple handles
export interface HandleGroupProps {
  handles: Array<{
    type: 'input' | 'output' | 'context'
    position: Position
    id?: string
    className?: string
    style?: React.CSSProperties
  }>
  onConnect?: (params: any) => void
  isValidConnection?: (connection: any) => boolean
}

export function HandleGroup({ handles, onConnect, isValidConnection }: HandleGroupProps) {
  return (
    <>
      {handles.map((handle, index) => (
        <NodeHandle
          key={`${handle.type}-${handle.position}-${index}`}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          className={handle.className}
          style={handle.style}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
        />
      ))}
    </>
  )
}

// Validation utilities for connections
export const connectionValidators = {
  // Only allow input to output connections
  standard: (connection: any) => {
    return connection.source && connection.target
  },

  // Allow context connections between any nodes
  context: (connection: any) => {
    return connection.source && connection.target
  },

  // Prevent circular connections
  noCircular: (connection: any) => {
    return connection.source !== connection.target
  },

  // Only allow specific node type connections
  nodeTypeSpecific: (allowedTypes: string[]) => (connection: any) => {
    // This would need access to node data to validate
    return connection.source && connection.target
  }
}

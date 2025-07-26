"use client"

import type React from "react"
import { memo, useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
// Try importing NodeResizer from 'reactflow' (standard in v11+)
import { NodeResizer } from '@xyflow/react';

interface CustomNodeProps {
  id: string
  data: {
    label: string
    description?: string
    width?: number
    height?: number
  }
  type: string
  selected?: boolean
  parentId?: string
  children?: React.ReactNode
  childCount?: number
  onDotMouseDown?: (nodeId: string, position: "top" | "bottom" | "left" | "right", event: React.MouseEvent) => void
  onDotMouseUp?: (nodeId: string, position: "top" | "bottom" | "left" | "right", event: React.MouseEvent) => void
  onDotMouseEnter?: (nodeId: string, position: "top" | "bottom" | "left" | "right") => void
  onDotMouseLeave?: (nodeId: string, position: "top" | "bottom" | "left" | "right") => void
  isConnecting?: boolean
  connectingFrom?: { nodeId: string; position: "top" | "bottom" | "left" | "right" } | null
  onContextMenu?: (nodeId: string, event: React.MouseEvent) => void
  onLabelChange?: (nodeId: string, newLabel: string) => void
  onNodeClick?: (nodeId: string, event: React.MouseEvent) => void
  onResize?: (nodeId: string, width: number, height: number) => void
  onDragOver?: (nodeId: string, event: React.DragEvent) => void
  onDrop?: (nodeId: string, event: React.DragEvent) => void
  isDragOver?: boolean
}

const nodeStyles: Record<string, string> = {
  event: "bg-orange-100 border-orange-300 text-orange-800",
  command: "bg-blue-100 border-blue-300 text-blue-800",
  aggregate: "bg-purple-100 border-purple-300 text-purple-800",
  policy: "bg-green-100 border-green-300 text-green-800",
  externalSystem: "bg-red-100 border-red-300 text-red-800",
  readModel: "bg-yellow-100 border-yellow-300 text-yellow-800",
  ui: "bg-pink-100 border-pink-300 text-pink-800",
  function: "bg-slate-50 border-slate-400 text-slate-800 border-dashed",
  input: "bg-green-50 border-green-400 text-green-700 rounded-full",
  output: "bg-red-50 border-red-400 text-red-700 rounded-full",
}

// Get default dimensions for each node type
export const getNodeDimensions = (type: string, customWidth?: number, customHeight?: number) => {
  const isCircular = type === "input" || type === "output"
  const isFunction = type === "function"

  let defaultWidth = 120
  let defaultHeight = 60

  if (isCircular) {
    defaultWidth = 80
    defaultHeight = 80
  } else if (isFunction) {
    defaultWidth = 300
    defaultHeight = 200
  }

  return {
    width: customWidth || defaultWidth,
    height: customHeight || defaultHeight,
  }
}

// Get exact connection point coordinates relative to node center
export const getConnectionPoint = (
  position: "top" | "bottom" | "left" | "right",
  nodeType: string,
  width?: number,
  height?: number,
) => {
  const { width: w, height: h } = getNodeDimensions(nodeType, width, height)

  switch (position) {
    case "top":
      return { x: 0, y: -h / 2 }
    case "bottom":
      return { x: 0, y: h / 2 }
    case "left":
      return { x: -w / 2, y: 0 }
    case "right":
      return { x: w / 2, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}

export const CustomNode = () => (
  <div style={{
    width: 120,
    height: 60,
    background: 'red',
    border: '2px solid black',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }}>
    DEBUG NODE
  </div>
);

CustomNode.displayName = "CustomNode"

"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Edit3, Copy, Trash2, LayoutGrid, MoveUp } from "lucide-react"
import useSpindleStore from "@/lib/stores/spindle-store"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  OnConnect,
  ReactFlowInstance,
  NodeTypes,
  Panel,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";

interface NodeContextMenuProps {
  position: { x: number; y: number }
  nodeId: string
  onEdit: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onRemoveFromContainer: (nodeId: string) => void
  onAutoLayout: (nodeId: string) => void
  onClose: () => void
}

export function NodeContextMenu({
  position,
  nodeId,
  onEdit,
  onDuplicate,
  onDelete,
  onRemoveFromContainer,
  onAutoLayout,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { nodes, getChildNodes } = useSpindleStore()

  const node = nodes.find((n) => n.id === nodeId)
  const isFunction = node?.type === "function"
  const hasParent = !!node?.parentId
  const childCount = isFunction ? getChildNodes(nodeId).length : 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  // Adjust position to keep menu within viewport
  const safeWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const safeWindowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const adjustedPosition = {
    x: Math.min(position.x, safeWindowWidth - 200),
    y: Math.min(position.y, safeWindowHeight - 300),
  }

  return (
    <Card
      ref={menuRef}
      className="absolute z-50 w-48 p-1 shadow-lg border bg-white"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start h-8" onClick={() => onEdit(nodeId)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Details
        </Button>

        <Button variant="ghost" size="sm" className="w-full justify-start h-8" onClick={() => onDuplicate(nodeId)}>
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </Button>

        <Separator />

        {isFunction && childCount > 0 && (
          <>
            <Button variant="ghost" size="sm" className="w-full justify-start h-8" onClick={() => onAutoLayout(nodeId)}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Auto Layout Children
            </Button>
            <Separator />
          </>
        )}

        {hasParent && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => onRemoveFromContainer(nodeId)}
            >
              <MoveUp className="w-4 h-4 mr-2" />
              Remove from Container
            </Button>
            <Separator />
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(nodeId)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </Card>
  )
}

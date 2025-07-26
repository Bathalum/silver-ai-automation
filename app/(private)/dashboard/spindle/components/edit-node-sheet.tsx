"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, X, GripVertical, Trash2, Edit3, Plus } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface CanvasNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: { label: string; description?: string; width?: number; height?: number }
  parentId?: string
  order?: number
}

interface EditNodeSheetProps {
  open: boolean
  setOpen: (open: boolean) => void
  node: CanvasNode | null
  onNodeChange: (node: CanvasNode) => void
  childNodes: CanvasNode[]
  onReorderChildNodes: (nodeId: string, newOrder: string[]) => void
  onRemoveNodeFromContainer: (nodeId: string) => void
  canvasId: string | null
}

const nodeTypeLabels: Record<string, string> = {
  event: "Domain Event",
  command: "Command",
  aggregate: "Aggregate",
  policy: "Policy",
  externalSystem: "External System",
  readModel: "Read Model",
  ui: "User Interface",
  function: "Function/Domain",
  input: "Input",
  output: "Output",
}

const nodeTypeColors: Record<string, string> = {
  event: "bg-orange-100 text-orange-800 border-orange-300",
  command: "bg-blue-100 text-blue-800 border-blue-300",
  aggregate: "bg-purple-100 text-purple-800 border-purple-300",
  policy: "bg-green-100 text-green-800 border-green-300",
  externalSystem: "bg-red-100 text-red-800 border-red-300",
  readModel: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ui: "bg-pink-100 text-pink-800 border-pink-300",
  function: "bg-slate-100 text-slate-800 border-slate-300",
  input: "bg-green-100 text-green-800 border-green-300",
  output: "bg-red-100 text-red-800 border-red-300",
}

export function EditNodeSheet({ open, setOpen, node, onNodeChange, childNodes, onReorderChildNodes, onRemoveNodeFromContainer, canvasId }: EditNodeSheetProps) {
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [width, setWidth] = useState<number | undefined>()
  const [height, setHeight] = useState<number | undefined>()

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "")
      setDescription(node.data.description || "")
      setWidth(node.data.width)
      setHeight(node.data.height)
    }
  }, [node])

  const handleSave = () => {
    if (!node) return

    const updatedNode: CanvasNode = {
      ...node,
      data: {
        ...node.data,
        label: label.trim(),
        description: description.trim() || undefined,
        width: width,
        height: height,
      },
    }

    onNodeChange(updatedNode)
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination || !node) return

    const items = Array.from(childNodes)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const newOrder = items.map((item) => item.id)
    onReorderChildNodes(node.id, newOrder)
  }

  const handleRemoveChild = (childId: string) => {
    onRemoveNodeFromContainer(childId)
  }

  if (!node) return null

  const nodeTypeLabel = nodeTypeLabels[node.type] || node.type
  const nodeTypeColor = nodeTypeColors[node.type] || "bg-gray-100 text-gray-800 border-gray-300"
  const isFunction = node.type === "function"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge className={`${nodeTypeColor} border`}>{nodeTypeLabel}</Badge>
            Edit Node Details
          </SheetTitle>
          <SheetDescription>
            Update the properties and content of this {nodeTypeLabel.toLowerCase()}.
            {canvasId && <div className="text-xs mt-1 text-gray-500">Canvas: {canvasId}</div>}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-6 py-4">
            {/* Basic Properties */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter node label..."
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description..."
                  className="w-full min-h-[100px]"
                />
              </div>

              {isFunction && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={width || ""}
                      onChange={(e) => setWidth(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                      placeholder="300"
                      min="200"
                      max="800"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={height || ""}
                      onChange={(e) => setHeight(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                      placeholder="200"
                      min="100"
                      max="600"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Child Nodes Management - Only for Function nodes */}
            {isFunction && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Child Nodes</h3>
                    <p className="text-sm text-gray-600">Manage and reorder the nodes within this function boundary</p>
                  </div>
                  <Badge variant="secondary">{childNodes.length} items</Badge>
                </div>

                {childNodes.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Node Sequence</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="child-nodes">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {childNodes.map((child, index) => (
                                <Draggable key={child.id} draggableId={child.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`
                                        flex items-center gap-3 p-3 bg-white border rounded-lg transition-all
                                        ${snapshot.isDragging ? "shadow-lg scale-105" : "hover:shadow-sm"}
                                      `}
                                    >
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                      </div>

                                      <Badge
                                        className={`${nodeTypeColors[child.type] || nodeTypeColors.event} text-xs`}
                                      >
                                        {nodeTypeLabels[child.type] || child.type}
                                      </Badge>

                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{child.data.label}</div>
                                        {child.data.description && (
                                          <div className="text-xs text-gray-500 truncate mt-1">
                                            {child.data.description}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            // TODO: Open child node edit
                                          }}
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleRemoveChild(child.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Plus className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-1">No child nodes</p>
                      <p className="text-xs text-gray-500">Drag nodes from the canvas into this function to add them</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Node Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Node Information</h3>
              <div className="text-sm text-gray-600 space-y-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="font-mono text-xs">{node.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{nodeTypeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span>
                    ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                  </span>
                </div>
                {node.parentId && (
                  <div className="flex justify-between">
                    <span>Parent:</span>
                    <span className="font-mono text-xs">{node.parentId}</span>
                  </div>
                )}
                {isFunction && (
                  <div className="flex justify-between">
                    <span>Children:</span>
                    <span>{childNodes.length} nodes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

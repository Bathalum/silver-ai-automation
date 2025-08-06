import { useReactFlow, Handle, Position, type NodeProps } from "reactflow"
import { Bookmark, Plug, Link } from "lucide-react"
import './flow-nodes.css'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Brain, GitBranch, Settings, Layers, Info, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { type FunctionModelNode } from "@/lib/domain/entities/function-model-node-types"

// 1:1 copy of StageNode, but for IONode
export function IONode(props: NodeProps) {
  const { data, isConnectable } = props
  const { io } = data

  // Function to get styling based on mode
  const getNodeStyling = (mode?: "input" | "output") => {
    switch (mode) {
      case "input":
        return {
          bgColor: "bg-green-200 hover:bg-green-300",
          textColor: "text-green-900",
          borderColor: "border-green-300"
        }
      case "output":
        return {
          bgColor: "bg-orange-200 hover:bg-orange-300", 
          textColor: "text-orange-900",
          borderColor: "border-orange-300"
        }
      default:
        return {
          bgColor: "bg-purple-200 hover:bg-purple-300",
          textColor: "text-purple-900", 
          borderColor: "border-purple-300"
        }
    }
  }

  const styling = getNodeStyling(io?.mode)

  return (
    <div className="w-[340px] cursor-pointer">
      {/* Left target handle for sibling connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      {/* Bottom target handle for child connections (ActionTableNodes) */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target" 
        className="parent-child" 
        isConnectable={isConnectable} 
      />
      {/* Right source handle for sibling connections */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      <Card className={`mb-1 flex flex-col items-stretch p-0 ${styling.bgColor} ${styling.borderColor} border-2 transition-colors`}>
        <CardHeader className="p-2 flex flex-row items-center justify-between">
          <span className={`font-bold ${styling.textColor} w-full text-center block`}>{io?.name || "I/O"}</span>
        </CardHeader>
      </Card>
    </div>
  )
}

export function StageNode(props: NodeProps) {
  const { data, isConnectable } = props
  const { stage } = data
  
  // Debug: Log when StageNode is rendered
  console.log('StageNode rendered:', { id: props.id, data, stage })
  
  return (
    <div className="w-[340px] cursor-pointer relative">
      {/* Left target handle for sibling connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      {/* Bottom target handle for child connections (ActionTableNodes) */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target" 
        className="parent-child" 
        isConnectable={isConnectable} 
      />
      {/* Right source handle for sibling connections */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source" 
        className="sibling" 
        isConnectable={isConnectable} 
      />
      <Card className="mb-1 flex flex-col items-stretch p-0 bg-blue-200 hover:bg-blue-300 transition-colors">
        <CardHeader className="p-2 flex flex-row items-center justify-between">
          <span className="font-bold text-blue-900 w-full text-center block">{stage?.name || "New Stage"}</span>
        </CardHeader>
      </Card>
    </div>
  )
}

// ActionTableNode: single node, styled as a table with header, rows, and floating bookmarks
export function ActionTableNode(props: NodeProps) {
  const { id, data, isConnectable } = props
  
  // Debug: Log when ActionTableNode is rendered
  console.log('ActionTableNode rendered:', { id, data })
  const { mode = "actions", modes = {
    actions: { label: "Actions", rows: [
      { 
        title: "Row 1", 
        type: "Type A", 
        actionRowId: "action-001",
        description: "Description for action 1",
        raci: {
          responsible: "IT Department",
          accountable: "Project Manager",
          consult: "Business Analyst",
          inform: "Stakeholders"
        }
      },
      { 
        title: "Row 2", 
        type: "Type B", 
        actionRowId: "action-002",
        description: "Description for action 2",
        raci: {
          responsible: "Development Team",
          accountable: "Tech Lead",
          consult: "Architect",
          inform: "Product Owner"
        }
      },
      { 
        title: "Row 3", 
        type: "Type C", 
        actionRowId: "action-003",
        description: "Description for action 3",
        raci: {
          responsible: "QA Team",
          accountable: "QA Lead",
          consult: "Test Engineer",
          inform: "Development Team"
        }
      }
    ] },
    dataChanges: { label: "Data Changes", rows: [
      { 
        title: "Change 1", 
        type: "String", 
        actionRowId: "change-001",
        description: "Description for data change 1",
        raci: {
          responsible: "Data Team",
          accountable: "Data Manager",
          consult: "Data Analyst",
          inform: "Business Users"
        }
      },
      { 
        title: "Change 2", 
        type: "Number", 
        actionRowId: "change-002",
        description: "Description for data change 2",
        raci: {
          responsible: "Backend Team",
          accountable: "Backend Lead",
          consult: "Database Admin",
          inform: "Frontend Team"
        }
      },
      { 
        title: "Change 3", 
        type: "Date", 
        actionRowId: "change-003",
        description: "Description for data change 3",
        raci: {
          responsible: "System Admin",
          accountable: "Infrastructure Lead",
          consult: "DevOps Engineer",
          inform: "Development Team"
        }
      }
    ] },
    boundaryCriteria: { label: "Boundary Criteria", rows: [
      { 
        title: "Criteria 1", 
        type: "Boolean", 
        actionRowId: "criteria-001",
        description: "Description for boundary criteria 1",
        raci: {
          responsible: "Business Analyst",
          accountable: "Product Manager",
          consult: "Stakeholders",
          inform: "Development Team"
        }
      },
      { 
        title: "Criteria 2", 
        type: "Enum", 
        actionRowId: "criteria-002",
        description: "Description for boundary criteria 2",
        raci: {
          responsible: "UX Designer",
          accountable: "Design Lead",
          consult: "User Researcher",
          inform: "Product Team"
        }
      },
      { 
        title: "Criteria 3", 
        type: "Number", 
        actionRowId: "criteria-003",
        description: "Description for boundary criteria 3",
        raci: {
          responsible: "Performance Engineer",
          accountable: "Performance Lead",
          consult: "System Architect",
          inform: "Development Team"
        }
      }
    ] }
  }} = data

  const defaultModes = {
    actions: { label: "Actions", rows: [] },
    dataChanges: { label: "Data Changes", rows: [] },
    boundaryCriteria: { label: "Boundary Criteria", rows: [] }
  } as const;
  type ModeKey = keyof typeof defaultModes;
  const modeKey: ModeKey = ["actions", "dataChanges", "boundaryCriteria"].includes(mode) ? (mode as ModeKey) : "actions";

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [activeSidebar, setActiveSidebar] = useState("details");

  const reactFlow = useReactFlow()

  const handleModeChange = useCallback((newMode: string) => {
    reactFlow.setNodes((nds) => nds.map((node) =>
      node.id === id ? {
        ...node,
        data: {
          ...node.data,
          mode: newMode
        }
      } : node
    ))
  }, [id, reactFlow])

  const modeList = [
    { key: "actions", icon: <Bookmark className="w-4 h-4" />, color: "blue", activeBg: "bg-blue-500", inactiveBg: "bg-blue-100", iconColor: "text-white", inactiveIcon: "text-blue-500" },
    { key: "dataChanges", icon: <Bookmark className="w-4 h-4" />, color: "orange", activeBg: "bg-orange-500", inactiveBg: "bg-orange-100", iconColor: "text-white", inactiveIcon: "text-orange-500" },
    { key: "boundaryCriteria", icon: <Bookmark className="w-4 h-4" />, color: "red", activeBg: "bg-red-500", inactiveBg: "bg-red-100", iconColor: "text-white", inactiveIcon: "text-red-500" }
  ]

  const activeMode = (modes && modes[modeKey]) || defaultModes[modeKey];
  const headerBg = modeList.find((m) => m.key === modeKey)?.activeBg || "bg-blue-500"

  // Sidebar items for the modal
  const sidebarItems = [
    { id: "details", label: "Details", icon: FileText },
    { id: "function-model", label: "Function Model", icon: Settings },
    { id: "event-storm", label: "Event Storm", icon: Zap },
    { id: "spindle", label: "Spindle", icon: GitBranch },
    { id: "knowledge-base", label: "Knowledge Base", icon: Brain },
  ]

  // Handler for row click
  function handleRowClick(row: any) {
    setSelectedRow(row);
    setModalOpen(true);
    setActiveSidebar("details"); // Reset to details tab
  }

  return (
    <div className="relative w-[340px] rounded-lg border shadow-md bg-white">
      {/* Bookmarks */}
      <div className="absolute -left-10 top-4 flex flex-col gap-2 z-10">
        {modeList.map(({ key, icon, activeBg, inactiveBg, iconColor, inactiveIcon }) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            className={`border rounded-md p-1 shadow transition flex items-center justify-center ${mode === key ? `${activeBg} border-black` : `${inactiveBg} border-gray-300`}`}
            aria-label={key}
          >
            {mode === key
              ? <span className={iconColor}>{icon}</span>
              : <span className={inactiveIcon}>{icon}</span>
            }
          </button>
        ))}
      </div>
      {/* Top source handle for connecting to parent stage node */}
      <Handle
        type="source"
        position={Position.Top}
        id="header-source"
        className="parent-child"
        isConnectable={isConnectable}
      />
      {/* Header */}
      <div className={`rounded-t-lg px-4 py-2 text-base font-semibold text-center text-gray-900 ${headerBg}`}>{activeMode.label}</div>
      {/* Table rows */}
      <div className="divide-y divide-green-100">
        {activeMode.rows.map((row: { title: string; type: string; linkedTool?: string; linkedId?: string }, idx: number) => (
          <div
            key={row.title + idx}
            className="relative flex flex-row items-center px-4 py-2 text-xs group cursor-pointer hover:bg-blue-50"
            onClick={() => handleRowClick(row)}
          >
            <div className="flex-1 text-left font-medium">{row.title}</div>
          </div>
        ))}
        <button
          className="w-full px-4 py-2 text-xs text-blue-600 hover:text-white hover:bg-blue-500 transition rounded-b-lg font-medium border-t border-blue-100"
          onClick={() => {
            reactFlow.setNodes((nds) => nds.map((node) => {
              if (node.id !== id) return node;
              const modes = node.data.modes || defaultModes;
              const modeData = modes[modeKey] || { label: modeKey, rows: [] };
              return {
                ...node,
                data: {
                  ...node.data,
                  modes: {
                    ...modes,
                    [modeKey]: {
                      ...modeData,
                      rows: [
                        ...(modeData.rows || []),
                        { 
                          title: 'New Row', 
                          type: '', 
                          actionRowId: `row-${Date.now()}`,
                          description: 'Description for new row',
                          raci: {
                            responsible: 'Department',
                            accountable: 'Manager',
                            consult: 'Analyst',
                            inform: 'Team'
                          }
                        },
                      ],
                    },
                  },
                },
              };
            }))
          }}
          type="button"
        >
          + Add Row
        </button>
      </div>
      {/* Modal for row details and linking */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Row Details</DialogTitle>
          </DialogHeader>
          <div className="flex h-[600px]">
            {/* Sidebar Tabs with icons */}
            <div className="w-16 bg-gray-50 border-r flex flex-col items-center py-4 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={activeSidebar === item.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-12 h-12 p-0 flex flex-col items-center justify-center"
                    onClick={() => setActiveSidebar(item.id)}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </Button>
                )
              })}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeSidebar === "details" && selectedRow && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      value={selectedRow.title}
                      onChange={(e) => {
                        reactFlow.setNodes((nds) => nds.map((node) => {
                          if (node.id !== id) return node;
                          const modes = node.data.modes || defaultModes;
                          const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                          const updatedRows = modeData.rows.map((r: any) => {
                            if (r.actionRowId === selectedRow.actionRowId) {
                              return { ...r, title: e.target.value };
                            }
                            return r;
                          });
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              modes: {
                                ...modes,
                                [modeKey]: {
                                  ...modeData,
                                  rows: updatedRows
                                }
                              }
                            }
                          };
                        }));
                        setSelectedRow({ ...selectedRow, title: e.target.value });
                      }}
                      className="mt-1 w-full p-3 border rounded-md bg-white"
                      placeholder="Enter title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <input
                      type="text"
                      value={selectedRow.type}
                      onChange={(e) => {
                        reactFlow.setNodes((nds) => nds.map((node) => {
                          if (node.id !== id) return node;
                          const modes = node.data.modes || defaultModes;
                          const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                          const updatedRows = modeData.rows.map((r: any) => {
                            if (r.actionRowId === selectedRow.actionRowId) {
                              return { ...r, type: e.target.value };
                            }
                            return r;
                          });
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              modes: {
                                ...modes,
                                [modeKey]: {
                                  ...modeData,
                                  rows: updatedRows
                                }
                              }
                            }
                          };
                        }));
                        setSelectedRow({ ...selectedRow, type: e.target.value });
                      }}
                      className="mt-1 w-full p-3 border rounded-md bg-white"
                      placeholder="Enter type"
                    />
                  </div>
                    <div>
                    <label className="text-sm font-medium">Action Row ID</label>
                    <input
                      type="text"
                      value={selectedRow.actionRowId}
                      readOnly
                      className="mt-1 w-full p-3 border rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Auto-generated ID"
                    />
                      </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={selectedRow.description}
                      onChange={(e) => {
                        // Update the row data in the flow
                        reactFlow.setNodes((nds) => nds.map((node) => {
                          if (node.id !== id) return node;
                          const modes = node.data.modes || defaultModes;
                          const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                          const updatedRows = modeData.rows.map((r: any, index: number) => {
                            if (r.actionRowId === selectedRow.actionRowId) {
                              return { ...r, description: e.target.value };
                            }
                            return r;
                          });
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              modes: {
                                ...modes,
                                [modeKey]: {
                                  ...modeData,
                                  rows: updatedRows
                                }
                              }
                            }
                          };
                        }));
                        // Update the selected row state
                        setSelectedRow({ ...selectedRow, description: e.target.value });
                      }}
                      className="mt-1 w-full p-3 border rounded-md min-h-[120px] resize-y bg-white"
                      placeholder="Enter detailed description..."
                      rows={5}
                    />
                    </div>
                  
                  {/* RACI Section */}
                    <div>
                    <label className="text-sm font-medium">RACI</label>
                    <div className="mt-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500">Responsible</label>
                          <input
                            type="text"
                            value={selectedRow.raci?.responsible || ''}
                            onChange={(e) => {
                              reactFlow.setNodes((nds) => nds.map((node) => {
                                if (node.id !== id) return node;
                                const modes = node.data.modes || defaultModes;
                                const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                                const updatedRows = modeData.rows.map((r: any) => {
                                  if (r.actionRowId === selectedRow.actionRowId) {
                                    return { 
                                      ...r, 
                                      raci: { 
                                        ...r.raci, 
                                        responsible: e.target.value 
                                      } 
                                    };
                                  }
                                  return r;
                                });
                                return {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    modes: {
                                      ...modes,
                                      [modeKey]: {
                                        ...modeData,
                                        rows: updatedRows
                                      }
                                    }
                                  }
                                };
                              }));
                              setSelectedRow({ 
                                ...selectedRow, 
                                raci: { 
                                  ...selectedRow.raci, 
                                  responsible: e.target.value 
                                } 
                              });
                            }}
                            className="w-full p-3 border rounded-md bg-white"
                            placeholder="e.g., IT Department"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500">Accountable</label>
                          <input
                            type="text"
                            value={selectedRow.raci?.accountable || ''}
                            onChange={(e) => {
                              reactFlow.setNodes((nds) => nds.map((node) => {
                                if (node.id !== id) return node;
                                const modes = node.data.modes || defaultModes;
                                const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                                const updatedRows = modeData.rows.map((r: any) => {
                                  if (r.actionRowId === selectedRow.actionRowId) {
                                    return { 
                                      ...r, 
                                      raci: { 
                                        ...r.raci, 
                                        accountable: e.target.value 
                                      } 
                                    };
                                  }
                                  return r;
                                });
                                return {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    modes: {
                                      ...modes,
                                      [modeKey]: {
                                        ...modeData,
                                        rows: updatedRows
                                      }
                                    }
                                  }
                                };
                              }));
                              setSelectedRow({ 
                                ...selectedRow, 
                                raci: { 
                                  ...selectedRow.raci, 
                                  accountable: e.target.value 
                                } 
                              });
                            }}
                            className="w-full p-3 border rounded-md bg-white"
                            placeholder="e.g., Project Manager"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500">Consult</label>
                          <input
                            type="text"
                            value={selectedRow.raci?.consult || ''}
                            onChange={(e) => {
                              reactFlow.setNodes((nds) => nds.map((node) => {
                                if (node.id !== id) return node;
                                const modes = node.data.modes || defaultModes;
                                const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                                const updatedRows = modeData.rows.map((r: any) => {
                                  if (r.actionRowId === selectedRow.actionRowId) {
                                    return { 
                                      ...r, 
                                      raci: { 
                                        ...r.raci, 
                                        consult: e.target.value 
                                      } 
                                    };
                                  }
                                  return r;
                                });
                                return {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    modes: {
                                      ...modes,
                                      [modeKey]: {
                                        ...modeData,
                                        rows: updatedRows
                                      }
                                    }
                                  }
                                };
                              }));
                              setSelectedRow({ 
                                ...selectedRow, 
                                raci: { 
                                  ...selectedRow.raci, 
                                  consult: e.target.value 
                                } 
                              });
                            }}
                            className="w-full p-3 border rounded-md bg-white"
                            placeholder="e.g., Business Analyst"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-gray-500">Inform</label>
                          <input
                            type="text"
                            value={selectedRow.raci?.inform || ''}
                            onChange={(e) => {
                              reactFlow.setNodes((nds) => nds.map((node) => {
                                if (node.id !== id) return node;
                                const modes = node.data.modes || defaultModes;
                                const modeData = modes[modeKey] || { label: modeKey, rows: [] };
                                const updatedRows = modeData.rows.map((r: any) => {
                                  if (r.actionRowId === selectedRow.actionRowId) {
                                    return { 
                                      ...r, 
                                      raci: { 
                                        ...r.raci, 
                                        inform: e.target.value 
                                      } 
                                    };
                                  }
                                  return r;
                                });
                                return {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    modes: {
                                      ...modes,
                                      [modeKey]: {
                                        ...modeData,
                                        rows: updatedRows
                                      }
                                    }
                                  }
                                };
                              }));
                              setSelectedRow({ 
                                ...selectedRow, 
                                raci: { 
                                  ...selectedRow.raci, 
                                  inform: e.target.value 
                                } 
                              });
                            }}
                            className="w-full p-3 border rounded-md bg-white"
                            placeholder="e.g., Stakeholders"
                          />
                        </div>
                      </div>
                    </div>
                      </div>
                    </div>
                  )}
              {activeSidebar === "function-model" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No Function Model content available</p>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Create Function Model
                  </Button>
                </div>
              )}
              {activeSidebar === "knowledge-base" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No Knowledge Base content available</p>
                  <Button variant="outline" size="sm">
                    <Brain className="w-4 h-4 mr-2" />
                    Create Knowledge Base Entry
                  </Button>
                </div>
              )}
              {activeSidebar === "spindle" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No Spindle content available</p>
                  <Button variant="outline" size="sm">
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Spindle Flow
                  </Button>
                </div>
              )}
              {activeSidebar === "event-storm" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No Event Storm content available</p>
                  <Button variant="outline" size="sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Create Event Storm
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 

// New: Function Model Container Node
export function FunctionModelContainerNode({ data, selected }: NodeProps<FunctionModelNode>) {
  const containerData = data.functionModelData.container
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(containerData?.name || data.name)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
      // TODO: Update container data
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setName(containerData?.name || data.name)
    }
  }

  return (
    <div
      className={cn(
        "group relative min-w-[300px] min-h-[200px] bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200 rounded-lg p-4 transition-all duration-200",
        selected && "border-blue-400 shadow-lg shadow-blue-200/50",
        "hover:border-blue-300 hover:shadow-md"
      )}
    >
      {/* Container Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleNameKeyDown}
              onBlur={() => setIsEditing(false)}
              className="text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            >
              {name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {containerData?.containerType || 'container'}
          </Badge>
        </div>
      </div>

      {/* Container Description */}
      {containerData?.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {containerData.description}
        </p>
      )}

      {/* Container Content Area */}
      <div className="flex-1 min-h-[120px] bg-white/50 rounded border border-blue-100 p-2">
        <div className="text-xs text-gray-500 text-center py-8">
          <Layers className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Drag nodes here to group them</p>
          <p className="text-xs">This container can hold stages, actions, and other components</p>
        </div>
      </div>

      {/* Container Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-blue-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          <span>Container for {containerData?.childNodes?.length || 0} items</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              // TODO: Open container edit modal
            }}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* React Flow Handles for Container */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        id="container-input"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        id="container-output"
      />
    </div>
  )
} 
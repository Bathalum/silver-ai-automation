# Node Behavior Abstraction and Unified Operations Interface Implementation Plan

## Overview

This plan addresses the **CRITICAL MISSING COMPONENTS** in the node-based architecture: **Node Behavior Abstraction** and **Unified Operations Interface**. These are NOT "partially implemented" - they are **COMPLETELY MISSING** from the actual application layer and UI integration.

## Current State Analysis

### ✅ **WHAT EXISTS (But NOT USED)**
- ✅ **Node Behavior Types**: `lib/domain/entities/node-behavior-types.ts` - Complete implementation
- ✅ **Unified Operations**: `lib/use-cases/unified-node-operations.ts` - Complete implementation  
- ✅ **Infrastructure Service**: `lib/infrastructure/services/unified-node-operations.ts` - Complete implementation
- ✅ **Node Use Cases**: `lib/application/use-cases/function-model-node-use-cases.ts` - Complete implementation

### ❌ **WHAT'S MISSING (CRITICAL GAPS)**
- ❌ **Application Layer Integration**: No hooks using node behavior abstraction
- ❌ **UI Integration**: No components using unified operations interface
- ❌ **Execution Engine**: No actual node execution in UI
- ❌ **Validation Engine**: No node validation in UI
- ❌ **Behavior Factory Usage**: NodeBehaviorFactory not used anywhere in UI
- ❌ **Cross-Feature Operations**: No unified operations in UI components
- ❌ **Node Execution UI**: No way to execute nodes from UI
- ❌ **Node Validation UI**: No way to validate nodes from UI
- ❌ **Behavior Display**: No way to see node behaviors in UI

## Implementation Strategy

### Phase 1: Application Layer Integration (Week 1)

#### 1.1 Create Node Behavior Hook
**Objective**: Create React hook for node behavior operations

**Node Behavior Hook**:
```typescript
// lib/application/hooks/use-node-behavior.ts
import { useState, useCallback } from 'react'
import { NodeBehaviorFactory } from '@/lib/domain/entities/node-behavior-types'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { BaseNode, FunctionModelNode } from '@/lib/domain/entities/base-node-types'
import type { ValidationResult, ExecutionResult } from '@/lib/domain/entities/node-behavior-types'

export function useNodeBehavior(featureType: string, entityId: string, nodeId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [behavior, setBehavior] = useState<any>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  const nodeOperations = new UnifiedNodeOperations()

  // Get node behavior
  const getNodeBehavior = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const nodeBehavior = await nodeOperations.getNodeBehavior(featureType, entityId, nodeId)
      setBehavior(nodeBehavior)
      return nodeBehavior
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node behavior'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Validate node
  const validateNode = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await nodeOperations.validateNode(featureType, entityId, nodeId)
      setValidationResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Execute node
  const executeNode = useCallback(async (context?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await nodeOperations.executeNode(featureType, entityId, nodeId, context)
      setExecutionResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Get node dependencies
  const getDependencies = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.getDependencies() || []
  }, [behavior, getNodeBehavior])

  // Get node outputs
  const getOutputs = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.getOutputs() || []
  }, [behavior, getNodeBehavior])

  // Check if node can execute
  const canExecute = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.canExecute() || false
  }, [behavior, getNodeBehavior])

  return {
    loading,
    error,
    behavior,
    validationResult,
    executionResult,
    getNodeBehavior,
    validateNode,
    executeNode,
    getDependencies,
    getOutputs,
    canExecute,
    clearError: () => setError(null)
  }
}
```

#### 1.2 Create Unified Operations Hook
**Objective**: Create React hook for unified node operations

**Unified Operations Hook**:
```typescript
// lib/application/hooks/use-unified-node-operations.ts
import { useState, useCallback } from 'react'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'
import type { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

export function useUnifiedNodeOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<BaseNode[]>([])
  const [links, setLinks] = useState<CrossFeatureLink[]>([])

  const nodeOperations = new UnifiedNodeOperations()

  // Create node
  const createNode = useCallback(async <T extends BaseNode>(
    node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const createdNode = await nodeOperations.createNode(node)
      setNodes(prev => [...prev, createdNode])
      return createdNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get node
  const getNode = useCallback(async <T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const node = await nodeOperations.getNode(featureType, entityId, nodeId)
      return node
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update node
  const updateNode = useCallback(async <T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId: string,
    updates: Partial<T>
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedNode = await nodeOperations.updateNode(featureType, entityId, nodeId, updates)
      setNodes(prev => prev.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      ))
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete node
  const deleteNode = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId: string
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      await nodeOperations.deleteNode(featureType, entityId, nodeId)
      setNodes(prev => prev.filter(node => node.id !== nodeId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create node link
  const createNodeLink = useCallback(async (
    link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>
  ): Promise<CrossFeatureLink> => {
    setLoading(true)
    setError(null)
    
    try {
      const newLink = await nodeOperations.createNodeLink(link)
      setLinks(prev => [...prev, newLink])
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get node links
  const getNodeLinks = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<CrossFeatureLink[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const links = await nodeOperations.getNodeLinks(featureType, entityId, nodeId)
      setLinks(links)
      return links
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node links'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get connected nodes
  const getConnectedNodes = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<BaseNode[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const connectedNodes = await nodeOperations.getConnectedNodes(featureType, entityId, nodeId)
      return connectedNodes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get connected nodes'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    nodes,
    links,
    createNode,
    getNode,
    updateNode,
    deleteNode,
    createNodeLink,
    getNodeLinks,
    getConnectedNodes,
    clearError: () => setError(null)
  }
}
```

### Phase 2: UI Component Integration (Week 2)

#### 2.1 Create Node Behavior Panel
**Objective**: Create UI component for displaying and interacting with node behaviors

**Node Behavior Panel Component**:
```typescript
// components/composites/function-model/node-behavior-panel.tsx
import { useState, useEffect } from 'react'
import { useNodeBehavior } from '@/lib/application/hooks/use-node-behavior'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  Layers,
  Table,
  ArrowLeftRight,
  GitBranch
} from 'lucide-react'

interface NodeBehaviorPanelProps {
  featureType: string
  entityId: string
  nodeId: string
  onExecutionComplete?: (result: any) => void
  onValidationComplete?: (result: any) => void
}

export function NodeBehaviorPanel({
  featureType,
  entityId,
  nodeId,
  onExecutionComplete,
  onValidationComplete
}: NodeBehaviorPanelProps) {
  const {
    loading,
    error,
    behavior,
    validationResult,
    executionResult,
    getNodeBehavior,
    validateNode,
    executeNode,
    getDependencies,
    getOutputs,
    canExecute
  } = useNodeBehavior(featureType, entityId, nodeId)

  const [dependencies, setDependencies] = useState<string[]>([])
  const [outputs, setOutputs] = useState<any[]>([])
  const [executable, setExecutable] = useState(false)

  useEffect(() => {
    if (behavior) {
      loadBehaviorInfo()
    }
  }, [behavior])

  const loadBehaviorInfo = async () => {
    try {
      const [deps, outs, canExec] = await Promise.all([
        getDependencies(),
        getOutputs(),
        canExecute()
      ])
      setDependencies(deps)
      setOutputs(outs)
      setExecutable(canExec)
    } catch (err) {
      console.error('Failed to load behavior info:', err)
    }
  }

  const handleValidate = async () => {
    try {
      const result = await validateNode()
      onValidationComplete?.(result)
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  const handleExecute = async () => {
    try {
      const result = await executeNode()
      onExecutionComplete?.(result)
    } catch (err) {
      console.error('Execution failed:', err)
    }
  }

  const getNodeIcon = (nodeType: string) => {
    const icons = {
      stageNode: Layers,
      actionTableNode: Table,
      ioNode: ArrowLeftRight,
      functionModelContainer: GitBranch
    }
    return icons[nodeType as keyof typeof icons] || Layers
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? CheckCircle : XCircle
  }

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Node Behavior
          {behavior && (
            <Badge variant="secondary">
              {behavior.constructor.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Node Type Info */}
        {behavior && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {getNodeIcon(behavior.node?.nodeType || 'stageNode') && 
              React.createElement(getNodeIcon(behavior.node?.nodeType || 'stageNode'), { className: 'h-4 w-4' })
            }
            <span className="font-medium">{behavior.node?.nodeType || 'Unknown'}</span>
            <Badge variant={executable ? 'default' : 'secondary'}>
              {executable ? 'Executable' : 'Not Executable'}
            </Badge>
          </div>
        )}

        {/* Dependencies */}
        {dependencies.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Dependencies</h4>
            <div className="space-y-1">
              {dependencies.map((dep, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {dep}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outputs */}
        {outputs.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Outputs</h4>
            <div className="space-y-1">
              {outputs.map((output, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {typeof output === 'string' ? output : JSON.stringify(output)}
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Validation Section */}
        <div>
          <h4 className="font-medium mb-2">Validation</h4>
          {validationResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.isValid) && 
                  React.createElement(getStatusIcon(validationResult.isValid), { 
                    className: `h-4 w-4 ${getStatusColor(validationResult.isValid)}` 
                  })
                }
                <span className={getStatusColor(validationResult.isValid)}>
                  {validationResult.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              {validationResult.errors.length > 0 && (
                <div className="text-sm text-red-600">
                  {validationResult.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
              {validationResult.warnings.length > 0 && (
                <div className="text-sm text-yellow-600">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button 
            onClick={handleValidate} 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Validate Node
          </Button>
        </div>

        <Separator />

        {/* Execution Section */}
        <div>
          <h4 className="font-medium mb-2">Execution</h4>
          {executionResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(executionResult.success) && 
                  React.createElement(getStatusIcon(executionResult.success), { 
                    className: `h-4 w-4 ${getStatusColor(executionResult.success)}` 
                  })
                }
                <span className={getStatusColor(executionResult.success)}>
                  {executionResult.success ? 'Success' : 'Failed'}
                </span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {executionResult.executionTime}ms
                </Badge>
              </div>
              {executionResult.error && (
                <div className="text-sm text-red-600">
                  Error: {executionResult.error}
                </div>
              )}
              {executionResult.output && (
                <div className="text-sm text-muted-foreground">
                  Output: {JSON.stringify(executionResult.output)}
                </div>
              )}
            </div>
          )}
          <Button 
            onClick={handleExecute} 
            disabled={!executable}
            size="sm"
            className="mt-2"
          >
            <Play className="h-4 w-4 mr-2" />
            Execute Node
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2.2 Create Unified Operations Panel
**Objective**: Create UI component for unified node operations

**Unified Operations Panel Component**:
```typescript
// components/composites/function-model/unified-operations-panel.tsx
import { useState, useEffect } from 'react'
import { useUnifiedNodeOperations } from '@/lib/application/hooks/use-unified-node-operations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Search, 
  Link, 
  Trash2, 
  Edit, 
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface UnifiedOperationsPanelProps {
  featureType: string
  entityId: string
  onNodeCreated?: (node: any) => void
  onNodeUpdated?: (node: any) => void
  onNodeDeleted?: (nodeId: string) => void
  onLinkCreated?: (link: any) => void
}

export function UnifiedOperationsPanel({
  featureType,
  entityId,
  onNodeCreated,
  onNodeUpdated,
  onNodeDeleted,
  onLinkCreated
}: UnifiedOperationsPanelProps) {
  const {
    loading,
    error,
    nodes,
    links,
    createNode,
    getNode,
    updateNode,
    deleteNode,
    createNodeLink,
    getNodeLinks,
    getConnectedNodes
  } = useUnifiedNodeOperations()

  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [connectedNodes, setConnectedNodes] = useState<any[]>([])

  useEffect(() => {
    if (selectedNode) {
      loadConnectedNodes()
    }
  }, [selectedNode])

  const loadConnectedNodes = async () => {
    if (!selectedNode) return
    
    try {
      const connected = await getConnectedNodes(featureType, entityId, selectedNode.id)
      setConnectedNodes(connected)
    } catch (err) {
      console.error('Failed to load connected nodes:', err)
    }
  }

  const handleCreateNode = async () => {
    try {
      const newNode = await createNode({
        featureType: featureType as any,
        entityId,
        nodeType: 'stageNode',
        name: 'New Node',
        description: 'New node description',
        position: { x: 0, y: 0 }
      })
      onNodeCreated?.(newNode)
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await deleteNode(featureType as any, entityId, nodeId)
      onNodeDeleted?.(nodeId)
    } catch (err) {
      console.error('Failed to delete node:', err)
    }
  }

  const handleCreateLink = async () => {
    if (!selectedNode) return
    
    try {
      const newLink = await createNodeLink({
        sourceFeature: featureType as any,
        sourceEntityId: entityId,
        sourceNodeId: selectedNode.id,
        targetFeature: 'knowledge-base' as any,
        targetEntityId: 'target-entity-id',
        targetNodeId: 'target-node-id',
        linkType: 'documents',
        linkContext: {}
      })
      onLinkCreated?.(newLink)
    } catch (err) {
      console.error('Failed to create link:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unified Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unified Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Unified Operations
          <Badge variant="secondary">
            {nodes.length} nodes, {links.length} links
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Node Operations */}
        <div>
          <h4 className="font-medium mb-2">Node Operations</h4>
          <div className="flex gap-2">
            <Button onClick={handleCreateNode} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Node
            </Button>
            <Button onClick={handleCreateLink} size="sm" disabled={!selectedNode}>
              <Link className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </div>
        </div>

        <Separator />

        {/* Node List */}
        <div>
          <h4 className="font-medium mb-2">Nodes ({nodes.length})</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No nodes found</p>
            ) : (
              nodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted ${
                    selectedNode?.id === node.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{node.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {node.nodeType}
                    </Badge>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNode(node.id)
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Selected Node</h4>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div><strong>Name:</strong> {selectedNode.name}</div>
                  <div><strong>Type:</strong> {selectedNode.nodeType}</div>
                  <div><strong>Position:</strong> ({selectedNode.position?.x}, {selectedNode.position?.y})</div>
                  {selectedNode.description && (
                    <div><strong>Description:</strong> {selectedNode.description}</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Connected Nodes */}
        {selectedNode && connectedNodes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Connected Nodes ({connectedNodes.length})</h4>
              <div className="space-y-1">
                {connectedNodes.map((node) => (
                  <div key={node.id} className="flex items-center gap-2 p-2 rounded border">
                    <span className="text-sm">{node.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {node.nodeType}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Links */}
        {links.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Links ({links.length})</h4>
              <div className="space-y-1">
                {links.map((link) => (
                  <div key={link.linkId} className="flex items-center gap-2 p-2 rounded border">
                    <span className="text-sm">
                      {link.sourceFeature} → {link.targetFeature}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {link.linkType}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

### Phase 3: Integration with FunctionProcessDashboard (Week 3)

#### 3.1 Add Node Behavior Panel to Dashboard
**Objective**: Integrate node behavior panel into the main dashboard

**Update FunctionProcessDashboard**:
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx

// Add imports
import { NodeBehaviorPanel } from '@/components/composites/function-model/node-behavior-panel'
import { UnifiedOperationsPanel } from '@/components/composites/function-model/unified-operations-panel'

// Add state for selected node
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

// Add to sidebar content
{activePersistenceTab === 'behavior' && selectedNodeId && (
  <NodeBehaviorPanel
    featureType="function-model"
    entityId={functionModel.modelId || 'default-model-id'}
    nodeId={selectedNodeId}
    onExecutionComplete={(result) => {
      console.log('Node execution completed:', result)
      // Handle execution result
    }}
    onValidationComplete={(result) => {
      console.log('Node validation completed:', result)
      // Handle validation result
    }}
  />
)}

{activePersistenceTab === 'operations' && (
  <UnifiedOperationsPanel
    featureType="function-model"
    entityId={functionModel.modelId || 'default-model-id'}
    onNodeCreated={(node) => {
      console.log('Node created:', node)
      // Handle node creation
    }}
    onNodeUpdated={(node) => {
      console.log('Node updated:', node)
      // Handle node update
    }}
    onNodeDeleted={(nodeId) => {
      console.log('Node deleted:', nodeId)
      // Handle node deletion
    }}
    onLinkCreated={(link) => {
      console.log('Link created:', link)
      // Handle link creation
    }}
  />
)}

// Add to sidebar tabs
const sidebarItems = [
  { id: "save-load", label: "Save/Load", icon: Save },
  { id: "version-control", label: "Versions", icon: GitBranch },
  { id: "links", label: "Links", icon: Link },
  { id: "behavior", label: "Behavior", icon: Zap }, // NEW
  { id: "operations", label: "Operations", icon: Settings }, // NEW
]
```

#### 3.2 Add Node Selection Handler
**Objective**: Handle node selection for behavior panel

**Node Selection Logic**:
```typescript
// Add node selection handler
const handleNodeSelect = (nodeId: string) => {
  setSelectedNodeId(nodeId)
  setActivePersistenceTab('behavior')
}

// Add to flow nodes
const onNodeClick = (event: React.MouseEvent, node: Node) => {
  handleNodeSelect(node.id)
}
```

### Phase 4: Execution Engine Integration (Week 4)

#### 4.1 Create Node Execution Service
**Objective**: Create service for executing nodes with proper context

**Node Execution Service**:
```typescript
// lib/services/node-execution-service.ts
import { NodeBehaviorFactory } from '@/lib/domain/entities/node-behavior-types'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { ExecutionResult, ValidationResult } from '@/lib/domain/entities/node-behavior-types'

export interface ExecutionContext {
  userId: string
  sessionId: string
  timestamp: Date
  parameters?: Record<string, any>
  environment?: 'development' | 'staging' | 'production'
}

export interface ExecutionOptions {
  validateBeforeExecute?: boolean
  timeout?: number
  retryOnFailure?: boolean
  maxRetries?: number
  logExecution?: boolean
}

export class NodeExecutionService {
  private nodeOperations: UnifiedNodeOperations

  constructor() {
    this.nodeOperations = new UnifiedNodeOperations()
  }

  async executeNode(
    featureType: string,
    entityId: string,
    nodeId: string,
    context?: ExecutionContext,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      // Get the node
      const node = await this.nodeOperations.getNode(featureType, entityId, nodeId)
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`)
      }

      // Validate before execution if requested
      if (options?.validateBeforeExecute) {
        const validation = await this.nodeOperations.validateNode(featureType, entityId, nodeId)
        if (!validation.isValid) {
          throw new Error(`Node validation failed: ${validation.errors.join(', ')}`)
        }
      }

      // Create behavior
      const behavior = NodeBehaviorFactory.createBehavior(node)

      // Execute with timeout if specified
      let executionPromise = behavior.execute(context)
      
      if (options?.timeout) {
        executionPromise = Promise.race([
          executionPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Execution timeout')), options.timeout)
          )
        ])
      }

      const result = await executionPromise

      // Log execution if requested
      if (options?.logExecution) {
        this.logExecution(nodeId, result, Date.now() - startTime)
      }

      return {
        success: true,
        output: result,
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId,
          featureType,
          entityId,
          context
        }
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId,
          featureType,
          entityId,
          context
        }
      }
    }
  }

  async validateNode(
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<ValidationResult> {
    return await this.nodeOperations.validateNode(featureType, entityId, nodeId)
  }

  async getNodeBehavior(
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<any> {
    return await this.nodeOperations.getNodeBehavior(featureType, entityId, nodeId)
  }

  private logExecution(nodeId: string, result: any, executionTime: number) {
    console.log(`Node execution completed:`, {
      nodeId,
      result,
      executionTime,
      timestamp: new Date().toISOString()
    })
  }
}
```

#### 4.2 Create Execution Hook
**Objective**: Create React hook for node execution

**Node Execution Hook**:
```typescript
// lib/application/hooks/use-node-execution.ts
import { useState, useCallback } from 'react'
import { NodeExecutionService } from '@/lib/services/node-execution-service'
import type { ExecutionResult, ValidationResult } from '@/lib/domain/entities/node-behavior-types'
import type { ExecutionContext, ExecutionOptions } from '@/lib/services/node-execution-service'

export function useNodeExecution() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null)

  const executionService = new NodeExecutionService()

  const executeNode = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string,
    context?: ExecutionContext,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await executionService.executeNode(featureType, entityId, nodeId, context, options)
      setLastResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const validateNode = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<ValidationResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await executionService.validateNode(featureType, entityId, nodeId)
      setLastValidation(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const getNodeBehavior = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<any> => {
    setLoading(true)
    setError(null)
    
    try {
      const behavior = await executionService.getNodeBehavior(featureType, entityId, nodeId)
      return behavior
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node behavior'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    lastResult,
    lastValidation,
    executeNode,
    validateNode,
    getNodeBehavior,
    clearError: () => setError(null),
    clearResults: () => {
      setLastResult(null)
      setLastValidation(null)
    }
  }
}
```

### Phase 5: Testing and Validation (Week 5)

#### 5.1 Comprehensive Testing
**Objective**: Test all node behavior and unified operations functionality

**Test Scenarios**:
1. **Node Behavior Testing**:
   - Test node validation for different node types
   - Test node execution for different node types
   - Test dependency resolution
   - Test output generation
   - Test error handling

2. **Unified Operations Testing**:
   - Test node creation across different features
   - Test node updates and deletions
   - Test cross-feature linking
   - Test connected node retrieval
   - Test search and filtering

3. **UI Integration Testing**:
   - Test node behavior panel functionality
   - Test unified operations panel functionality
   - Test node selection and interaction
   - Test execution and validation UI
   - Test error display and handling

4. **Performance Testing**:
   - Test execution time for different node types
   - Test validation performance
   - Test UI responsiveness during operations
   - Test memory usage during operations

## Success Metrics

### Functional Metrics
- **Node Behavior Integration**: 100% of node types have behavior abstraction
- **Unified Operations**: Support for all cross-feature operations
- **Execution Engine**: <500ms execution time for simple nodes
- **Validation Engine**: <100ms validation time for all node types
- **UI Integration**: All behavior and operations accessible via UI
- **Error Handling**: Comprehensive error handling and user feedback

### Technical Metrics
- **Code Coverage**: >90% test coverage for behavior and operations
- **Performance**: <1s response time for all operations
- **Scalability**: Support for 1000+ nodes with behavior
- **Maintainability**: Clean separation of concerns
- **Type Safety**: 100% type safety across all operations

## Risk Mitigation

### Technical Risks
1. **Performance Issues**: Implement caching and optimization
2. **Memory Leaks**: Proper cleanup in hooks and components
3. **Type Conflicts**: Ensure consistent type usage
4. **Error Propagation**: Comprehensive error handling

### User Experience Risks
1. **Complex UI**: Provide clear, intuitive interfaces
2. **Slow Operations**: Implement loading states and progress indicators
3. **Error Confusion**: Clear error messages and recovery options
4. **Feature Discovery**: Add tooltips and documentation

## Timeline and Milestones

### Week 1: Application Layer Integration
- [ ] Create use-node-behavior.ts hook
- [ ] Create use-unified-node-operations.ts hook
- [ ] Test hooks with existing functionality
- [ ] Document hook APIs

### Week 2: UI Component Integration
- [ ] Create NodeBehaviorPanel component
- [ ] Create UnifiedOperationsPanel component
- [ ] Test component functionality
- [ ] Add proper styling and theming

### Week 3: Dashboard Integration
- [ ] Integrate panels into FunctionProcessDashboard
- [ ] Add node selection handling
- [ ] Test dashboard integration
- [ ] Add proper navigation

### Week 4: Execution Engine Integration
- [ ] Create NodeExecutionService
- [ ] Create use-node-execution.ts hook
- [ ] Test execution functionality
- [ ] Add timeout and retry logic

### Week 5: Testing and Validation
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

## Conclusion

This implementation plan addresses the **CRITICAL MISSING COMPONENTS** in the node-based architecture. The node behavior abstraction and unified operations interface are **NOT "partially implemented"** - they are **COMPLETELY MISSING** from the application layer and UI integration.

The plan provides:

1. **Complete Application Layer**: Hooks for node behavior and unified operations
2. **Full UI Integration**: Components for behavior and operations panels
3. **Execution Engine**: Service for node execution with proper context
4. **Validation Engine**: Comprehensive node validation
5. **Dashboard Integration**: Seamless integration with existing dashboard
6. **Comprehensive Testing**: Full test coverage for all functionality

This will complete the node-based architecture and provide the missing functionality that was identified in the architecture design document. 
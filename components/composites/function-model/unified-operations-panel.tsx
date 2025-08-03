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
      const connected = await getConnectedNodes(featureType as any, entityId, selectedNode.id)
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
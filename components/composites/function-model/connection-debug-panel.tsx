'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { analyzeConnections, validateConnections, getConnectionStats } from '@/lib/utils/performance-data'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

interface ConnectionDebugPanelProps {
  model: FunctionModel
  isOpen: boolean
  onClose: () => void
}

export function ConnectionDebugPanel({ model, isOpen, onClose }: ConnectionDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'stats'>('overview')
  
  if (!isOpen) return null
  
  const connectionAnalysis = analyzeConnections(model.edgesData)
  const validation = validateConnections(model.edgesData, model.nodesData)
  const stats = getConnectionStats(model.edgesData)
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            Connection Debug Panel - {model.name}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-2 border-b">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </Button>
            <Button
              variant={activeTab === 'validation' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('validation')}
            >
              Validation
            </Button>
            <Button
              variant={activeTab === 'stats' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('stats')}
            >
              Statistics
            </Button>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Connection Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Connections:</span>
                      <Badge variant="outline">{connectionAnalysis.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Complexity Level:</span>
                      <Badge variant={connectionAnalysis.complexity === 'high' ? 'destructive' : 
                                   connectionAnalysis.complexity === 'medium' ? 'secondary' : 'default'}>
                        {connectionAnalysis.complexity}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Parent-Child:</span>
                      <Badge variant="outline">{connectionAnalysis.byType.parentChild}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Sibling:</span>
                      <Badge variant="outline">{connectionAnalysis.byType.sibling}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Handle Patterns</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Header → Bottom:</span>
                      <Badge variant="outline">{connectionAnalysis.byHandlePattern.headerToBottom}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Right → Left:</span>
                      <Badge variant="outline">{connectionAnalysis.byHandlePattern.rightToLeft}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Other:</span>
                      <Badge variant="outline">{connectionAnalysis.byHandlePattern.other}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {connectionAnalysis.total > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Connection Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {connectionAnalysis.byType.parentChild > 0 && (
                      <Badge variant="secondary">Parent-Child: {connectionAnalysis.byType.parentChild}</Badge>
                    )}
                    {connectionAnalysis.byType.sibling > 0 && (
                      <Badge variant="secondary">Sibling: {connectionAnalysis.byType.sibling}</Badge>
                    )}
                    {connectionAnalysis.byType.input > 0 && (
                      <Badge variant="secondary">Input: {connectionAnalysis.byType.input}</Badge>
                    )}
                    {connectionAnalysis.byType.output > 0 && (
                      <Badge variant="secondary">Output: {connectionAnalysis.byType.output}</Badge>
                    )}
                    {connectionAnalysis.byType.custom > 0 && (
                      <Badge variant="secondary">Custom: {connectionAnalysis.byType.custom}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium">
                  {validation.isValid ? 'All connections are valid' : `${validation.issues.length} issues found`}
                </span>
              </div>
              
              {validation.issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validation.issues.map((issue, index) => (
                        <div key={index} className="text-sm">• {issue}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Node Analysis</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Nodes:</span>
                      <Badge variant="outline">{model.nodesData?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Connected Nodes:</span>
                      <Badge variant="outline">{validation.connectedNodes}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Orphaned Nodes:</span>
                      <Badge variant={validation.orphanedNodes > 0 ? 'destructive' : 'outline'}>
                        {validation.orphanedNodes}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Connection Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Edges:</span>
                      <Badge variant="outline">{stats.totalEdges}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Source Nodes:</span>
                      <Badge variant="outline">{stats.uniqueSourceNodes}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Target Nodes:</span>
                      <Badge variant="outline">{stats.uniqueTargetNodes}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Connected Nodes:</span>
                      <Badge variant="outline">{stats.uniqueConnectedNodes}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Connection Distribution</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Max Connections/Node:</span>
                      <Badge variant="outline">{stats.maxConnectionsPerNode}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Connections/Node:</span>
                      <Badge variant="outline">{stats.minConnectionsPerNode}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Connections/Node:</span>
                      <Badge variant="outline">{stats.averageConnectionsPerNode.toFixed(1)}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {stats.nodesWithMostConnections.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Nodes with Most Connections</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.nodesWithMostConnections.map(nodeId => (
                      <Badge key={nodeId} variant="secondary">
                        {nodeId} ({stats.maxConnectionsPerNode})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
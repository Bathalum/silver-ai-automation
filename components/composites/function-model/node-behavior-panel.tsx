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
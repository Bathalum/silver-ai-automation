"use client"

import { FunctionModelSharedModal } from "./shared-feature-modal"
import { EntityFormFields } from "./feature-form-fields"
import { FlowStatistics } from "../ui/flow-statistics"
import { Layers, Settings, Database } from "lucide-react"
import type { Node, Edge } from "reactflow"
import type { FunctionModel } from "@/lib/domain/entities/function-model-types"
import type { FunctionModelNode } from "@/lib/domain/entities/function-model-node-types"

interface FunctionModelModalProps {
  isOpen: boolean
  onClose: () => void
  functionModel: FunctionModel
  flowNodes?: Node[]
  flowEdges?: Edge[]
  onUpdateFunctionModel?: (updatedModel: FunctionModel) => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}

export function FunctionModelModal({ 
  isOpen, 
  onClose, 
  functionModel,
  flowNodes = [],
  flowEdges = [],
  onUpdateFunctionModel,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: FunctionModelModalProps) {
  
  // Helper function to get node statistics from our node-based architecture
  const getNodeStats = () => {
    const stageNodes = flowNodes.filter(node => node.type === 'stageNode')
    const actionNodes = flowNodes.filter(node => node.type === 'actionTableNode')
    const ioNodes = flowNodes.filter(node => node.type === 'ioNode')
    
    return {
      stages: stageNodes.length,
      actions: actionNodes.length,
      ioPorts: ioNodes.length,
      totalActions: actionNodes.reduce((total, node) => {
        const modes = node.data?.modes || {}
        const actionsMode = modes.actions || { rows: [] }
        return total + (actionsMode.rows?.length || 0)
      }, 0)
    }
  }

  const nodeStats = getNodeStats()
  
  // Render Details Tab - Function Model specific fields
  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Basic Entity Fields */}
      <EntityFormFields
        id={functionModel.modelId}
        name={functionModel.name}
        description={functionModel.description || ''}
        onUpdateName={(name) => onUpdateFunctionModel?.({ ...functionModel, name })}
        onUpdateDescription={(description) => 
          onUpdateFunctionModel?.({ ...functionModel, description })
        }
        entityType="Function Model"
      />

      {/* Function Model Specific Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Version Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Version Information
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Current Version</label>
              <input 
                type="text" 
                value={functionModel.currentVersion} 
                readOnly 
                className="mt-1 w-full p-2 border rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <input 
                type="text" 
                value={functionModel.status} 
                readOnly 
                className="mt-1 w-full p-2 border rounded-md bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Model Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Model Information
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Version Count</label>
              <input 
                type="text" 
                value={functionModel.versionCount.toString()} 
                readOnly 
                className="mt-1 w-full p-2 border rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Saved</label>
              <input 
                type="text" 
                value={functionModel.lastSavedAt.toLocaleDateString()} 
                readOnly 
                className="mt-1 w-full p-2 border rounded-md bg-gray-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stages Summary - Updated for node-based architecture */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Stages ({nodeStats.stages})
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flowNodes
              .filter(node => node.type === 'stageNode')
              .map((node) => {
                const stageData = node.data?.stage
                return (
                  <div key={node.id} className="bg-white rounded border p-3">
                    <h5 className="font-medium text-sm">{stageData?.name || node.data?.name || 'Unnamed Stage'}</h5>
                    <p className="text-xs text-gray-600 mt-1">{stageData?.description || node.data?.description || 'No description'}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {stageData?.actions?.length || 0} actions
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Metadata */}
      {functionModel.metadata && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Metadata
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Version:</span>
              <span className="font-mono">{functionModel.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Category:</span>
              <span>{functionModel.metadata.category || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tags:</span>
              <span>{functionModel.metadata.tags?.join(', ') || 'None'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render Stats Tab - Updated for node-based architecture
  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Function Model Statistics</h3>
      <FlowStatistics
        nodes={flowNodes}
        edges={flowEdges}
        title="Function Model Statistics"
        variant="default"
        showSummary={true}
        showDetailedStats={true}
      />
      
      {/* Function Model Specific Stats - Updated for node-based architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-700">Stages</h4>
          <p className="text-2xl font-bold text-blue-900">{nodeStats.stages}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-700">Total Actions</h4>
          <p className="text-2xl font-bold text-green-900">{nodeStats.totalActions}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-700">I/O Ports</h4>
          <p className="text-2xl font-bold text-purple-900">{nodeStats.ioPorts}</p>
        </div>
      </div>
    </div>
  )

  return (
    <FunctionModelSharedModal
      isOpen={isOpen}
      onClose={onClose}
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToEventStorm={onNavigateToEventStorm}
      onNavigateToSpindle={onNavigateToSpindle}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
} 
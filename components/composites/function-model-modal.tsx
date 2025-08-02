"use client"

import { FunctionModelSharedModal } from "./shared-feature-modal"
import { EntityFormFields } from "./feature-form-fields"
import { FlowStatistics } from "../ui/flow-statistics"
import { Layers, Settings, Database } from "lucide-react"
import type { Node, Edge } from "reactflow"
import type { FunctionModel, Stage, DataPort } from "@/lib/domain/entities/function-model-types"

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
  
  // Render Details Tab - Function Model specific fields
  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Basic Entity Fields */}
      <EntityFormFields
        id={functionModel.id}
        name={functionModel.name}
        description={functionModel.description}
        onUpdateName={(name) => onUpdateFunctionModel?.({ ...functionModel, name })}
        onUpdateDescription={(description) => 
          onUpdateFunctionModel?.({ ...functionModel, description })
        }
        entityType="Function Model"
      />

      {/* Function Model Specific Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Port */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Input Port
          </h4>
          <div className="space-y-3">
            <EntityFormFields
              id="input-port"
              name="Input Port"
              description="Data input for the function model"
              onUpdateName={(name) => {
                // TODO: Update input port name in nodesData
                console.log('Update input port name:', name)
              }}
              onUpdateDescription={(description) => {
                // TODO: Update input port description in nodesData
                console.log('Update input port description:', description)
              }}
              entityType="Input"
            />
          </div>
        </div>

        {/* Output Port */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Output Port
          </h4>
          <div className="space-y-3">
            <EntityFormFields
              id="output-port"
              name="Output Port"
              description="Data output from the function model"
              onUpdateName={(name) => {
                // TODO: Update output port name in nodesData
                console.log('Update output port name:', name)
              }}
              onUpdateDescription={(description) => {
                // TODO: Update output port description in nodesData
                console.log('Update output port description:', description)
              }}
              entityType="Output"
            />
          </div>
        </div>
      </div>

      {/* Nodes Summary */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Nodes ({functionModel.nodesData?.length || 0})
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {functionModel.nodesData?.map((node) => (
              <div key={node.id} className="bg-white rounded border p-3">
                <h5 className="font-medium text-sm">{node.data.label}</h5>
                <p className="text-xs text-gray-600 mt-1">{node.data.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Type: {node.type}
                </div>
              </div>
            )) || (
              <div className="text-sm text-gray-500">No nodes found</div>
            )}
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
              <span className="font-mono">{functionModel.metadata.version}</span>
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

  // Render Stats Tab - Same FlowStatistics component works with any flow data!
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
      
      {/* Function Model Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-700">Nodes</h4>
          <p className="text-2xl font-bold text-blue-900">{functionModel.nodesData?.length || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-700">Connections</h4>
          <p className="text-2xl font-bold text-green-900">{functionModel.edgesData?.length || 0}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-700">Status</h4>
          <p className="text-2xl font-bold text-purple-900 capitalize">{functionModel.status}</p>
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
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
              id={functionModel.input.id}
              name={functionModel.input.name}
              description={functionModel.input.description}
              onUpdateName={(name) => {
                const updatedInput = { ...functionModel.input, name }
                onUpdateFunctionModel?.({ ...functionModel, input: updatedInput })
              }}
              onUpdateDescription={(description) => {
                const updatedInput = { ...functionModel.input, description }
                onUpdateFunctionModel?.({ ...functionModel, input: updatedInput })
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
              id={functionModel.output.id}
              name={functionModel.output.name}
              description={functionModel.output.description}
              onUpdateName={(name) => {
                const updatedOutput = { ...functionModel.output, name }
                onUpdateFunctionModel?.({ ...functionModel, output: updatedOutput })
              }}
              onUpdateDescription={(description) => {
                const updatedOutput = { ...functionModel.output, description }
                onUpdateFunctionModel?.({ ...functionModel, output: updatedOutput })
              }}
              entityType="Output"
            />
          </div>
        </div>
      </div>

      {/* Stages Summary */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Stages ({functionModel.stages.length})
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {functionModel.stages.map((stage) => (
              <div key={stage.id} className="bg-white rounded border p-3">
                <h5 className="font-medium text-sm">{stage.name}</h5>
                <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {stage.actions.length} actions
                </div>
              </div>
            ))}
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
              <span>{functionModel.metadata.tags.join(', ') || 'None'}</span>
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
          <h4 className="text-sm font-medium text-blue-700">Stages</h4>
          <p className="text-2xl font-bold text-blue-900">{functionModel.stages.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-700">Total Actions</h4>
          <p className="text-2xl font-bold text-green-900">
            {functionModel.stages.reduce((total, stage) => total + stage.actions.length, 0)}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-700">Data Ports</h4>
          <p className="text-2xl font-bold text-purple-900">2</p>
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
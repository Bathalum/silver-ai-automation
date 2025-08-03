'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, X, Save, Plus } from 'lucide-react'

interface ModalStackProps {
  modals: Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: any
    context?: { previousModal?: string; stageId?: string }
  }>
  onClose: () => void
  onGoBack: () => void
}

export function ModalStack({ modals, onClose, onGoBack }: ModalStackProps) {
  if (modals.length === 0) return null

  const currentModal = modals[modals.length - 1]
  const canGoBack = modals.length > 1

  const renderModalContent = () => {
    switch (currentModal.type) {
      case 'stage':
        return <StageModalContent data={currentModal.data} />
      case 'action':
        return <ActionModalContent data={currentModal.data} />
      case 'input':
        return <InputModalContent data={currentModal.data} />
      case 'output':
        return <OutputModalContent data={currentModal.data} />
      case 'function':
      default:
        return <FunctionModalContent data={currentModal.data} />
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGoBack}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <DialogTitle className="capitalize">
                {currentModal.type} Details
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {renderModalContent()}
      </DialogContent>
    </Dialog>
  )
}

// Modal Content Components
function StageModalContent({ data }: { data: any }) {
  const [name, setName] = React.useState(data.name || '')
  const [description, setDescription] = React.useState(data.description || '')
  const [actions, setActions] = React.useState(data.actions || [])
  const [dataChanges, setDataChanges] = React.useState(data.dataChange || [])
  const [boundaryCriteria, setBoundaryCriteria] = React.useState(data.boundaryCriteria || [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="stage-name">Name</Label>
          <Input
            id="stage-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter stage name"
          />
        </div>
        <div>
          <Label htmlFor="stage-description">Description</Label>
          <Textarea
            id="stage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter stage description"
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label>Actions</Label>
        <div className="space-y-2 mt-2">
          {actions.map((action: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={action}
                onChange={(e) => {
                  const newActions = [...actions]
                  newActions[index] = e.target.value
                  setActions(newActions)
                }}
                placeholder="Enter action"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActions(actions.filter((_, i) => i !== index))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActions([...actions, ''])}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Action
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ActionModalContent({ data }: { data: any }) {
  const [name, setName] = React.useState(data.name || '')
  const [description, setDescription] = React.useState(data.description || '')
  const [type, setType] = React.useState(data.type || 'action')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="action-name">Name</Label>
          <Input
            id="action-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter action name"
          />
        </div>
        <div>
          <Label htmlFor="action-type">Type</Label>
          <select
            id="action-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="action">Action</option>
            <option value="action-group">Action Group</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="action-description">Description</Label>
        <Textarea
          id="action-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter action description"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}

function InputModalContent({ data }: { data: any }) {
  const [name, setName] = React.useState(data.name || '')
  const [description, setDescription] = React.useState(data.description || '')
  const [masterData, setMasterData] = React.useState(data.masterData || [])
  const [referenceData, setReferenceData] = React.useState(data.referenceData || [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="input-name">Name</Label>
          <Input
            id="input-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter input name"
          />
        </div>
        <div>
          <Label htmlFor="input-description">Description</Label>
          <Textarea
            id="input-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter input description"
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label>Master Data</Label>
        <div className="space-y-2 mt-2">
          {masterData.map((item: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newData = [...masterData]
                  newData[index] = e.target.value
                  setMasterData(newData)
                }}
                placeholder="Enter master data item"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMasterData(masterData.filter((_, i) => i !== index))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMasterData([...masterData, ''])}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Master Data
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}

function OutputModalContent({ data }: { data: any }) {
  const [name, setName] = React.useState(data.name || '')
  const [description, setDescription] = React.useState(data.description || '')
  const [transactionData, setTransactionData] = React.useState(data.transactionData || [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="output-name">Name</Label>
          <Input
            id="output-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter output name"
          />
        </div>
        <div>
          <Label htmlFor="output-description">Description</Label>
          <Textarea
            id="output-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter output description"
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label>Transaction Data</Label>
        <div className="space-y-2 mt-2">
          {transactionData.map((item: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newData = [...transactionData]
                  newData[index] = e.target.value
                  setTransactionData(newData)
                }}
                placeholder="Enter transaction data item"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTransactionData(transactionData.filter((_, i) => i !== index))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransactionData([...transactionData, ''])}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction Data
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}

function FunctionModalContent({ data }: { data: any }) {
  const [name, setName] = React.useState(data.name || '')
  const [description, setDescription] = React.useState(data.description || '')
  const [complexity, setComplexity] = React.useState(data.businessLogic?.complexity || 'simple')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="function-name">Name</Label>
          <Input
            id="function-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter function name"
          />
        </div>
        <div>
          <Label htmlFor="function-complexity">Complexity</Label>
          <select
            id="function-complexity"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="simple">Simple</option>
            <option value="moderate">Moderate</option>
            <option value="complex">Complex</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="function-description">Description</Label>
        <Textarea
          id="function-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter function description"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
} 
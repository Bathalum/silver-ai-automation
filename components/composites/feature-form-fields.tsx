"use client"

import { useState, useEffect } from "react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useFeedback } from "../ui/feedback-toast"

export interface EditableFieldProps {
  label: string
  value: string
  onUpdate: (newValue: string) => void
  placeholder?: string
  successMessage?: string
  readOnly?: boolean
  className?: string
}

export function EditableTextField({
  label,
  value,
  onUpdate,
  placeholder,
  successMessage = "Field updated",
  readOnly = false,
  className
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(value)
  const { showSuccess } = useFeedback()

  // Sync editValue when value changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleBlurOrEnter = () => {
    if (editValue !== value) {
      onUpdate(editValue)
      showSuccess(successMessage)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlurOrEnter()
    }
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleBlurOrEnter}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? "bg-gray-50" : ""}
      />
    </div>
  )
}

export function EditableTextareaField({
  label,
  value,
  onUpdate,
  placeholder,
  successMessage = "Field updated",
  readOnly = false,
  rows = 4,
  className
}: EditableFieldProps & { rows?: number }) {
  const [editValue, setEditValue] = useState(value)
  const { showSuccess } = useFeedback()

  // Sync editValue when value changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleBlurOrEnter = () => {
    if (editValue !== value) {
      onUpdate(editValue)
      showSuccess(successMessage)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlurOrEnter()
    }
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <Textarea
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleBlurOrEnter}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={rows}
        className={readOnly ? "bg-gray-50" : ""}
      />
    </div>
  )
}

// Pre-configured form field sets for common patterns
export interface EntityFormFieldsProps {
  id: string
  name: string
  description: string
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
  entityType?: string
  className?: string
}

export function EntityFormFields({
  id,
  name,
  description,
  onUpdateName,
  onUpdateDescription,
  entityType = "Entity",
  className
}: EntityFormFieldsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <EditableTextField
        label={`${entityType} Name`}
        value={name}
        onUpdate={onUpdateName}
        placeholder={`Enter ${entityType.toLowerCase()} name`}
        successMessage={`${entityType} name updated`}
      />
      
      <EditableTextField
        label={`${entityType} ID`}
        value={id}
        onUpdate={() => {}} // ID is read-only
        readOnly={true}
      />
      
      <EditableTextareaField
        label="Description"
        value={description}
        onUpdate={onUpdateDescription}
        placeholder={`Enter ${entityType.toLowerCase()} description`}
        successMessage={`${entityType} description updated`}
        rows={4}
      />
    </div>
  )
}

// Specific entity form fields
export function EventStormFormFields({
  id,
  name,
  description,
  onUpdateName,
  onUpdateDescription
}: {
  id: string
  name: string
  description: string
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
}) {
  return (
    <EntityFormFields
      id={id}
      name={name}
      description={description}
      onUpdateName={onUpdateName}
      onUpdateDescription={onUpdateDescription}
      entityType="Event Storm"
    />
  )
}

export function DomainFormFields({
  id,
  name,
  description,
  onUpdateName,
  onUpdateDescription
}: {
  id: string
  name: string
  description: string
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
}) {
  return (
    <EntityFormFields
      id={id}
      name={name}
      description={description}
      onUpdateName={onUpdateName}
      onUpdateDescription={onUpdateDescription}
      entityType="Domain"
    />
  )
}

export function EventFormFields({
  id,
  name,
  description,
  onUpdateName,
  onUpdateDescription
}: {
  id: string
  name: string
  description: string
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
}) {
  return (
    <EntityFormFields
      id={id}
      name={name}
      description={description}
      onUpdateName={onUpdateName}
      onUpdateDescription={onUpdateDescription}
      entityType="Event"
    />
  )
} 
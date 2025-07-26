import { useState, useEffect } from "react"
import { useFeedback } from "@/components/ui/feedback-toast"

export interface UseModalFormProps<T> {
  entity: T
  onUpdate: (updated: T) => void
  nameField?: keyof T
  descriptionField?: keyof T
  metadataField?: keyof T
}

export function useModalForm<T extends Record<string, any>>({
  entity,
  onUpdate,
  nameField = 'name' as keyof T,
  descriptionField = 'description' as keyof T,
  metadataField = 'metadata' as keyof T
}: UseModalFormProps<T>) {
  const [editName, setEditName] = useState(String(entity[nameField] || ''))
  const [editDescription, setEditDescription] = useState(String(entity[descriptionField] || ''))
  const [metadata, setMetadata] = useState(entity[metadataField] || {})
  
  const { showSuccess } = useFeedback()

  // Sync form values when entity changes
  useEffect(() => {
    setEditName(String(entity[nameField] || ''))
    setEditDescription(String(entity[descriptionField] || ''))
    setMetadata(entity[metadataField] || {})
  }, [entity, nameField, descriptionField, metadataField])

  // Handlers for blur/enter - real-time editing
  const handleNameBlurOrEnter = () => {
    if (editName !== entity[nameField]) {
      const updatedEntity = {
        ...entity,
        [nameField]: editName,
      }
      onUpdate(updatedEntity)
      showSuccess(`${String(nameField).charAt(0).toUpperCase() + String(nameField).slice(1)} updated`)
    }
  }
  
  const handleDescriptionBlurOrEnter = () => {
    if (editDescription !== entity[descriptionField]) {
      const updatedEntity = {
        ...entity,
        [descriptionField]: editDescription,
      }
      onUpdate(updatedEntity)
      showSuccess(`${String(descriptionField).charAt(0).toUpperCase() + String(descriptionField).slice(1)} updated`)
    }
  }

  const handleMetadataBlurOrEnter = () => {
    const updatedEntity = {
      ...entity,
      [metadataField]: metadata,
    }
    onUpdate(updatedEntity)
    showSuccess(`${String(metadataField).charAt(0).toUpperCase() + String(metadataField).slice(1)} updated`)
  }

  return {
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    metadata,
    setMetadata,
    handleNameBlurOrEnter,
    handleDescriptionBlurOrEnter,
    handleMetadataBlurOrEnter
  }
} 
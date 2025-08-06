// Modal Management Hook
// This file implements the Application Layer hook for modal stack management

import { useState, useCallback } from 'react'
import { useFeedback } from '@/components/ui/feedback-toast'

export interface ModalData {
  type: "function" | "stage" | "action" | "input" | "output"
  data: any
  context?: { 
    previousModal?: string
    stageId?: string
    nodeId?: string
  }
}

export interface ModalStackState {
  modals: ModalData[]
  currentModal: ModalData | null
  canGoBack: boolean
}

export function useModalManagement() {
  const [modalStack, setModalStack] = useState<ModalData[]>([])
  const { showSuccess, showError } = useFeedback()

  // Get current modal and navigation state
  const currentModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null
  const canGoBack = modalStack.length > 1

  // Open a new modal
  const openModal = useCallback((modalData: ModalData) => {
    try {
      setModalStack(prev => [...prev, modalData])
      showSuccess(`Opened ${modalData.type} modal`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open modal'
      showError(errorMessage)
    }
  }, [])

  // Close the current modal
  const closeModal = useCallback(() => {
    try {
      if (modalStack.length > 0) {
        setModalStack(prev => prev.slice(0, -1))
        showSuccess('Modal closed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close modal'
      showError(errorMessage)
    }
  }, [modalStack.length])

  // Close all modals
  const closeAllModals = useCallback(() => {
    try {
      setModalStack([])
      showSuccess('All modals closed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close all modals'
      showError(errorMessage)
    }
  }, [])

  // Go back to previous modal
  const goBackToPreviousModal = useCallback(() => {
    try {
      if (modalStack.length > 1) {
        setModalStack(prev => prev.slice(0, -1))
        showSuccess('Returned to previous modal')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to go back'
      showError(errorMessage)
    }
  }, [modalStack.length])

  // Close modals by context (e.g., close all modals for a specific stage)
  const closeModalsByContext = useCallback((contextKey: string, contextValue: string) => {
    try {
      setModalStack(prev => prev.filter(modal => 
        modal.context?.[contextKey as keyof typeof modal.context] !== contextValue
      ))
      showSuccess('Context modals closed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close context modals'
      showError(errorMessage)
    }
  }, [])

  // Update current modal data
  const updateCurrentModal = useCallback((updates: Partial<ModalData>) => {
    try {
      if (modalStack.length > 0) {
        setModalStack(prev => {
          const newStack = [...prev]
          const lastIndex = newStack.length - 1
          newStack[lastIndex] = { ...newStack[lastIndex], ...updates }
          return newStack
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update modal'
      showError(errorMessage)
    }
  }, [modalStack.length])

  return {
    // State
    modalStack,
    currentModal,
    canGoBack,
    
    // Actions
    openModal,
    closeModal,
    closeAllModals,
    goBackToPreviousModal,
    closeModalsByContext,
    updateCurrentModal,
    
    // Utilities
    hasModals: modalStack.length > 0,
    modalCount: modalStack.length
  }
} 
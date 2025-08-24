/**
 * Workflow UI state management hook
 * Handles workflow-specific UI state like selection, editing mode, and interactions
 */

import { useState, useCallback, useRef } from 'react'

export interface WorkflowNode {
  id: string
  type: 'input' | 'output' | 'stage' | 'container' | 'kb' | 'tether'
  name: string
  description: string
  position: { x: number; y: number }
  config: Record<string, any>
  status: 'idle' | 'running' | 'completed' | 'error'
  selected?: boolean
}

export interface WorkflowConnection {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  type: 'default' | 'conditional'
  label?: string
  condition?: string
  selected?: boolean
}

export interface WorkflowUIState {
  // Selection state
  selectedNodes: string[]
  selectedConnections: string[]
  selectedElements: string[]
  
  // Editing state
  isEditing: boolean
  editMode: 'select' | 'connect' | 'pan' | 'zoom'
  isDragging: boolean
  isConnecting: boolean
  
  // UI interaction state
  hoveredNode: string | null
  hoveredConnection: string | null
  contextMenu: {
    isOpen: boolean
    position: { x: number; y: number } | null
    target: 'node' | 'connection' | 'canvas' | null
    targetId: string | null
  }
  
  // Canvas state
  canvasPosition: { x: number; y: number }
  canvasZoom: number
  canvasSize: { width: number; height: number }
  
  // Panel state
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  activePanel: 'properties' | 'context' | 'execution' | 'history' | null
  
  // Toolbar state
  toolbarVisible: boolean
  activeTool: 'select' | 'pan' | 'zoom' | 'connect' | 'add-node' | null
}

export interface UseWorkflowUIStateReturn extends WorkflowUIState {
  // Selection methods
  selectNode: (nodeId: string, multiSelect?: boolean) => void
  selectConnection: (connectionId: string, multiSelect?: boolean) => void
  selectElement: (elementId: string, type: 'node' | 'connection', multiSelect?: boolean) => void
  clearSelection: () => void
  
  // Editing methods
  setEditMode: (mode: WorkflowUIState['editMode']) => void
  setDragging: (dragging: boolean) => void
  setConnecting: (connecting: boolean) => void
  
  // UI interaction methods
  setHoveredNode: (nodeId: string | null) => void
  setHoveredConnection: (connectionId: string | null) => void
  openContextMenu: (position: { x: number; y: number }, target: 'node' | 'connection' | 'canvas', targetId?: string) => void
  closeContextMenu: () => void
  
  // Canvas methods
  setCanvasPosition: (position: { x: number; y: number }) => void
  setCanvasZoom: (zoom: number) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  resetCanvas: () => void
  
  // Panel methods
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setActivePanel: (panel: WorkflowUIState['activePanel']) => void
  
  // Toolbar methods
  setToolbarVisible: (visible: boolean) => void
  setActiveTool: (tool: WorkflowUIState['activeTool']) => void
  
  // Utility methods
  isNodeSelected: (nodeId: string) => boolean
  isConnectionSelected: (connectionId: string) => boolean
  getSelectedElements: () => { nodes: string[], connections: string[] }
}

const initialState: WorkflowUIState = {
  selectedNodes: [],
  selectedConnections: [],
  selectedElements: [],
  isEditing: false,
  editMode: 'select',
  isDragging: false,
  isConnecting: false,
  hoveredNode: null,
  hoveredConnection: null,
  contextMenu: {
    isOpen: false,
    position: null,
    target: null,
    targetId: null
  },
  canvasPosition: { x: 0, y: 0 },
  canvasZoom: 1,
  canvasSize: { width: 0, height: 0 },
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: false,
  activePanel: 'properties',
  toolbarVisible: true,
  activeTool: 'select'
}

export function useWorkflowUIState(): UseWorkflowUIStateReturn {
  const [state, setState] = useState<WorkflowUIState>(initialState)
  const lastSelectionTime = useRef<number>(0)

  // Selection methods
  const selectNode = useCallback((nodeId: string, multiSelect = false) => {
    setState(prev => {
      const now = Date.now()
      const isMultiSelect = multiSelect || (now - lastSelectionTime.current < 300)
      lastSelectionTime.current = now

      if (isMultiSelect) {
        const newSelectedNodes = prev.selectedNodes.includes(nodeId)
          ? prev.selectedNodes.filter(id => id !== nodeId)
          : [...prev.selectedNodes, nodeId]
        
        return {
          ...prev,
          selectedNodes: newSelectedNodes,
          selectedElements: [...newSelectedNodes, ...prev.selectedConnections]
        }
      } else {
        return {
          ...prev,
          selectedNodes: [nodeId],
          selectedConnections: [],
          selectedElements: [nodeId]
        }
      }
    })
  }, [])

  const selectConnection = useCallback((connectionId: string, multiSelect = false) => {
    setState(prev => {
      const now = Date.now()
      const isMultiSelect = multiSelect || (now - lastSelectionTime.current < 300)
      lastSelectionTime.current = now

      if (isMultiSelect) {
        const newSelectedConnections = prev.selectedConnections.includes(connectionId)
          ? prev.selectedConnections.filter(id => id !== connectionId)
          : [...prev.selectedConnections, connectionId]
        
        return {
          ...prev,
          selectedConnections: newSelectedConnections,
          selectedElements: [...prev.selectedNodes, ...newSelectedConnections]
        }
      } else {
        return {
          ...prev,
          selectedNodes: [],
          selectedConnections: [connectionId],
          selectedElements: [connectionId]
        }
      }
    })
  }, [])

  const selectElement = useCallback((elementId: string, type: 'node' | 'connection', multiSelect = false) => {
    if (type === 'node') {
      selectNode(elementId, multiSelect)
    } else {
      selectConnection(elementId, multiSelect)
    }
  }, [selectNode, selectConnection])

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNodes: [],
      selectedConnections: [],
      selectedElements: []
    }))
  }, [])

  // Editing methods
  const setEditMode = useCallback((mode: WorkflowUIState['editMode']) => {
    setState(prev => ({
      ...prev,
      editMode: mode,
      isConnecting: mode === 'connect'
    }))
  }, [])

  const setDragging = useCallback((dragging: boolean) => {
    setState(prev => ({ ...prev, isDragging: dragging }))
  }, [])

  const setConnecting = useCallback((connecting: boolean) => {
    setState(prev => ({ ...prev, isConnecting: connecting }))
  }, [])

  // UI interaction methods
  const setHoveredNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, hoveredNode: nodeId }))
  }, [])

  const setHoveredConnection = useCallback((connectionId: string | null) => {
    setState(prev => ({ ...prev, hoveredConnection: connectionId }))
  }, [])

  const openContextMenu = useCallback((position: { x: number; y: number }, target: 'node' | 'connection' | 'canvas', targetId?: string) => {
    setState(prev => ({
      ...prev,
      contextMenu: {
        isOpen: true,
        position,
        target,
        targetId: targetId || null
      }
    }))
  }, [])

  const closeContextMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      contextMenu: {
        ...prev.contextMenu,
        isOpen: false,
        position: null,
        target: null,
        targetId: null
      }
    }))
  }, [])

  // Canvas methods
  const setCanvasPosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({ ...prev, canvasPosition: position }))
  }, [])

  const setCanvasZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, canvasZoom: Math.max(0.1, Math.min(3, zoom)) }))
  }, [])

  const setCanvasSize = useCallback((size: { width: number; height: number }) => {
    setState(prev => ({ ...prev, canvasSize: size }))
  }, [])

  const resetCanvas = useCallback(() => {
    setState(prev => ({
      ...prev,
      canvasPosition: { x: 0, y: 0 },
      canvasZoom: 1
    }))
  }, [])

  // Panel methods
  const toggleLeftPanel = useCallback(() => {
    setState(prev => ({ ...prev, leftPanelOpen: !prev.leftPanelOpen }))
  }, [])

  const toggleRightPanel = useCallback(() => {
    setState(prev => ({ ...prev, rightPanelOpen: !prev.rightPanelOpen }))
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setState(prev => ({ ...prev, bottomPanelOpen: !prev.bottomPanelOpen }))
  }, [])

  const setActivePanel = useCallback((panel: WorkflowUIState['activePanel']) => {
    setState(prev => ({ ...prev, activePanel: panel }))
  }, [])

  // Toolbar methods
  const setToolbarVisible = useCallback((visible: boolean) => {
    setState(prev => ({ ...prev, toolbarVisible: visible }))
  }, [])

  const setActiveTool = useCallback((tool: WorkflowUIState['activeTool']) => {
    setState(prev => ({ ...prev, activeTool: tool }))
  }, [])

  // Utility methods
  const isNodeSelected = useCallback((nodeId: string) => {
    return state.selectedNodes.includes(nodeId)
  }, [state.selectedNodes])

  const isConnectionSelected = useCallback((connectionId: string) => {
    return state.selectedConnections.includes(connectionId)
  }, [state.selectedConnections])

  const getSelectedElements = useCallback(() => {
    return {
      nodes: state.selectedNodes,
      connections: state.selectedConnections
    }
  }, [state.selectedNodes, state.selectedConnections])

  return {
    ...state,
    selectNode,
    selectConnection,
    selectElement,
    clearSelection,
    setEditMode,
    setDragging,
    setConnecting,
    setHoveredNode,
    setHoveredConnection,
    openContextMenu,
    closeContextMenu,
    setCanvasPosition,
    setCanvasZoom,
    setCanvasSize,
    resetCanvas,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
    setActivePanel,
    setToolbarVisible,
    setActiveTool,
    isNodeSelected,
    isConnectionSelected,
    getSelectedElements
  }
}

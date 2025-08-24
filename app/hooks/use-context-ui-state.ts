/**
 * Context UI state management hook
 * Handles context sharing, hierarchy, and access control UI state
 */

import { useState, useCallback, useRef } from 'react'

export interface ContextNode {
  id: string
  name: string
  type: 'input' | 'output' | 'intermediate' | 'shared'
  value: any
  dataType: string
  source: string
  timestamp: Date
  accessLevel: 'private' | 'team' | 'public'
  isEncrypted: boolean
  version: number
  metadata: Record<string, any>
}

export interface ContextRelationship {
  id: string
  sourceId: string
  targetId: string
  type: 'inherits' | 'shares' | 'depends' | 'references'
  strength: 'weak' | 'medium' | 'strong'
  bidirectional: boolean
  metadata: Record<string, any>
}

export interface ContextHierarchy {
  id: string
  name: string
  level: number
  parentId: string | null
  children: string[]
  contextIds: string[]
  accessControl: {
    canRead: boolean
    canWrite: boolean
    canShare: boolean
    canDelete: boolean
  }
}

export interface ContextAccessControl {
  userId: string
  userName: string
  userRole: string
  permissions: {
    read: boolean
    write: boolean
    share: boolean
    delete: boolean
    admin: boolean
  }
  grantedAt: Date
  grantedBy: string
  expiresAt?: Date
}

export interface ContextUIState {
  // Context management
  contexts: ContextNode[]
  relationships: ContextRelationship[]
  hierarchies: ContextHierarchy[]
  accessControls: ContextAccessControl[]
  
  // Context selection and editing
  selectedContext: string | null
  editingContext: string | null
  contextClipboard: ContextNode[]
  
  // Context sharing state
  isSharing: boolean
  sharingContext: string | null
  shareTargets: string[]
  sharePermissions: {
    read: boolean
    write: boolean
    share: boolean
    delete: boolean
  }
  
  // Context hierarchy state
  activeHierarchy: string | null
  expandedHierarchyNodes: string[]
  hierarchyViewMode: 'tree' | 'graph' | 'list'
  
  // Context access state
  currentUserAccess: ContextAccessControl | null
  accessRequestPending: boolean
  accessRequestReason: string
  
  // Context validation
  validationErrors: Array<{
    contextId: string
    field: string
    message: string
    severity: 'warning' | 'error'
  }>
  isValidating: boolean
  
  // UI display state
  showContextPanel: boolean
  showAccessPanel: boolean
  showHierarchyPanel: boolean
  showSharingPanel: boolean
  
  // Context search and filtering
  contextSearchTerm: string
  contextTypeFilter: string[]
  contextAccessFilter: string[]
  contextSortBy: 'name' | 'type' | 'timestamp' | 'access'
  contextSortOrder: 'asc' | 'desc'
  
  // Context operations
  isCreatingContext: boolean
  isUpdatingContext: boolean
  isDeletingContext: boolean
  operationInProgress: boolean
}

export interface UseContextUIStateReturn extends ContextUIState {
  // Context management methods
  addContext: (context: Omit<ContextNode, 'id' | 'timestamp' | 'version'>) => string
  updateContext: (contextId: string, updates: Partial<ContextNode>) => void
  deleteContext: (contextId: string) => void
  duplicateContext: (contextId: string) => string
  
  // Context selection methods
  selectContext: (contextId: string | null) => void
  setEditingContext: (contextId: string | null) => void
  addToClipboard: (contextId: string) => void
  removeFromClipboard: (contextId: string) => void
  clearClipboard: () => void
  
  // Context sharing methods
  startSharing: (contextId: string) => void
  stopSharing: () => void
  addShareTarget: (targetId: string) => void
  removeShareTarget: (targetId: string) => void
  setSharePermissions: (permissions: Partial<ContextUIState['sharePermissions']>) => void
  executeShare: () => Promise<void>
  
  // Context hierarchy methods
  setActiveHierarchy: (hierarchyId: string | null) => void
  expandHierarchyNode: (nodeId: string) => void
  collapseHierarchyNode: (nodeId: string) => void
  setHierarchyViewMode: (mode: ContextUIState['hierarchyViewMode']) => void
  createHierarchy: (name: string, parentId?: string) => string
  deleteHierarchy: (hierarchyId: string) => void
  
  // Context access methods
  requestAccess: (contextId: string, reason: string) => Promise<void>
  grantAccess: (userId: string, contextId: string, permissions: Partial<ContextAccessControl['permissions']>) => void
  revokeAccess: (userId: string, contextId: string) => void
  updateAccessPermissions: (userId: string, contextId: string, permissions: Partial<ContextAccessControl['permissions']>) => void
  
  // Context validation methods
  validateContext: (contextId: string) => Promise<boolean>
  validateAllContexts: () => Promise<void>
  clearValidationErrors: (contextId?: string) => void
  
  // UI display methods
  toggleContextPanel: () => void
  toggleAccessPanel: () => void
  toggleHierarchyPanel: () => void
  toggleSharingPanel: () => void
  
  // Context search and filtering methods
  setContextSearchTerm: (term: string) => void
  setContextTypeFilter: (types: string[]) => void
  setContextAccessFilter: (accessLevels: string[]) => void
  setContextSortBy: (field: ContextUIState['contextSortBy']) => void
  setContextSortOrder: (order: ContextUIState['contextSortOrder']) => void
  
  // Context operations methods
  setCreatingContext: (creating: boolean) => void
  setUpdatingContext: (updating: boolean) => void
  setDeletingContext: (deleting: boolean) => void
  
  // Utility methods
  getContextById: (contextId: string) => ContextNode | undefined
  getContextsByType: (type: string) => ContextNode[]
  getContextsByAccessLevel: (accessLevel: string) => ContextNode[]
  getContextHierarchy: (contextId: string) => ContextHierarchy | undefined
  getContextAccessControl: (contextId: string, userId: string) => ContextAccessControl | undefined
  canUserAccess: (contextId: string, userId: string, permission: keyof ContextAccessControl['permissions']) => boolean
  getFilteredContexts: () => ContextNode[]
  getSortedContexts: (contexts: ContextNode[]) => ContextNode[]
}

const initialState: ContextUIState = {
  contexts: [],
  relationships: [],
  hierarchies: [],
  accessControls: [],
  selectedContext: null,
  editingContext: null,
  contextClipboard: [],
  isSharing: false,
  sharingContext: null,
  shareTargets: [],
  sharePermissions: {
    read: true,
    write: false,
    share: false,
    delete: false
  },
  activeHierarchy: null,
  expandedHierarchyNodes: [],
  hierarchyViewMode: 'tree',
  currentUserAccess: null,
  accessRequestPending: false,
  accessRequestReason: '',
  validationErrors: [],
  isValidating: false,
  showContextPanel: false,
  showAccessPanel: false,
  showHierarchyPanel: false,
  showSharingPanel: false,
  contextSearchTerm: '',
  contextTypeFilter: [],
  contextAccessFilter: [],
  contextSortBy: 'name',
  contextSortOrder: 'asc',
  isCreatingContext: false,
  isUpdatingContext: false,
  isDeletingContext: false,
  operationInProgress: false
}

export function useContextUIState(): UseContextUIStateReturn {
  const [state, setState] = useState<ContextUIState>(initialState)
  const contextCounterRef = useRef(0)
  const hierarchyCounterRef = useRef(0)

  // Context management methods
  const addContext = useCallback((context: Omit<ContextNode, 'id' | 'timestamp' | 'version'>) => {
    const contextId = `ctx-${++contextCounterRef.current}`
    const newContext: ContextNode = {
      ...context,
      id: contextId,
      timestamp: new Date(),
      version: 1
    }
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, newContext]
    }))
    
    return contextId
  }, [])

  const updateContext = useCallback((contextId: string, updates: Partial<ContextNode>) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(ctx => {
        if (ctx.id === contextId) {
          return {
            ...ctx,
            ...updates,
            version: ctx.version + 1,
            timestamp: new Date()
          }
        }
        return ctx
      })
    }))
  }, [])

  const deleteContext = useCallback((contextId: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.filter(ctx => ctx.id !== contextId),
      selectedContext: prev.selectedContext === contextId ? null : prev.selectedContext,
      editingContext: prev.editingContext === contextId ? null : prev.editingContext
    }))
  }, [])

  const duplicateContext = useCallback((contextId: string) => {
    const originalContext = state.contexts.find(ctx => ctx.id === contextId)
    if (!originalContext) return ''
    
    const duplicatedContext: Omit<ContextNode, 'id' | 'timestamp' | 'version'> = {
      ...originalContext,
      name: `${originalContext.name} (Copy)`,
      timestamp: new Date(),
      version: 1
    }
    
    return addContext(duplicatedContext)
  }, [state.contexts, addContext])

  // Context selection methods
  const selectContext = useCallback((contextId: string | null) => {
    setState(prev => ({ ...prev, selectedContext: contextId }))
  }, [])

  const setEditingContext = useCallback((contextId: string | null) => {
    setState(prev => ({ ...prev, editingContext: contextId }))
  }, [])

  const addToClipboard = useCallback((contextId: string) => {
    const context = state.contexts.find(ctx => ctx.id === contextId)
    if (context && !state.contextClipboard.find(ctx => ctx.id === contextId)) {
      setState(prev => ({
        ...prev,
        contextClipboard: [...prev.contextClipboard, context]
      }))
    }
  }, [state.contexts, state.contextClipboard])

  const removeFromClipboard = useCallback((contextId: string) => {
    setState(prev => ({
      ...prev,
      contextClipboard: prev.contextClipboard.filter(ctx => ctx.id !== contextId)
    }))
  }, [])

  const clearClipboard = useCallback(() => {
    setState(prev => ({ ...prev, contextClipboard: [] }))
  }, [])

  // Context sharing methods
  const startSharing = useCallback((contextId: string) => {
    setState(prev => ({
      ...prev,
      isSharing: true,
      sharingContext: contextId,
      showSharingPanel: true
    }))
  }, [])

  const stopSharing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSharing: false,
      sharingContext: null,
      showSharingPanel: false
    }))
  }, [])

  const addShareTarget = useCallback((targetId: string) => {
    setState(prev => ({
      ...prev,
      shareTargets: prev.shareTargets.includes(targetId) 
        ? prev.shareTargets 
        : [...prev.shareTargets, targetId]
    }))
  }, [])

  const removeShareTarget = useCallback((targetId: string) => {
    setState(prev => ({
      ...prev,
      shareTargets: prev.shareTargets.filter(id => id !== targetId)
    }))
  }, [])

  const setSharePermissions = useCallback((permissions: Partial<ContextUIState['sharePermissions']>) => {
    setState(prev => ({
      ...prev,
      sharePermissions: { ...prev.sharePermissions, ...permissions }
    }))
  }, [])

  const executeShare = useCallback(async () => {
    // Implementation would handle the actual sharing logic
    setState(prev => ({
      ...prev,
      isSharing: false,
      sharingContext: null,
      showSharingPanel: false
    }))
  }, [])

  // Context hierarchy methods
  const setActiveHierarchy = useCallback((hierarchyId: string | null) => {
    setState(prev => ({ ...prev, activeHierarchy: hierarchyId }))
  }, [])

  const expandHierarchyNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      expandedHierarchyNodes: prev.expandedHierarchyNodes.includes(nodeId)
        ? prev.expandedHierarchyNodes
        : [...prev.expandedHierarchyNodes, nodeId]
    }))
  }, [])

  const collapseHierarchyNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      expandedHierarchyNodes: prev.expandedHierarchyNodes.filter(id => id !== nodeId)
    }))
  }, [])

  const setHierarchyViewMode = useCallback((mode: ContextUIState['hierarchyViewMode']) => {
    setState(prev => ({ ...prev, hierarchyViewMode: mode }))
  }, [])

  const createHierarchy = useCallback((name: string, parentId?: string) => {
    const hierarchyId = `hier-${++hierarchyCounterRef.current}`
    const newHierarchy: ContextHierarchy = {
      id: hierarchyId,
      name,
      level: parentId ? (state.hierarchies.find(h => h.id === parentId)?.level || 0) + 1 : 0,
      parentId: parentId || null,
      children: [],
      contextIds: [],
      accessControl: {
        canRead: true,
        canWrite: true,
        canShare: true,
        canDelete: true
      }
    }
    
    setState(prev => ({
      ...prev,
      hierarchies: [...prev.hierarchies, newHierarchy]
    }))
    
    return hierarchyId
  }, [state.hierarchies])

  const deleteHierarchy = useCallback((hierarchyId: string) => {
    setState(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => h.id !== hierarchyId)
    }))
  }, [])

  // Context access methods
  const requestAccess = useCallback(async (contextId: string, reason: string) => {
    setState(prev => ({
      ...prev,
      accessRequestPending: true,
      accessRequestReason: reason
    }))
    
    // Implementation would handle the actual access request
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setState(prev => ({
      ...prev,
      accessRequestPending: false,
      accessRequestReason: ''
    }))
  }, [])

  const grantAccess = useCallback((userId: string, contextId: string, permissions: Partial<ContextAccessControl['permissions']>) => {
    const newAccessControl: ContextAccessControl = {
      userId,
      userName: `User ${userId}`, // This would come from user service
      userRole: 'user',
      permissions: {
        read: true,
        write: false,
        share: false,
        delete: false,
        admin: false,
        ...permissions
      },
      grantedAt: new Date(),
      grantedBy: 'current-user' // This would come from auth service
    }
    
    setState(prev => ({
      ...prev,
      accessControls: [...prev.accessControls, newAccessControl]
    }))
  }, [])

  const revokeAccess = useCallback((userId: string, contextId: string) => {
    setState(prev => ({
      ...prev,
      accessControls: prev.accessControls.filter(ac => 
        !(ac.userId === userId && ac.userId === contextId)
      )
    }))
  }, [])

  const updateAccessPermissions = useCallback((userId: string, contextId: string, permissions: Partial<ContextAccessControl['permissions']>) => {
    setState(prev => ({
      ...prev,
      accessControls: prev.accessControls.map(ac => {
        if (ac.userId === userId && ac.userId === contextId) {
          return {
            ...ac,
            permissions: { ...ac.permissions, ...permissions }
          }
        }
        return ac
      })
    }))
  }, [])

  // Context validation methods
  const validateContext = useCallback(async (contextId: string): Promise<boolean> => {
    const context = state.contexts.find(ctx => ctx.id === contextId)
    if (!context) return false
    
    // Simple validation - in real implementation, this would be more comprehensive
    const isValid = context.name.length > 0 && context.dataType.length > 0
    
    setState(prev => ({
      ...prev,
      validationErrors: prev.validationErrors.filter(err => err.contextId !== contextId)
    }))
    
    if (!isValid) {
      setState(prev => ({
        ...prev,
        validationErrors: [
          ...prev.validationErrors,
          {
            contextId,
            field: 'validation',
            message: 'Context validation failed',
            severity: 'error'
          }
        ]
      }))
    }
    
    return isValid
  }, [state.contexts])

  const validateAllContexts = useCallback(async () => {
    setState(prev => ({ ...prev, isValidating: true }))
    
    const validationPromises = state.contexts.map(ctx => validateContext(ctx.id))
    await Promise.all(validationPromises)
    
    setState(prev => ({ ...prev, isValidating: false }))
  }, [state.contexts, validateContext])

  const clearValidationErrors = useCallback((contextId?: string) => {
    setState(prev => ({
      ...prev,
      validationErrors: contextId 
        ? prev.validationErrors.filter(err => err.contextId !== contextId)
        : []
    }))
  }, [])

  // UI display methods
  const toggleContextPanel = useCallback(() => {
    setState(prev => ({ ...prev, showContextPanel: !prev.showContextPanel }))
  }, [])

  const toggleAccessPanel = useCallback(() => {
    setState(prev => ({ ...prev, showAccessPanel: !prev.showAccessPanel }))
  }, [])

  const toggleHierarchyPanel = useCallback(() => {
    setState(prev => ({ ...prev, showHierarchyPanel: !prev.showHierarchyPanel }))
  }, [])

  const toggleSharingPanel = useCallback(() => {
    setState(prev => ({ ...prev, showSharingPanel: !prev.showSharingPanel }))
  }, [])

  // Context search and filtering methods
  const setContextSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, contextSearchTerm: term }))
  }, [])

  const setContextTypeFilter = useCallback((types: string[]) => {
    setState(prev => ({ ...prev, contextTypeFilter: types }))
  }, [])

  const setContextAccessFilter = useCallback((accessLevels: string[]) => {
    setState(prev => ({ ...prev, contextAccessFilter: accessLevels }))
  }, [])

  const setContextSortBy = useCallback((field: ContextUIState['contextSortBy']) => {
    setState(prev => ({ ...prev, contextSortBy: field }))
  }, [])

  const setContextSortOrder = useCallback((order: ContextUIState['contextSortOrder']) => {
    setState(prev => ({ ...prev, contextSortOrder: order }))
  }, [])

  // Context operations methods
  const setCreatingContext = useCallback((creating: boolean) => {
    setState(prev => ({ ...prev, isCreatingContext: creating }))
  }, [])

  const setUpdatingContext = useCallback((updating: boolean) => {
    setState(prev => ({ ...prev, isUpdatingContext: updating }))
  }, [])

  const setDeletingContext = useCallback((deleting: boolean) => {
    setState(prev => ({ ...prev, isDeletingContext: deleting }))
  }, [])

  // Utility methods
  const getContextById = useCallback((contextId: string) => {
    return state.contexts.find(ctx => ctx.id === contextId)
  }, [state.contexts])

  const getContextsByType = useCallback((type: string) => {
    return state.contexts.filter(ctx => ctx.type === type)
  }, [state.contexts])

  const getContextsByAccessLevel = useCallback((accessLevel: string) => {
    return state.contexts.filter(ctx => ctx.accessLevel === accessLevel)
  }, [state.contexts])

  const getContextHierarchy = useCallback((contextId: string) => {
    return state.hierarchies.find(h => h.contextIds.includes(contextId))
  }, [state.hierarchies])

  const getContextAccessControl = useCallback((contextId: string, userId: string) => {
    return state.accessControls.find(ac => 
      ac.userId === userId && ac.userId === contextId
    )
  }, [state.accessControls])

  const canUserAccess = useCallback((contextId: string, userId: string, permission: keyof ContextAccessControl['permissions']) => {
    const accessControl = getContextAccessControl(contextId, userId)
    return accessControl?.permissions[permission] || false
  }, [getContextAccessControl])

  const getFilteredContexts = useCallback(() => {
    let filtered = state.contexts

    // Apply search filter
    if (state.contextSearchTerm) {
      filtered = filtered.filter(ctx =>
        ctx.name.toLowerCase().includes(state.contextSearchTerm.toLowerCase()) ||
        ctx.description?.toLowerCase().includes(state.contextSearchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (state.contextTypeFilter.length > 0) {
      filtered = filtered.filter(ctx => state.contextTypeFilter.includes(ctx.type))
    }

    // Apply access level filter
    if (state.contextAccessFilter.length > 0) {
      filtered = filtered.filter(ctx => state.contextAccessFilter.includes(ctx.accessLevel))
    }

    return filtered
  }, [state.contexts, state.contextSearchTerm, state.contextTypeFilter, state.contextAccessFilter])

  const getSortedContexts = useCallback((contexts: ContextNode[]) => {
    const sorted = [...contexts].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (state.contextSortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'type':
          aValue = a.type.toLowerCase()
          bValue = b.type.toLowerCase()
          break
        case 'timestamp':
          aValue = a.timestamp.getTime()
          bValue = b.timestamp.getTime()
          break
        case 'access':
          aValue = a.accessLevel.toLowerCase()
          bValue = b.accessLevel.toLowerCase()
          break
        default:
          return 0
      }

      if (state.contextSortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return sorted
  }, [state.contextSortBy, state.contextSortOrder])

  return {
    ...state,
    addContext,
    updateContext,
    deleteContext,
    duplicateContext,
    selectContext,
    setEditingContext,
    addToClipboard,
    removeFromClipboard,
    clearClipboard,
    startSharing,
    stopSharing,
    addShareTarget,
    removeShareTarget,
    setSharePermissions,
    executeShare,
    setActiveHierarchy,
    expandHierarchyNode,
    collapseHierarchyNode,
    setHierarchyViewMode,
    createHierarchy,
    deleteHierarchy,
    requestAccess,
    grantAccess,
    revokeAccess,
    updateAccessPermissions,
    validateContext,
    validateAllContexts,
    clearValidationErrors,
    toggleContextPanel,
    toggleAccessPanel,
    toggleHierarchyPanel,
    toggleSharingPanel,
    setContextSearchTerm,
    setContextTypeFilter,
    setContextAccessFilter,
    setContextSortBy,
    setContextSortOrder,
    setCreatingContext,
    setUpdatingContext,
    setDeletingContext,
    getContextById,
    getContextsByType,
    getContextsByAccessLevel,
    getContextHierarchy,
    getContextAccessControl,
    canUserAccess,
    getFilteredContexts,
    getSortedContexts
  }
}

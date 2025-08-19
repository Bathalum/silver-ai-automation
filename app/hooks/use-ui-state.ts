// UI State Management Hook - Pure UI Concerns Only
// Following Clean Architecture: UI-only state with no business logic

'use client'

import { useState, useCallback, useReducer } from 'react'

/**
 * UI State Types - Pure presentation concerns
 */
export interface ModalState {
  workflowCreation: boolean
  nodeProperties: boolean
  contextViewer: boolean
  validation: boolean
  settings: boolean
  help: boolean
}

export interface SidebarState {
  isOpen: boolean
  activeTab: 'properties' | 'context' | 'validation' | 'templates'
  width: number
  collapsed: boolean
}

export interface CanvasViewportState {
  zoom: number
  position: { x: number; y: number }
  bounds: { width: number; height: number }
  fitToScreen: boolean
  snapToGrid: boolean
  gridSize: number
}

export interface FormState {
  activeForm: string | null
  isDirty: boolean
  isSubmitting: boolean
  lastSaved: string | null
  autoSaveEnabled: boolean
  validationMode: 'onBlur' | 'onChange' | 'onSubmit'
}

export interface AppearanceState {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'normal' | 'spacious'
  animations: boolean
  reducedMotion: boolean
  highContrast: boolean
}

export interface SearchFilterState {
  query: string
  activeFilters: string[]
  showAdvanced: boolean
  searchHistory: string[]
  isSearching: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface UIState {
  modals: ModalState
  sidebar: SidebarState
  viewport: CanvasViewportState
  forms: FormState
  appearance: AppearanceState
  searchFilter: SearchFilterState
}

/**
 * UI State Actions
 */
type UIAction =
  | { type: 'TOGGLE_MODAL'; modal: keyof ModalState }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'SET_SIDEBAR_OPEN'; isOpen: boolean }
  | { type: 'SET_SIDEBAR_TAB'; tab: SidebarState['activeTab'] }
  | { type: 'SET_SIDEBAR_WIDTH'; width: number }
  | { type: 'TOGGLE_SIDEBAR_COLLAPSED' }
  | { type: 'SET_VIEWPORT_ZOOM'; zoom: number }
  | { type: 'SET_VIEWPORT_POSITION'; position: { x: number; y: number } }
  | { type: 'SET_VIEWPORT_BOUNDS'; bounds: { width: number; height: number } }
  | { type: 'TOGGLE_VIEWPORT_SNAP_TO_GRID' }
  | { type: 'SET_VIEWPORT_GRID_SIZE'; gridSize: number }
  | { type: 'FIT_VIEWPORT_TO_SCREEN' }
  | { type: 'SET_ACTIVE_FORM'; formId: string | null }
  | { type: 'SET_FORM_DIRTY'; isDirty: boolean }
  | { type: 'SET_FORM_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_FORM_LAST_SAVED'; timestamp: string }
  | { type: 'TOGGLE_FORM_AUTO_SAVE' }
  | { type: 'SET_FORM_VALIDATION_MODE'; mode: FormState['validationMode'] }
  | { type: 'SET_THEME'; theme: AppearanceState['theme'] }
  | { type: 'SET_DENSITY'; density: AppearanceState['density'] }
  | { type: 'TOGGLE_ANIMATIONS' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'TOGGLE_HIGH_CONTRAST' }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'ADD_SEARCH_FILTER'; filter: string }
  | { type: 'REMOVE_SEARCH_FILTER'; filter: string }
  | { type: 'CLEAR_SEARCH_FILTERS' }
  | { type: 'TOGGLE_ADVANCED_SEARCH' }
  | { type: 'SET_SEARCH_SORT'; sortBy: string; sortOrder: 'asc' | 'desc' }
  | { type: 'ADD_SEARCH_HISTORY'; query: string }
  | { type: 'SET_IS_SEARCHING'; isSearching: boolean }
  | { type: 'RESET_UI_STATE' }

/**
 * Initial UI State
 */
const initialUIState: UIState = {
  modals: {
    workflowCreation: false,
    nodeProperties: false,
    contextViewer: false,
    validation: false,
    settings: false,
    help: false
  },
  sidebar: {
    isOpen: true,
    activeTab: 'properties',
    width: 300,
    collapsed: false
  },
  viewport: {
    zoom: 1,
    position: { x: 0, y: 0 },
    bounds: { width: 1200, height: 800 },
    fitToScreen: false,
    snapToGrid: true,
    gridSize: 20
  },
  forms: {
    activeForm: null,
    isDirty: false,
    isSubmitting: false,
    lastSaved: null,
    autoSaveEnabled: true,
    validationMode: 'onBlur'
  },
  appearance: {
    theme: 'system',
    density: 'normal',
    animations: true,
    reducedMotion: false,
    highContrast: false
  },
  searchFilter: {
    query: '',
    activeFilters: [],
    showAdvanced: false,
    searchHistory: [],
    isSearching: false,
    sortBy: 'name',
    sortOrder: 'asc'
  }
}

/**
 * UI State Reducer
 */
function uiStateReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'TOGGLE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: !state.modals[action.modal]
        }
      }

    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          workflowCreation: false,
          nodeProperties: false,
          contextViewer: false,
          validation: false,
          settings: false,
          help: false
        }
      }

    case 'SET_SIDEBAR_OPEN':
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          isOpen: action.isOpen
        }
      }

    case 'SET_SIDEBAR_TAB':
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          activeTab: action.tab
        }
      }

    case 'SET_SIDEBAR_WIDTH':
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          width: Math.max(200, Math.min(600, action.width))
        }
      }

    case 'TOGGLE_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          collapsed: !state.sidebar.collapsed
        }
      }

    case 'SET_VIEWPORT_ZOOM':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          zoom: Math.max(0.1, Math.min(5, action.zoom))
        }
      }

    case 'SET_VIEWPORT_POSITION':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          position: action.position
        }
      }

    case 'SET_VIEWPORT_BOUNDS':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          bounds: action.bounds
        }
      }

    case 'TOGGLE_VIEWPORT_SNAP_TO_GRID':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          snapToGrid: !state.viewport.snapToGrid
        }
      }

    case 'SET_VIEWPORT_GRID_SIZE':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          gridSize: Math.max(5, Math.min(50, action.gridSize))
        }
      }

    case 'FIT_VIEWPORT_TO_SCREEN':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          fitToScreen: true,
          zoom: 1,
          position: { x: 0, y: 0 }
        }
      }

    case 'SET_ACTIVE_FORM':
      return {
        ...state,
        forms: {
          ...state.forms,
          activeForm: action.formId
        }
      }

    case 'SET_FORM_DIRTY':
      return {
        ...state,
        forms: {
          ...state.forms,
          isDirty: action.isDirty
        }
      }

    case 'SET_FORM_SUBMITTING':
      return {
        ...state,
        forms: {
          ...state.forms,
          isSubmitting: action.isSubmitting
        }
      }

    case 'SET_FORM_LAST_SAVED':
      return {
        ...state,
        forms: {
          ...state.forms,
          lastSaved: action.timestamp,
          isDirty: false
        }
      }

    case 'TOGGLE_FORM_AUTO_SAVE':
      return {
        ...state,
        forms: {
          ...state.forms,
          autoSaveEnabled: !state.forms.autoSaveEnabled
        }
      }

    case 'SET_FORM_VALIDATION_MODE':
      return {
        ...state,
        forms: {
          ...state.forms,
          validationMode: action.mode
        }
      }

    case 'SET_THEME':
      return {
        ...state,
        appearance: {
          ...state.appearance,
          theme: action.theme
        }
      }

    case 'SET_DENSITY':
      return {
        ...state,
        appearance: {
          ...state.appearance,
          density: action.density
        }
      }

    case 'TOGGLE_ANIMATIONS':
      return {
        ...state,
        appearance: {
          ...state.appearance,
          animations: !state.appearance.animations
        }
      }

    case 'TOGGLE_REDUCED_MOTION':
      return {
        ...state,
        appearance: {
          ...state.appearance,
          reducedMotion: !state.appearance.reducedMotion
        }
      }

    case 'TOGGLE_HIGH_CONTRAST':
      return {
        ...state,
        appearance: {
          ...state.appearance,
          highContrast: !state.appearance.highContrast
        }
      }

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          query: action.query
        }
      }

    case 'ADD_SEARCH_FILTER':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          activeFilters: [...state.searchFilter.activeFilters, action.filter]
        }
      }

    case 'REMOVE_SEARCH_FILTER':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          activeFilters: state.searchFilter.activeFilters.filter(f => f !== action.filter)
        }
      }

    case 'CLEAR_SEARCH_FILTERS':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          activeFilters: [],
          query: ''
        }
      }

    case 'TOGGLE_ADVANCED_SEARCH':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          showAdvanced: !state.searchFilter.showAdvanced
        }
      }

    case 'SET_SEARCH_SORT':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          sortBy: action.sortBy,
          sortOrder: action.sortOrder
        }
      }

    case 'ADD_SEARCH_HISTORY':
      const newHistory = [action.query, ...state.searchFilter.searchHistory.filter(q => q !== action.query)].slice(0, 10)
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          searchHistory: newHistory
        }
      }

    case 'SET_IS_SEARCHING':
      return {
        ...state,
        searchFilter: {
          ...state.searchFilter,
          isSearching: action.isSearching
        }
      }

    case 'RESET_UI_STATE':
      return initialUIState

    default:
      return state
  }
}

/**
 * Custom Hook for UI State Management
 * 
 * This hook manages pure UI state with no business logic.
 * It follows Clean Architecture by:
 * 1. Containing only UI-specific concerns
 * 2. Not depending on any business logic or domain models
 * 3. Providing a clean interface for UI components
 * 4. Using reducer pattern for complex state management
 */
export function useUIState() {
  const [state, dispatch] = useReducer(uiStateReducer, initialUIState)

  // Modal operations
  const toggleModal = useCallback((modal: keyof ModalState) => {
    dispatch({ type: 'TOGGLE_MODAL', modal })
  }, [])

  const closeAllModals = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_MODALS' })
  }, [])

  // Sidebar operations
  const setSidebarOpen = useCallback((isOpen: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_OPEN', isOpen })
  }, [])

  const setSidebarTab = useCallback((tab: SidebarState['activeTab']) => {
    dispatch({ type: 'SET_SIDEBAR_TAB', tab })
  }, [])

  const setSidebarWidth = useCallback((width: number) => {
    dispatch({ type: 'SET_SIDEBAR_WIDTH', width })
  }, [])

  const toggleSidebarCollapsed = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' })
  }, [])

  // Viewport operations
  const setViewportZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_VIEWPORT_ZOOM', zoom })
  }, [])

  const setViewportPosition = useCallback((position: { x: number; y: number }) => {
    dispatch({ type: 'SET_VIEWPORT_POSITION', position })
  }, [])

  const setViewportBounds = useCallback((bounds: { width: number; height: number }) => {
    dispatch({ type: 'SET_VIEWPORT_BOUNDS', bounds })
  }, [])

  const toggleSnapToGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_VIEWPORT_SNAP_TO_GRID' })
  }, [])

  const setGridSize = useCallback((gridSize: number) => {
    dispatch({ type: 'SET_VIEWPORT_GRID_SIZE', gridSize })
  }, [])

  const fitToScreen = useCallback(() => {
    dispatch({ type: 'FIT_VIEWPORT_TO_SCREEN' })
  }, [])

  // Form operations
  const setActiveForm = useCallback((formId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_FORM', formId })
  }, [])

  const setFormDirty = useCallback((isDirty: boolean) => {
    dispatch({ type: 'SET_FORM_DIRTY', isDirty })
  }, [])

  const setFormSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_FORM_SUBMITTING', isSubmitting })
  }, [])

  const markFormSaved = useCallback(() => {
    dispatch({ type: 'SET_FORM_LAST_SAVED', timestamp: new Date().toISOString() })
  }, [])

  const toggleAutoSave = useCallback(() => {
    dispatch({ type: 'TOGGLE_FORM_AUTO_SAVE' })
  }, [])

  const setValidationMode = useCallback((mode: FormState['validationMode']) => {
    dispatch({ type: 'SET_FORM_VALIDATION_MODE', mode })
  }, [])

  // Appearance operations
  const setTheme = useCallback((theme: AppearanceState['theme']) => {
    dispatch({ type: 'SET_THEME', theme })
  }, [])

  const setDensity = useCallback((density: AppearanceState['density']) => {
    dispatch({ type: 'SET_DENSITY', density })
  }, [])

  const toggleAnimations = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANIMATIONS' })
  }, [])

  const toggleReducedMotion = useCallback(() => {
    dispatch({ type: 'TOGGLE_REDUCED_MOTION' })
  }, [])

  const toggleHighContrast = useCallback(() => {
    dispatch({ type: 'TOGGLE_HIGH_CONTRAST' })
  }, [])

  // Search and filter operations
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', query })
  }, [])

  const addSearchFilter = useCallback((filter: string) => {
    dispatch({ type: 'ADD_SEARCH_FILTER', filter })
  }, [])

  const removeSearchFilter = useCallback((filter: string) => {
    dispatch({ type: 'REMOVE_SEARCH_FILTER', filter })
  }, [])

  const clearSearchFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH_FILTERS' })
  }, [])

  const toggleAdvancedSearch = useCallback(() => {
    dispatch({ type: 'TOGGLE_ADVANCED_SEARCH' })
  }, [])

  const setSearchSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    dispatch({ type: 'SET_SEARCH_SORT', sortBy, sortOrder })
  }, [])

  const addSearchToHistory = useCallback((query: string) => {
    if (query.trim()) {
      dispatch({ type: 'ADD_SEARCH_HISTORY', query: query.trim() })
    }
  }, [])

  const setIsSearching = useCallback((isSearching: boolean) => {
    dispatch({ type: 'SET_IS_SEARCHING', isSearching })
  }, [])

  // Utility operations
  const resetUIState = useCallback(() => {
    dispatch({ type: 'RESET_UI_STATE' })
  }, [])

  return {
    // State
    state,
    
    // Modal operations
    toggleModal,
    closeAllModals,
    
    // Sidebar operations
    setSidebarOpen,
    setSidebarTab,
    setSidebarWidth,
    toggleSidebarCollapsed,
    
    // Viewport operations
    setViewportZoom,
    setViewportPosition,
    setViewportBounds,
    toggleSnapToGrid,
    setGridSize,
    fitToScreen,
    
    // Form operations
    setActiveForm,
    setFormDirty,
    setFormSubmitting,
    markFormSaved,
    toggleAutoSave,
    setValidationMode,
    
    // Appearance operations
    setTheme,
    setDensity,
    toggleAnimations,
    toggleReducedMotion,
    toggleHighContrast,
    
    // Search operations
    setSearchQuery,
    addSearchFilter,
    removeSearchFilter,
    clearSearchFilters,
    toggleAdvancedSearch,
    setSearchSort,
    addSearchToHistory,
    setIsSearching,
    
    // Utility operations
    resetUIState
  }
}

/**
 * Selector hooks for specific UI state slices
 */
export function useModalState() {
  const { state, toggleModal, closeAllModals } = useUIState()
  return {
    modals: state.modals,
    toggleModal,
    closeAllModals
  }
}

export function useSidebarState() {
  const { 
    state, 
    setSidebarOpen, 
    setSidebarTab, 
    setSidebarWidth, 
    toggleSidebarCollapsed 
  } = useUIState()
  
  return {
    sidebar: state.sidebar,
    setSidebarOpen,
    setSidebarTab,
    setSidebarWidth,
    toggleSidebarCollapsed
  }
}

export function useViewportState() {
  const { 
    state, 
    setViewportZoom, 
    setViewportPosition, 
    setViewportBounds,
    toggleSnapToGrid,
    setGridSize,
    fitToScreen
  } = useUIState()
  
  return {
    viewport: state.viewport,
    setViewportZoom,
    setViewportPosition,
    setViewportBounds,
    toggleSnapToGrid,
    setGridSize,
    fitToScreen
  }
}

export function useFormUIState() {
  const { 
    state, 
    setActiveForm, 
    setFormDirty, 
    setFormSubmitting,
    markFormSaved,
    toggleAutoSave,
    setValidationMode
  } = useUIState()
  
  return {
    forms: state.forms,
    setActiveForm,
    setFormDirty,
    setFormSubmitting,
    markFormSaved,
    toggleAutoSave,
    setValidationMode
  }
}

export function useAppearanceState() {
  const { 
    state, 
    setTheme, 
    setDensity, 
    toggleAnimations,
    toggleReducedMotion,
    toggleHighContrast
  } = useUIState()
  
  return {
    appearance: state.appearance,
    setTheme,
    setDensity,
    toggleAnimations,
    toggleReducedMotion,
    toggleHighContrast
  }
}

export function useSearchFilterState() {
  const { 
    state, 
    setSearchQuery, 
    addSearchFilter, 
    removeSearchFilter,
    clearSearchFilters,
    toggleAdvancedSearch,
    setSearchSort,
    addSearchToHistory,
    setIsSearching
  } = useUIState()
  
  return {
    searchFilter: state.searchFilter,
    setSearchQuery,
    addSearchFilter,
    removeSearchFilter,
    clearSearchFilters,
    toggleAdvancedSearch,
    setSearchSort,
    addSearchToHistory,
    setIsSearching
  }
}

/**
 * UI hook for managing UI-specific state (modals, themes, notifications)
 * Handles global UI state that doesn't belong to specific components
 */

import { useState, useCallback, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface Modal {
  id: string
  component: React.ComponentType<any>
  props?: any
  onClose?: () => void
}

export interface UseUIStateReturn {
  // Theme state
  theme: Theme
  setTheme: (theme: Theme) => void
  
  // Modal state
  modals: Modal[]
  openModal: (modal: Omit<Modal, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Loading state
  isLoading: boolean
  setLoading: (loading: boolean) => void
  
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  
  // Mobile detection
  isMobile: boolean
}

// Local storage keys
const THEME_KEY = 'app-theme'
const SIDEBAR_KEY = 'sidebar-open'

export function useUIState(): UseUIStateReturn {
  // Theme state with localStorage persistence
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system'
  })

  // Modal state
  const [modals, setModals] = useState<Modal[]>([])

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpenState] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(SIDEBAR_KEY)
    return stored ? JSON.parse(stored) : true
  })

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  // Theme setter with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    
    // Apply theme to document
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  // Modal management
  const openModal = useCallback((modal: Omit<Modal, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newModal: Modal = { ...modal, id }
    setModals(prev => [...prev, newModal])
    return id
  }, [])

  const closeModal = useCallback((id: string) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id)
      if (modal?.onClose) {
        modal.onClose()
      }
      return prev.filter(m => m.id !== id)
    })
  }, [])

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      prev.forEach(modal => {
        if (modal.onClose) {
          modal.onClose()
        }
      })
      return []
    })
  }, [])

  // Sidebar management with persistence
  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(open))
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen, setSidebarOpen])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => setTheme('system') // Re-apply system theme
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, setTheme])

  // Apply initial theme
  useEffect(() => {
    setTheme(theme)
  }, []) // Only run once on mount

  // Close sidebar on mobile when modal opens
  useEffect(() => {
    if (isMobile && modals.length > 0) {
      setSidebarOpen(false)
    }
  }, [isMobile, modals.length, setSidebarOpen])

  return {
    theme,
    setTheme,
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isLoading,
    setLoading,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    isMobile
  }
}

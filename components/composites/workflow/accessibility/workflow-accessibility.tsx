'use client'

import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Keyboard navigation hook
export function useKeyboardNavigation(
  elements: HTMLElement[],
  onEnter?: (element: HTMLElement, index: number) => void,
  onEscape?: () => void
) {
  const currentIndexRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          currentIndexRef.current = Math.max(0, currentIndexRef.current - 1)
          elements[currentIndexRef.current]?.focus()
          break
        case 'ArrowDown':
          event.preventDefault()
          currentIndexRef.current = Math.min(elements.length - 1, currentIndexRef.current + 1)
          elements[currentIndexRef.current]?.focus()
          break
        case 'ArrowLeft':
          event.preventDefault()
          currentIndexRef.current = Math.max(0, currentIndexRef.current - 1)
          elements[currentIndexRef.current]?.focus()
          break
        case 'ArrowRight':
          event.preventDefault()
          currentIndexRef.current = Math.min(elements.length - 1, currentIndexRef.current + 1)
          elements[currentIndexRef.current]?.focus()
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (onEnter && elements[currentIndexRef.current]) {
            onEnter(elements[currentIndexRef.current], currentIndexRef.current)
          }
          break
        case 'Escape':
          event.preventDefault()
          if (onEscape) {
            onEscape()
          }
          break
        case 'Home':
          event.preventDefault()
          currentIndexRef.current = 0
          elements[0]?.focus()
          break
        case 'End':
          event.preventDefault()
          currentIndexRef.current = elements.length - 1
          elements[elements.length - 1]?.focus()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [elements, onEnter, onEscape])

  return currentIndexRef.current
}

// Screen reader announcements
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Skip navigation component
interface SkipNavigationProps {
  links: Array<{ href: string; label: string }>
}

export function SkipNavigation({ links }: SkipNavigationProps) {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="Skip navigation">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="absolute top-0 left-0 z-50 p-2 bg-blue-600 text-white focus:block"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

// Accessible node component wrapper
interface AccessibleNodeProps {
  children: React.ReactNode
  nodeId: string
  nodeType: string
  nodeName: string
  nodeStatus: string
  isSelected?: boolean
  isExecuting?: boolean
  onSelect?: () => void
  onActivate?: () => void
  className?: string
}

export function AccessibleNode({
  children,
  nodeId,
  nodeType,
  nodeName,
  nodeStatus,
  isSelected,
  isExecuting,
  onSelect,
  onActivate,
  className
}: AccessibleNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)

  const getAriaLabel = () => {
    let label = `${nodeType} node: ${nodeName}, status: ${nodeStatus}`
    if (isSelected) label += ', selected'
    if (isExecuting) label += ', currently executing'
    return label
  }

  const getAriaDescription = () => {
    let description = `${nodeType} workflow node`
    if (isExecuting) description += '. This node is currently executing'
    return description
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (onActivate) {
          onActivate()
          announceToScreenReader(`Activated ${nodeName}`)
        }
        break
      case 'Tab':
        if (onSelect) {
          onSelect()
        }
        break
    }
  }

  return (
    <div
      ref={nodeRef}
      role="button"
      tabIndex={0}
      aria-label={getAriaLabel()}
      aria-description={getAriaDescription()}
      aria-selected={isSelected}
      aria-busy={isExecuting}
      data-node-id={nodeId}
      data-node-type={nodeType}
      className={cn(
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "transition-all duration-200",
        isSelected && "ring-2 ring-blue-500",
        className
      )}
      onKeyDown={handleKeyDown}
      onClick={onSelect}
    >
      {children}
    </div>
  )
}

// Accessible toolbar component
interface AccessibleToolbarProps {
  children: React.ReactNode
  label: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function AccessibleToolbar({
  children,
  label,
  orientation = 'horizontal',
  className
}: AccessibleToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={cn("flex", orientation === 'vertical' ? "flex-col" : "flex-row", className)}
    >
      {children}
    </div>
  )
}

// Accessible canvas region
interface AccessibleCanvasProps {
  children: React.ReactNode
  nodeCount: number
  selectedNodeName?: string
  isExecuting?: boolean
  className?: string
}

export function AccessibleCanvas({
  children,
  nodeCount,
  selectedNodeName,
  isExecuting,
  className
}: AccessibleCanvasProps) {
  const getAriaLabel = () => {
    let label = `Workflow canvas with ${nodeCount} nodes`
    if (selectedNodeName) label += `, ${selectedNodeName} selected`
    if (isExecuting) label += ', workflow executing'
    return label
  }

  return (
    <main
      role="main"
      aria-label={getAriaLabel()}
      aria-live="polite"
      aria-atomic="false"
      className={cn("relative focus:outline-none", className)}
      tabIndex={-1}
    >
      <div
        role="application"
        aria-label="Workflow designer"
        className="w-full h-full"
      >
        {children}
      </div>
    </main>
  )
}

// Accessible status announcer
interface StatusAnnouncerProps {
  status: string
  details?: string
  priority?: 'polite' | 'assertive'
}

export function StatusAnnouncer({ status, details, priority = 'polite' }: StatusAnnouncerProps) {
  useEffect(() => {
    const message = details ? `${status}: ${details}` : status
    announceToScreenReader(message, priority)
  }, [status, details, priority])

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {status} {details}
    </div>
  )
}

// High contrast theme toggle
export function HighContrastToggle() {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isHighContrast])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsHighContrast(!isHighContrast)}
      aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
    >
      {isHighContrast ? 'Normal Contrast' : 'High Contrast'}
    </Button>
  )
}

// Font size controls
export function FontSizeControls() {
  const [fontSize, setFontSize] = React.useState(100)

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`
  }, [fontSize])

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(150, prev + 10))
    announceToScreenReader(`Font size increased to ${fontSize + 10}%`)
  }

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(80, prev - 10))
    announceToScreenReader(`Font size decreased to ${fontSize - 10}%`)
  }

  const resetFontSize = () => {
    setFontSize(100)
    announceToScreenReader('Font size reset to 100%')
  }

  return (
    <div role="group" aria-label="Font size controls" className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={decreaseFontSize}
        disabled={fontSize <= 80}
        aria-label="Decrease font size"
      >
        A-
      </Button>
      <span className="text-sm px-2" aria-live="polite">
        {fontSize}%
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={increaseFontSize}
        disabled={fontSize >= 150}
        aria-label="Increase font size"
      >
        A+
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={resetFontSize}
        aria-label="Reset font size to default"
      >
        Reset
      </Button>
    </div>
  )
}

// Focus trap for modals
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return containerRef
}

// Landmark navigation
export function LandmarkNavigation() {
  const landmarks = [
    { id: 'main-navigation', label: 'Main Navigation' },
    { id: 'workflow-toolbar', label: 'Workflow Toolbar' },
    { id: 'node-sidebar', label: 'Node Tools' },
    { id: 'workflow-canvas', label: 'Workflow Canvas' },
    { id: 'properties-panel', label: 'Properties Panel' },
    { id: 'status-bar', label: 'Status Bar' }
  ]

  return (
    <nav aria-label="Page landmarks" className="sr-only focus-within:not-sr-only">
      <h2>Skip to:</h2>
      <ul>
        {landmarks.map(landmark => (
          <li key={landmark.id}>
            <a
              href={`#${landmark.id}`}
              className="block p-2 bg-blue-600 text-white focus:bg-blue-700"
            >
              {landmark.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
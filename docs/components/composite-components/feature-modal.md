# FeatureModal

## Overview

The `FeatureModal` is a composite component that provides a standardized modal interface for feature-specific settings and configuration. It combines a sidebar navigation with tabbed content areas, offering a consistent user experience across different features in the application.

### Key Features
- **Sidebar Navigation**: Icon-based navigation with tooltips and active state management
- **Tabbed Content**: Dynamic content rendering based on active tab selection
- **Feature-Specific Configuration**: Supports different feature types (event-storm, function-model, spindle, knowledge-base)
- **Responsive Design**: Adapts to different screen sizes with proper overflow handling
- **Accessibility**: Built on Radix UI Dialog primitives with proper ARIA support

### When to Use
- Creating feature-specific settings modals
- Implementing consistent navigation patterns across features
- Providing tabbed interfaces for complex feature configuration
- Building modals that need sidebar navigation to other features

### When Not to Use
- Simple confirmation dialogs (use `AlertDialog` instead)
- Basic forms without navigation requirements (use `Dialog` directly)
- Modals that don't need tabbed content or sidebar navigation

## API Reference

### Props Interface
```typescript
export interface FeatureModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  featureType: "event-storm" | "function-model" | "spindle" | "knowledge-base"
  // Flow data for statistics
  flowNodes?: Node[]
  flowEdges?: Edge[]
  // Content renderers
  renderDetailsTab: () => ReactNode
  renderStatsTab?: () => ReactNode
  renderEventStormTab?: () => ReactNode
  renderFunctionModelTab?: () => ReactNode
  renderSpindleTab?: () => ReactNode
  renderKnowledgeBaseTab?: () => ReactNode
  // Navigation handlers
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
  onNavigateToEventStorm?: () => void
  className?: string
}
```

### Props Description
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls modal visibility |
| `onClose` | `() => void` | Yes | - | Callback when modal should close |
| `title` | `string` | Yes | - | Modal title displayed in header |
| `featureType` | `"event-storm" \| "function-model" \| "spindle" \| "knowledge-base"` | Yes | - | Determines sidebar configuration and styling |
| `flowNodes` | `Node[]` | No | `[]` | ReactFlow nodes for statistics display |
| `flowEdges` | `Edge[]` | No | `[]` | ReactFlow edges for statistics display |
| `renderDetailsTab` | `() => ReactNode` | Yes | - | Function to render details tab content |
| `renderStatsTab` | `() => ReactNode` | No | - | Function to render statistics tab content |
| `renderEventStormTab` | `() => ReactNode` | No | - | Function to render event storm navigation tab |
| `renderFunctionModelTab` | `() => ReactNode` | No | - | Function to render function model navigation tab |
| `renderSpindleTab` | `() => ReactNode` | No | - | Function to render spindle navigation tab |
| `renderKnowledgeBaseTab` | `() => ReactNode` | No | - | Function to render knowledge base navigation tab |
| `onNavigateToFunctionModel` | `() => void` | No | - | Callback for function model navigation |
| `onNavigateToSpindle` | `() => void` | No | - | Callback for spindle navigation |
| `onNavigateToKnowledgeBase` | `() => void` | No | - | Callback for knowledge base navigation |
| `onNavigateToEventStorm` | `() => void` | No | - | Callback for event storm navigation |
| `className` | `string` | No | - | Additional CSS classes for modal customization |

## Usage Examples

### Basic Usage
```tsx
import { FeatureModal } from "@/components/composites/feature-modal"
import { useState } from "react"

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Feature Details</h3>
      <p>Configure your feature settings here.</p>
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Statistics</h3>
      <p>View feature statistics and metrics.</p>
    </div>
  )

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Open Feature Modal
      </button>
      
      <FeatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Feature Settings"
        featureType="event-storm"
        renderDetailsTab={renderDetailsTab}
        renderStatsTab={renderStatsTab}
        onNavigateToFunctionModel={() => {
          window.location.href = "/dashboard/function-model"
        }}
        onNavigateToSpindle={() => {
          window.location.href = "/dashboard/spindle"
        }}
        onNavigateToKnowledgeBase={() => {
          window.location.href = "/dashboard/knowledge-base"
        }}
      />
    </div>
  )
}
```

### Advanced Usage
```tsx
import { FeatureModal } from "@/components/composites/feature-modal"
import { FlowStatistics } from "@/components/ui/flow-statistics"
import { EventStormFormFields } from "@/components/composites/feature-form-fields"
import { useState } from "react"
import type { Node, Edge } from "reactflow"
import type { EventStorm } from "@/lib/domain/entities/event-storm"

interface AdvancedFeatureModalProps {
  eventStorm: EventStorm
  flowNodes: Node[]
  flowEdges: Edge[]
  onUpdateEventStorm: (updated: EventStorm) => void
  onUpdateFlowName: (name: string) => void
}

function AdvancedFeatureModal({
  eventStorm,
  flowNodes,
  flowEdges,
  onUpdateEventStorm,
  onUpdateFlowName
}: AdvancedFeatureModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const renderDetailsTab = () => (
    <EventStormFormFields
      id={eventStorm.id}
      name={eventStorm.name}
      description={eventStorm.description}
      onUpdateName={onUpdateFlowName}
      onUpdateDescription={(description) => 
        onUpdateEventStorm({ ...eventStorm, description })
      }
    />
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Event Storm Statistics</h3>
      <FlowStatistics
        nodes={flowNodes}
        edges={flowEdges}
        title="Event Storm Statistics"
        variant="default"
        showSummary={true}
        showDetailedStats={true}
      />
    </div>
  )

  const renderFunctionModelTab = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Function Model</h3>
      <p className="text-muted-foreground mb-4">
        Design process flows, stages, and business functions
      </p>
      <button 
        onClick={() => window.location.href = "/dashboard/function-model"}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go to Function Model
      </button>
    </div>
  )

  return (
    <FeatureModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Event Storm Settings"
      featureType="event-storm"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      renderFunctionModelTab={renderFunctionModelTab}
      onNavigateToFunctionModel={() => {
        window.location.href = "/dashboard/function-model"
      }}
      onNavigateToSpindle={() => {
        window.location.href = "/dashboard/spindle"
      }}
      onNavigateToKnowledgeBase={() => {
        window.location.href = "/dashboard/knowledge-base"
      }}
    />
  )
}
```

### Integration Examples
```tsx
import { FeatureModal } from "@/components/composites/feature-modal"
import { FunctionModelSharedModal } from "@/components/composites/shared-feature-modal"
import { useState } from "react"

function FeatureModalIntegration() {
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false)
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false)

  // Legacy FeatureModal usage
  const renderLegacyDetailsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Legacy Modal</h3>
      <p>This uses the base FeatureModal component.</p>
    </div>
  )

  // Shared modal usage (recommended)
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Legacy FeatureModal</h3>
        <button 
          onClick={() => setIsLegacyModalOpen(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded"
        >
          Open Legacy Modal
        </button>
        
        <FeatureModal
          isOpen={isLegacyModalOpen}
          onClose={() => setIsLegacyModalOpen(false)}
          title="Legacy Feature Modal"
          featureType="function-model"
          renderDetailsTab={renderLegacyDetailsTab}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Shared FeatureModal (Recommended)</h3>
        <button 
          onClick={() => setIsSharedModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Open Shared Modal
        </button>
        
        <FunctionModelSharedModal
          isOpen={isSharedModalOpen}
          onClose={() => setIsSharedModalOpen(false)}
          renderDetailsTab={() => (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shared Modal</h3>
              <p>This uses the enhanced SharedFeatureModal with built-in content.</p>
            </div>
          )}
        />
      </div>
    </div>
  )
}
```

## Implementation Details

### Component Architecture
```
FeatureModal
├── Dialog (Radix UI)
│   ├── DialogContent
│   │   ├── DialogHeader
│   │   │   └── DialogTitle
│   │   └── Content Container
│   │       ├── FeatureSidebar
│   │       │   ├── Feature Indicator
│   │       │   ├── Navigation Items
│   │       │   └── Footer
│   │       └── Tab Content Area
│   │           ├── Details Tab
│   │           ├── Stats Tab
│   │           ├── Event Storm Tab
│   │           ├── Function Model Tab
│   │           ├── Spindle Tab
│   │           └── Knowledge Base Tab
│   └── Backdrop
```

### State Management
- **Local State**: `activeTab` - Manages which tab is currently active
- **Props State**: `isOpen` - Controls modal visibility from parent
- **External State**: None - Stateless component that relies on props

### Performance Considerations
- **Memoization**: No internal memoization - relies on parent component optimization
- **Re-render Triggers**: Re-renders when `isOpen`, `activeTab`, or any render function changes
- **Optimization Tips**: 
  - Memoize render functions in parent components
  - Use `useCallback` for navigation handlers
  - Consider using `React.memo` for the component if used frequently

### Error Handling
- **Validation**: No internal validation - relies on TypeScript for type safety
- **Error States**: No error states - errors should be handled in render functions
- **Fallbacks**: Graceful handling of missing render functions (optional chaining)

## Testing Guide

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureModal } from '@/components/composites/feature-modal'

describe('FeatureModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    featureType: 'event-storm' as const,
    renderDetailsTab: () => <div>Details Content</div>,
    renderStatsTab: () => <div>Stats Content</div>,
  }

  it('renders modal when isOpen is true', () => {
    render(<FeatureModal {...defaultProps} />)
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Details Content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<FeatureModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<FeatureModal {...defaultProps} onClose={onClose} />)
    
    // Find and click the close button (implementation depends on Dialog component)
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('switches tabs when sidebar items are clicked', () => {
    render(<FeatureModal {...defaultProps} />)
    
    // Click on stats tab
    const statsButton = screen.getByRole('button', { name: /statistics/i })
    fireEvent.click(statsButton)
    
    expect(screen.getByText('Stats Content')).toBeInTheDocument()
    expect(screen.queryByText('Details Content')).not.toBeInTheDocument()
  })

  it('resets to details tab when modal opens', () => {
    const { rerender } = render(<FeatureModal {...defaultProps} isOpen={false} />)
    
    // Open modal
    rerender(<FeatureModal {...defaultProps} isOpen={true} />)
    
    expect(screen.getByText('Details Content')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeatureModal } from '@/components/composites/feature-modal'

describe('FeatureModal Integration', () => {
  it('integrates with navigation handlers', async () => {
    const mockNavigate = jest.fn()
    const props = {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      featureType: 'event-storm' as const,
      renderDetailsTab: () => <div>Details</div>,
      onNavigateToFunctionModel: mockNavigate,
    }

    render(<FeatureModal {...props} />)
    
    // Click on function model navigation
    const functionModelButton = screen.getByRole('button', { name: /function model/i })
    fireEvent.click(functionModelButton)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
  })

  it('handles flow data for statistics', () => {
    const flowNodes = [{ id: '1', type: 'default', position: { x: 0, y: 0 } }]
    const flowEdges = [{ id: '1', source: '1', target: '2' }]
    
    const props = {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      featureType: 'event-storm' as const,
      renderDetailsTab: () => <div>Details</div>,
      renderStatsTab: () => <div>Stats: {flowNodes.length} nodes</div>,
      flowNodes,
      flowEdges,
    }

    render(<FeatureModal {...props} />)
    
    // Switch to stats tab
    const statsButton = screen.getByRole('button', { name: /statistics/i })
    fireEvent.click(statsButton)
    
    expect(screen.getByText('Stats: 1 nodes')).toBeInTheDocument()
  })
})
```

## Performance Considerations

### Bundle Size
- **Component Size**: ~2.5 KB (gzipped)
- **Dependencies**: 
  - `react` (hooks)
  - `@radix-ui/react-dialog`
  - `reactflow` (types only)
- **Tree Shaking**: Fully supported - only used exports are included

### Runtime Performance
- **Render Performance**: O(1) for typical usage
- **Memory Usage**: Minimal footprint - no heavy computations
- **Re-render Optimization**: 
  - Only re-renders when props change
  - Tab switching is efficient with conditional rendering
  - No unnecessary re-renders of render functions

### Best Practices
- **Avoid**: 
  - Creating render functions inline (causes re-renders)
  - Heavy computations in render functions
  - Unnecessary prop changes
- **Prefer**: 
  - Memoized render functions
  - Stable navigation handlers
  - Minimal prop updates
- **Monitor**: 
  - Tab switching performance
  - Modal open/close frequency
  - Render function complexity

## Accessibility Documentation

### ARIA Support
- **Roles**: 
  - `dialog` (from Radix UI Dialog)
  - `button` (sidebar navigation items)
  - `tab` (implicit tab structure)
- **States**: 
  - `aria-expanded` (for collapsible sections)
  - `aria-selected` (for active tab)
- **Properties**: 
  - `aria-label` (for navigation items)
  - `aria-describedby` (for tooltips)

### Keyboard Navigation
- **Tab Order**: 
  1. Close button
  2. Sidebar navigation items
  3. Tab content area
  4. Interactive elements in content
- **Keyboard Shortcuts**: 
  - `Escape` - Closes modal
  - `Tab` - Navigates through focusable elements
  - `Enter/Space` - Activates buttons
- **Focus Management**: 
  - Focus trapped within modal when open
  - Focus returns to trigger element when closed
  - Focus moves to first interactive element when opened

### Screen Reader Support
- **Announcements**: 
  - Modal title announced when opened
  - Tab changes announced
  - Navigation actions announced
- **Landmarks**: 
  - `dialog` landmark for modal
  - `navigation` landmark for sidebar
  - `main` landmark for content area
- **Live Regions**: 
  - Tab content changes announced
  - Navigation actions announced

### Color & Contrast
- **Contrast Ratios**: 
  - Text: 4.5:1 (WCAG AA compliant)
  - Interactive elements: 3:1 (WCAG AA compliant)
- **Color Independence**: 
  - All interactive elements have non-color indicators
  - Focus states visible without color
- **High Contrast Mode**: 
  - Fully supported
  - All interactive elements remain visible
  - Proper focus indicators maintained

## Migration & Breaking Changes

### Version History
| Version | Changes | Migration Guide |
|---------|---------|-----------------|
| 1.0.0 | Initial release | - |
| 1.1.0 | Added SharedFeatureModal | Use SharedFeatureModal for new implementations |
| 1.2.0 | Removed pre-configured modals | Use SharedFeatureModal variants instead |

### Breaking Changes
- **v1.1.0**: Introduction of `SharedFeatureModal` as preferred alternative
- **v1.2.0**: Removal of `EventStormFeatureModal`, `FunctionModelFeatureModal`, `SpindleFeatureModal`

### Migration Steps
1. **From pre-configured modals to SharedFeatureModal**:
   ```tsx
   // Old
   <EventStormFeatureModal {...props} />
   
   // New
   <EventStormSharedModal {...props} />
   ```

2. **From FeatureModal to SharedFeatureModal**:
   ```tsx
   // Old
   <FeatureModal
     featureType="event-storm"
     renderFunctionModelTab={renderFunctionModelTab}
     {...props}
   />
   
   // New
   <EventStormSharedModal
     onNavigateToFunctionModel={onNavigateToFunctionModel}
     {...props}
   />
   ```

## Related Components

### Dependencies
- **Required**: 
  - `@radix-ui/react-dialog` - Modal functionality
  - `FeatureSidebar` - Navigation sidebar
- **Optional**: 
  - `reactflow` - Flow data types

### Related Features
- **Similar Components**: 
  - `SharedFeatureModal` - Enhanced version with built-in content
  - `Dialog` - Base modal component
  - `AlertDialog` - Confirmation dialogs
- **Complementary Components**: 
  - `FeatureSidebar` - Navigation sidebar
  - `FlowStatistics` - Statistics display
  - `EventStormFormFields` - Form fields for event storm
- **Parent/Child Relationships**: 
  - Used by feature-specific modal wrappers
  - Composes with `FeatureSidebar` for navigation
  - Renders custom content via render functions

---

**Last Updated**: December 2024  
**Maintained By**: Frontend Team  
**Version**: 1.2.0 
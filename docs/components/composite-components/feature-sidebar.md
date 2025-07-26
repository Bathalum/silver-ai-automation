# FeatureSidebar

## Overview

The `FeatureSidebar` is a composite component that provides a standardized navigation sidebar for feature-specific modals and interfaces. It combines a feature indicator with navigation items, offering consistent navigation patterns across different features in the application.

### Key Features
- **Feature Indicator**: Dynamic icon and label based on feature type with gradient styling
- **Tab Navigation**: Icon-based navigation with active state management and tooltips
- **Cross-Feature Navigation**: Seamless navigation between different features (Event Storm, Function Model, Spindle, Knowledge Base)
- **Responsive Design**: Compact mode support for smaller screens
- **Accessibility**: Built-in tooltips and proper ARIA support
- **Customizable**: Flexible styling and behavior options

### When to Use
- Creating navigation sidebars for feature modals
- Implementing consistent navigation patterns across features
- Building tabbed interfaces with cross-feature navigation
- Providing compact navigation in space-constrained layouts

### When Not to Use
- Simple button navigation (use Button components directly)
- Navigation that doesn't need tab switching
- Sidebars that don't follow the feature navigation pattern

## API Reference

### Props Interface
```typescript
export interface FeatureSidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  featureType?: "event-storm" | "function-model" | "spindle" | "knowledge-base"
  className?: string
  showTooltips?: boolean
  compact?: boolean
  // Navigation callbacks for other features
  onNavigateToFunctionModel?: () => void
  onNavigateToEventStorm?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}
```

### Props Description
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `activeTab` | `string` | No | `"details"` | Currently active tab identifier |
| `onTabChange` | `(tab: string) => void` | No | - | Callback when tab changes |
| `featureType` | `"event-storm" \| "function-model" \| "spindle" \| "knowledge-base"` | No | `"event-storm"` | Determines feature indicator and navigation items |
| `className` | `string` | No | - | Additional CSS classes for customization |
| `showTooltips` | `boolean` | No | `true` | Whether to show tooltips on hover |
| `compact` | `boolean` | No | `false` | Compact mode for smaller screens |
| `onNavigateToFunctionModel` | `() => void` | No | - | Callback for function model navigation |
| `onNavigateToEventStorm` | `() => void` | No | - | Callback for event storm navigation |
| `onNavigateToSpindle` | `() => void` | No | - | Callback for spindle navigation |
| `onNavigateToKnowledgeBase` | `() => void` | No | - | Callback for knowledge base navigation |

## Usage Examples

### Basic Usage
```tsx
import { FeatureSidebar } from "@/components/composites/feature-sidebar"
import { useState } from "react"

function MyComponent() {
  const [activeTab, setActiveTab] = useState("details")

  return (
    <div className="flex h-screen">
      <FeatureSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        featureType="event-storm"
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
      
      <div className="flex-1 p-6">
        {activeTab === "details" && <div>Details Content</div>}
        {activeTab === "stats" && <div>Statistics Content</div>}
      </div>
    </div>
  )
}
```

### Advanced Usage with All Features
```tsx
import { FeatureSidebar } from "@/components/composites/feature-sidebar"
import { useState, useCallback } from "react"

function AdvancedFeatureSidebar() {
  const [activeTab, setActiveTab] = useState("details")
  const [currentFeature, setCurrentFeature] = useState<"event-storm" | "function-model" | "spindle" | "knowledge-base">("event-storm")

  const handleNavigateToFeature = useCallback((feature: string) => {
    setCurrentFeature(feature as any)
    setActiveTab("details")
    // Additional navigation logic here
  }, [])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <FeatureSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        featureType={currentFeature}
        showTooltips={true}
        compact={false}
        onNavigateToFunctionModel={() => handleNavigateToFeature("function-model")}
        onNavigateToEventStorm={() => handleNavigateToFeature("event-storm")}
        onNavigateToSpindle={() => handleNavigateToFeature("spindle")}
        onNavigateToKnowledgeBase={() => handleNavigateToFeature("knowledge-base")}
        className="shadow-lg"
      />
      
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentFeature === "event-storm" && "Event Storm"}
              {currentFeature === "function-model" && "Function Model"}
              {currentFeature === "spindle" && "Spindle"}
              {currentFeature === "knowledge-base" && "Knowledge Base"}
            </h1>
            <p className="text-gray-600">Manage your feature configuration</p>
          </div>

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Details</h2>
                <p>Configure your {currentFeature} settings here.</p>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Statistics</h2>
                <p>View {currentFeature} statistics and metrics.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Integration Examples
```tsx
import { FeatureSidebar } from "@/components/composites/feature-sidebar"
import { FeatureModal } from "@/components/composites/feature-modal"
import { useState } from "react"

function FeatureSidebarIntegration() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

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
    <div className="flex h-screen">
      {/* Standalone FeatureSidebar */}
      <FeatureSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        featureType="event-storm"
        onNavigateToFunctionModel={() => setIsModalOpen(true)}
        onNavigateToSpindle={() => setIsModalOpen(true)}
        onNavigateToKnowledgeBase={() => setIsModalOpen(true)}
      />
      
      {/* Content Area */}
      <div className="flex-1 p-6">
        <div className="mb-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Modal
          </button>
        </div>
        
        {activeTab === "details" && renderDetailsTab()}
        {activeTab === "stats" && renderStatsTab()}
      </div>

      {/* FeatureModal using the same sidebar pattern */}
      <FeatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Feature Settings"
        featureType="function-model"
        renderDetailsTab={renderDetailsTab}
        renderStatsTab={renderStatsTab}
        onNavigateToEventStorm={() => {
          window.location.href = "/dashboard/event-storm"
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

### Compact Mode Usage
```tsx
import { FeatureSidebar } from "@/components/composites/feature-sidebar"
import { useState } from "react"

function CompactFeatureSidebar() {
  const [activeTab, setActiveTab] = useState("details")

  return (
    <div className="flex h-screen">
      <FeatureSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        featureType="function-model"
        compact={true}
        showTooltips={true}
        onNavigateToEventStorm={() => {
          window.location.href = "/dashboard/event-storm"
        }}
        onNavigateToSpindle={() => {
          window.location.href = "/dashboard/spindle"
        }}
        onNavigateToKnowledgeBase={() => {
          window.location.href = "/dashboard/knowledge-base"
        }}
      />
      
      <div className="flex-1 p-4">
        <div className="text-sm text-gray-600 mb-4">
          Compact mode: Smaller icons, no labels, no footer
        </div>
        
        {activeTab === "details" && (
          <div className="bg-white rounded border p-4">
            <h2 className="font-semibold mb-2">Details</h2>
            <p className="text-sm">Compact sidebar content.</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

## Implementation Details

### Component Architecture
```
FeatureSidebar
├── Container
│   ├── Feature Indicator
│   │   ├── Icon Container (Gradient Background)
│   │   ├── Feature Icon
│   │   └── Feature Label (conditional)
│   ├── Navigation Items
│   │   ├── Statistics Button
│   │   ├── Function Model Button
│   │   ├── Spindle Button
│   │   └── Knowledge Base Button
│   └── Footer (conditional)
│       ├── Silver AI Label
│       └── Framework Label
```

### State Management
- **Local State**: None - stateless component
- **Props State**: `activeTab` - Controls which tab is active
- **External State**: Navigation callbacks for cross-feature communication

### Performance Considerations
- **Memoization**: `handleItemClick` is memoized with `useCallback`
- **Re-render Triggers**: Re-renders when `activeTab`, `featureType`, or navigation callbacks change
- **Optimization Tips**: 
  - Memoize navigation callbacks in parent components
  - Use `React.memo` for the component if used frequently
  - Avoid inline function creation for callbacks

### Error Handling
- **Validation**: No internal validation - relies on TypeScript for type safety
- **Error States**: No error states - errors should be handled in parent components
- **Fallbacks**: Graceful handling of missing navigation callbacks (optional chaining)

## Testing Guide

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureSidebar } from '@/components/composites/feature-sidebar'

describe('FeatureSidebar', () => {
  const defaultProps = {
    activeTab: 'details',
    onTabChange: jest.fn(),
    featureType: 'event-storm' as const,
  }

  it('renders with default props', () => {
    render(<FeatureSidebar {...defaultProps} />)
    
    expect(screen.getByText('Event Storm')).toBeInTheDocument()
    expect(screen.getByText('Statistics')).toBeInTheDocument()
  })

  it('calls onTabChange when feature indicator is clicked', () => {
    const onTabChange = jest.fn()
    render(<FeatureSidebar {...defaultProps} onTabChange={onTabChange} />)
    
    const featureIndicator = screen.getByText('Event Storm').closest('div')
    fireEvent.click(featureIndicator!)
    
    expect(onTabChange).toHaveBeenCalledWith('details')
  })

  it('calls onTabChange when navigation item is clicked', () => {
    const onTabChange = jest.fn()
    render(<FeatureSidebar {...defaultProps} onTabChange={onTabChange} />)
    
    // Find and click the statistics button
    const statsButton = screen.getByTitle('Statistics')
    fireEvent.click(statsButton)
    
    expect(onTabChange).toHaveBeenCalledWith('stats')
  })

  it('shows active state for current tab', () => {
    render(<FeatureSidebar {...defaultProps} activeTab="stats" />)
    
    const statsButton = screen.getByTitle('Statistics')
    expect(statsButton).toHaveClass('bg-blue-50')
  })

  it('renders in compact mode', () => {
    render(<FeatureSidebar {...defaultProps} compact={true} />)
    
    const container = screen.getByText('Event Storm').closest('div')?.parentElement
    expect(container).toHaveClass('w-12')
  })

  it('hides tooltips when showTooltips is false', () => {
    render(<FeatureSidebar {...defaultProps} showTooltips={false} />)
    
    // Tooltips should not be rendered
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('hides footer in compact mode', () => {
    render(<FeatureSidebar {...defaultProps} compact={true} />)
    
    expect(screen.queryByText('Silver AI')).not.toBeInTheDocument()
    expect(screen.queryByText('Framework')).not.toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeatureSidebar } from '@/components/composites/feature-sidebar'

describe('FeatureSidebar Integration', () => {
  it('integrates with navigation callbacks', async () => {
    const mockNavigate = jest.fn()
    const props = {
      activeTab: 'details',
      onTabChange: jest.fn(),
      featureType: 'event-storm' as const,
      onNavigateToFunctionModel: mockNavigate,
    }

    render(<FeatureSidebar {...props} />)
    
    // Click on function model navigation
    const functionModelButton = screen.getByTitle('Function Model')
    fireEvent.click(functionModelButton)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
  })

  it('handles different feature types correctly', () => {
    const { rerender } = render(
      <FeatureSidebar 
        activeTab="details"
        onTabChange={jest.fn()}
        featureType="event-storm"
      />
    )
    
    expect(screen.getByText('Event Storm')).toBeInTheDocument()
    
    // Change to function model
    rerender(
      <FeatureSidebar 
        activeTab="details"
        onTabChange={jest.fn()}
        featureType="function-model"
      />
    )
    
    expect(screen.getByText('Function Model')).toBeInTheDocument()
  })

  it('works with custom className', () => {
    render(
      <FeatureSidebar 
        {...defaultProps}
        className="custom-sidebar"
      />
    )
    
    const container = screen.getByText('Event Storm').closest('div')?.parentElement
    expect(container).toHaveClass('custom-sidebar')
  })
})
```

## Performance Considerations

### Bundle Size
- **Component Size**: ~3.2 KB (gzipped)
- **Dependencies**: 
  - `react` (hooks)
  - `@radix-ui/react-tooltip`
  - `lucide-react` (icons)
  - `clsx` (utility)
- **Tree Shaking**: Fully supported - only used icons are included

### Runtime Performance
- **Render Performance**: O(1) for typical usage
- **Memory Usage**: Minimal footprint - no heavy computations
- **Re-render Optimization**: 
  - Only re-renders when props change
  - Memoized click handlers prevent unnecessary re-renders
  - Conditional rendering for compact mode and tooltips

### Best Practices
- **Avoid**: 
  - Creating navigation callbacks inline
  - Frequent feature type changes
  - Heavy computations in navigation callbacks
- **Prefer**: 
  - Memoized navigation callbacks
  - Stable feature types
  - Minimal prop updates
- **Monitor**: 
  - Tab switching frequency
  - Navigation callback performance
  - Tooltip rendering performance

## Accessibility Documentation

### ARIA Support
- **Roles**: 
  - `button` (navigation items)
  - `tooltip` (tooltip content)
- **States**: 
  - `aria-expanded` (for tooltips)
  - `aria-selected` (for active tab)
- **Properties**: 
  - `aria-label` (for navigation items)
  - `aria-describedby` (for tooltips)

### Keyboard Navigation
- **Tab Order**: 
  1. Feature indicator
  2. Statistics button
  3. Navigation buttons (Function Model, Spindle, Knowledge Base)
- **Keyboard Shortcuts**: 
  - `Tab` - Navigates through focusable elements
  - `Enter/Space` - Activates buttons
  - `Escape` - Closes tooltips
- **Focus Management**: 
  - Focus moves to clicked item
  - Focus trapped within sidebar
  - Focus indicators visible

### Screen Reader Support
- **Announcements**: 
  - Feature type announced
  - Tab changes announced
  - Navigation actions announced
- **Landmarks**: 
  - `navigation` landmark for sidebar
  - `button` landmarks for interactive elements
- **Live Regions**: 
  - Tab changes announced
  - Navigation actions announced

### Color & Contrast
- **Contrast Ratios**: 
  - Text: 4.5:1 (WCAG AA compliant)
  - Interactive elements: 3:1 (WCAG AA compliant)
  - Gradient backgrounds: 4.5:1 (WCAG AA compliant)
- **Color Independence**: 
  - All interactive elements have non-color indicators
  - Focus states visible without color
  - Active states have border indicators
- **High Contrast Mode**: 
  - Fully supported
  - All interactive elements remain visible
  - Proper focus indicators maintained

## Migration & Breaking Changes

### Version History
| Version | Changes | Migration Guide |
|---------|---------|-----------------|
| 1.0.0 | Initial release | - |
| 1.1.0 | Added compact mode | No migration needed |
| 1.2.0 | Added showTooltips prop | No migration needed |

### Breaking Changes
None currently. The component is designed to be backward compatible.

### Migration Steps
N/A - No breaking changes to migrate from.

## Related Components

### Dependencies
- **Required**: 
  - `@radix-ui/react-tooltip` - Tooltip functionality
  - `lucide-react` - Icons
  - `clsx` - Utility for conditional classes
- **Optional**: 
  - None

### Related Features
- **Similar Components**: 
  - `Sidebar` - General sidebar component
  - `NavigationMenu` - Horizontal navigation
  - `Tabs` - Tab-based navigation
- **Complementary Components**: 
  - `FeatureModal` - Modal that uses this sidebar
  - `SharedFeatureModal` - Enhanced modal with built-in sidebar
  - `Tooltip` - Base tooltip component
- **Parent/Child Relationships**: 
  - Used by `FeatureModal` and `SharedFeatureModal`
  - Composes with `Tooltip` for enhanced UX
  - Renders navigation items dynamically

---

**Last Updated**: December 2024  
**Maintained By**: Frontend Team  
**Version**: 1.2.0 
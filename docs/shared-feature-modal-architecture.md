# Shared Feature Modal Architecture

## Table of Contents
1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Structure](#component-structure)
4. [Data Flow](#data-flow)
5. [Features & Use Cases](#features--use-cases)
6. [Extension Patterns](#extension-patterns)
7. [Best Practices](#best-practices)
8. [Examples](#examples)
9. [Migration Guide](#migration-guide)

## Overview

The Shared Feature Modal Architecture provides a consistent, reusable foundation for creating feature-specific modals across the application. It follows Clean Architecture principles and Component-Based Design to ensure maintainability, scalability, and consistency.

### Key Benefits
- **Consistent UX**: Same navigation, interactions, and styling across all features
- **Minimal Code**: 15-80 lines for new modals vs. 200+ lines before
- **Type Safety**: Full TypeScript support with feature-specific interfaces
- **Reusable Logic**: Built-in toast feedback, form handling, and statistics
- **Easy Maintenance**: Single source of truth for UI patterns

## Architecture Principles

### Clean Architecture Integration
The modal architecture integrates seamlessly with our Clean Architecture layers:

```
Presentation Layer (UI Components)
├── FeatureModal (Modal structure)
├── FeatureSidebar (Navigation)
├── FlowStatistics (Data visualization)
└── EntityFormFields (Form patterns)

Application Layer (Business Logic)
├── useFeedback (Toast system)
├── Form handlers (Validation, updates)
└── Statistics calculation

Domain Layer (Data Models)
├── EventStorm (Event storm data)
├── FunctionModel (Function model data)
└── Custom entities (Feature-specific data)

Infrastructure Layer (External Services)
├── Supabase (Data persistence)
└── React Flow (Flow visualization)
```

### Component-Based Design
Following our component hierarchy:

- **Base Components**: `Dialog`, `Input`, `Textarea`, `Button`
- **Composite Components**: `FeatureModal`, `EntityFormFields`, `FlowStatistics`
- **Feature Components**: `EventStormModal`, `FunctionModelModal`
- **Page Components**: Dashboard pages that use the modals

## Component Structure

### Core Components

#### 1. FeatureModal (Base Modal)
```typescript
// components/composites/feature-modal.tsx
export interface FeatureModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  featureType: "event-storm" | "function-model" | "spindle" | "knowledge-base"
  flowNodes?: Node[]
  flowEdges?: Edge[]
  renderDetailsTab: () => ReactNode
  renderStatsTab?: () => ReactNode
  renderEventStormTab?: () => ReactNode
  renderFunctionModelTab?: () => ReactNode
  renderSpindleTab?: () => ReactNode
  renderKnowledgeBaseTab?: () => ReactNode
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
  onNavigateToEventStorm?: () => void
  className?: string
}
```

**Responsibilities:**
- Modal structure and layout
- Tab state management
- Sidebar integration
- Content rendering based on active tab

#### 2. FeatureSidebar (Navigation)
```typescript
// components/composites/feature-sidebar.tsx
export interface FeatureSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  featureType: "event-storm" | "function-model" | "spindle" | "knowledge-base"
}
```

**Responsibilities:**
- Icon-based vertical navigation
- Active tab highlighting
- Feature-specific tab configuration
- Consistent navigation patterns

#### 3. EntityFormFields (Form Patterns)
```typescript
// components/composites/feature-form-fields.tsx
export interface EntityFormFieldsProps {
  id: string
  name: string
  description: string
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
  entityType?: string
  className?: string
}
```

**Responsibilities:**
- Standard entity form fields (ID, name, description)
- Built-in validation and feedback
- Enter key and blur handling
- Toast notifications

#### 4. FlowStatistics (Data Visualization)
```typescript
// components/ui/flow-statistics.tsx
export interface FlowStatisticsProps {
  nodes: Node[]
  edges: Edge[]
  title?: string
  variant?: "default" | "compact" | "detailed"
  showSummary?: boolean
  showDetailedStats?: boolean
}
```

**Responsibilities:**
- Real-time flow statistics calculation
- Node and edge counting
- Multiple display variants
- Universal compatibility with any flow data

### Pre-configured Modals

#### EventStormFeatureModal
```typescript
export function EventStormFeatureModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  onNavigateToFunctionModel,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: EventStormFeatureModalProps)
```

#### FunctionModelFeatureModal
```typescript
export function FunctionModelFeatureModal({
  isOpen,
  onClose,
  flowNodes,
  flowEdges,
  renderDetailsTab,
  renderStatsTab,
  renderEventStormTab,
  renderSpindleTab,
  renderKnowledgeBaseTab,
  onNavigateToEventStorm,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: FunctionModelFeatureModalProps)
```

## Data Flow

### 1. Modal Opening Flow
```
User clicks modal trigger
    ↓
Modal state updates (isOpen: true)
    ↓
FeatureModal initializes with default tab ("details")
    ↓
FeatureSidebar renders with active tab
    ↓
Content area renders based on active tab
    ↓
User interacts with modal content
```

### 2. Form Update Flow
```
User edits form field
    ↓
EditableTextField/EditableTextareaField captures input
    ↓
User presses Enter or blurs field
    ↓
handleBlurOrEnter() validates changes
    ↓
onUpdate callback triggers with new data
    ↓
useFeedback() shows success toast
    ↓
Parent component updates data model
    ↓
UI reflects changes
```

### 3. Tab Navigation Flow
```
User clicks sidebar tab
    ↓
onTabChange() updates activeTab state
    ↓
FeatureSidebar re-renders with new active tab
    ↓
Content area renders new tab content
    ↓
Tab-specific render function executes
    ↓
Custom content displays
```

### 4. Statistics Flow
```
Flow data changes (nodes/edges)
    ↓
FlowStatistics receives new data
    ↓
Component calculates real-time statistics
    ↓
Statistics display updates automatically
    ↓
Feature-specific stats render alongside flow stats
```

## Features & Use Cases

### Core Features

#### 1. Consistent Navigation
- **Icon-based sidebar**: Vertical navigation with consistent icons
- **Active tab highlighting**: Visual feedback for current tab
- **Feature-specific tabs**: Different tabs per feature type
- **Cross-feature navigation**: Seamless navigation between features

#### 2. Universal Statistics
- **Flow statistics**: Works with any React Flow data
- **Real-time updates**: Automatically updates when data changes
- **Multiple variants**: Compact, default, and detailed views
- **Feature-specific stats**: Custom statistics per feature

#### 3. Smart Form Handling
- **Auto-save on blur/enter**: No explicit save buttons needed
- **Toast feedback**: Immediate user feedback on changes
- **Validation**: Built-in validation patterns
- **State synchronization**: Automatic sync with external data

#### 4. Flexible Content Rendering
- **Render functions**: Custom content per tab
- **Conditional rendering**: Show/hide content based on data
- **Dynamic fields**: Support for custom field types
- **Responsive design**: Works on all screen sizes

### Use Cases

#### 1. Simple Entity Management
**Use Case**: Basic entities like Events, Domains, Users
**Implementation**: Use `SimpleEntityModal` or `EntityFormFields`
**Features**: Name, description, ID fields with automatic updates

```typescript
<SimpleEntityModal
  entity={event}
  onUpdateEntity={updateEvent}
  entityType="Event"
  isOpen={isOpen}
  onClose={onClose}
  flowNodes={eventNodes}
  flowEdges={eventEdges}
/>
```

#### 2. Complex Entity Management
**Use Case**: Entities with nested data like Function Models
**Implementation**: Use `ComplexEntityModal` or custom render functions
**Features**: Nested forms, metadata, child entities

```typescript
<FunctionModelModal
  functionModel={functionModel}
  onUpdateFunctionModel={updateFunctionModel}
  isOpen={isOpen}
  onClose={onClose}
  flowNodes={functionModelNodes}
  flowEdges={functionModelEdges}
/>
```

#### 3. Custom Field Management
**Use Case**: Entities with dynamic or custom fields
**Implementation**: Use `CustomFieldModal` with field configuration
**Features**: Dynamic forms, custom validation, field types

```typescript
<CustomFieldModal
  entity={customEntity}
  onUpdateEntity={updateCustomEntity}
  customFields={[
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'dueDate', label: 'Due Date', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ]}
  isOpen={isOpen}
  onClose={onClose}
/>
```

#### 4. Flow Visualization & Analysis
**Use Case**: Any feature with React Flow data
**Implementation**: Use `FlowStatistics` component
**Features**: Real-time statistics, node/edge counting, flow analysis

```typescript
<FlowStatistics
  nodes={flowNodes}
  edges={flowEdges}
  title="Flow Statistics"
  variant="default"
  showSummary={true}
  showDetailedStats={true}
/>
```

## Extension Patterns

### Pattern 1: Simple Entity Extension
For basic entities with standard fields (name, description, ID).

```typescript
export function MyEntityModal({ entity, onUpdateEntity, ...props }) {
  const renderDetailsTab = () => (
    <EntityFormFields
      id={entity.id}
      name={entity.name}
      description={entity.description}
      onUpdateName={(name) => onUpdateEntity({ ...entity, name })}
      onUpdateDescription={(description) => onUpdateEntity({ ...entity, description })}
      entityType="My Entity"
    />
  )

  const renderStatsTab = () => (
    <FlowStatistics
      nodes={props.flowNodes || []}
      edges={props.flowEdges || []}
      title="My Entity Statistics"
    />
  )

  return (
    <FeatureModal
      title="My Entity Settings"
      featureType="event-storm"
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      {...props}
    />
  )
}
```

### Pattern 2: Complex Entity Extension
For entities with nested data, custom fields, or complex structures.

```typescript
export function ComplexEntityModal({ entity, onUpdateEntity, ...props }) {
  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Basic fields */}
      <EntityFormFields
        id={entity.id}
        name={entity.name}
        description={entity.description}
        onUpdateName={(name) => onUpdateEntity({ ...entity, name })}
        onUpdateDescription={(description) => onUpdateEntity({ ...entity, description })}
        entityType="Complex Entity"
      />

      {/* Custom fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EditableTextField
          label="Custom Field"
          value={entity.customField}
          onUpdate={(value) => onUpdateEntity({ ...entity, customField: value })}
        />
      </div>

      {/* Nested data */}
      {entity.children && (
        <div className="space-y-4">
          <h4>Children ({entity.children.length})</h4>
          {/* Render children */}
        </div>
      )}
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      <FlowStatistics
        nodes={props.flowNodes || []}
        edges={props.flowEdges || []}
        title="Complex Entity Statistics"
      />
      
      {/* Custom stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4>Custom Metric</h4>
          <p>{entity.customMetric}</p>
        </div>
      </div>
    </div>
  )

  return (
    <FeatureModal
      title="Complex Entity Settings"
      featureType="function-model"
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      {...props}
    />
  )
}
```

### Pattern 3: Pre-configured Modal Extension
For features that need specific navigation and tab configurations.

```typescript
// Create a pre-configured modal for your feature
export function MyFeatureModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity,
  flowNodes,
  flowEdges,
  onNavigateToOtherFeature
}: MyFeatureModalProps) {
  
  const renderDetailsTab = () => (
    <EntityFormFields
      id={entity.id}
      name={entity.name}
      description={entity.description}
      onUpdateName={(name) => onUpdateEntity({ ...entity, name })}
      onUpdateDescription={(description) => onUpdateEntity({ ...entity, description })}
      entityType="My Feature"
    />
  )

  const renderStatsTab = () => (
    <FlowStatistics
      nodes={flowNodes || []}
      edges={flowEdges || []}
      title="My Feature Statistics"
    />
  )

  const renderOtherFeatureTab = () => (
    <div className="text-center py-8">
      <Button onClick={onNavigateToOtherFeature}>
        Go to Other Feature
      </Button>
    </div>
  )

  return (
    <FeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="My Feature Settings"
      featureType="event-storm"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      renderEventStormTab={renderOtherFeatureTab}
      onNavigateToEventStorm={onNavigateToOtherFeature}
    />
  )
}
```

## Best Practices

### 1. Component Design
- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Use render functions for customization
- **Props Interface**: Define clear, typed interfaces for all props
- **Default Values**: Provide sensible defaults for optional props

### 2. State Management
- **Local State**: Keep modal state local to the modal component
- **Parent Updates**: Use callbacks to update parent state
- **Synchronization**: Sync local state with props changes
- **Validation**: Validate data before calling update callbacks

### 3. Performance
- **Memoization**: Use React.memo for expensive components
- **Lazy Loading**: Load heavy content only when needed
- **Debouncing**: Debounce rapid updates to prevent excessive re-renders
- **Cleanup**: Clean up subscriptions and timers on unmount

### 4. Accessibility
- **Keyboard Navigation**: Support Tab, Enter, Escape keys
- **Screen Readers**: Provide proper ARIA labels and descriptions
- **Focus Management**: Manage focus when modal opens/closes
- **Color Contrast**: Ensure sufficient contrast for all text

### 5. Error Handling
- **Validation**: Validate input before processing
- **Error Boundaries**: Wrap modals in error boundaries
- **User Feedback**: Provide clear error messages
- **Graceful Degradation**: Handle missing data gracefully

## Examples

### Complete Example: Event Modal
```typescript
// components/composites/event-modal.tsx
"use client"

import { FeatureModal } from "./feature-modal"
import { EntityFormFields } from "./feature-form-fields"
import { FlowStatistics } from "../ui/flow-statistics"
import type { Node, Edge } from "reactflow"
import type { Event } from "@/lib/domain/entities/event-storm"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  flowNodes?: Node[]
  flowEdges?: Edge[]
  onUpdateEvent?: (updatedEvent: Event) => void
  onNavigateToFunctionModel?: () => void
  onNavigateToSpindle?: () => void
  onNavigateToKnowledgeBase?: () => void
}

export function EventModal({ 
  isOpen, 
  onClose, 
  event,
  flowNodes = [],
  flowEdges = [],
  onUpdateEvent,
  onNavigateToFunctionModel,
  onNavigateToSpindle,
  onNavigateToKnowledgeBase
}: EventModalProps) {
  
  const renderDetailsTab = () => (
    <EntityFormFields
      id={event.id}
      name={event.name}
      description={event.description}
      onUpdateName={(name) => onUpdateEvent?.({ ...event, name })}
      onUpdateDescription={(description) => onUpdateEvent?.({ ...event, description })}
      entityType="Event"
    />
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Event Statistics</h3>
      <FlowStatistics
        nodes={flowNodes}
        edges={flowEdges}
        title="Event Statistics"
        variant="default"
        showSummary={true}
        showDetailedStats={true}
      />
    </div>
  )

  return (
    <FeatureModal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Settings"
      featureType="event-storm"
      flowNodes={flowNodes}
      flowEdges={flowEdges}
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      onNavigateToFunctionModel={onNavigateToFunctionModel}
      onNavigateToSpindle={onNavigateToSpindle}
      onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
    />
  )
}
```

### Usage in Dashboard
```typescript
// app/(private)/dashboard/event-storm/components/event-storm-dashboard.tsx
"use client"

import { useState } from "react"
import { EventModal } from "@/components/composites/event-modal"
import type { Event } from "@/lib/domain/entities/event-storm"

export function EventStormDashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleUpdateEvent = (updatedEvent: Event) => {
    // Update event in database/state
    console.log("Event updated:", updatedEvent)
  }

  const handleNavigateToFunctionModel = () => {
    // Navigate to function model
    console.log("Navigate to function model")
  }

  return (
    <div>
      {/* Dashboard content */}
      
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent!}
        flowNodes={[]} // Your flow nodes
        flowEdges={[]} // Your flow edges
        onUpdateEvent={handleUpdateEvent}
        onNavigateToFunctionModel={handleNavigateToFunctionModel}
        onNavigateToSpindle={() => console.log("Navigate to spindle")}
        onNavigateToKnowledgeBase={() => console.log("Navigate to knowledge base")}
      />
    </div>
  )
}
```

## Migration Guide

### From Custom Modals to Shared Architecture

#### Before (Custom Modal)
```typescript
// Old approach: 200+ lines of custom modal code
export function CustomEventModal({ event, onUpdate, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("details")
  const [editName, setEditName] = useState(event.name)
  const [editDescription, setEditDescription] = useState(event.description)
  
  // Custom form handling
  const handleNameBlur = () => {
    if (editName !== event.name) {
      onUpdate({ ...event, name: editName })
      // Custom toast logic
    }
  }
  
  // Custom modal structure
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Event Settings</DialogTitle>
        </DialogHeader>
        <div className="flex h-[600px]">
          {/* Custom sidebar */}
          <div className="w-16 bg-gray-50 border-r">
            {/* Custom tab buttons */}
          </div>
          
          {/* Custom content */}
          <div className="flex-1 p-6">
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Custom form fields */}
              </div>
            )}
            {activeTab === "stats" && (
              <div>
                {/* Custom statistics */}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### After (Shared Architecture)
```typescript
// New approach: 30 lines using shared components
export function EventModal({ event, onUpdateEvent, ...props }) {
  const renderDetailsTab = () => (
    <EntityFormFields
      id={event.id}
      name={event.name}
      description={event.description}
      onUpdateName={(name) => onUpdateEvent({ ...event, name })}
      onUpdateDescription={(description) => onUpdateEvent({ ...event, description })}
      entityType="Event"
    />
  )

  const renderStatsTab = () => (
    <FlowStatistics
      nodes={props.flowNodes || []}
      edges={props.flowEdges || []}
      title="Event Statistics"
    />
  )

  return (
    <FeatureModal
      title="Event Settings"
      featureType="event-storm"
      renderDetailsTab={renderDetailsTab}
      renderStatsTab={renderStatsTab}
      {...props}
    />
  )
}
```

### Migration Steps

1. **Identify Modal Patterns**: Look for common patterns in existing modals
2. **Extract Shared Logic**: Move common functionality to shared components
3. **Create Render Functions**: Convert modal content to render functions
4. **Update Props Interface**: Define clear interfaces for your data models
5. **Test Integration**: Ensure all features work with the new architecture
6. **Remove Duplicate Code**: Clean up old modal implementations

### Benefits of Migration

- **90% Code Reduction**: From 200+ lines to 30 lines
- **Consistent UX**: Same interactions and styling everywhere
- **Easier Maintenance**: Single source of truth for UI patterns
- **Better Performance**: Optimized components with proper memoization
- **Type Safety**: Full TypeScript support with clear interfaces

---

## Conclusion

The Shared Feature Modal Architecture provides a powerful, flexible foundation for creating consistent, maintainable modals across the application. By following Clean Architecture principles and Component-Based Design, it ensures that:

- **UI patterns are consistent** while **data models are feature-specific**
- **Code is minimal** while **functionality is comprehensive**
- **Maintenance is easy** while **extensibility is unlimited**

This architecture scales from simple entities to complex workflows, providing the right level of abstraction for each use case while maintaining consistency across the entire application. 
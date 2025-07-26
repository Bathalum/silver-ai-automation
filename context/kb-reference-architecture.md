# Knowledge Base Reference Architecture & Features

## Overview
This document outlines the complete architecture, components, and features of the knowledge base reference system that needs to be replicated in our Silver AI Automation codebase, following our established Clean Architecture and Component-Based Design principles.

---

## 1. Project Structure

### Core Dependencies
- **Next.js 15.2.4** (upgrade from 14.2.16)
- **React 19** (upgrade from React 18)
- **TypeScript 5**
- **Tailwind CSS 3.4.17**
- **Radix UI Components** (comprehensive set - 40+ components)
- **Lucide React 0.454.0** (icons)
- **React Hook Form 7.54.1**
- **Zod 3.24.1** (validation)
- **Date-fns 4.1.0** (date utilities)
- **Recharts 2.15.0** (charts)
- **Sonner 1.7.1** (toasts)
- **Geist Fonts** (sans and mono variants)
- **next-themes** (theme provider)
- **cmdk** (command palette)
- **embla-carousel-react** (carousel components)
- **input-otp** (OTP input components)
- **react-resizable-panels** (resizable layouts)
- **vaul** (drawer components)

### File Structure (Aligned with Your Actual Codebase Architecture)
```
app/
├── (private)/
│   └── dashboard/
│       └── knowledge-base/
│           ├── [id]/
│           │   └── page.tsx (SOP detail page - Page Component)
│           ├── components/ (Feature Components)
│           │   ├── knowledge-base-dashboard.tsx (main dashboard component)
│           │   ├── sop-content-viewer.tsx (content viewing component)
│           │   ├── sop-list-view.tsx (list view component)
│           │   └── knowledge-base-filters.tsx (filtering component)
│           ├── hooks/ (Feature-specific hooks)
│           │   └── use-knowledge-base.ts (knowledge base specific hooks)
│           ├── page.tsx (main knowledge base page - Page Component)
│           └── loading.tsx (loading state component)
├── layout.tsx (root layout with Geist fonts and metadata)
└── globals.css (comprehensive CSS variables and theme setup)

components/
├── ui/ (Base Components - shadcn/ui library)
│   ├── button.tsx, input.tsx, card.tsx, etc. (40+ components)
│   ├── page-header.tsx (page header component)
│   └── theme-provider.tsx (next-themes provider wrapper)
├── composites/ (Composite Components)
│   ├── knowledge-base/
│   │   ├── sop-card.tsx (SOP card display component)
│   │   ├── sop-list-item.tsx (compact SOP list item)
│   │   ├── sop-detail-modal.tsx (detailed SOP view modal)
│   │   ├── sop-info-modal.tsx (SOP metadata and edit modal)
│   │   ├── knowledge-base-search.tsx (search functionality)
│   │   ├── knowledge-base-sidebar.tsx (main navigation sidebar)
│   │   ├── sop-sidebar.tsx (SOP-specific navigation sidebar)
│   │   ├── sop-content-sidebar.tsx (content-focused sidebar)
│   │   └── floating-sidebar.tsx (mobile/responsive floating sidebar)
│   ├── shared/ (shared composite components)
│   │   ├── constants.ts (shared constants)
│   │   ├── mode-selector.tsx (mode selection component)
│   │   └── navigation-tab-content.tsx (navigation tab content)
│   ├── feature-sidebar.tsx (feature sidebar component)
│   ├── dashboard-sidebar.tsx (dashboard sidebar component)
│   └── [other existing composite components]
└── features/ (Feature Components for public pages)
    └── knowledge-base-section.tsx (public knowledge base section)

lib/
├── domain/ (Domain Layer - Clean Architecture)
│   ├── entities/
│   │   ├── knowledge-base-types.ts (core business entities and types)
│   │   ├── function-model-types.ts (existing function model types)
│   │   ├── event-storm.ts (existing event storm types)
│   │   └── service.ts (existing service types)
│   └── rules/
│       └── knowledge-base-validation.ts (business rules and validation)
├── use-cases/ (Application Layer - Clean Architecture)
│   ├── get-sops.ts (knowledge base use case)
│   ├── create-sop.ts (knowledge base use case)
│   ├── update-sop.ts (knowledge base use case)
│   ├── delete-sop.ts (knowledge base use case)
│   ├── get-services.ts (existing use case)
│   └── get-testimonials.ts (existing use case)
├── infrastructure/ (Infrastructure Layer - Clean Architecture)
│   ├── knowledge-base-repository.ts (knowledge base data access)
│   ├── knowledge-base-service.ts (knowledge base external services)
│   └── contact-service.ts (existing service)
├── stores/ (State management)
│   └── knowledge-base-store.ts (knowledge base state management)
├── utils/ (Application Layer - Business logic utilities)
│   ├── table-of-contents.ts (TOC generation utility)
│   ├── knowledge-base/
│   │   ├── sop-content-processor.ts (content processing utilities)
│   │   └── search-utils.ts (search and filtering utilities)
│   └── utils.ts (general utility functions)

hooks/ (Additional utility hooks)
├── use-toast.ts (toast notification system)
└── use-mobile.tsx (responsive design hook)

Configuration Files:
├── next.config.mjs (Next.js configuration)
├── tailwind.config.ts (Tailwind CSS with custom theme)
├── components.json (shadcn/ui configuration)
├── tsconfig.json (TypeScript configuration)
├── postcss.config.mjs (PostCSS configuration)
└── package.json (dependencies and scripts)
```

---

## 2. Data Models & Types (Domain Layer)

### Core Types (lib/domain/entities/knowledge-base-types.ts)
```typescript
// Core business entities following Clean Architecture principles
interface SOP {
  id: string
  title: string
  content: string
  summary: string
  tags: string[]
  category: string
  version: string
  status: "draft" | "published" | "archived"
  createdAt: Date
  updatedAt: Date
  author: string
  linkedFunctionModels: string[]
  linkedEventStorms: string[]
  linkedSpindles: string[]
  vectorEmbedding?: number[]
  searchKeywords: string[]
  readTime: number
  lastViewed?: Date
}

interface LinkedEntity {
  id: string
  title: string
  type: "function-model" | "event-storm" | "spindle"
  description?: string
}

interface KnowledgeBaseFilters {
  search: string
  category: string
  status: string
  tags: string[]
}

interface TableOfContents {
  id: string
  title: string
  level: number
}

// Business value objects
interface SOPMetadata {
  version: string
  author: string
  lastModified: Date
  readCount: number
}

interface SearchResult {
  sop: SOP
  relevanceScore: number
  matchedTerms: string[]
}
```

### Business Rules (lib/domain/rules/knowledge-base-validation.ts)
```typescript
// Business rules and validation logic
export const SOP_VALIDATION_RULES = {
  title: { minLength: 3, maxLength: 200 },
  content: { minLength: 10 },
  tags: { maxCount: 10, maxLength: 50 },
  category: { required: true }
}

export function validateSOP(sop: Partial<SOP>): ValidationResult {
  // Business rule validation logic
}
```

---

## 3. Component Architecture (Following Our Component-Based Design)

### 3.1 Base Components (components/ui/)
**Location**: `/components/ui/` - shadcn/ui library components
- **Button, Input, Card, Modal, Dropdown** - Fundamental UI building blocks
- **Table, Form, Dialog, Popover** - Complex base components
- **Theme Provider** - Theme management wrapper

### 3.2 Composite Components (components/composites/knowledge-base/)

#### Card & List Components
- **SOPCard** (`components/composites/knowledge-base/sop-card.tsx`)
  - Composed of: Card, Badge, Button, Avatar base components
  - Displays SOP information with status badges, tags, linked entities
  - Action buttons (view, edit) with consistent styling

- **SOPListItem** (`components/composites/knowledge-base/sop-list-item.tsx`)
  - Composed of: Card, Badge, Button base components
  - Compact view with essential SOP information
  - Consistent with other list items in the application

#### Modal Components
- **SOPDetailModal** (`components/composites/knowledge-base/sop-detail-modal.tsx`)
  - Composed of: Dialog, Card, Button, Badge base components
  - Detailed SOP view with full content display and formatting
  - Consistent modal behavior and styling

- **SOPInfoModal** (`components/composites/knowledge-base/sop-info-modal.tsx`)
  - Composed of: Dialog, Form, Input, Button base components
  - SOP metadata display and editing functionality
  - Form validation and error handling

#### Search & Filter Components
- **KnowledgeBaseSearch** (`components/composites/knowledge-base/knowledge-base-search.tsx`)
  - Composed of: Input, Button, Dropdown base components
  - Search functionality with real-time results
  - Consistent with other search components in the application

- **KnowledgeBaseFilters** (`components/composites/knowledge-base/knowledge-base-filters.tsx`)
  - Composed of: Select, Checkbox, Button base components
  - Advanced filtering options for category, status, tags
  - Reusable filtering logic

#### Sidebar Components
- **KnowledgeBaseSidebar** (`components/composites/knowledge-base/knowledge-base-sidebar.tsx`)
  - Composed of: Sidebar, Button, Badge base components
  - Navigation sidebar with collapsible functionality
  - Links to different sections and feature integration

- **SOPSidebar** (`components/composites/knowledge-base/sop-sidebar.tsx`)
  - Composed of: Sidebar, Button, ScrollArea base components
  - SOP-specific sidebar with content navigation
  - Table of contents generation and related documents

- **SOPContentSidebar** (`components/composites/knowledge-base/sop-content-sidebar.tsx`)
  - Composed of: Card, Badge, Button base components
  - Content-focused sidebar for SOP viewing
  - Metadata display and linked entities

- **FloatingSidebar** (`components/composites/knowledge-base/floating-sidebar.tsx`)
  - Composed of: Sheet, Button, ScrollArea base components
  - Mobile/responsive floating sidebar with overlay functionality
  - Touch-friendly interactions

### 3.3 Feature Components (app/(private)/dashboard/knowledge-base/components/)

#### Main Feature Components
- **KnowledgeBaseDashboard** (`app/(private)/dashboard/knowledge-base/components/knowledge-base-dashboard.tsx`)
  - Composed of: KnowledgeBaseSearch, KnowledgeBaseFilters, SOPCard composite components
  - Main dashboard layout and data management
  - Integration with custom hooks for data fetching
  - Similar pattern to FunctionProcessDashboard and EventStormDashboard

- **SOPContentViewer** (`app/(private)/dashboard/knowledge-base/components/sop-content-viewer.tsx`)
  - Composed of: SOPContentSidebar, FloatingSidebar composite components
  - SOP content rendering with markdown support
  - Table of contents generation and navigation
  - Header with back button, edit, share, and bookmark actions

- **SOPListView** (`app/(private)/dashboard/knowledge-base/components/sop-list-view.tsx`)
  - Composed of: SOPListItem, KnowledgeBaseFilters composite components
  - List view of SOPs with filtering and search
  - Pagination and sorting functionality

- **KnowledgeBaseFilters** (`app/(private)/dashboard/knowledge-base/components/knowledge-base-filters.tsx`)
  - Composed of: KnowledgeBaseFilters composite component
  - Feature-specific filtering logic and state management
  - Integration with URL parameters for shareable state

### 3.4 Feature-Specific Hooks (app/(private)/dashboard/knowledge-base/hooks/)
- **useKnowledgeBase** (`app/(private)/dashboard/knowledge-base/hooks/use-knowledge-base.ts`)
  - Feature-specific hooks following the pattern of use-event-storm.ts
  - Knowledge base specific state management and operations

### 3.5 Page Components (app/(private)/dashboard/knowledge-base/)

#### Main Page Components
- **KnowledgeBasePage** (`app/(private)/dashboard/knowledge-base/page.tsx`)
  - Composed of: KnowledgeBaseDashboard feature component
  - Main landing page with search, filters, and SOP list
  - Page-level state management and data fetching
  - Routing and navigation concerns
  - Following the pattern of FunctionModelPage and EventStormPage

- **SOPDetailPage** (`app/(private)/dashboard/knowledge-base/[id]/page.tsx`)
  - Composed of: SOPContentViewer, SOPSidebar feature components
  - SOP detail page with dynamic routing
  - Page-level state management for individual SOP
  - Error handling and loading states

---

## 4. Application Layer (Custom Hooks & Use Cases)

### 4.1 Use Cases (lib/use-cases/)
Following Clean Architecture principles and your existing pattern, use cases contain application-specific business logic:

```typescript
// lib/use-cases/get-sops.ts
export const getSOPs = (filters: KnowledgeBaseFilters): SOP[] => {
  // Application logic for retrieving SOPs with filtering
  // Business rules for data retrieval
  // Following the pattern of get-services.ts and get-testimonials.ts
  return [
    // Mock data or actual data retrieval logic
  ]
}

// lib/use-cases/create-sop.ts
export const createSOP = (sopData: CreateSOPRequest): SOP => {
  // Application logic for SOP creation
  // Business rule validation
  // Following existing use case patterns
}

// lib/use-cases/update-sop.ts
export const updateSOP = (id: string, updates: UpdateSOPRequest): SOP => {
  // Application logic for SOP updates
  // Version control and change tracking
  // Business rule validation
}

// lib/use-cases/delete-sop.ts
export const deleteSOP = (id: string): void => {
  // Application logic for SOP deletion
  // Soft delete vs hard delete logic
  // Dependency checking
}
```

### 4.2 Custom Hooks

#### Feature-Specific Hooks (app/(private)/dashboard/knowledge-base/hooks/)
```typescript
// app/(private)/dashboard/knowledge-base/hooks/use-knowledge-base.ts
export function useKnowledgeBase() {
  // Feature-specific state management for SOPs, filters, loading
  // Integration with use cases for CRUD operations
  // Search and filtering logic
  // Mock data management with realistic content
  // Category and tag management
  // Status filtering (draft, published, archived)
  // URL parameter integration for shareable state
  // Following the pattern of use-event-storm.ts
}

export function useSOPById(id: string) {
  // Get specific SOP by ID using use cases
  // Related entities fetching (Function Models, Event Storms, Spindles)
  // Content parsing and formatting
  // Table of contents generation
  // Linked entities resolution
  // Error handling and loading states
}
```

#### Global Hooks (hooks/)
```typescript
// hooks/use-toast.ts
export function useToast() {
  // Toast notification system with reducer pattern
  // Toast management (add, update, dismiss, remove)
  // Queue management and timeout handling
}

// hooks/use-mobile.tsx
export function useIsMobile() {
  // Responsive design hook for mobile detection
  // Media query listener for breakpoint changes
  // Returns boolean for mobile state
}
```

### 4.3 Utility Functions (lib/utils/)

#### Content Processing
```typescript
// lib/utils/knowledge-base/sop-content-processor.ts
export function processSOPContent(content: string): ProcessedContent {
  // Markdown processing and sanitization
  // Header ID generation for navigation
  // Link processing and validation
  // Content optimization
}

// lib/utils/table-of-contents.ts
export function generateTableOfContents(content: string): TableOfContents[]
// Parses markdown headers and generates navigation structure
// Creates IDs for smooth scrolling navigation
// Supports h1-h6 header levels
```

#### Search Utilities
```typescript
// lib/utils/knowledge-base/search-utils.ts
export function searchSOPs(sops: SOP[], query: string): SearchResult[] {
  // Full-text search implementation
  // Relevance scoring
  // Fuzzy matching
  // Search result ranking
}

export function filterSOPs(sops: SOP[], filters: KnowledgeBaseFilters): SOP[] {
  // Advanced filtering logic
  // Category and tag filtering
  // Status filtering
  // Date range filtering
}
```

### 4.4 Additional Hooks
```typescript
// hooks/use-toast.ts
export function useToast() {
  // Toast notification system with reducer pattern
  // Toast management (add, update, dismiss, remove)
  // Queue management and timeout handling
}

// hooks/use-mobile.tsx
export function useIsMobile() {
  // Responsive design hook for mobile detection
  // Media query listener for breakpoint changes
  // Returns boolean for mobile state
}
```

**Features:**
- Clean Architecture separation of concerns
- Use cases for business logic isolation
- Custom hooks for state management
- URL parameter integration for shareable state
- Comprehensive error handling and loading states
- Optimistic updates and rollback functionality

---

## 5. Infrastructure Layer (Data Access & External Services)

### 5.1 Repository Pattern (lib/infrastructure/)

```typescript
// lib/infrastructure/knowledge-base-repository.ts
export const getKnowledgeBaseData = (filters: KnowledgeBaseFilters): SOP[] => {
  // Data access logic for retrieving SOPs
  // Following the pattern of contact-service.ts
  // Mock data or actual data retrieval
  return [
    // SOP data
  ]
}

export const getSOPById = (id: string): SOP | null => {
  // Data access logic for retrieving single SOP
  // Related entities fetching
  // Caching strategies
}

export const createSOP = (sop: CreateSOPRequest): SOP => {
  // Data access logic for creating SOPs
  // Validation and data sanitization
  // Following existing service patterns
}

export const updateSOP = (id: string, updates: UpdateSOPRequest): SOP => {
  // Data access logic for updating SOPs
  // Version control implementation
  // Audit trail management
}

export const deleteSOP = (id: string): void => {
  // Data access logic for deleting SOPs
  // Soft delete implementation
  // Dependency cleanup
}
```

### 5.2 Service Layer (lib/infrastructure/)

```typescript
// lib/infrastructure/knowledge-base-service.ts
export const searchSOPs = async (query: string): Promise<SearchResult[]> => {
  // External search service integration
  // Vector search implementation
  // Search result ranking and relevance
  // Following the pattern of contact-service.ts
}

export const generateEmbeddings = async (content: string): Promise<number[]> => {
  // AI/ML service integration for embeddings
  // Content vectorization
  // Caching and optimization
}

export const exportSOP = async (id: string, format: 'pdf' | 'docx' | 'html'): Promise<Blob> => {
  // Export service integration
  // Document generation
  // Format conversion
}
```

### 5.3 External Integrations
- **Supabase**: Primary data storage and authentication
- **Vector Database**: For semantic search and embeddings
- **File Storage**: For document attachments and exports
- **Search Service**: For advanced search capabilities
- **AI Services**: For content analysis and suggestions

---

## 6. Key Features

### 6.1 Knowledge Base Management
- **SOP Creation & Editing**: Full CRUD operations
- **Content Management**: Rich text content with markdown support
- **Version Control**: SOP versioning and history
- **Status Management**: Draft, published, archived states

### 6.2 Search & Discovery
- **Full-Text Search**: Search across titles, content, tags
- **Advanced Filtering**: By category, status, tags, author
- **Smart Suggestions**: Based on search history and content
- **Vector Search**: Embedding-based semantic search

### 6.3 Content Organization
- **Categorization**: Hierarchical category system
- **Tagging**: Flexible tagging system
- **Related Content**: Links between SOPs and other entities
- **Table of Contents**: Auto-generated from content structure

### 6.4 Integration Features
- **Linked Entities**: Connection to Function Models, Event Storms, Spindles
- **Cross-References**: Bidirectional linking between documents
- **Context Awareness**: Related content suggestions

### 6.5 User Experience
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant components
- **Performance**: Optimized loading and rendering
- **Real-time Updates**: Live content updates

---

## 7. Data Flow Architecture (Clean Architecture Integration)

### 7.1 Component Relationships and Flow
Following our established component architecture:

1. **Composition Flow**: 
   - Page Components → Feature Components → Composite Components → Base Components

2. **Data Flow**:
   - Data flows down from page components to feature components to composite components to base components
   - Events and user interactions flow up in the opposite direction

3. **Clean Architecture Integration**:
   - Page and Feature components interact with the Application Layer through custom hooks
   - Custom hooks interact with the Infrastructure Layer through use cases
   - Use cases interact with repositories and services
   - Repositories and services interact with external systems (Supabase, APIs)

### 7.2 State Management
- **Local State**: Component-level state with React hooks
- **Custom Hooks**: Reusable logic for data operations following Clean Architecture
- **URL Parameters**: Shareable, bookmarkable states for filters and search
- **Mock Data**: Realistic sample data for development

### 7.3 Data Persistence
- **Local Storage**: User preferences and temporary data
- **Supabase Integration**: Primary data storage and real-time updates
- **Caching**: Optimized data fetching and caching strategies
- **Offline Support**: Local caching for offline functionality

---

## 8. Styling & Theming

### 8.1 Design System
- **Tailwind CSS**: Utility-first styling with custom theme
- **CSS Variables**: Comprehensive theme system with light/dark mode
- **Component Variants**: Consistent design patterns with shadcn/ui
- **Dark Mode**: Full theme provider support with next-themes
- **Geist Fonts**: Modern typography with sans and mono variants
- **Custom Color Palette**: Extended color system with sidebar-specific colors
- **Animation System**: Tailwind animations with accordion and custom keyframes

### 8.2 Responsive Design
- **Mobile-First**: Progressive enhancement
- **Breakpoint System**: Consistent responsive behavior
- **Touch-Friendly**: Mobile-optimized interactions

---

## 9. Integration Points

### 9.1 Existing Architecture Integration
- **Function Models**: Link SOPs to function model diagrams
- **Event Storms**: Connect SOPs to event storm sessions
- **Spindles**: Associate SOPs with spindle workflows
- **Dashboard**: Knowledge base analytics and insights

### 9.2 Future Enhancements
- **AI Integration**: Smart content suggestions
- **Collaboration**: Multi-user editing and commenting
- **Analytics**: Usage tracking and insights
- **Export**: PDF, Word, HTML export options

---

## 10. Implementation Priority (Following Our Architecture Principles)

### Phase 1: Core Foundation & Clean Architecture Setup
1. Update dependencies (Next.js 15, React 19, TypeScript 5)
2. Implement domain layer (entities and business rules) - following existing patterns
3. Set up infrastructure layer (repositories and services) - following contact-service.ts pattern
4. Create application layer (use cases) - following get-services.ts and get-testimonials.ts patterns
5. Set up theme system with Geist fonts and CSS variables
6. Configure Tailwind CSS with custom theme
7. Set up shadcn/ui configuration

### Phase 2: Component Architecture Implementation
1. Create base components (leveraging existing shadcn/ui)
2. Implement composite components (knowledge-base specific) - following existing composite patterns
3. Build feature components (dashboard integration) - following FunctionProcessDashboard and EventStormDashboard patterns
4. Create page components (routing and layout) - following FunctionModelPage and EventStormPage patterns
5. Set up component composition and data flow
6. Implement URL parameter integration for shareable state

### Phase 3: Knowledge Base Features
1. SOP CRUD operations using use cases and repositories
2. Advanced search and filtering system with business logic
3. Content rendering with markdown support and processing
4. Table of contents generation and navigation
5. Sidebar navigation (main, SOP-specific, floating)
6. Modal components for SOP details and editing
7. Card and list item components with consistent styling

### Phase 4: Advanced Features & Integration
1. Linked entities integration (Function Models, Event Storms, Spindles)
2. Advanced search capabilities with vector embeddings
3. Content organization with categories and tags
4. User experience enhancements (responsive design, accessibility)
5. Performance optimization and code splitting
6. Error handling and loading states
7. Mobile responsiveness and touch interactions

### Phase 5: Polish & Production Readiness
1. Integration with existing Silver AI Automation features
2. Accessibility improvements (WCAG compliance)
3. Testing and comprehensive documentation
4. SEO optimization and metadata management
5. Performance monitoring and optimization
6. Security implementation and validation

---

## 11. Technical Considerations

### 11.1 Performance
- **Code Splitting**: Lazy loading for large components
- **Virtualization**: For large lists of SOPs
- **Caching**: Intelligent data caching strategies
- **Optimization**: Bundle size and loading optimization

### 11.2 Security
- **Input Validation**: Comprehensive form validation
- **XSS Prevention**: Safe content rendering
- **Access Control**: Role-based permissions
- **Data Sanitization**: Clean data handling

### 11.3 Scalability
- **Modular Architecture**: Component-based design
- **Extensible Types**: Flexible data models
- **Plugin System**: Extensible functionality
- **API Design**: RESTful API patterns

---

This architecture provides a comprehensive foundation for implementing a knowledge base system that integrates seamlessly with the existing Silver AI Automation platform while maintaining consistency with our established Clean Architecture and Component-Based Design principles. The implementation follows our proven architectural patterns, ensuring maintainability, scalability, and adaptability to future requirements. 
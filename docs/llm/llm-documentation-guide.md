# LLM Documentation Creation Guide

## Overview

This guide provides LLMs with everything needed to create comprehensive component documentation following our established standards. Use this guide along with the referenced documents to ensure consistent, high-quality documentation.

## Required Documents for LLM Context

### 1. Core Standards
- **`docs/component-documentation-standards.md`** - Complete documentation template and requirements
- **`docs/architecture/component-architecture.md`** - Component architecture patterns

### 2. Example Documentation
- **`docs/components/composite-components/feature-modal.md`** - Perfect example of standards implementation
- **`docs/shared-feature-modal-architecture.md`** - Shows component relationships and patterns

### 3. Project Context
- **`docs/README.md`** - Overall documentation structure and navigation
- **`docs/architecture/data-flow-patterns.md`** - Data flow patterns in the application

## LLM Documentation Creation Process

### Step 1: Analyze the Component
Before creating documentation, analyze the component to understand:

1. **Component Type**: Is it a UI, Composite, or Feature component?
2. **Purpose**: What does it do and why does it exist?
3. **Dependencies**: What other components does it use?
4. **Props Interface**: What props does it accept?
5. **State Management**: How does it manage state?
6. **Integration Points**: How does it work with other components?

### Step 2: Determine Documentation Location
Based on component type, place documentation in the correct folder:

```
docs/components/
├── ui-components/          # Base UI components (Button, Input, etc.)
├── composite-components/   # Reusable composite components
└── feature-components/     # Business-specific feature components
```

### Step 3: Follow the Complete Template Structure

Use the exact structure from `component-documentation-standards.md`:

```markdown
# Component Name

## Overview
[Brief description with key features and purpose]

### Key Features
- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

### When to Use
- Use case 1
- Use case 2

### When Not to Use
- Anti-pattern 1
- Anti-pattern 2

## API Reference

### Props Interface
```typescript
interface ComponentNameProps {
  // Complete TypeScript interface
}
```

### Props Description
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `propName` | `type` | Yes/No | `default` | Description |

## Usage Examples

### Basic Usage
```tsx
// Minimal working example
```

### Advanced Usage
```tsx
// Complex example with multiple features
```

### Integration Examples
```tsx
// Example with related components
```

## Implementation Details

### Component Architecture
```
ComponentName
├── SubComponent1
├── SubComponent2
└── SubComponent3
```

### State Management
- **Local State**: Description
- **Props State**: Description
- **External State**: Description

### Performance Considerations
- **Memoization**: What's memoized
- **Re-render Triggers**: What causes re-renders
- **Optimization Tips**: How to optimize

### Error Handling
- **Validation**: Input validation
- **Error States**: Error display
- **Fallbacks**: Default behavior

## Testing Guide

### Unit Tests
```typescript
// Complete test examples
```

### Integration Tests
```typescript
// Integration test examples
```

## Performance Considerations

### Bundle Size
- **Component Size**: ~X KB (gzipped)
- **Dependencies**: List of dependencies
- **Tree Shaking**: Whether supported

### Runtime Performance
- **Render Performance**: O(1) for typical usage
- **Memory Usage**: Minimal footprint
- **Re-render Optimization**: Optimization details

### Best Practices
- **Avoid**: Anti-patterns
- **Prefer**: Good patterns
- **Monitor**: What to watch

## Accessibility Documentation

### ARIA Support
- **Roles**: List of ARIA roles
- **States**: ARIA states
- **Properties**: ARIA properties

### Keyboard Navigation
- **Tab Order**: How tab navigation works
- **Keyboard Shortcuts**: Available shortcuts
- **Focus Management**: Focus handling

### Screen Reader Support
- **Announcements**: What screen readers announce
- **Landmarks**: Semantic structure
- **Live Regions**: Dynamic content

### Color & Contrast
- **Contrast Ratios**: WCAG compliance
- **Color Independence**: Works without color
- **High Contrast Mode**: Support details

## Migration & Breaking Changes

### Version History
| Version | Changes | Migration Guide |
|---------|---------|-----------------|
| 1.0.0 | Initial release | - |

### Breaking Changes
None currently or specific changes with migration examples.

### Migration Steps
Step-by-step migration instructions if needed.

## Related Components

### Dependencies
- **Required**: Components this depends on
- **Optional**: Optional dependencies

### Related Features
- **Similar Components**: Alternative implementations
- **Complementary Components**: Components that work together
- **Parent/Child Relationships**: Component hierarchy

---

**Last Updated**: [Date]  
**Maintained By**: [Team/Person]  
**Version**: [Version]
```

## LLM Best Practices

### 1. Always Include Complete Examples
- Provide **working code examples** that can be copied and pasted
- Include **import statements** and **dependencies**
- Show **real-world usage patterns**

### 2. Be Specific and Detailed
- Use **exact prop names** and **types** from the component
- Include **default values** and **validation rules**
- Explain **when and why** to use specific props

### 3. Follow the Architecture Patterns
- Reference the **component architecture** document
- Show how components **compose together**
- Explain **data flow** and **state management**

### 4. Include Testing Examples
- Provide **complete test code** that can be run
- Cover **unit tests**, **integration tests**, and **accessibility tests**
- Show **testing patterns** and **best practices**

### 5. Consider Performance and Accessibility
- Always include **performance considerations**
- Document **accessibility features** and **WCAG compliance**
- Provide **optimization tips** and **best practices**

## Quality Checklist for LLM Output

Before finalizing documentation, ensure:

- [ ] **Complete API documentation** with all props and types
- [ ] **Working code examples** that can be executed
- [ ] **Comprehensive testing examples** with actual test code
- [ ] **Performance considerations** with specific metrics
- [ ] **Accessibility documentation** with ARIA details
- [ ] **Proper file location** in the correct folder
- [ ] **Consistent formatting** following the template
- [ ] **Clear navigation** with proper headings
- [ ] **Related components** and dependencies listed
- [ ] **Version information** and maintenance details

## Common LLM Mistakes to Avoid

### 1. Incomplete Examples
❌ **Bad**: "Here's how to use the component..."
✅ **Good**: Complete, runnable code with imports and context

### 2. Missing API Details
❌ **Bad**: "The component accepts various props..."
✅ **Good**: Complete TypeScript interface with all props documented

### 3. Generic Testing
❌ **Bad**: "Write tests for the component..."
✅ **Good**: Complete test examples with actual test code

### 4. Missing Context
❌ **Bad**: "This component does things..."
✅ **Good**: Explains when to use, when not to use, and how it fits in the architecture

## Example LLM Prompt

```
Please create comprehensive documentation for [ComponentName] following our established standards.

Required context:
1. Component source code: [paste component code]
2. Component type: [UI/Composite/Feature]
3. Related components: [list related components]

Please follow the complete template structure from component-documentation-standards.md and use feature-modal.md as a reference example.

Include:
- Complete API documentation with TypeScript interfaces
- Working code examples (Basic, Advanced, Integration)
- Comprehensive testing examples
- Performance considerations
- Accessibility documentation
- Proper file location and naming

Ensure all examples are complete, runnable, and follow our component architecture patterns.
```

## Conclusion

By following this guide and using the complete documentation package, LLMs can create consistent, comprehensive, and maintainable component documentation that meets our high standards for developer experience and code maintainability.

Remember: **Quality over quantity**. It's better to have complete, accurate documentation for fewer components than incomplete documentation for many components. 
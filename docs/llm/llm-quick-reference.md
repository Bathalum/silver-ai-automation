# LLM Documentation Quick Reference

## 🚀 Quick Start for LLMs

### Required Documents (Always Include)
1. **`docs/component-documentation-standards.md`** - Complete template and requirements
2. **`docs/components/composite-components/shared-feature-modal.md`** - Perfect example to follow
3. **`docs/llm-documentation-guide.md`** - Detailed LLM-specific instructions

### Optional Context Documents
5. **`docs/architecture/component-architecture.md`** - Overall patterns
6. **`docs/README.md`** - Documentation structure

## 📋 Essential Template Structure

```markdown
# Component Name

## Overview
[Purpose and key features]

### Key Features
- Feature 1: Description
- Feature 2: Description

### When to Use
- Use case 1
- Use case 2

### When Not to Use
- Anti-pattern 1

## API Reference

### Props Interface
```typescript
interface ComponentNameProps {
  // Complete TypeScript interface
}
```

### Props Description
| Prop | Type | Required | Default | Description |

## Usage Examples

### Basic Usage
```tsx
// Complete, runnable example
```

### Advanced Usage
```tsx
// Complex example
```

### Integration Examples
```tsx
// With related components
```

## Implementation Details

### Component Architecture
```
ComponentName
├── SubComponent1
└── SubComponent2
```

### State Management
- **Local State**: Description
- **Props State**: Description

### Performance Considerations
- **Memoization**: What's memoized
- **Re-render Triggers**: What causes re-renders

### Error Handling
- **Validation**: Input validation
- **Error States**: Error display

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
- **Dependencies**: List

### Runtime Performance
- **Render Performance**: O(1) for typical usage
- **Memory Usage**: Minimal footprint

### Best Practices
- **Avoid**: Anti-patterns
- **Prefer**: Good patterns

## Accessibility Documentation

### ARIA Support
- **Roles**: List of ARIA roles
- **States**: ARIA states

### Keyboard Navigation
- **Tab Order**: How tab navigation works
- **Focus Management**: Focus handling

### Screen Reader Support
- **Announcements**: What screen readers announce
- **Landmarks**: Semantic structure

### Color & Contrast
- **Contrast Ratios**: WCAG compliance
- **Color Independence**: Works without color

## Migration & Breaking Changes

### Version History
| Version | Changes | Migration Guide |

### Breaking Changes
None currently or specific changes.

### Migration Steps
Step-by-step instructions if needed.

## Related Components

### Dependencies
- **Required**: Components this depends on
- **Optional**: Optional dependencies

### Related Features
- **Similar Components**: Alternative implementations
- **Complementary Components**: Components that work together

---

**Last Updated**: [Date]  
**Maintained By**: [Team/Person]  
**Version**: [Version]
```

## 🎯 LLM Best Practices

### ✅ DO
- **Include complete, runnable code examples**
- **Document ALL props with TypeScript interfaces**
- **Provide comprehensive testing examples**
- **Explain when and why to use the component**
- **Include performance and accessibility details**
- **Follow the exact template structure**

### ❌ DON'T
- **Create incomplete or generic examples**
- **Skip API documentation**
- **Provide vague testing guidance**
- **Ignore performance and accessibility**
- **Deviate from the established template**

## 📁 File Location Guide

```
docs/components/
├── ui-components/          # Button, Input, Dialog, etc.
├── composite-components/   # FeatureModal, EntityFormFields, etc.
└── feature-components/     # EventStormModal, FunctionModelModal, etc.
```

## 🔍 Quality Checklist

- [ ] Complete API documentation with TypeScript
- [ ] Working code examples (Basic, Advanced, Integration)
- [ ] Comprehensive testing examples
- [ ] Performance considerations
- [ ] Accessibility documentation
- [ ] Proper file location
- [ ] Consistent formatting
- [ ] Related components listed
- [ ] Version information included

## 💡 Example LLM Prompt

```
Create comprehensive documentation for [ComponentName] following our standards.

Context:
- Component code: [paste code]
- Component type: [UI/Composite/Feature]
- Related components: [list]

Follow the template from component-documentation-standards.md and use feature-modal.md as reference.

Include: Complete API docs, working examples, testing examples, performance notes, accessibility details.

Ensure all examples are complete and runnable.
```

---

**Remember**: Quality over quantity. Complete, accurate documentation is better than incomplete documentation. 
import type { SOP, KnowledgeBaseFilters } from "../domain/entities/knowledge-base-types"

export const getSOPs = (filters: KnowledgeBaseFilters): SOP[] => {
  // Application logic for retrieving SOPs with filtering
  // Business rules for data retrieval
  // Following the pattern of get-services.ts and get-testimonials.ts
  
  const mockSOPs: SOP[] = [
    {
      id: "1",
      title: "Customer Onboarding Process",
      content: `# Customer Onboarding Process

## Overview
This document outlines the standard operating procedure for onboarding new customers to our platform.

## Prerequisites
- Customer account created
- Initial consultation completed
- Contract signed

## Steps

### 1. Account Setup
- Create user accounts for key stakeholders
- Configure permissions and access levels
- Set up initial project structure

### 2. Data Migration
- Import existing customer data
- Validate data integrity
- Set up data backup procedures

### 3. Training
- Schedule training sessions
- Provide documentation and resources
- Conduct hands-on workshops

### 4. Go-Live
- Final system configuration
- User acceptance testing
- Production deployment

## Success Criteria
- All users can access the system
- Data migration completed successfully
- Training completed for all users
- System operational in production`,
      summary: "Standard operating procedure for onboarding new customers to our platform, including account setup, data migration, training, and go-live processes.",
      tags: ["onboarding", "customer", "process", "training"],
      category: "Customer Management",
      version: "1.0",
      status: "published",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
      author: "John Smith",
      linkedFunctionModels: ["func-001", "func-002"],
      linkedEventStorms: ["event-001"],
      linkedSpindles: ["spindle-001"],
      searchKeywords: ["onboarding", "customer", "process", "training", "setup"],
      readTime: 8,
      lastViewed: new Date("2024-01-20")
    },
    {
      id: "2",
      title: "Data Backup and Recovery",
      content: `# Data Backup and Recovery

## Overview
This SOP describes the procedures for backing up critical data and recovering from data loss incidents.

## Backup Procedures

### Daily Backups
- Automated backup at 2:00 AM
- Verify backup integrity
- Store in secure location

### Weekly Backups
- Full system backup
- Archive to off-site location
- Update recovery documentation

## Recovery Procedures

### Data Loss Assessment
- Identify affected systems
- Determine data loss scope
- Assess business impact

### Recovery Execution
- Restore from latest backup
- Verify data integrity
- Update affected users

## Testing
- Monthly recovery drills
- Document lessons learned
- Update procedures as needed`,
      summary: "Procedures for backing up critical data and recovering from data loss incidents, including daily and weekly backup schedules and recovery protocols.",
      tags: ["backup", "recovery", "data", "security"],
      category: "IT Operations",
      version: "2.1",
      status: "published",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-18"),
      author: "Sarah Johnson",
      linkedFunctionModels: ["func-003"],
      linkedEventStorms: ["event-002"],
      linkedSpindles: [],
      searchKeywords: ["backup", "recovery", "data", "security", "disaster"],
      readTime: 5,
      lastViewed: new Date("2024-01-19")
    },
    {
      id: "3",
      title: "Quality Assurance Testing",
      content: `# Quality Assurance Testing

## Overview
Standard procedures for conducting quality assurance testing on new features and system updates.

## Test Planning
- Define test objectives
- Identify test scenarios
- Prepare test data

## Test Execution
- Execute test cases
- Document results
- Report defects

## Test Completion
- Review test coverage
- Validate fixes
- Sign off on release`,
      summary: "Standard procedures for conducting quality assurance testing on new features and system updates, including test planning, execution, and completion.",
      tags: ["testing", "quality", "assurance", "qa"],
      category: "Development",
      version: "1.2",
      status: "draft",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-20"),
      author: "Mike Chen",
      linkedFunctionModels: ["func-004"],
      linkedEventStorms: ["event-003"],
      linkedSpindles: ["spindle-002"],
      searchKeywords: ["testing", "quality", "assurance", "qa", "test"],
      readTime: 3,
      lastViewed: undefined
    }
  ]

  // Apply filters
  let filteredSOPs = mockSOPs

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filteredSOPs = filteredSOPs.filter(sop => 
      sop.title.toLowerCase().includes(searchLower) ||
      sop.content.toLowerCase().includes(searchLower) ||
      sop.tags.some(tag => tag.toLowerCase().includes(searchLower))
    )
  }

  if (filters.category) {
    filteredSOPs = filteredSOPs.filter(sop => sop.category === filters.category)
  }

  if (filters.status) {
    filteredSOPs = filteredSOPs.filter(sop => sop.status === filters.status)
  }

  if (filters.tags.length > 0) {
    filteredSOPs = filteredSOPs.filter(sop => 
      filters.tags.some(tag => sop.tags.includes(tag))
    )
  }

  return filteredSOPs
} 
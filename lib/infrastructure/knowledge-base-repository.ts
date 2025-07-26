import type { SOP, KnowledgeBaseFilters, CreateSOPRequest, UpdateSOPRequest } from "../domain/entities/knowledge-base-types"

export const getKnowledgeBaseData = (filters: KnowledgeBaseFilters): SOP[] => {
  // Data access logic for retrieving SOPs
  // Following the pattern of contact-service.ts
  // Mock data or actual data retrieval
  
  const mockSOPs: SOP[] = [
    {
      id: "1",
      title: "Customer Onboarding Process",
      content: "# Customer Onboarding Process\n\n## Overview\nThis document outlines the standard operating procedure for onboarding new customers to our platform.",
      summary: "Standard operating procedure for onboarding new customers to our platform.",
      tags: ["onboarding", "customer", "process"],
      category: "Customer Management",
      version: "1.0",
      status: "published",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
      author: "John Smith",
      linkedFunctionModels: ["func-001"],
      linkedEventStorms: ["event-001"],
      linkedSpindles: ["spindle-001"],
      searchKeywords: ["onboarding", "customer", "process"],
      readTime: 8,
      lastViewed: new Date("2024-01-20")
    },
    {
      id: "2",
      title: "Data Backup and Recovery",
      content: "# Data Backup and Recovery\n\n## Overview\nThis SOP describes the procedures for backing up critical data.",
      summary: "Procedures for backing up critical data and recovering from data loss incidents.",
      tags: ["backup", "recovery", "data"],
      category: "IT Operations",
      version: "2.1",
      status: "published",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-18"),
      author: "Sarah Johnson",
      linkedFunctionModels: ["func-003"],
      linkedEventStorms: ["event-002"],
      linkedSpindles: [],
      searchKeywords: ["backup", "recovery", "data"],
      readTime: 5,
      lastViewed: new Date("2024-01-19")
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

export const getSOPById = (id: string): SOP | null => {
  // Data access logic for retrieving single SOP
  // Related entities fetching
  // Caching strategies
  
  const mockSOPs = getKnowledgeBaseData({ search: "", category: "", status: "", tags: [] })
  return mockSOPs.find(sop => sop.id === id) || null
}

export const createSOP = (sop: CreateSOPRequest): SOP => {
  // Data access logic for creating SOPs
  // Validation and data sanitization
  // Following existing service patterns
  
  const newSOP: SOP = {
    id: `sop-${Date.now()}`,
    title: sop.title,
    content: sop.content,
    summary: sop.summary,
    tags: sop.tags,
    category: sop.category,
    version: "1.0",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    author: sop.author,
    linkedFunctionModels: sop.linkedFunctionModels || [],
    linkedEventStorms: sop.linkedEventStorms || [],
    linkedSpindles: sop.linkedSpindles || [],
    searchKeywords: [],
    readTime: Math.ceil(sop.content.split(/\s+/).length / 200)
  }

  // In a real implementation, this would save to the database
  return newSOP
}

export const updateSOP = (id: string, updates: UpdateSOPRequest): SOP => {
  // Data access logic for updating SOPs
  // Version control implementation
  // Audit trail management
  
  const existingSOP = getSOPById(id)
  if (!existingSOP) {
    throw new Error(`SOP with ID ${id} not found`)
  }

  const updatedSOP: SOP = {
    ...existingSOP,
    ...updates,
    updatedAt: new Date(),
    version: incrementVersion(existingSOP.version)
  }

  // In a real implementation, this would save to the database
  return updatedSOP
}

export const deleteSOP = (id: string): void => {
  // Data access logic for deleting SOPs
  // Soft delete implementation
  // Dependency cleanup
  
  const existingSOP = getSOPById(id)
  if (!existingSOP) {
    throw new Error(`SOP with ID ${id} not found`)
  }

  // In a real implementation, this would perform the deletion
  console.log(`SOP ${id} deleted`)
}

function incrementVersion(currentVersion: string): string {
  const [major, minor] = currentVersion.split('.').map(Number)
  return `${major}.${minor + 1}`
} 
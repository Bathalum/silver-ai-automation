// Core business entities following Clean Architecture principles
export interface SOP {
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

export interface LinkedEntity {
  id: string
  title: string
  type: "function-model" | "event-storm" | "spindle"
  description?: string
}

export interface KnowledgeBaseFilters {
  search: string
  category: string
  status: string
  tags: string[]
}

export interface TableOfContents {
  id: string
  title: string
  level: number
}

// Business value objects
export interface SOPMetadata {
  version: string
  author: string
  lastModified: Date
  readCount: number
}

export interface SearchResult {
  sop: SOP
  relevanceScore: number
  matchedTerms: string[]
}

export interface CreateSOPRequest {
  title: string
  content: string
  summary: string
  tags: string[]
  category: string
  author: string
  linkedFunctionModels?: string[]
  linkedEventStorms?: string[]
  linkedSpindles?: string[]
}

export interface UpdateSOPRequest {
  title?: string
  content?: string
  summary?: string
  tags?: string[]
  category?: string
  status?: "draft" | "published" | "archived"
  linkedFunctionModels?: string[]
  linkedEventStorms?: string[]
  linkedSpindles?: string[]
}

export interface ProcessedContent {
  content: string
  tableOfContents: TableOfContents[]
  wordCount: number
  readTime: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
} 
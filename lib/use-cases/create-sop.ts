import type { SOP, CreateSOPRequest } from "../domain/entities/knowledge-base-types"
import { validateCreateSOPRequest } from "../domain/rules/knowledge-base-validation"

export const createSOP = (sopData: CreateSOPRequest): SOP => {
  // Application logic for SOP creation
  // Business rule validation
  // Following existing use case patterns
  
  // Validate the request
  const validation = validateCreateSOPRequest(sopData)
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  // Generate new SOP with required fields
  const newSOP: SOP = {
    id: generateId(),
    title: sopData.title,
    content: sopData.content,
    summary: sopData.summary,
    tags: sopData.tags,
    category: sopData.category,
    version: "1.0",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    author: sopData.author,
    linkedFunctionModels: sopData.linkedFunctionModels || [],
    linkedEventStorms: sopData.linkedEventStorms || [],
    linkedSpindles: sopData.linkedSpindles || [],
    searchKeywords: generateSearchKeywords(sopData.title, sopData.content, sopData.tags),
    readTime: calculateReadTime(sopData.content)
  }

  // In a real implementation, this would save to the database
  // For now, we'll just return the created SOP
  return newSOP
}

function generateId(): string {
  return `sop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateSearchKeywords(title: string, content: string, tags: string[]): string[] {
  const keywords = new Set<string>()
  
  // Add title words
  title.toLowerCase().split(/\s+/).forEach(word => {
    if (word.length > 2) keywords.add(word)
  })
  
  // Add content words (first 100 words)
  content.toLowerCase().split(/\s+/).slice(0, 100).forEach(word => {
    if (word.length > 3) keywords.add(word)
  })
  
  // Add tags
  tags.forEach(tag => keywords.add(tag.toLowerCase()))
  
  return Array.from(keywords)
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
} 
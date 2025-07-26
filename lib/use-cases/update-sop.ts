import type { SOP, UpdateSOPRequest } from "../domain/entities/knowledge-base-types"
import { validateUpdateSOPRequest } from "../domain/rules/knowledge-base-validation"

export const updateSOP = (id: string, updates: UpdateSOPRequest): SOP => {
  // Application logic for SOP updates
  // Version control and change tracking
  // Business rule validation
  
  // Validate the updates
  const validation = validateUpdateSOPRequest(updates)
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  // In a real implementation, this would fetch the existing SOP from the database
  // For now, we'll create a mock updated SOP
  const existingSOP: SOP = {
    id,
    title: "Existing SOP Title",
    content: "Existing content",
    summary: "Existing summary",
    tags: ["existing", "tags"],
    category: "Existing Category",
    version: "1.0",
    status: "draft",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    author: "Existing Author",
    linkedFunctionModels: [],
    linkedEventStorms: [],
    linkedSpindles: [],
    searchKeywords: ["existing", "keywords"],
    readTime: 5
  }

  // Apply updates
  const updatedSOP: SOP = {
    ...existingSOP,
    ...updates,
    updatedAt: new Date(),
    version: incrementVersion(existingSOP.version),
    searchKeywords: updates.title || updates.content || updates.tags 
      ? generateSearchKeywords(
          updates.title || existingSOP.title,
          updates.content || existingSOP.content,
          updates.tags || existingSOP.tags
        )
      : existingSOP.searchKeywords,
    readTime: updates.content 
      ? calculateReadTime(updates.content)
      : existingSOP.readTime
  }

  // In a real implementation, this would save to the database
  // For now, we'll just return the updated SOP
  return updatedSOP
}

function incrementVersion(currentVersion: string): string {
  const [major, minor] = currentVersion.split('.').map(Number)
  return `${major}.${minor + 1}`
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
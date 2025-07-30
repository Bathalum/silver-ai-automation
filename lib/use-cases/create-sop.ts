import type { SOP, CreateSOPRequest } from "../domain/entities/knowledge-base-types"
import { validateCreateSOPRequest } from "../domain/rules/knowledge-base-validation"
import { createKnowledgeBaseNode } from "../domain/entities/unified-node-types"
import { SupabaseNodeRepository } from "../infrastructure/unified-node-repository"
import type { BaseNode } from "../domain/entities/unified-node-types"

const nodeRepository = new SupabaseNodeRepository()

export const createSOP = async (sopData: CreateSOPRequest): Promise<BaseNode> => {
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

  // Create unified node for the SOP
  const node = createKnowledgeBaseNode(
    'SOP',
    sopData.title,
    sopData.summary,
    { x: 0, y: 0 }, // Default position
    {
      sop: newSOP,
      content: sopData.content,
      category: sopData.category,
      status: 'draft'
    }
  )

  // Save to unified node system
  const createdNode = await nodeRepository.createNode(node)
  
  return createdNode
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
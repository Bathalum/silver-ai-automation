import type { SOP, UpdateSOPRequest } from "../domain/entities/knowledge-base-types"
import { validateUpdateSOPRequest } from "../domain/rules/knowledge-base-validation"
import { SupabaseNodeRepository } from "../infrastructure/unified-node-repository"
import { unifiedNodeToSOP } from "../domain/entities/unified-node-types"
import type { BaseNode } from "../domain/entities/unified-node-types"

const nodeRepository = new SupabaseNodeRepository()

export const updateSOP = async (id: string, updates: UpdateSOPRequest): Promise<BaseNode> => {
  // Validate the updates
  const validation = validateUpdateSOPRequest(updates)
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  // Get existing node
  const existingNode = await nodeRepository.getNode(id)
  if (!existingNode || existingNode.type !== 'knowledge-base') {
    throw new Error('SOP not found')
  }

  // Convert existing node to SOP
  const existingSOP = unifiedNodeToSOP(existingNode)

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

  // Update the node with new metadata
  const updatedNode = await nodeRepository.updateNode(id, {
    name: updatedSOP.title,
    description: updatedSOP.summary,
    metadata: {
      ...existingNode.metadata,
      knowledgeBase: {
        sop: updatedSOP,
        content: updatedSOP.content,
        category: updatedSOP.category,
        status: updatedSOP.status
      }
    }
  })

  return updatedNode
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
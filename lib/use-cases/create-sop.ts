import type { SOP, SOPCreateOptions } from "../domain/entities/knowledge-base-types"
import { KnowledgeBaseRepository } from "../infrastructure/repositories/knowledge-base-repository"

const knowledgeBaseRepository = new KnowledgeBaseRepository()

export const createSOP = async (options: SOPCreateOptions): Promise<SOP> => {
  try {
    // Validate required fields
    if (!options.title?.trim()) {
      throw new Error('SOP title is required')
    }
    
    if (!options.content?.trim()) {
      throw new Error('SOP content is required')
    }

    // Create SOP using knowledge base repository
    const sop = await knowledgeBaseRepository.createSOP(options)
    
    return sop
  } catch (error) {
    console.error('Error creating SOP:', error)
    throw new Error('Failed to create SOP')
  }
} 
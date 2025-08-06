import type { SOP, SOPUpdateOptions } from "../domain/entities/knowledge-base-types"
import { KnowledgeBaseRepository } from "../infrastructure/repositories/knowledge-base-repository"

const knowledgeBaseRepository = new KnowledgeBaseRepository()

export const updateSOP = async (sopId: string, updates: SOPUpdateOptions): Promise<SOP> => {
  try {
    // Update SOP using knowledge base repository
    const updatedSOP = await knowledgeBaseRepository.updateSOP(sopId, updates)
    
    return updatedSOP
  } catch (error) {
    console.error('Error updating SOP:', error)
    throw new Error('Failed to update SOP')
  }
} 
import { KnowledgeBaseRepository } from "../infrastructure/repositories/knowledge-base-repository"

const knowledgeBaseRepository = new KnowledgeBaseRepository()

export const deleteSOP = async (sopId: string): Promise<void> => {
  try {
    // Delete the SOP from the knowledge base system
    await knowledgeBaseRepository.deleteSOP(sopId)
  } catch (error) {
    console.error('Error deleting SOP:', error)
    throw new Error('Failed to delete SOP')
  }
} 
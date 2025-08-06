import { KnowledgeBaseRepository } from "../infrastructure/repositories/knowledge-base-repository"
import { SOP } from "../domain/entities/knowledge-base-types"

const knowledgeBaseRepository = new KnowledgeBaseRepository()

export const getSOPs = async (): Promise<SOP[]> => {
  try {
    const sops = await knowledgeBaseRepository.getAllSOPs()
    return sops
  } catch (error) {
    console.error("Error loading SOPs:", error)
    throw new Error("Failed to load SOPs")
  }
}

export const getSOPById = async (sopId: string): Promise<SOP | null> => {
  try {
    const sop = await knowledgeBaseRepository.getSOPById(sopId)
    return sop
  } catch (error) {
    console.error("Error loading SOP:", error)
    throw new Error("Failed to load SOP")
  }
} 
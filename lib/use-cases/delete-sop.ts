import { SupabaseNodeRepository } from "../infrastructure/unified-node-repository"

const nodeRepository = new SupabaseNodeRepository()

export const deleteSOP = async (id: string): Promise<void> => {
  // Get existing node to verify it's a knowledge base node
  const existingNode = await nodeRepository.getNode(id)
  if (!existingNode || existingNode.type !== 'knowledge-base') {
    throw new Error('SOP not found')
  }

  // Delete the node from the unified system
  // This will also delete any relationships and AI agents associated with the node
  await nodeRepository.deleteNode(id)
} 
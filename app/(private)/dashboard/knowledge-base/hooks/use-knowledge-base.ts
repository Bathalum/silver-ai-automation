import { useState, useEffect } from 'react'
import { KnowledgeBaseRepository } from '@/lib/infrastructure/repositories/knowledge-base-repository'
import { SOP, SOPCreateOptions, SOPUpdateOptions } from '@/lib/domain/entities/knowledge-base-types'

const knowledgeBaseRepository = new KnowledgeBaseRepository()

export function useKnowledgeBase() {
  const [sops, setSOPs] = useState<SOP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSOPs()
  }, [])

  const loadSOPs = async () => {
    try {
      setLoading(true)
      setError(null)
      const allSOPs = await knowledgeBaseRepository.getAllSOPs()
      setSOPs(allSOPs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOPs')
    } finally {
      setLoading(false)
    }
  }

  const createSOP = async (options: SOPCreateOptions): Promise<SOP> => {
    try {
      const newSOP = await knowledgeBaseRepository.createSOP(options)
      setSOPs(prev => [...prev, newSOP])
      return newSOP
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create SOP')
    }
  }

  const updateSOP = async (sopId: string, updates: SOPUpdateOptions): Promise<SOP> => {
    try {
      const updatedSOP = await knowledgeBaseRepository.updateSOP(sopId, updates)
      setSOPs(prev => prev.map(sop => sop.id === sopId ? updatedSOP : sop))
      return updatedSOP
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update SOP')
    }
  }

  const deleteSOP = async (sopId: string): Promise<void> => {
    try {
      await knowledgeBaseRepository.deleteSOP(sopId)
      setSOPs(prev => prev.filter(sop => sop.id !== sopId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete SOP')
    }
  }

  const getSOPById = async (sopId: string): Promise<SOP | null> => {
    try {
      return await knowledgeBaseRepository.getSOPById(sopId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get SOP')
    }
  }

  return {
    sops,
    loading,
    error,
    createSOP,
    updateSOP,
    deleteSOP,
    getSOPById,
    loadSOPs
  }
}

export function useSOPById(sopId: string) {
  const [sop, setSOP] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sopId) {
      loadSOP()
    }
  }, [sopId])

  const loadSOP = async () => {
    try {
      setLoading(true)
      setError(null)
      const sopData = await knowledgeBaseRepository.getSOPById(sopId)
      setSOP(sopData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOP')
    } finally {
      setLoading(false)
    }
  }

  return {
    sop,
    loading,
    error,
    loadSOP
  }
} 
import { useState, useEffect } from "react"
import { getSOPs, getSOPById } from "@/lib/use-cases/get-sops"
import type { SOP, KnowledgeBaseFilters } from "@/lib/domain/entities/knowledge-base-types"

export function useKnowledgeBase() {
  const [sops, setSOPs] = useState<SOP[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<KnowledgeBaseFilters>({
    search: "",
    category: "",
    status: "",
    tags: []
  })

  useEffect(() => {
    loadSOPs()
  }, [filters])

  const loadSOPs = async () => {
    setLoading(true)
    try {
      const filteredSOPs = await getSOPs(filters)
      setSOPs(filteredSOPs)
    } catch (error) {
      console.error("Error loading SOPs:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateFilters = (newFilters: Partial<KnowledgeBaseFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
      tags: []
    })
  }

  return {
    sops,
    loading,
    filters,
    updateFilters,
    clearFilters,
    loadSOPs
  }
}

export function useSOPById(id: string) {
  const [sop, setSOP] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSOP()
  }, [id])

  const loadSOP = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const foundSOP = await getSOPById(id)
      
      if (foundSOP) {
        setSOP(foundSOP)
      } else {
        setError("SOP not found")
      }
    } catch (err) {
      setError("Error loading SOP")
      console.error("Error loading SOP:", err)
    } finally {
      setLoading(false)
    }
  }

  return {
    sop,
    loading,
    error,
    reload: loadSOP
  }
} 
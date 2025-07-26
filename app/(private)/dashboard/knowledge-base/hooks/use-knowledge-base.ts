import { useState, useEffect } from "react"
import { getSOPs } from "@/lib/use-cases/get-sops"
import type { SOP, KnowledgeBaseFilters } from "@/lib/domain/entities/knowledge-base-types"

export function useKnowledgeBase() {
  // Feature-specific state management for SOPs, filters, loading
  // Integration with use cases for CRUD operations
  // Search and filtering logic
  // Mock data management with realistic content
  // Category and tag management
  // Status filtering (draft, published, archived)
  // URL parameter integration for shareable state
  // Following the pattern of use-event-storm.ts
  
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

  const loadSOPs = () => {
    setLoading(true)
    try {
      const filteredSOPs = getSOPs(filters)
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
  // Get specific SOP by ID using use cases
  // Related entities fetching (Function Models, Event Storms, Spindles)
  // Content parsing and formatting
  // Table of contents generation
  // Linked entities resolution
  // Error handling and loading states
  
  const [sop, setSOP] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSOP()
  }, [id])

  const loadSOP = () => {
    setLoading(true)
    setError(null)
    
    try {
      const allSOPs = getSOPs({ search: "", category: "", status: "", tags: [] })
      const foundSOP = allSOPs.find(s => s.id === id)
      
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
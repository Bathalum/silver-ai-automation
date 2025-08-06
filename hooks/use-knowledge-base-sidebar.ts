"use client"

import { useState, useEffect } from "react"
import { useKnowledgeBase } from "@/app/(private)/dashboard/knowledge-base/hooks/use-knowledge-base"
import { SOP } from "@/lib/domain/entities/knowledge-base-types"

export function useKnowledgeBaseSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSOPs, setFilteredSOPs] = useState<SOP[]>([])

  const { sops, loading, error } = useKnowledgeBase()

  useEffect(() => {
    if (sops && searchQuery) {
      const filtered = sops.filter(sop =>
        sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredSOPs(filtered)
    } else if (sops) {
      setFilteredSOPs(sops)
    }
  }, [sops, searchQuery])

  const openSidebar = () => setIsOpen(true)
  const closeSidebar = () => setIsOpen(false)
  const toggleSidebar = () => setIsOpen(!isOpen)

  const selectSOP = (sop: SOP) => {
    setSelectedSOP(sop)
    openSidebar()
  }

  const clearSelection = () => {
    setSelectedSOP(null)
    setSearchQuery("")
  }

  return {
    isOpen,
    selectedSOP,
    searchQuery,
    filteredSOPs,
    loading,
    error,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    selectSOP,
    clearSelection,
    setSearchQuery
  }
} 
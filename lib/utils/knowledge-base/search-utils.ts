import type { SOP, KnowledgeBaseFilters, SearchResult } from "../../domain/entities/knowledge-base-types"

export function searchSOPs(sops: SOP[], query: string): SearchResult[] {
  // Full-text search implementation
  // Relevance scoring
  // Fuzzy matching
  // Search result ranking
  
  if (!query.trim()) {
    return []
  }

  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
  const results: SearchResult[] = []

  for (const sop of sops) {
    const relevanceScore = calculateRelevanceScore(sop, searchTerms)
    
    if (relevanceScore > 0) {
      const matchedTerms = findMatchedTerms(sop, searchTerms)
      
      results.push({
        sop,
        relevanceScore,
        matchedTerms
      })
    }
  }

  // Sort by relevance score (highest first)
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

export function filterSOPs(sops: SOP[], filters: KnowledgeBaseFilters): SOP[] {
  // Advanced filtering logic
  // Category and tag filtering
  // Status filtering
  // Date range filtering
  
  let filteredSOPs = sops

  // Search filter
  if (filters.search) {
    const searchResults = searchSOPs(sops, filters.search)
    filteredSOPs = searchResults.map(result => result.sop)
  }

  // Category filter
  if (filters.category) {
    filteredSOPs = filteredSOPs.filter(sop => sop.category === filters.category)
  }

  // Status filter
  if (filters.status) {
    filteredSOPs = filteredSOPs.filter(sop => sop.status === filters.status)
  }

  // Tags filter
  if (filters.tags.length > 0) {
    filteredSOPs = filteredSOPs.filter(sop => 
      filters.tags.some(tag => sop.tags.includes(tag))
    )
  }

  return filteredSOPs
}

function calculateRelevanceScore(sop: SOP, searchTerms: string[]): number {
  let score = 0

  for (const term of searchTerms) {
    // Title matches (highest weight)
    if (sop.title.toLowerCase().includes(term)) {
      score += 10
    }

    // Summary matches (high weight)
    if (sop.summary.toLowerCase().includes(term)) {
      score += 8
    }

    // Content matches (medium weight)
    if (sop.content.toLowerCase().includes(term)) {
      score += 5
    }

    // Tag matches (high weight)
    if (sop.tags.some(tag => tag.toLowerCase().includes(term))) {
      score += 7
    }

    // Search keywords matches (medium weight)
    if (sop.searchKeywords.some(keyword => keyword.toLowerCase().includes(term))) {
      score += 6
    }
  }

  return score
}

function findMatchedTerms(sop: SOP, searchTerms: string[]): string[] {
  const matchedTerms: string[] = []

  for (const term of searchTerms) {
    if (sop.title.toLowerCase().includes(term) ||
        sop.summary.toLowerCase().includes(term) ||
        sop.content.toLowerCase().includes(term) ||
        sop.tags.some(tag => tag.toLowerCase().includes(term)) ||
        sop.searchKeywords.some(keyword => keyword.toLowerCase().includes(term))) {
      matchedTerms.push(term)
    }
  }

  return matchedTerms
} 
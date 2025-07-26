import type { TableOfContents } from "../domain/entities/knowledge-base-types"

export function generateTableOfContents(content: string): TableOfContents[] {
  // Parses markdown headers and generates navigation structure
  // Creates IDs for smooth scrolling navigation
  // Supports h1-h6 header levels
  
  const lines = content.split('\n')
  const toc: TableOfContents[] = []
  let idCounter = 1

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const title = headerMatch[2].trim()
      const id = generateId(title, idCounter++)
      
      toc.push({
        id,
        title,
        level
      })
    }
  }

  return toc
}

function generateId(title: string, counter: number): string {
  // Convert title to URL-friendly ID
  const baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
  
  // If baseId is empty or already exists, append counter
  return baseId || `section-${counter}`
} 
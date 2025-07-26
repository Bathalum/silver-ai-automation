import type { ProcessedContent } from "../../domain/entities/knowledge-base-types"

export function processSOPContent(content: string): ProcessedContent {
  // Markdown processing and sanitization
  // Header ID generation for navigation
  // Link processing and validation
  // Content optimization
  
  // Sanitize content
  const sanitizedContent = sanitizeMarkdown(content)
  
  // Calculate word count
  const wordCount = calculateWordCount(sanitizedContent)
  
  // Calculate read time (200 words per minute)
  const readTime = Math.ceil(wordCount / 200)
  
  // Generate table of contents
  const tableOfContents = generateTableOfContents(sanitizedContent)
  
  return {
    content: sanitizedContent,
    tableOfContents,
    wordCount,
    readTime
  }
}

function sanitizeMarkdown(content: string): string {
  // Basic markdown sanitization
  // Remove potentially dangerous HTML
  // Clean up formatting
  
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

function calculateWordCount(content: string): number {
  // Count words in content
  return content.split(/\s+/).filter(word => word.length > 0).length
}

function generateTableOfContents(content: string): any[] {
  // Import the table of contents generator
  const { generateTableOfContents } = require('../table-of-contents')
  return generateTableOfContents(content)
} 
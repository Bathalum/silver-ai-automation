// Pagination Service for Application Layer
// This file implements pagination support for performance optimization

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface PaginationMetadata {
  total: number
  page: number
  limit: number
}

export class PaginationService {
  static createPaginationOptions(
    page: number = 1,
    limit: number = 20,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): PaginationOptions {
    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)), // Cap at 100 items per page
      sortBy,
      sortOrder
    }
  }

  static createPaginationResult<T>(
    data: T[],
    metadata: PaginationMetadata
  ): PaginationResult<T> {
    const totalPages = Math.ceil(metadata.total / metadata.limit)
    
    return {
      data,
      pagination: {
        page: metadata.page,
        limit: metadata.limit,
        total: metadata.total,
        totalPages,
        hasNext: metadata.page < totalPages,
        hasPrevious: metadata.page > 1
      }
    }
  }

  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit
  }

  static validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    return {
      page: Math.max(1, options.page),
      limit: Math.min(100, Math.max(1, options.limit)),
      sortBy: options.sortBy,
      sortOrder: options.sortOrder === 'desc' ? 'desc' : 'asc'
    }
  }

  // Helper method to slice array data for pagination
  static paginateArray<T>(
    data: T[],
    options: PaginationOptions
  ): PaginationResult<T> {
    const validatedOptions = this.validatePaginationOptions(options)
    const offset = this.calculateOffset(validatedOptions.page, validatedOptions.limit)
    
    // Sort data if sortBy is provided
    let sortedData = [...data]
    if (validatedOptions.sortBy) {
      sortedData.sort((a, b) => {
        const aValue = (a as any)[validatedOptions.sortBy!]
        const bValue = (b as any)[validatedOptions.sortBy!]
        
        if (validatedOptions.sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        }
      })
    }
    
    const paginatedData = sortedData.slice(offset, offset + validatedOptions.limit)
    
    return this.createPaginationResult(paginatedData, {
      total: data.length,
      page: validatedOptions.page,
      limit: validatedOptions.limit
    })
  }

  // Helper method to create database query parameters
  static createQueryParams(options: PaginationOptions): {
    offset: number
    limit: number
    sortBy?: string
    sortOrder?: string
  } {
    const validatedOptions = this.validatePaginationOptions(options)
    
    return {
      offset: this.calculateOffset(validatedOptions.page, validatedOptions.limit),
      limit: validatedOptions.limit,
      sortBy: validatedOptions.sortBy,
      sortOrder: validatedOptions.sortOrder
    }
  }
} 
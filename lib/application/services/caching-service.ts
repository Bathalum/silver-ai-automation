// Caching Service for Application Layer
// This file implements caching strategy for performance optimization

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items in cache
}

export interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
}

export class CachingService {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly defaultMaxSize = 1000

  constructor(private readonly options: CacheOptions = {}) {
    this.options.ttl = options.ttl || this.defaultTTL
    this.options.maxSize = options.maxSize || this.defaultMaxSize
    
    // Clean up expired items periodically
    setInterval(() => this.cleanup(), 60000) // Clean up every minute
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.options.maxSize!) {
      this.evictOldest()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl!
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  // Cache key generators for different use cases
  static generateNodeKey(nodeType: string, nodeId: string): string {
    return `node:${nodeType}:${nodeId}`
  }

  static generateModelKey(modelId: string): string {
    return `model:${modelId}`
  }

  static generateNodesListKey(modelId: string, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(filters) : 'all'
    return `nodes:list:${modelId}:${filterString}`
  }

  static generateLinksKey(nodeType: string, nodeId?: string): string {
    return nodeId ? `links:${nodeType}:${nodeId}` : `links:${nodeType}:all`
  }

  static generateSearchKey(query: string, modelId: string): string {
    return `search:${modelId}:${query}`
  }
} 
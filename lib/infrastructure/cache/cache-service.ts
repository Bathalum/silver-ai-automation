import { Result } from '../../domain/shared/result';

/**
 * Interface for cache operations
 */
export interface ICacheService {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<Result<T | null>>;

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<Result<void>>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<Result<void>>;

  /**
   * Check if key exists in cache
   */
  exists(key: string): Promise<Result<boolean>>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<Result<void>>;

  /**
   * Get multiple values from cache
   */
  getMany<T>(keys: string[]): Promise<Result<Map<string, T | null>>>;

  /**
   * Set multiple values in cache
   */
  setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<Result<void>>;

  /**
   * Delete multiple keys from cache
   */
  deleteMany(keys: string[]): Promise<Result<void>>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<Result<CacheStats>>;
}

export interface CacheStats {
  /** Total number of cache entries */
  totalKeys: number;
  
  /** Cache hit count */
  hits: number;
  
  /** Cache miss count */
  misses: number;
  
  /** Cache hit rate */
  hitRate: number;
  
  /** Memory usage in bytes */
  memoryUsage?: number;
  
  /** Cache provider info */
  provider: string;
}

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtl: number;
  
  /** Maximum number of cache entries */
  maxEntries?: number;
  
  /** Cache key prefix */
  keyPrefix?: string;
  
  /** Serialization format */
  serializationFormat: 'json' | 'msgpack';
  
  /** Compression enabled */
  compressionEnabled: boolean;
  
  /** Provider-specific options */
  providerOptions?: Record<string, any>;
}

/**
 * In-memory cache service implementation
 */
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(
    private readonly config: CacheConfig
  ) {
    // Start cleanup interval for expired entries
    setInterval(() => this.cleanupExpired(), 60000); // Every minute
  }

  async get<T>(key: string): Promise<Result<T | null>> {
    try {
      const fullKey = this.buildKey(key);
      const entry = this.cache.get(fullKey);
      
      if (!entry) {
        this.stats.misses++;
        return Result.ok(null);
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.cache.delete(fullKey);
        this.stats.misses++;
        return Result.ok(null);
      }

      this.stats.hits++;
      return Result.ok(this.deserialize<T>(entry.value));
    } catch (error) {
      return Result.fail(
        `Cache get failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<Result<void>> {
    try {
      const fullKey = this.buildKey(key);
      const ttl = ttlSeconds || this.config.defaultTtl;
      
      const entry: CacheEntry = {
        value: this.serialize(value),
        createdAt: Date.now(),
        expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : undefined
      };

      // Check if we need to evict entries
      if (this.config.maxEntries && this.cache.size >= this.config.maxEntries) {
        await this.evictOldest();
      }

      this.cache.set(fullKey, entry);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Cache set failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async delete(key: string): Promise<Result<void>> {
    try {
      const fullKey = this.buildKey(key);
      this.cache.delete(fullKey);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Cache delete failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async exists(key: string): Promise<Result<boolean>> {
    try {
      const fullKey = this.buildKey(key);
      const entry = this.cache.get(fullKey);
      
      if (!entry) {
        return Result.ok(false);
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.cache.delete(fullKey);
        return Result.ok(false);
      }

      return Result.ok(true);
    } catch (error) {
      return Result.fail(
        `Cache exists check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      this.cache.clear();
      this.stats.hits = 0;
      this.stats.misses = 0;
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Cache clear failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getMany<T>(keys: string[]): Promise<Result<Map<string, T | null>>> {
    try {
      const result = new Map<string, T | null>();
      
      for (const key of keys) {
        const valueResult = await this.get<T>(key);
        if (valueResult.isSuccess) {
          result.set(key, valueResult.value);
        } else {
          result.set(key, null);
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        `Cache getMany failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<Result<void>> {
    try {
      for (const [key, value] of entries) {
        const setResult = await this.set(key, value, ttlSeconds);
        if (setResult.isFailure) {
          return setResult;
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Cache setMany failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteMany(keys: string[]): Promise<Result<void>> {
    try {
      for (const key of keys) {
        await this.delete(key);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Cache deleteMany failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getStats(): Promise<Result<CacheStats>> {
    try {
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

      const stats: CacheStats = {
        totalKeys: this.cache.size,
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimal places
        memoryUsage: this.calculateMemoryUsage(),
        provider: 'memory'
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(
        `Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private buildKey(key: string): string {
    const prefix = this.config.keyPrefix || '';
    return `${prefix}${key}`;
  }

  private serialize<T>(value: T): string {
    if (this.config.serializationFormat === 'json') {
      return JSON.stringify(value);
    } else {
      // For msgpack, we'd need to add the msgpack library
      // For now, fall back to JSON
      return JSON.stringify(value);
    }
  }

  private deserialize<T>(value: string): T {
    if (this.config.serializationFormat === 'json') {
      return JSON.parse(value);
    } else {
      // For msgpack, we'd need to add the msgpack library
      // For now, fall back to JSON
      return JSON.parse(value);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  private async evictOldest(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += entry.value.length * 2;
      totalSize += 32; // Object overhead
    }

    return totalSize;
  }
}

interface CacheEntry {
  value: string;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Function Model specific cache service
 * Provides typed cache operations for function model entities
 */
export class FunctionModelCacheService {
  private readonly keyPatterns = {
    model: (id: string) => `function-model:${id}`,
    modelList: (userId: string, filter: string) => `function-model-list:${userId}:${filter}`,
    modelStats: (id: string) => `function-model-stats:${id}`,
    modelPermissions: (id: string, userId: string) => `function-model-permissions:${id}:${userId}`,
    queryResult: (queryId: string) => `query-result:${queryId}`
  };

  constructor(
    private readonly cacheService: ICacheService,
    private readonly config: {
      modelTtl: number;
      listTtl: number;
      statsTtl: number;
      permissionsTtl: number;
      queryTtl: number;
    }
  ) {}

  /**
   * Cache function model
   */
  async cacheModel(modelId: string, model: any): Promise<Result<void>> {
    const key = this.keyPatterns.model(modelId);
    return this.cacheService.set(key, model, this.config.modelTtl);
  }

  /**
   * Get cached function model
   */
  async getCachedModel(modelId: string): Promise<Result<any | null>> {
    const key = this.keyPatterns.model(modelId);
    return this.cacheService.get(key);
  }

  /**
   * Cache model list
   */
  async cacheModelList(userId: string, filter: string, models: any[]): Promise<Result<void>> {
    const key = this.keyPatterns.modelList(userId, filter);
    return this.cacheService.set(key, models, this.config.listTtl);
  }

  /**
   * Get cached model list
   */
  async getCachedModelList(userId: string, filter: string): Promise<Result<any[] | null>> {
    const key = this.keyPatterns.modelList(userId, filter);
    return this.cacheService.get(key);
  }

  /**
   * Cache model statistics
   */
  async cacheModelStats(modelId: string, stats: any): Promise<Result<void>> {
    const key = this.keyPatterns.modelStats(modelId);
    return this.cacheService.set(key, stats, this.config.statsTtl);
  }

  /**
   * Get cached model statistics
   */
  async getCachedModelStats(modelId: string): Promise<Result<any | null>> {
    const key = this.keyPatterns.modelStats(modelId);
    return this.cacheService.get(key);
  }

  /**
   * Cache model permissions
   */
  async cacheModelPermissions(modelId: string, userId: string, permissions: any): Promise<Result<void>> {
    const key = this.keyPatterns.modelPermissions(modelId, userId);
    return this.cacheService.set(key, permissions, this.config.permissionsTtl);
  }

  /**
   * Get cached model permissions
   */
  async getCachedModelPermissions(modelId: string, userId: string): Promise<Result<any | null>> {
    const key = this.keyPatterns.modelPermissions(modelId, userId);
    return this.cacheService.get(key);
  }

  /**
   * Cache query result
   */
  async cacheQueryResult(queryId: string, result: any): Promise<Result<void>> {
    const key = this.keyPatterns.queryResult(queryId);
    return this.cacheService.set(key, result, this.config.queryTtl);
  }

  /**
   * Get cached query result
   */
  async getCachedQueryResult(queryId: string): Promise<Result<any | null>> {
    const key = this.keyPatterns.queryResult(queryId);
    return this.cacheService.get(key);
  }

  /**
   * Invalidate model cache
   */
  async invalidateModel(modelId: string): Promise<Result<void>> {
    const keys = [
      this.keyPatterns.model(modelId),
      this.keyPatterns.modelStats(modelId)
    ];

    return this.cacheService.deleteMany(keys);
  }

  /**
   * Invalidate all cached data for a user
   */
  async invalidateUserCache(userId: string): Promise<Result<void>> {
    // This would require pattern-based deletion in a real cache implementation
    // For now, we can only clear specific known keys
    return Result.ok(undefined);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<Result<CacheStats>> {
    return this.cacheService.getStats();
  }
}
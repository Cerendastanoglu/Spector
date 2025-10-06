import type { IntelRequest, NormalizedResult } from './types.js';

interface CacheEntry {
  result: NormalizedResult;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  requestType: IntelRequest['type'];
  target: string;
  providers: string[];
}

/**
 * Short-lived cache for intelligence results
 * Respects provider ToS with TTL between 5-30 minutes
 */
export class Cache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTtl = 15 * 60 * 1000; // 15 minutes
  private readonly maxTtl = 30 * 60 * 1000; // 30 minutes
  private readonly minTtl = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from request
   */
  private generateKey(request: IntelRequest): string {
    const keyParts = [
      request.type,
      request.target,
      request.providers?.sort().join(',') || 'all',
      request.options?.country || 'global',
      request.options?.language || 'en'
    ];
    
    return keyParts.join(':');
  }

  /**
   * Get TTL based on request type
   */
  private getTtl(type: IntelRequest['type']): number {
    switch (type) {
      case 'competitor_analysis':
        return 25 * 60 * 1000; // Competitor data changes slowly - 25 min
      case 'keyword_research':
        return 20 * 60 * 1000; // Keyword data - 20 min
      case 'market_analysis':
        return 30 * 60 * 1000; // Market analysis - 30 min
      case 'pricing_intelligence':
        return 5 * 60 * 1000;  // Pricing changes fast - 5 min
      default:
        return this.defaultTtl;
    }
  }

  /**
   * Check if cached entry exists and is valid
   */
  has(request: IntelRequest): boolean {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cached result
   */
  get(request: IntelRequest): NormalizedResult | null {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access time for LRU behavior
    entry.lastAccessed = now;
    
    console.log(`📦 Cache hit for ${request.type}:${request.target}`);
    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(request: IntelRequest, result: NormalizedResult): void {
    const key = this.generateKey(request);
    const now = Date.now();
    const ttl = this.getTtl(request.type);
    
    const entry: CacheEntry = {
      result,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessed: now,
      requestType: request.type,
      target: request.target,
      providers: request.providers || []
    };
    
    this.cache.set(key, entry);
    
    console.log(`📦 Cached ${request.type}:${request.target} for ${ttl / 60000} minutes`);
  }

  /**
   * Invalidate cache for specific target
   */
  invalidate(target: string, type?: IntelRequest['type']): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.target === target && (!type || entry.requestType === type)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for ${target}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    entries: Array<{
      key: string;
      type: string;
      target: string;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      type: entry.requestType,
      target: entry.target,
      age: now - entry.createdAt,
      ttl: entry.expiresAt - now
    }));
    
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache size in bytes (approximation)
   */
  getSize(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough size calculation
      size += key.length * 2; // UTF-16 string
      size += JSON.stringify(entry).length * 2;
    }
    
    return size;
  }

  /**
   * Remove least recently used entries if cache is too large
   */
  private evictLru(maxSize = 100): void {
    if (this.cache.size <= maxSize) return;
    
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = entries.slice(0, this.cache.size - maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
    
    console.log(`♻️ Evicted ${toRemove.length} LRU cache entries`);
  }

  /**
   * Prefetch data for common queries
   */
  async prefetch(targets: string[], type: IntelRequest['type']): Promise<void> {
    console.log(`🔮 Prefetching ${type} data for ${targets.length} targets`);
    // TODO: Implement prefetching logic
    // This would make background requests to warm the cache
  }
}

// Export singleton instance
export const cache = new Cache();
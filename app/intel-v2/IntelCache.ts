import type { IntelRequest, CacheConfig } from './types.js';
import { logger } from '~/utils/logger';

interface CacheEntry {
  value: any;
  expiresAt: number;
  lastAccessed: number;
  ttlSeconds: number;
  staleWhileRevalidate: boolean;
}

/**
 * Intelligence caching system with stale-while-revalidate support
 */
export class IntelCache {
  private cache = new Map<string, CacheEntry>();
  private revalidationPromises = new Map<string, Promise<any>>();

  /**
   * Get cached value with stale-while-revalidate support
   */
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    entry.lastAccessed = now;
    
    // Still fresh
    if (now < entry.expiresAt) {
      return entry.value;
    }
    
    // Expired - check if we should return stale
    if (entry.staleWhileRevalidate) {
      // Return stale data immediately, revalidation handled elsewhere
      return entry.value;
    }
    
    // Hard expired - remove and return null
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache entry with TTL
   */
  set(key: string, value: any, ttlSeconds: number, config?: Partial<CacheConfig>): void {
    const now = Date.now();
    
    if (config?.noStore) {
      // Don't cache if no-store is enabled
      return;
    }
    
    const entry: CacheEntry = {
      value,
      expiresAt: now + (ttlSeconds * 1000),
      lastAccessed: now,
      ttlSeconds,
      staleWhileRevalidate: config?.staleWhileRevalidate ?? false
    };
    
    this.cache.set(key, entry);
    
    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance
      this.cleanup();
    }
  }

  /**
   * Delete cache entry
   */
  del(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if entry exists and is fresh
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return Date.now() < entry.expiresAt;
  }

  /**
   * Check if entry is stale but available for stale-while-revalidate
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    return now >= entry.expiresAt && entry.staleWhileRevalidate;
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(
    shopId: string, 
    capability: string, 
    queryHash: string, 
    timeRange?: { from?: string; to?: string }, 
    market?: string
  ): string {
    const parts = [
      `shop:${shopId}`,
      `cap:${capability}`,
      `query:${queryHash}`,
      market ? `market:${market}` : null,
      timeRange?.from ? `from:${timeRange.from}` : null,
      timeRange?.to ? `to:${timeRange.to}` : null
    ].filter(Boolean);
    
    return parts.join('|');
  }

  /**
   * Generate query hash from IntelRequest
   */
  hashQuery(request: IntelRequest): string {
    const normalized = {
      query: request.query.toLowerCase().trim(),
      domain: request.domain?.toLowerCase(),
      locale: request.locale,
      market: request.market,
      productIdentifiers: request.productIdentifiers?.sort(),
      maxResults: request.maxResults
    };
    
    return this.simpleHash(JSON.stringify(normalized));
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Remove entries that are expired and not using stale-while-revalidate
      if (now > entry.expiresAt && !entry.staleWhileRevalidate) {
        this.cache.delete(key);
        cleaned++;
      }
      
      // Remove very old stale entries (older than 1 hour)
      if (now > entry.expiresAt + 3600000) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries for a shop
   */
  clearShop(shopId: string): number {
    let cleared = 0;
    const shopPrefix = `shop:${shopId}|`;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(shopPrefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    logger.info(`🗑️ Cleared ${cleared} cache entries for shop: ${shopId}`);
    return cleared;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🗑️ Cleared entire cache: ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    freshEntries: number;
    staleEntries: number;
    expiredEntries: number;
    memoryUsage: number; // approximate bytes
  } {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    let expired = 0;
    let memoryUsage = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Estimate memory usage
      memoryUsage += key.length * 2; // UTF-16 chars
      memoryUsage += JSON.stringify(entry.value).length * 2;
      
      if (now < entry.expiresAt) {
        fresh++;
      } else if (entry.staleWhileRevalidate) {
        stale++;
      } else {
        expired++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      freshEntries: fresh,
      staleEntries: stale,
      expiredEntries: expired,
      memoryUsage
    };
  }

  /**
   * Mark key for background revalidation
   */
  markForRevalidation(key: string, revalidateFunc: () => Promise<any>): void {
    // Avoid duplicate revalidation
    if (this.revalidationPromises.has(key)) {
      return;
    }
    
    const promise = revalidateFunc()
      .then(newValue => {
        const entry = this.cache.get(key);
        if (entry) {
          // Update with fresh data
          entry.value = newValue;
          entry.expiresAt = Date.now() + (entry.ttlSeconds * 1000);
        }
      })
      .catch(error => {
        logger.warn(`Background revalidation failed for ${key}:`, error);
      })
      .finally(() => {
        this.revalidationPromises.delete(key);
      });
    
    this.revalidationPromises.set(key, promise);
  }

  /**
   * Get cache entries for debugging
   */
  debug(): Array<{ key: string; size: number; fresh: boolean; stale: boolean }> {
    const now = Date.now();
    const entries: Array<{ key: string; size: number; fresh: boolean; stale: boolean }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        size: JSON.stringify(entry.value).length,
        fresh: now < entry.expiresAt,
        stale: now >= entry.expiresAt && entry.staleWhileRevalidate
      });
    }
    
    return entries.sort((a, b) => b.size - a.size);
  }
}

// Export singleton instance
export const intelCache = new IntelCache();
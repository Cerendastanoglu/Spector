/**
 * Redis Client for Distributed State Management
 * Uses Upstash Redis REST API (perfect for serverless/Cloud Run)
 */

import { Redis } from '@upstash/redis';

// Singleton Redis client
let redis: Redis | null = null;

/**
 * Get the Redis client instance
 * Returns null if Redis is not configured (graceful degradation)
 */
export function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL or TOKEN not configured - falling back to in-memory');
    return null;
  }
  
  try {
    redis = new Redis({
      url,
      token,
      // Retry configuration for reliability
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(retryCount * 100, 1000),
      },
    });
    
    console.log('[Redis] Upstash Redis client initialized');
    return redis;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return null;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Rate limiting using Redis with sliding window
 * Falls back to in-memory if Redis is unavailable
 */
export async function redisRateLimit(
  identifier: string,
  config: { windowMs: number; maxRequests: number }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const client = getRedisClient();
  
  if (!client) {
    // Fall back to in-memory (imported separately to avoid circular deps)
    return inMemoryRateLimit(identifier, config);
  }
  
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  const windowStart = now - config.windowMs;
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = client.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request with timestamp as score
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    
    // Set TTL to clean up old keys
    pipeline.expire(key, Math.ceil(config.windowMs / 1000) + 1);
    
    const results = await pipeline.exec();
    
    // zcard result is at index 1
    const currentCount = (results[1] as number) || 0;
    const resetTime = now + config.windowMs;
    
    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }
    
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - currentCount - 1),
      resetTime,
    };
  } catch (error) {
    console.error('[Redis] Rate limit error, falling back to allow:', error);
    // On error, allow the request (fail-open for availability)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
}

// ============================================================================
// In-Memory Fallback (for local dev or Redis failure)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

function inMemoryRateLimit(
  identifier: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  // Cleanup expired entries occasionally
  if (Math.random() < 0.01) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (now > v.resetTime) inMemoryStore.delete(k);
    }
  }
  
  const entry = inMemoryStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    inMemoryStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================================================
// Utility Functions for Other Redis Use Cases
// ============================================================================

/**
 * Set a value with optional TTL (in seconds)
 */
export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    if (ttlSeconds) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('[Redis] Set error:', error);
    return false;
  }
}

/**
 * Get a value
 */
export async function redisGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    return await client.get(key);
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

/**
 * Delete a key
 */
export async function redisDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('[Redis] Del error:', error);
    return false;
  }
}

/**
 * Increment a counter (useful for analytics)
 */
export async function redisIncr(key: string, ttlSeconds?: number): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const result = await client.incr(key);
    if (ttlSeconds) {
      await client.expire(key, ttlSeconds);
    }
    return result;
  } catch (error) {
    console.error('[Redis] Incr error:', error);
    return null;
  }
}

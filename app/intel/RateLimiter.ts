/**
 * Rate Limiter
 * 
 * Implements per-provider rate limiting with sliding window algorithm
 * Respects provider ToS and API limits
 */

import type { RateLimiter as IRateLimiter, RateLimitState } from './types';
import { providerRegistry } from './ProviderRegistry';

export class RateLimiter implements IRateLimiter {
  private rateLimitStates = new Map<string, Map<string, RateLimitState>>();

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request can be made within rate limits
   */
  async checkLimit(providerId: string): Promise<boolean> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) return false;

    const now = Date.now();
    
    // Check minute, hour, and day limits
    const minuteLimit = await this.checkWindow(providerId, 'minute', provider.rateLimit.requestsPerMinute, now);
    const hourLimit = await this.checkWindow(providerId, 'hour', provider.rateLimit.requestsPerHour, now);
    const dayLimit = await this.checkWindow(providerId, 'day', provider.rateLimit.requestsPerDay, now);

    return minuteLimit && hourLimit && dayLimit;
  }

  /**
   * Record a successful request
   */
  async recordRequest(providerId: string): Promise<void> {
    const now = Date.now();
    
    await this.recordWindow(providerId, 'minute', now);
    await this.recordWindow(providerId, 'hour', now);
    await this.recordWindow(providerId, 'day', now);
  }

  /**
   * Get remaining requests for a provider
   */
  async getRemainingRequests(providerId: string): Promise<number> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) return 0;

    const now = Date.now();
    
    const minuteRemaining = await this.getRemainingInWindow(providerId, 'minute', provider.rateLimit.requestsPerMinute, now);
    const hourRemaining = await this.getRemainingInWindow(providerId, 'hour', provider.rateLimit.requestsPerHour, now);
    const dayRemaining = await this.getRemainingInWindow(providerId, 'day', provider.rateLimit.requestsPerDay, now);

    return Math.min(minuteRemaining, hourRemaining, dayRemaining);
  }

  /**
   * Get reset time for rate limit
   */
  async getResetTime(providerId: string): Promise<number> {
    const now = Date.now();
    const minuteWindow = this.getWindowKey('minute', now);
    const state = this.getProviderState(providerId, 'minute');
    
    if (state.has(minuteWindow)) {
      // Reset at next minute
      return Math.ceil(now / 60000) * 60000;
    }
    
    return now;
  }

  /**
   * Check if request fits within a specific time window
   */
  private async checkWindow(
    providerId: string, 
    windowType: 'minute' | 'hour' | 'day', 
    limit: number, 
    timestamp: number
  ): Promise<boolean> {
    const windowKey = this.getWindowKey(windowType, timestamp);
    const state = this.getProviderState(providerId, windowType);
    const currentCount = state.get(windowKey)?.requests || 0;
    
    return currentCount < limit;
  }

  /**
   * Record a request in a specific time window
   */
  private async recordWindow(
    providerId: string, 
    windowType: 'minute' | 'hour' | 'day', 
    timestamp: number
  ): Promise<void> {
    const windowKey = this.getWindowKey(windowType, timestamp);
    const state = this.getProviderState(providerId, windowType);
    
    const current = state.get(windowKey) || {
      requests: 0,
      resetTime: this.getResetTimeForWindow(windowType, timestamp),
      remaining: this.getLimit(providerId, windowType)
    };
    
    current.requests++;
    current.remaining = Math.max(0, current.remaining - 1);
    
    state.set(windowKey, current);
  }

  /**
   * Get remaining requests in a specific window
   */
  private async getRemainingInWindow(
    providerId: string, 
    windowType: 'minute' | 'hour' | 'day', 
    limit: number, 
    timestamp: number
  ): Promise<number> {
    const windowKey = this.getWindowKey(windowType, timestamp);
    const state = this.getProviderState(providerId, windowType);
    const currentCount = state.get(windowKey)?.requests || 0;
    
    return Math.max(0, limit - currentCount);
  }

  /**
   * Get provider state for a specific window type
   */
  private getProviderState(providerId: string, windowType: string): Map<string, RateLimitState> {
    const key = `${providerId}:${windowType}`;
    
    if (!this.rateLimitStates.has(key)) {
      this.rateLimitStates.set(key, new Map());
    }
    
    const state = this.rateLimitStates.get(key);
    if (!state) {
      throw new Error(`Rate limit state not found for key: ${key}`);
    }
    return state;
  }

  /**
   * Generate window key based on timestamp and type
   */
  private getWindowKey(windowType: 'minute' | 'hour' | 'day', timestamp: number): string {
    const date = new Date(timestamp);
    
    switch (windowType) {
      case 'minute':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      default:
        throw new Error(`Unknown window type: ${windowType}`);
    }
  }

  /**
   * Get reset time for a window type
   */
  private getResetTimeForWindow(windowType: 'minute' | 'hour' | 'day', timestamp: number): number {
    const date = new Date(timestamp);
    
    switch (windowType) {
      case 'minute':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                       date.getHours(), date.getMinutes() + 1).getTime();
      case 'hour':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                       date.getHours() + 1).getTime();
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
      default:
        throw new Error(`Unknown window type: ${windowType}`);
    }
  }

  /**
   * Get rate limit for provider and window type
   */
  private getLimit(providerId: string, windowType: 'minute' | 'hour' | 'day'): number {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) return 0;

    switch (windowType) {
      case 'minute':
        return provider.rateLimit.requestsPerMinute;
      case 'hour':
        return provider.rateLimit.requestsPerHour;
      case 'day':
        return provider.rateLimit.requestsPerDay;
      default:
        return 0;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours ago
    
    for (const [key, stateMap] of this.rateLimitStates.entries()) {
      for (const [windowKey, state] of stateMap.entries()) {
        if (state.resetTime < cutoff) {
          stateMap.delete(windowKey);
        }
      }
      
      // Remove empty state maps
      if (stateMap.size === 0) {
        this.rateLimitStates.delete(key);
      }
    }
    
    console.log(`🧹 Cleaned up rate limiter: ${this.rateLimitStates.size} active states`);
  }

  /**
   * Get current rate limit status for all providers
   */
  getStatus(): Record<string, { remaining: number; resetTime: number; requests: number }> {
    const status: Record<string, any> = {};
    
    for (const provider of Array.from(providerRegistry.getMetrics() as Map<string, any>).map(([id]) => id)) {
      const now = Date.now();
      const minuteWindow = this.getWindowKey('minute', now);
      const state = this.getProviderState(provider, 'minute');
      const currentState = state.get(minuteWindow);
      
      status[provider] = {
        remaining: currentState?.remaining || this.getLimit(provider, 'minute'),
        resetTime: currentState?.resetTime || this.getResetTimeForWindow('minute', now),
        requests: currentState?.requests || 0
      };
    }
    
    return status;
  }

  /**
   * Reset rate limits for a provider (for testing)
   */
  reset(providerId?: string): void {
    if (providerId) {
      for (const [key] of this.rateLimitStates.entries()) {
        if (key.startsWith(providerId)) {
          this.rateLimitStates.delete(key);
        }
      }
    } else {
      this.rateLimitStates.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();
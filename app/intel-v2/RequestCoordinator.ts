import type { ProviderError, RateLimitConfig } from './types.js';

interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number; // tokens per second
  lastRefill: number;
}

interface ProviderBudget {
  dailyLimit: number;
  dailySpent: number;
  lastReset: string; // date string YYYY-MM-DD
}

/**
 * Request coordinator with rate limiting, retries, and budget controls
 */
export class RequestCoordinator {
  private tokenBuckets = new Map<string, TokenBucket>();
  private budgets = new Map<string, ProviderBudget>();
  private rateLimits = new Map<string, RateLimitConfig>();

  constructor() {
    // Initialize default rate limits from environment
    this.initializeFromEnv();
  }

  /**
   * Initialize rate limits from environment variables
   */
  private initializeFromEnv(): void {
    // Default rate limits - can be overridden by env vars
    const defaults: Record<string, RateLimitConfig> = {
      ahrefs: {
        requestsPerMinute: 10,
        requestsPerHour: 500,
        requestsPerDay: 10000,
        budgetLimit: 100 // $100/day
      },
      semrush: {
        requestsPerMinute: 20,
        requestsPerHour: 1000,
        requestsPerDay: 20000,
        budgetLimit: 200
      },
      similarweb: {
        requestsPerMinute: 5,
        requestsPerHour: 200,
        requestsPerDay: 5000,
        budgetLimit: 50
      },
      serpapi: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        budgetLimit: 150
      },
      price2spy: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        budgetLimit: 75
      },
      trustpilot: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        budgetLimit: 25
      }
    };

    for (const [provider, config] of Object.entries(defaults)) {
      this.setProviderLimits(provider, config);
    }
  }

  /**
   * Set rate limits for a provider
   */
  setProviderLimits(providerId: string, limits: RateLimitConfig): void {
    this.rateLimits.set(providerId, limits);
    
    // Initialize token bucket for requests per minute
    this.tokenBuckets.set(providerId, {
      tokens: limits.requestsPerMinute,
      capacity: limits.requestsPerMinute,
      refillRate: limits.requestsPerMinute / 60, // per second
      lastRefill: Date.now()
    });

    console.log(`⚡ Set rate limits for ${providerId}: ${limits.requestsPerMinute}/min`);
  }

  /**
   * Check if request is allowed (rate limit + budget)
   */
  async canMakeRequest(providerId: string, estimatedCost = 0): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    // Check budget first
    if (!this.checkBudget(providerId, estimatedCost)) {
      return {
        allowed: false,
        reason: 'budget_exceeded'
      };
    }

    // Check rate limit
    const bucket = this.getTokenBucket(providerId);
    this.refillBucket(bucket);

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil(1 / bucket.refillRate); // seconds until next token
      return {
        allowed: false,
        reason: 'rate_limited',
        retryAfter
      };
    }

    return { allowed: true };
  }

  /**
   * Consume a token for rate limiting
   */
  consumeToken(providerId: string): boolean {
    const bucket = this.getTokenBucket(providerId);
    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Record spending for budget tracking
   */
  recordSpending(providerId: string, cost: number): void {
    const today = new Date().toISOString().split('T')[0];
    let budget = this.budgets.get(providerId);

    if (!budget || budget.lastReset !== today) {
      // Reset daily budget
      const limits = this.rateLimits.get(providerId);
      budget = {
        dailyLimit: limits?.budgetLimit || 100,
        dailySpent: 0,
        lastReset: today
      };
      this.budgets.set(providerId, budget);
    }

    budget.dailySpent += cost;
    
    if (budget.dailySpent > budget.dailyLimit) {
      console.warn(`💰 Budget exceeded for ${providerId}: $${budget.dailySpent}/$${budget.dailyLimit}`);
    }
  }

  /**
   * Execute request with retries and error handling
   */
  async executeRequest<T>(
    providerId: string,
    requestFunc: () => Promise<T>,
    estimatedCost = 0,
    maxRetries = 3
  ): Promise<T> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= maxRetries) {
      try {
        // Check if we can make the request
        const permission = await this.canMakeRequest(providerId, estimatedCost);
        if (!permission.allowed) {
          throw new Error(`Request denied: ${permission.reason}${
            permission.retryAfter ? ` (retry after ${permission.retryAfter}s)` : ''
          }`);
        }

        // Consume rate limit token
        if (!this.consumeToken(providerId)) {
          const bucket = this.getTokenBucket(providerId);
          const retryAfter = Math.ceil(1 / bucket.refillRate);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Execute the request
        const result = await requestFunc();
        
        // Record successful spending
        this.recordSpending(providerId, estimatedCost);
        
        return result;

      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if it's a retriable error
        if (!this.isRetriableError(error) || attempts > maxRetries) {
          throw this.createProviderError(providerId, lastError);
        }

        // Calculate backoff delay with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Max 30s
        const jitter = Math.random() * 1000; // 0-1s jitter
        const delay = baseDelay + jitter;

        console.warn(
          `🔄 Retry ${attempts}/${maxRetries} for ${providerId} after ${Math.round(delay)}ms:`,
          lastError.message
        );

        await this.sleep(delay);
      }
    }

    throw this.createProviderError(providerId, lastError || new Error('Max retries exceeded'));
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: any): boolean {
    if (error?.status) {
      // HTTP status codes that are retriable
      return [429, 500, 502, 503, 504].includes(error.status);
    }

    if (error?.code) {
      // Network errors that are retriable
      return ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code);
    }

    return false;
  }

  /**
   * Create structured provider error
   */
  private createProviderError(providerId: string, error: Error): ProviderError {
    const budget = this.budgets.get(providerId);
    const budgetExceeded = budget ? budget.dailySpent >= budget.dailyLimit : false;

    return {
      provider: providerId,
      code: error.message.includes('rate_limited') ? 'RATE_LIMITED' :
            error.message.includes('budget_exceeded') ? 'BUDGET_EXCEEDED' :
            'REQUEST_FAILED',
      message: error.message,
      retryAfter: error.message.includes('retry after') 
        ? parseInt(error.message.match(/\d+/)?.[0] || '60')
        : undefined,
      budgetExceeded
    };
  }

  /**
   * Get or create token bucket for provider
   */
  private getTokenBucket(providerId: string): TokenBucket {
    let bucket = this.tokenBuckets.get(providerId);
    
    if (!bucket) {
      const limits = this.rateLimits.get(providerId);
      bucket = {
        tokens: limits?.requestsPerMinute || 10,
        capacity: limits?.requestsPerMinute || 10,
        refillRate: (limits?.requestsPerMinute || 10) / 60,
        lastRefill: Date.now()
      };
      this.tokenBuckets.set(providerId, bucket);
    }
    
    return bucket;
  }

  /**
   * Refill token bucket based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * bucket.refillRate;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Check budget constraints
   */
  private checkBudget(providerId: string, estimatedCost: number): boolean {
    const today = new Date().toISOString().split('T')[0];
    let budget = this.budgets.get(providerId);

    if (!budget || budget.lastReset !== today) {
      // New day, reset budget
      const limits = this.rateLimits.get(providerId);
      budget = {
        dailyLimit: limits?.budgetLimit || 100,
        dailySpent: 0,
        lastReset: today
      };
      this.budgets.set(providerId, budget);
    }

    return (budget.dailySpent + estimatedCost) <= budget.dailyLimit;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get budget status for all providers
   */
  getBudgetStatus(): Record<string, {
    dailyLimit: number;
    dailySpent: number;
    remaining: number;
    utilizationPercent: number;
  }> {
    const status: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];

    for (const [providerId, limits] of this.rateLimits.entries()) {
      let budget = this.budgets.get(providerId);
      
      if (!budget || budget.lastReset !== today) {
        budget = {
          dailyLimit: limits.budgetLimit || 100,
          dailySpent: 0,
          lastReset: today
        };
      }

      status[providerId] = {
        dailyLimit: budget.dailyLimit,
        dailySpent: budget.dailySpent,
        remaining: Math.max(0, budget.dailyLimit - budget.dailySpent),
        utilizationPercent: Math.round((budget.dailySpent / budget.dailyLimit) * 100)
      };
    }

    return status;
  }

  /**
   * Get rate limit status for all providers
   */
  getRateLimitStatus(): Record<string, {
    availableTokens: number;
    capacity: number;
    refillRate: number;
    utilizationPercent: number;
  }> {
    const status: Record<string, any> = {};

    for (const [providerId] of this.rateLimits.entries()) {
      const bucket = this.getTokenBucket(providerId);
      this.refillBucket(bucket);

      status[providerId] = {
        availableTokens: Math.floor(bucket.tokens),
        capacity: bucket.capacity,
        refillRate: bucket.refillRate * 60, // per minute
        utilizationPercent: Math.round(((bucket.capacity - bucket.tokens) / bucket.capacity) * 100)
      };
    }

    return status;
  }

  /**
   * Reset all budgets (for testing)
   */
  resetBudgets(): void {
    this.budgets.clear();
    console.log('💰 Reset all provider budgets');
  }

  /**
   * Reset rate limits (for testing)
   */
  resetRateLimits(): void {
    for (const bucket of this.tokenBuckets.values()) {
      bucket.tokens = bucket.capacity;
      bucket.lastRefill = Date.now();
    }
    console.log('⚡ Reset all rate limit buckets');
  }
}

// Export singleton
export const requestCoordinator = new RequestCoordinator();
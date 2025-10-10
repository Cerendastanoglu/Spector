/**
 * Query Planner
 * 
 * Intelligent orchestration of provider queries based on request type,
 * provider capabilities, and optimal execution strategies
 */

import type { 
  IntelRequest, 
  ProviderConfig, 
  ProviderResponse,
  StreamChunk,
  NormalizedResult 
} from './types';
import { providerRegistry } from './ProviderRegistry.js';
import { resultNormalizer } from './ResultNormalizer.js';
import { rateLimiter } from './RateLimiter.js';
import { cache } from './Cache.js';

export interface QueryPlan {
  requestId: string;
  providers: ProviderConfig[];
  estimatedDuration: number;
  cacheStrategy: 'prefer_cache' | 'bypass_cache' | 'cache_only';
  parallelExecution: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class QueryPlanner {
  private activeRequests = new Map<string, AbortController>();

  /**
   * Create execution plan for an intelligence request
   */
  async createPlan(request: IntelRequest): Promise<QueryPlan> {
    const requestId = this.generateRequestId();
    
    // Get healthy providers for this request
    const availableProviders = providerRegistry.getHealthyProviders(request);
    
    // Filter providers based on rate limits
    const providers = await this.filterByRateLimit(availableProviders);
    
    // Estimate execution time
    const estimatedDuration = this.estimateDuration(providers, request);
    
    // Determine cache strategy
    const cacheStrategy = this.determineCacheStrategy(request);
    
    // Determine if parallel execution is beneficial
    const parallelExecution = providers.length > 1 && estimatedDuration > 2000;
    
    // Set priority based on request type and user context
    const priority = this.determinePriority(request);

    return {
      requestId,
      providers,
      estimatedDuration,
      cacheStrategy,
      parallelExecution,
      priority
    };
  }

  /**
   * Execute query plan with streaming results
   */
  async executePlan(
    plan: QueryPlan, 
    request: IntelRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<NormalizedResult> {
    const abortController = new AbortController();
    this.activeRequests.set(plan.requestId, abortController);

    try {
      // Check cache first if strategy allows
      if (plan.cacheStrategy !== 'bypass_cache') {
        const cached = await this.checkCache(request);
        if (cached) {
          onChunk({
            type: 'result',
            data: cached,
            progress: { completed: 1, total: 1, message: 'Returning cached results' }
          });
          return cached;
        }
      }

      // Send initial progress
      onChunk({
        type: 'progress',
        progress: { 
          completed: 0, 
          total: plan.providers.length,
          message: `Querying ${plan.providers.length} providers...`
        }
      });

      let results: ProviderResponse[];
      
      if (plan.parallelExecution) {
        results = await this.executeParallel(plan, request, onChunk, abortController.signal);
      } else {
        results = await this.executeSequential(plan, request, onChunk, abortController.signal);
      }

      // Normalize and combine results
      const normalizedResult = await resultNormalizer.normalize(results, request);

      // Cache the result if strategy allows
      if (plan.cacheStrategy !== 'cache_only') {
        await this.cacheResult(request, normalizedResult);
      }

      // Send completion
      onChunk({
        type: 'complete',
        data: normalizedResult,
        progress: { 
          completed: plan.providers.length, 
          total: plan.providers.length,
          message: 'Query complete'
        }
      });

      return normalizedResult;

    } catch (error) {
      onChunk({
        type: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'QUERY_EXECUTION_FAILED'
        }
      });
      throw error;
    } finally {
      this.activeRequests.delete(plan.requestId);
    }
  }

  /**
   * Cancel an active request
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Execute providers in parallel
   */
  private async executeParallel(
    plan: QueryPlan,
    request: IntelRequest,
    onChunk: (chunk: StreamChunk) => void,
    signal: AbortSignal
  ): Promise<ProviderResponse[]> {
    const promises = plan.providers.map(async (provider, index) => {
      try {
        const response = await this.queryProvider(provider, request, signal);
        
        onChunk({
          type: 'result',
          providerId: provider.id,
          data: response.data,
          progress: {
            completed: index + 1,
            total: plan.providers.length,
            message: `Received data from ${provider.name}`
          }
        });

        return response;
      } catch (error) {
        const errorResponse: ProviderResponse = {
          providerId: provider.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            requestId: plan.requestId,
            timestamp: Date.now(),
            duration: 0,
            cached: false
          }
        };

        onChunk({
          type: 'error',
          providerId: provider.id,
          error: {
            message: errorResponse.error || 'Unknown error',
            code: 'PROVIDER_ERROR',
            providerId: provider.id
          }
        });

        return errorResponse;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute providers sequentially
   */
  private async executeSequential(
    plan: QueryPlan,
    request: IntelRequest,
    onChunk: (chunk: StreamChunk) => void,
    signal: AbortSignal
  ): Promise<ProviderResponse[]> {
    const results: ProviderResponse[] = [];

    for (let i = 0; i < plan.providers.length; i++) {
      const provider = plan.providers[i];
      
      try {
        const response = await this.queryProvider(provider, request, signal);
        results.push(response);
        
        onChunk({
          type: 'result',
          providerId: provider.id,
          data: response.data,
          progress: {
            completed: i + 1,
            total: plan.providers.length,
            message: `Received data from ${provider.name}`
          }
        });
      } catch (error) {
        const errorResponse: ProviderResponse = {
          providerId: provider.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            requestId: plan.requestId,
            timestamp: Date.now(),
            duration: 0,
            cached: false
          }
        };
        
        results.push(errorResponse);
        
        onChunk({
          type: 'error',
          providerId: provider.id,
          error: {
            message: errorResponse.error || 'Unknown error',
            code: 'PROVIDER_ERROR',
            providerId: provider.id
          }
        });
      }
    }

    return results;
  }

  /**
   * Query a single provider with retry logic
   */
  private async queryProvider(
    provider: ProviderConfig,
    request: IntelRequest,
    signal: AbortSignal
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= provider.retryConfig.maxRetries; attempt++) {
      try {
        // Check if request was cancelled
        if (signal.aborted) {
          throw new Error('Request cancelled');
        }

        // Check rate limit
        const canProceed = await rateLimiter.checkLimit(provider.id);
        if (!canProceed) {
          providerRegistry.recordRateLimit(provider.id);
          throw new Error('Rate limit exceeded');
        }

        // Make the actual API call
        const response = await this.makeProviderRequest(provider, request, signal);
        
        // Record successful request
        await rateLimiter.recordRequest(provider.id);
        
        const duration = Date.now() - startTime;
        const providerResponse: ProviderResponse = {
          providerId: provider.id,
          success: true,
          data: response,
          metadata: {
            requestId: this.generateRequestId(),
            timestamp: Date.now(),
            duration,
            cached: false
          }
        };

        // Update provider metrics
        providerRegistry.updateMetrics(provider.id, providerResponse);

        return providerResponse;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < provider.retryConfig.maxRetries) {
          // Wait before retry with backoff
          const backoffTime = provider.retryConfig.exponential 
            ? provider.retryConfig.backoffMs * Math.pow(2, attempt)
            : provider.retryConfig.backoffMs;
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    const errorResponse: ProviderResponse = {
      providerId: provider.id,
      success: false,
      error: lastError?.message || 'Unknown error',
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: Date.now(),
        duration,
        cached: false
      }
    };

    providerRegistry.updateMetrics(provider.id, errorResponse);
    throw lastError;
  }

  /**
   * Make actual HTTP request to provider
   */
  private async makeProviderRequest(
    provider: ProviderConfig,
    request: IntelRequest,
    signal: AbortSignal
  ): Promise<any> {
    // This is where you would implement the actual API calls to each provider
    // For now, we'll simulate the request
    
    console.log(`🔍 Querying ${provider.name} for ${request.type} on ${request.target}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    // Check if cancelled during request
    if (signal.aborted) {
      throw new Error('Request cancelled');
    }
    
    // Simulate provider-specific responses
    return this.simulateProviderResponse(provider, request);
  }

  /**
   * Simulate provider responses for development
   */
  private simulateProviderResponse(provider: ProviderConfig, request: IntelRequest): any {
    const baseData = {
      provider: provider.name,
      target: request.target,
      timestamp: Date.now()
    };

    switch (provider.type[0]) {
      case 'seo':
        return {
          ...baseData,
          domainAuthority: Math.floor(Math.random() * 100),
          backlinks: Math.floor(Math.random() * 1000000),
          organicKeywords: Math.floor(Math.random() * 50000),
          topKeywords: Array.from({ length: 5 }, (_, i) => ({
            keyword: `keyword-${i + 1}`,
            position: Math.floor(Math.random() * 100) + 1,
            searchVolume: Math.floor(Math.random() * 10000),
            difficulty: Math.floor(Math.random() * 100)
          }))
        };

      case 'traffic':
        return {
          ...baseData,
          monthlyVisits: Math.floor(Math.random() * 10000000),
          bounceRate: Math.random() * 0.8,
          avgSessionDuration: Math.floor(Math.random() * 600),
          trafficSources: {
            direct: Math.random() * 0.4,
            search: Math.random() * 0.4,
            social: Math.random() * 0.2
          }
        };

      case 'pricing':
        return {
          ...baseData,
          products: Array.from({ length: 3 }, (_, i) => ({
            name: `Product ${i + 1}`,
            price: Math.floor(Math.random() * 1000),
            currency: 'USD',
            availability: Math.random() > 0.3
          }))
        };

      default:
        return baseData;
    }
  }

  /**
   * Helper methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async filterByRateLimit(providers: ProviderConfig[]): Promise<ProviderConfig[]> {
    const available: ProviderConfig[] = [];
    
    for (const provider of providers) {
      const canProceed = await rateLimiter.checkLimit(provider.id);
      if (canProceed) {
        available.push(provider);
      }
    }
    
    return available;
  }

  private estimateDuration(providers: ProviderConfig[], _request: IntelRequest): number {
    // Base estimation on provider count and historical metrics
    const avgResponseTime = providers.reduce((sum, provider) => {
      const metrics = providerRegistry.getMetrics(provider.id) as any;
      return sum + (metrics?.avgResponseTime || 1000);
    }, 0) / providers.length;

    return Math.ceil(avgResponseTime * providers.length / (providers.length > 1 ? 2 : 1));
  }

  private determineCacheStrategy(request: IntelRequest): 'prefer_cache' | 'bypass_cache' | 'cache_only' {
    // Real-time requests should bypass cache, others can use cache
    if (request.options?.realTime) {
      return 'bypass_cache';
    }
    
    if (request.options?.cacheOnly) {
      return 'cache_only';
    }
    
    return 'prefer_cache';
  }

  private determinePriority(request: IntelRequest): 'high' | 'medium' | 'low' {
    // Priority based on request type and context
    if (request.type === 'competitor_analysis') {
      return 'high';
    }
    
    if (request.providers.length > 3) {
      return 'medium';
    }
    
    return 'low';
  }

  private async checkCache(request: IntelRequest): Promise<NormalizedResult | null> {
    return cache.get(request);
  }

  private async cacheResult(request: IntelRequest, result: NormalizedResult): Promise<void> {
    cache.set(request, result);
  }

  private generateCacheKey(request: IntelRequest): string {
    const keyParts = [
      request.type,
      request.target,
      request.providers.sort().join(','),
      request.location || 'global',
      JSON.stringify(request.keywords?.sort() || [])
    ];
    
    return `intel:${keyParts.join(':')}`;
  }

  private calculateTTL(request: IntelRequest): number {
    // TTL in seconds based on request type
    const ttlMap: Record<string, number> = {
      'competitor_analysis': 1800, // 30 minutes
      'keyword_research': 3600,   // 1 hour
      'market_analysis': 1800,    // 30 minutes
      'pricing_intelligence': 300 // 5 minutes
    };
    
    return ttlMap[request.type] || 1800;
  }
}

export const queryPlanner = new QueryPlanner();
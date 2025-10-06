/**
 * Provider Registry
 * 
 * Central registry for all intelligence providers with health monitoring
 * and dynamic provider management
 */

import type { 
  ProviderConfig, 
  ProviderType, 
  ProviderMetrics,
  IntelRequest,
  ProviderResponse 
} from './types';

export class ProviderRegistry {
  private providers = new Map<string, ProviderConfig>();
  private metrics = new Map<string, ProviderMetrics>();
  private healthChecks = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.initializeDefaultProviders();
    this.startHealthChecks();
  }

  /**
   * Register a new provider
   */
  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.id, config);
    this.initializeMetrics(config.id);
    this.startHealthCheck(config);
    
    console.log(`✅ Registered provider: ${config.name} (${config.type.join(', ')})`);
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: ProviderType): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.type.includes(type));
  }

  /**
   * Get provider by ID
   */
  getProvider(id: string): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all healthy providers for a request
   */
  getHealthyProviders(request: IntelRequest): ProviderConfig[] {
    const availableProviders = request.providers
      .flatMap(type => this.getProvidersByType(type))
      .filter((provider, index, arr) => 
        arr.findIndex(p => p.id === provider.id) === index // Remove duplicates
      );

    return availableProviders.filter(provider => {
      const metrics = this.metrics.get(provider.id);
      return metrics?.healthStatus === 'healthy' || metrics?.healthStatus === 'degraded';
    });
  }

  /**
   * Get provider metrics
   */
  getMetrics(providerId?: string): ProviderMetrics | Map<string, ProviderMetrics> | undefined {
    if (providerId) {
      return this.metrics.get(providerId);
    }
    return this.metrics;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is healthy
   */
  isHealthy(providerId: string): boolean {
    const metrics = this.metrics.get(providerId);
    return metrics?.healthStatus === 'healthy' || metrics?.healthStatus === 'degraded';
  }

  /**
   * Update provider metrics
   */
  updateMetrics(providerId: string, response: ProviderResponse): void {
    const metrics = this.metrics.get(providerId);
    if (!metrics) return;

    metrics.requestCount++;
    
    if (response.success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
      metrics.lastError = response.error;
    }

    metrics.avgResponseTime = (
      (metrics.avgResponseTime * (metrics.requestCount - 1) + response.metadata.duration) / 
      metrics.requestCount
    );

    // Update health status based on error rate
    const errorRate = metrics.errorCount / metrics.requestCount;
    if (errorRate > 0.5) {
      metrics.healthStatus = 'unhealthy';
    } else if (errorRate > 0.2) {
      metrics.healthStatus = 'degraded';
    } else {
      metrics.healthStatus = 'healthy';
    }

    this.metrics.set(providerId, metrics);
  }

  /**
   * Record rate limit hit
   */
  recordRateLimit(providerId: string): void {
    const metrics = this.metrics.get(providerId);
    if (metrics) {
      metrics.rateLimitHits++;
      metrics.healthStatus = 'degraded';
      this.metrics.set(providerId, metrics);
    }
  }

  /**
   * Initialize default providers
   */
  private initializeDefaultProviders(): void {
    // SEO Providers
    this.registerProvider({
      id: 'ahrefs',
      name: 'Ahrefs',
      type: ['seo'],
      baseUrl: 'https://apiv2.ahrefs.com',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 50000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        exponential: true
      },
      healthCheck: {
        endpoint: '/subscription',
        intervalMs: 300000 // 5 minutes
      },
      supportedOperations: ['domain_rating', 'backlinks', 'organic_keywords', 'top_pages']
    });

    this.registerProvider({
      id: 'semrush',
      name: 'SEMrush',
      type: ['seo', 'serp'],
      baseUrl: 'https://api.semrush.com',
      rateLimit: {
        requestsPerMinute: 120,
        requestsPerHour: 7200,
        requestsPerDay: 100000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 500,
        exponential: true
      },
      healthCheck: {
        endpoint: '/units',
        intervalMs: 300000
      },
      supportedOperations: ['domain_overview', 'backlinks', 'keywords', 'serp_results']
    });

    // Traffic Providers
    this.registerProvider({
      id: 'similarweb',
      name: 'SimilarWeb',
      type: ['traffic'],
      baseUrl: 'https://api.similarweb.com',
      rateLimit: {
        requestsPerMinute: 600,
        requestsPerHour: 36000,
        requestsPerDay: 500000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 2000,
        exponential: true
      },
      healthCheck: {
        endpoint: '/capabilities',
        intervalMs: 600000 // 10 minutes
      },
      supportedOperations: ['total_traffic', 'traffic_sources', 'engagement', 'demographics']
    });

    // SERP Providers
    this.registerProvider({
      id: 'serpapi',
      name: 'SerpApi',
      type: ['serp'],
      baseUrl: 'https://serpapi.com',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 50000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        exponential: true
      },
      healthCheck: {
        endpoint: '/account',
        intervalMs: 300000
      },
      supportedOperations: ['google_search', 'google_shopping', 'bing_search']
    });

    // Social Providers
    this.registerProvider({
      id: 'brandwatch',
      name: 'Brandwatch',
      type: ['social'],
      baseUrl: 'https://api.brandwatch.com',
      rateLimit: {
        requestsPerMinute: 300,
        requestsPerHour: 18000,
        requestsPerDay: 200000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1500,
        exponential: true
      },
      healthCheck: {
        endpoint: '/projects',
        intervalMs: 600000
      },
      supportedOperations: ['mentions', 'sentiment', 'influencers', 'demographics']
    });

    // Reviews Providers
    this.registerProvider({
      id: 'trustpilot',
      name: 'Trustpilot',
      type: ['reviews'],
      baseUrl: 'https://api.trustpilot.com',
      rateLimit: {
        requestsPerMinute: 120,
        requestsPerHour: 7200,
        requestsPerDay: 100000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        exponential: true
      },
      healthCheck: {
        endpoint: '/business-units',
        intervalMs: 300000
      },
      supportedOperations: ['business_units', 'reviews', 'product_reviews']
    });

    // Pricing Providers
    this.registerProvider({
      id: 'price2spy',
      name: 'Price2Spy',
      type: ['pricing'],
      baseUrl: 'https://www.price2spy.com/api',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 50000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 2000,
        exponential: true
      },
      healthCheck: {
        endpoint: '/account',
        intervalMs: 600000
      },
      supportedOperations: ['product_prices', 'price_history', 'competitor_products']
    });
  }

  /**
   * Initialize metrics for a provider
   */
  private initializeMetrics(providerId: string): void {
    this.metrics.set(providerId, {
      providerId,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      rateLimitHits: 0,
      healthStatus: 'healthy',
      uptime: 100
    });
  }

  /**
   * Start health checks for all providers
   */
  private startHealthChecks(): void {
    for (const provider of this.providers.values()) {
      this.startHealthCheck(provider);
    }
  }

  /**
   * Start health check for a specific provider
   */
  private startHealthCheck(provider: ProviderConfig): void {
    // Clear existing health check if any
    const existingCheck = this.healthChecks.get(provider.id);
    if (existingCheck) {
      clearInterval(existingCheck);
    }

    // Start new health check
    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(provider);
      } catch (error) {
        console.error(`❌ Health check failed for ${provider.name}:`, error);
        this.updateHealthStatus(provider.id, 'unhealthy');
      }
    }, provider.healthCheck.intervalMs);

    this.healthChecks.set(provider.id, interval);
  }

  /**
   * Perform health check for a provider
   */
  private async performHealthCheck(provider: ProviderConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // This would make an actual HTTP request in production
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const duration = Date.now() - startTime;
      
      if (duration > 5000) {
        this.updateHealthStatus(provider.id, 'degraded');
      } else {
        this.updateHealthStatus(provider.id, 'healthy');
      }
      
      console.log(`💚 Health check passed for ${provider.name} (${duration}ms)`);
    } catch (error) {
      this.updateHealthStatus(provider.id, 'unhealthy');
      console.error(`❌ Health check failed for ${provider.name}:`, error);
    }
  }

  /**
   * Update health status for a provider
   */
  private updateHealthStatus(providerId: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
    const metrics = this.metrics.get(providerId);
    if (metrics) {
      metrics.healthStatus = status;
      
      // Update uptime based on status
      if (status === 'healthy') {
        metrics.uptime = Math.min(100, metrics.uptime + 1);
      } else if (status === 'unhealthy') {
        metrics.uptime = Math.max(0, metrics.uptime - 5);
      }
      
      this.metrics.set(providerId, metrics);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    for (const interval of this.healthChecks.values()) {
      clearInterval(interval);
    }
    this.healthChecks.clear();
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
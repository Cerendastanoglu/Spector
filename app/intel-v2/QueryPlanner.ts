import type { 
  IntelRequest, 
  IntelCapability, 
  QueryPlan, 
  IntelProvider
} from './types.js';
import { providerRegistry } from './ProviderRegistry.js';
import { requestCoordinator } from './RequestCoordinator.js';

/**
 * Query Planner - Smart fan-out and execution planning
 */
export class QueryPlanner {
  
  /**
   * Plan queries based on input parameters
   */
  async planQueries(request: IntelRequest, shopId: string): Promise<QueryPlan> {
    const requestId = this.generateRequestId();
    
    // Determine required capabilities based on input
    const capabilities = this.determineCapabilities(request);
    
    // Get available providers for capabilities
    const availableProviders = await this.selectProviders(capabilities, shopId, request);
    
    // Estimate cost and duration
    const estimatedCost = this.estimateCost(availableProviders, request);
    const estimatedDuration = this.estimateDuration(availableProviders);
    
    // Determine cache strategy
    const cacheStrategy = this.determineCacheStrategy(request);
    
    // Check for rate limit warnings
    const rateLimitWarnings = await this.checkRateLimits(availableProviders);
    
    return {
      requestId,
      capabilities,
      selectedProviders: availableProviders.map(p => p.name),
      estimatedCost,
      estimatedDuration,
      cacheStrategy,
      rateLimitWarnings
    };
  }

  /**
   * Determine required capabilities based on request
   */
  private determineCapabilities(request: IntelRequest): IntelCapability[] {
    const capabilities: IntelCapability[] = [];
    
    // If domain is provided → prioritize traffic, keywords, reviews
    if (request.domain) {
      capabilities.push('traffic', 'keywords', 'reviews');
      
      // Add company profile for business intelligence
      capabilities.push('company_profile');
      
      // Add social mentions
      capabilities.push('social');
    }
    
    // If query only → run discovery mode
    if (request.query && !request.domain) {
      capabilities.push('serp', 'keywords');
      
      // Add social for brand mentions
      capabilities.push('social');
    }
    
    // If product identifiers → focus on pricing
    if (request.productIdentifiers?.length) {
      capabilities.push('pricing');
      
      // Add reviews for product sentiment
      capabilities.push('reviews');
    }
    
    // Always include SERP for competitive landscape
    if (!capabilities.includes('serp')) {
      capabilities.push('serp');
    }
    
    // Respect explicit capability requests
    if (request.capabilities?.length) {
      // Merge with discovered capabilities
      const merged = new Set([...capabilities, ...request.capabilities]);
      return Array.from(merged);
    }
    
    return capabilities;
  }

  /**
   * Select providers based on capabilities and constraints
   */
  private async selectProviders(
    capabilities: IntelCapability[], 
    shopId: string,
    request: IntelRequest
  ): Promise<IntelProvider[]> {
    const selectedProviders = new Set<IntelProvider>();
    const maxProvidersPerRequest = this.getMaxProviders(request);
    
    // Get configured providers for each capability
    for (const capability of capabilities) {
      const providers = providerRegistry.getByCapability(capability);
      
      // Filter by configured status
      const configuredProviders = [];
      for (const provider of providers) {
        if (await provider.isConfigured(shopId)) {
          configuredProviders.push(provider);
        }
      }
      
      // Sort by priority/quality and take top providers
      const sortedProviders = this.prioritizeProviders(configuredProviders, capability);
      
      // Add top provider(s) for this capability
      const providersToAdd = sortedProviders.slice(0, 2); // Max 2 per capability
      providersToAdd.forEach(p => selectedProviders.add(p));
      
      // Stop if we hit provider limit
      if (selectedProviders.size >= maxProvidersPerRequest) {
        break;
      }
    }
    
    return Array.from(selectedProviders).slice(0, maxProvidersPerRequest);
  }

  /**
   * Get maximum providers per request (merchant configurable)
   */
  private getMaxProviders(request: IntelRequest): number {
    // Default to 3 providers to control costs
    // Could be made merchant-configurable
    return request.maxResults && request.maxResults < 50 ? 2 : 3;
  }

  /**
   * Prioritize providers by quality and reliability
   */
  private prioritizeProviders(providers: IntelProvider[], capability: IntelCapability): IntelProvider[] {
    // Quality rankings by capability (could be data-driven)
    const rankings: Record<IntelCapability, string[]> = {
      keywords: ['semrush', 'ahrefs', 'serpapi'],
      traffic: ['similarweb', 'ahrefs', 'semrush'],
      pricing: ['price2spy', 'serpapi'],
      serp: ['serpapi', 'semrush', 'ahrefs'],
      reviews: ['trustpilot', 'semrush'],
      social: ['brandwatch', 'semrush'],
      company_profile: ['similarweb', 'ahrefs']
    };
    
    const preferredOrder = rankings[capability] || [];
    
    return providers.sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.name);
      const bIndex = preferredOrder.indexOf(b.name);
      
      // Prefer providers in ranking order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Ranked providers come first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Alphabetical for unranked
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Estimate cost for selected providers
   */
  private estimateCost(providers: IntelProvider[], request: IntelRequest): number {
    // Cost estimates per provider per request
    const costEstimates: Record<string, number> = {
      ahrefs: 0.10,
      semrush: 0.08,
      similarweb: 0.15,
      serpapi: 0.05,
      price2spy: 0.03,
      trustpilot: 0.02,
      brandwatch: 0.12
    };
    
    let totalCost = 0;
    const maxResults = request.maxResults || 20;
    
    for (const provider of providers) {
      const baseCost = costEstimates[provider.name] || 0.05;
      
      // Scale by result count
      const scaledCost = baseCost * Math.min(maxResults / 20, 2); // Cap at 2x
      
      totalCost += scaledCost;
    }
    
    return Math.round(totalCost * 100) / 100; // Round to cents
  }

  /**
   * Estimate duration for execution
   */
  private estimateDuration(providers: IntelProvider[]): number {
    // Duration estimates per provider (seconds)
    const durationEstimates: Record<string, number> = {
      ahrefs: 3,
      semrush: 4,
      similarweb: 5,
      serpapi: 2,
      price2spy: 3,
      trustpilot: 2,
      brandwatch: 4
    };
    
    // Parallel execution - use longest provider time + some overhead
    const maxDuration = Math.max(
      ...providers.map(p => durationEstimates[p.name] || 3)
    );
    
    return maxDuration + 2; // Add 2s overhead
  }

  /**
   * Determine cache strategy
   */
  private determineCacheStrategy(request: IntelRequest): 'cache_first' | 'network_first' | 'no_cache' {
    // Real-time pricing should be fresh
    if (request.productIdentifiers?.length) {
      return 'network_first';
    }
    
    // Time-sensitive queries prefer fresh data
    if (request.timeRange?.from) {
      const fromDate = new Date(request.timeRange.from);
      const daysSinceFrom = (Date.now() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceFrom < 1) {
        return 'network_first'; // Recent data needs to be fresh
      }
    }
    
    // Default to cache-first for most queries
    return 'cache_first';
  }

  /**
   * Check for rate limit warnings
   */
  private async checkRateLimits(providers: IntelProvider[]): Promise<string[]> {
    const warnings: string[] = [];
    const rateLimitStatus = requestCoordinator.getRateLimitStatus();
    const budgetStatus = requestCoordinator.getBudgetStatus();
    
    for (const provider of providers) {
      const rateStatus = rateLimitStatus[provider.name];
      const budget = budgetStatus[provider.name];
      
      // Check rate limits
      if (rateStatus?.availableTokens < 5) {
        warnings.push(`${provider.name}: Low rate limit (${rateStatus.availableTokens} requests remaining)`);
      }
      
      // Check budget
      if (budget?.utilizationPercent > 80) {
        warnings.push(`${provider.name}: High budget utilization (${budget.utilizationPercent}%)`);
      }
      
      if (budget?.remaining < 10) {
        warnings.push(`${provider.name}: Low budget ($${budget.remaining} remaining)`);
      }
    }
    
    return warnings;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create discovery plan for competitive research
   */
  async createDiscoveryPlan(
    seedKeywords: string[], 
    market: string, 
    shopId: string
  ): Promise<{
    competitors: QueryPlan;
    keywords: QueryPlan;
    pricing: QueryPlan;
  }> {
    
    // Plan 1: Competitor Discovery
    const competitorRequest: IntelRequest = {
      query: seedKeywords.join(' '),
      market,
      capabilities: ['serp', 'traffic', 'keywords'],
      maxResults: 20
    };
    const competitors = await this.planQueries(competitorRequest, shopId);
    
    // Plan 2: Keyword Research
    const keywordRequest: IntelRequest = {
      query: seedKeywords.join(' '),
      market,
      capabilities: ['keywords', 'serp'],
      maxResults: 50
    };
    const keywords = await this.planQueries(keywordRequest, shopId);
    
    // Plan 3: Pricing Analysis (if we found competitors)
    const pricingRequest: IntelRequest = {
      query: seedKeywords.join(' '),
      market,
      capabilities: ['pricing'],
      maxResults: 30
    };
    const pricing = await this.planQueries(pricingRequest, shopId);
    
    return { competitors, keywords, pricing };
  }

  /**
   * Create competitor analysis plan
   */
  async createCompetitorPlan(
    myDomain: string,
    competitorDomain: string,
    shopId: string
  ): Promise<{
    gaps: QueryPlan;
    overlap: QueryPlan;
    traffic: QueryPlan;
  }> {
    
    // Plan 1: Keyword Gaps
    const gapsRequest: IntelRequest = {
      query: `${myDomain} vs ${competitorDomain}`,
      domain: competitorDomain,
      capabilities: ['keywords', 'serp'],
      maxResults: 50
    };
    const gaps = await this.planQueries(gapsRequest, shopId);
    
    // Plan 2: Content Overlap  
    const overlapRequest: IntelRequest = {
      query: `${myDomain} ${competitorDomain}`,
      capabilities: ['keywords', 'traffic'],
      maxResults: 30
    };
    const overlap = await this.planQueries(overlapRequest, shopId);
    
    // Plan 3: Traffic Analysis
    const trafficRequest: IntelRequest = {
      query: competitorDomain,
      domain: competitorDomain,
      capabilities: ['traffic', 'social', 'reviews'],
      maxResults: 20
    };
    const traffic = await this.planQueries(trafficRequest, shopId);
    
    return { gaps, overlap, traffic };
  }

  /**
   * Create local competitor plan
   */
  async createLocalPlan(
    location: string,
    niche: string[],
    shopId: string
  ): Promise<QueryPlan> {
    
    const localRequest: IntelRequest = {
      query: `${niche.join(' ')} ${location}`,
      market: this.extractCountryFromLocation(location),
      capabilities: ['serp', 'reviews', 'social'],
      maxResults: 25
    };
    
    return this.planQueries(localRequest, shopId);
  }

  /**
   * Extract country code from location string
   */
  private extractCountryFromLocation(location: string): string {
    // Simple extraction - in practice would use a geo database
    const countryMappings: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'germany': 'DE',
      'france': 'FR',
      'turkey': 'TR',
      'australia': 'AU'
    };
    
    const normalized = location.toLowerCase();
    for (const [country, code] of Object.entries(countryMappings)) {
      if (normalized.includes(country)) {
        return code;
      }
    }
    
    return 'US'; // Default
  }
}

// Export singleton
export const queryPlanner = new QueryPlanner();
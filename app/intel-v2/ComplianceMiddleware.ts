import type { 
  IntelRequest,
  ProviderComplianceConfig,
  ComplianceCheckResult,
  ProviderStatus
} from './types.js';

/**
 * Compliance Middleware - Legal and robots.txt safety hooks
 */
export class ComplianceMiddleware {
  
  // Cached robots.txt content (1 hour TTL)
  private robotsCache = new Map<string, { content: string; expires: number }>();
  
  // Domain allow/block lists
  private allowedDomains = new Set([
    'google.com',
    'bing.com',
    'amazon.com',
    'shopify.com',
    'etsy.com',
    'ebay.com'
  ]);
  
  private blockedDomains = new Set([
    'facebook.com',      // Privacy sensitive
    'instagram.com',     // Privacy sensitive
    'linkedin.com',      // Professional network
    'pinterest.com',     // Image rights
    'tiktok.com',        // COPPA/age restrictions
    'snapchat.com',      // Privacy focused
    'whatsapp.com',      // Messaging privacy
    'telegram.org'       // Messaging privacy
  ]);
  
  // Regional compliance restrictions
  private regionalRestrictions = new Map([
    ['CN', ['google.com', 'facebook.com', 'twitter.com']], // China
    ['RU', ['facebook.com', 'instagram.com', 'twitter.com']], // Russia
    ['IR', ['facebook.com', 'twitter.com', 'youtube.com']]  // Iran
  ]);

  /**
   * Check compliance for an intelligence request
   */
  async checkCompliance(
    request: IntelRequest, 
    providerName: string,
    config: ProviderComplianceConfig
  ): Promise<ComplianceCheckResult> {
    
    const violations: string[] = [];
    const warnings: string[] = [];
    
    // 1. Check domain restrictions
    if (request.domain) {
      const domainCheck = this.checkDomainRestrictions(request.domain);
      if (!domainCheck.allowed) {
        violations.push(`Domain ${request.domain} is blocked: ${domainCheck.reason}`);
      }
      if (domainCheck.warnings?.length) {
        warnings.push(...domainCheck.warnings);
      }
    }
    
    // 2. Check robots.txt compliance
    if (request.domain && config.respectRobots) {
      const robotsCheck = await this.checkRobotsCompliance(request.domain, providerName);
      if (!robotsCheck.allowed) {
        violations.push(`Robots.txt disallows ${providerName}: ${robotsCheck.reason}`);
      }
    }
    
    // 3. Check regional restrictions
    if (request.market) {
      const regionalCheck = this.checkRegionalRestrictions(request.domain, request.market);
      if (!regionalCheck.allowed) {
        violations.push(`Regional restriction in ${request.market}: ${regionalCheck.reason}`);
      }
    }
    
    // 4. Check explicit consent requirements
    if (config.requiresExplicitConsent && !request.hasUserConsent) {
      violations.push('Provider requires explicit user consent');
    }
    
    // 5. Check rate limits vs terms of service
    if (request.maxResults && config.maxResultsPerQuery) {
      if (request.maxResults > config.maxResultsPerQuery) {
        violations.push(`Requested ${request.maxResults} results, max allowed: ${config.maxResultsPerQuery}`);
      }
    }
    
    // 6. Check commercial use restrictions
    if (config.commercialUseRestricted && this.isCommercialUse(request)) {
      violations.push('Provider restricts commercial use for this type of query');
    }
    
    // 7. Data retention compliance
    if (config.dataRetentionDays) {
      warnings.push(`Data must be deleted after ${config.dataRetentionDays} days`);
    }
    
    return {
      allowed: violations.length === 0,
      violations,
      warnings,
      requiresConsent: config.requiresExplicitConsent && !request.hasUserConsent,
      dataRetentionDays: config.dataRetentionDays
    };
  }

  /**
   * Check domain restrictions
   */
  private checkDomainRestrictions(domain: string): {
    allowed: boolean;
    reason?: string;
    warnings?: string[];
  } {
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Check explicit blocks
    if (this.blockedDomains.has(normalizedDomain)) {
      return {
        allowed: false,
        reason: 'Domain is on privacy/legal block list'
      };
    }
    
    // Check subdomain blocks
    for (const blocked of Array.from(this.blockedDomains)) {
      if (normalizedDomain.endsWith(`.${blocked}`)) {
        return {
          allowed: false,
          reason: `Subdomain of blocked domain ${blocked}`
        };
      }
    }
    
    // Warnings for sensitive domains
    const warnings: string[] = [];
    
    if (normalizedDomain.includes('bank') || normalizedDomain.includes('financial')) {
      warnings.push('Financial domain detected - ensure compliance with financial data regulations');
    }
    
    if (normalizedDomain.includes('health') || normalizedDomain.includes('medical')) {
      warnings.push('Healthcare domain detected - ensure HIPAA compliance');
    }
    
    if (normalizedDomain.includes('gov') || normalizedDomain.includes('government')) {
      warnings.push('Government domain detected - may have access restrictions');
    }
    
    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check robots.txt compliance
   */
  private async checkRobotsCompliance(domain: string, userAgent: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      const robotsContent = await this.fetchRobotsTxt(domain);
      
      if (!robotsContent) {
        // No robots.txt = allowed
        return { allowed: true };
      }
      
      const rules = this.parseRobotsTxt(robotsContent, userAgent);
      
      // Check if our scraping paths are disallowed
      const scrapingPaths = [
        '/search',
        '/api',
        '/products',
        '/product',
        '/catalog',
        '/category'
      ];
      
      for (const path of scrapingPaths) {
        if (rules.disallowedPaths.some(disallowed => 
          path.startsWith(disallowed) || disallowed === '/'
        )) {
          return {
            allowed: false,
            reason: `Robots.txt disallows access to ${path} for ${userAgent}`
          };
        }
      }
      
      // Check crawl delay
      if (rules.crawlDelay && rules.crawlDelay > 10) {
        return {
          allowed: false,
          reason: `Robots.txt requires ${rules.crawlDelay}s crawl delay (too restrictive)`
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      // Failed to fetch robots.txt - assume allowed but log warning
      console.warn(`Failed to check robots.txt for ${domain}:`, error);
      return { allowed: true };
    }
  }

  /**
   * Fetch robots.txt with caching
   */
  private async fetchRobotsTxt(domain: string): Promise<string | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    const cacheKey = normalizedDomain;
    const cached = this.robotsCache.get(cacheKey);
    
    // Return cached if valid
    if (cached && cached.expires > Date.now()) {
      return cached.content;
    }
    
    try {
      const robotsUrl = `https://${normalizedDomain}/robots.txt`;
      
      // Use fetch with timeout
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Spector-Intelligence-Bot/1.0 (+https://spector.shopify.io/robots)'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const content = await response.text();
      
      // Cache for 1 hour
      this.robotsCache.set(cacheKey, {
        content,
        expires: Date.now() + 3600000
      });
      
      return content;
      
    } catch (error) {
      // Network error - cache empty result briefly to avoid retries
      this.robotsCache.set(cacheKey, {
        content: '',
        expires: Date.now() + 300000 // 5 minutes
      });
      return null;
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string, userAgent: string): {
    disallowedPaths: string[];
    crawlDelay?: number;
  } {
    const lines = content.split('\n').map(line => line.trim());
    const disallowedPaths: string[] = [];
    let crawlDelay: number | undefined;
    let isRelevantSection = false;
    
    for (const line of lines) {
      if (line.startsWith('#') || !line) {
        continue;
      }
      
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.substring(11).trim();
        isRelevantSection = agent === '*' || 
                           agent.toLowerCase().includes(userAgent.toLowerCase()) ||
                           userAgent.toLowerCase().includes(agent.toLowerCase());
        continue;
      }
      
      if (!isRelevantSection) {
        continue;
      }
      
      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.substring(9).trim();
        if (path) {
          disallowedPaths.push(path);
        }
      }
      
      if (line.toLowerCase().startsWith('crawl-delay:')) {
        const delay = parseInt(line.substring(12).trim());
        if (!isNaN(delay)) {
          crawlDelay = delay;
        }
      }
    }
    
    return { disallowedPaths, crawlDelay };
  }

  /**
   * Check regional compliance restrictions
   */
  private checkRegionalRestrictions(domain: string | undefined, market: string): {
    allowed: boolean;
    reason?: string;
  } {
    if (!domain) {
      return { allowed: true };
    }
    
    const normalizedDomain = this.normalizeDomain(domain);
    const restrictions = this.regionalRestrictions.get(market);
    
    if (!restrictions) {
      return { allowed: true };
    }
    
    for (const restricted of restrictions) {
      if (normalizedDomain === restricted || normalizedDomain.endsWith(`.${restricted}`)) {
        return {
          allowed: false,
          reason: `Domain ${restricted} is restricted in market ${market}`
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check if request is commercial use
   */
  private isCommercialUse(request: IntelRequest): boolean {
    // Commercial use indicators
    const commercialKeywords = [
      'price', 'pricing', 'cost', 'revenue', 'profit', 'sales',
      'competitor', 'competition', 'market share', 'business',
      'commercial', 'enterprise', 'b2b', 'wholesale'
    ];
    
    const query = request.query?.toLowerCase() || '';
    
    return commercialKeywords.some(keyword => query.includes(keyword)) ||
           !!request.productIdentifiers?.length; // Product analysis = commercial
  }

  /**
   * Normalize domain for consistent checking
   */
  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/^www\./, '')        // Remove www
      .replace(/\/.*$/, '')         // Remove path
      .trim();
  }

  /**
   * Get provider status with compliance info
   */
  getProviderStatus(
    providerName: string, 
    config: ProviderComplianceConfig
  ): ProviderStatus {
    
    // Determine status based on configuration
    let status: 'active' | 'restricted' | 'blocked' = 'active';
    const restrictions: string[] = [];
    
    if (!config.allowedInRegions?.length) {
      status = 'restricted';
      restrictions.push('No regions configured');
    }
    
    if (config.requiresExplicitConsent) {
      restrictions.push('Requires user consent');
    }
    
    if (config.commercialUseRestricted) {
      restrictions.push('Commercial use restricted');
    }
    
    if (config.maxResultsPerQuery && config.maxResultsPerQuery < 10) {
      restrictions.push(`Limited to ${config.maxResultsPerQuery} results`);
    }
    
    return {
      name: providerName,
      status,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
      lastComplianceCheck: new Date().toISOString()
    };
  }

  /**
   * Bulk compliance check for multiple domains
   */
  async bulkDomainCheck(domains: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Check all domains concurrently
    const checks = domains.map(async domain => {
      const check = this.checkDomainRestrictions(domain);
      results.set(domain, check.allowed);
    });
    
    await Promise.all(checks);
    return results;
  }

  /**
   * Clear robots.txt cache
   */
  clearRobotsCache(): void {
    this.robotsCache.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    robotsCacheSize: number;
    oldestEntry: string | null;
  } {
    const entries = Array.from(this.robotsCache.entries());
    
    return {
      robotsCacheSize: entries.length,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(([_, data]) => data.expires)).toString()
        : null
    };
  }
}

// Export singleton
export const complianceMiddleware = new ComplianceMiddleware();
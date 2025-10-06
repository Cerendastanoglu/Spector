import type { 
  IntelDatum, 
  NormalizedIntel, 
  SEOPayload,
  TrafficPayload,
  PricingPayload,
  ReviewsPayload,
  SocialPayload,
  CompanyProfilePayload
} from './types.js';

/**
 * Result normalizer - converts heterogeneous payloads into common schema
 */
export class ResultNormalizer {
  
  /**
   * Normalize array of IntelDatum to unified NormalizedIntel format
   */
  normalizeResults(data: IntelDatum[]): NormalizedIntel[] {
    const normalized: NormalizedIntel[] = [];
    
    for (const datum of data) {
      try {
        const results = this.normalizeDatum(datum);
        normalized.push(...results);
      } catch (error) {
        console.warn(`Failed to normalize ${datum.provider}:${datum.capability}`, error);
        // Continue processing other data
      }
    }
    
    return this.deduplicateResults(normalized);
  }

  /**
   * Normalize single datum based on capability type
   */
  private normalizeDatum(datum: IntelDatum): NormalizedIntel[] {
    switch (datum.capability) {
      case 'keywords':
        return this.normalizeKeywords(datum);
      case 'traffic':
        return this.normalizeTraffic(datum);
      case 'pricing':
        return this.normalizePricing(datum);
      case 'serp':
        return this.normalizeSERP(datum);
      case 'reviews':
        return this.normalizeReviews(datum);
      case 'social':
        return this.normalizeSocial(datum);
      case 'company_profile':
        return this.normalizeCompanyProfile(datum);
      default:
        console.warn(`Unknown capability: ${datum.capability}`);
        return [];
    }
  }

  /**
   * Normalize SEO/Keywords data
   */
  private normalizeKeywords(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as SEOPayload;
    const results: NormalizedIntel[] = [];
    
    // Process keywords
    if (payload.keywords) {
      for (const kw of payload.keywords) {
        results.push({
          entityType: 'keyword',
          entityId: `${kw.keyword}-${datum.provider}`,
          name: kw.keyword,
          url: kw.url,
          metrics: {
            keywords: [{
              keyword: kw.keyword,
              volume: kw.volume,
              difficulty: kw.difficulty,
              cpc: kw.cpc,
              position: kw.position
            }]
          },
          evidence: [{
            provider: datum.provider,
            retrievedAt: datum.meta?.timestamp || new Date().toISOString()
          }]
        });
      }
    }
    
    // Process competitor domains
    if (payload.domains) {
      for (const domain of payload.domains) {
        results.push({
          entityType: 'competitor',
          entityId: domain.domain,
          name: domain.domain,
          url: `https://${domain.domain}`,
          metrics: {
            traffic: {
              monthlyVisits: domain.traffic,
              sources: { organic: 0.6, paid: 0.2, referral: 0.1, direct: 0.1 }, // Estimated
              rank: domain.rank
            },
            keywords: [{ 
              keyword: 'total', 
              volume: domain.keywords, 
              difficulty: 0, 
              cpc: 0 
            }]
          },
          evidence: [{
            provider: datum.provider,
            retrievedAt: datum.meta?.timestamp || new Date().toISOString()
          }]
        });
      }
    }
    
    return results;
  }

  /**
   * Normalize traffic data
   */
  private normalizeTraffic(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as TrafficPayload;
    
    return [{
      entityType: 'competitor',
      entityId: payload.domain,
      name: payload.domain,
      url: `https://${payload.domain}`,
      metrics: {
        traffic: {
          monthlyVisits: payload.monthlyVisits,
          sources: {
            organic: payload.trafficSources.organic / 100,
            paid: payload.trafficSources.paid / 100,
            referral: payload.trafficSources.referral / 100,
            direct: payload.trafficSources.direct / 100
          },
          rank: payload.globalRank
        }
      },
      evidence: [{
        provider: datum.provider,
        retrievedAt: datum.meta?.timestamp || new Date().toISOString()
      }]
    }];
  }

  /**
   * Normalize pricing data
   */
  private normalizePricing(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as PricingPayload;
    const results: NormalizedIntel[] = [];
    
    for (const product of payload.products) {
      results.push({
        entityType: 'product',
        entityId: product.productId || `${product.name}-${product.seller}`,
        name: product.name,
        metrics: {
          price: product.price,
          // Calculate trend if we have historical data
          priceTrend: this.calculatePriceTrend(product.name, product.price)
        },
        evidence: [{
          provider: datum.provider,
          retrievedAt: datum.meta?.timestamp || new Date().toISOString()
        }]
      });
    }
    
    return results;
  }

  /**
   * Normalize SERP data (similar to keywords but position-focused)
   */
  private normalizeSERP(datum: IntelDatum): NormalizedIntel[] {
    // SERP data is typically similar to SEO data
    return this.normalizeKeywords(datum);
  }

  /**
   * Normalize reviews data
   */
  private normalizeReviews(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as ReviewsPayload;
    
    return [{
      entityType: 'competitor',
      entityId: `reviews-${payload.platform}`,
      name: payload.platform,
      metrics: {
        rating: {
          average: payload.ratings.average,
          count: payload.ratings.count,
          platform: payload.platform
        },
        reviews: {
          count: payload.ratings.count,
          lastReviewAt: payload.reviews[0]?.date,
          themes: payload.themes || []
        }
      },
      evidence: [{
        provider: datum.provider,
        retrievedAt: datum.meta?.timestamp || new Date().toISOString()
      }]
    }];
  }

  /**
   * Normalize social media data
   */
  private normalizeSocial(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as SocialPayload;
    const results: NormalizedIntel[] = [];
    
    for (const mention of payload.mentions) {
      results.push({
        entityType: 'mention',
        entityId: `${mention.platform}-social`,
        name: mention.platform,
        metrics: {
          social: {
            mentions: mention.count,
            sentiment: mention.sentiment,
            platform: mention.platform
          }
        },
        evidence: [{
          provider: datum.provider,
          retrievedAt: datum.meta?.timestamp || new Date().toISOString()
        }]
      });
    }
    
    return results;
  }

  /**
   * Normalize company profile data
   */
  private normalizeCompanyProfile(datum: IntelDatum): NormalizedIntel[] {
    const payload = datum.payload as CompanyProfilePayload;
    
    return [{
      entityType: 'competitor',
      entityId: payload.company,
      name: payload.company,
      country: payload.hqCountry,
      metrics: {
        estRevenue: payload.revenue ? {
          range: payload.revenue.estimate,
          confidence: payload.revenue.confidence
        } : undefined
      },
      evidence: [{
        provider: datum.provider,
        retrievedAt: datum.meta?.timestamp || new Date().toISOString()
      }]
    }];
  }

  /**
   * Calculate price trend (placeholder - would use cached historical data)
   */
  private calculatePriceTrend(_productName: string, _currentPrice: number): { period: '7d' | '30d'; slope: number; change: number } | undefined {
    // In real implementation, this would:
    // 1. Look up historical prices from cache
    // 2. Calculate 7d and 30d trends
    // 3. Return slope and percentage change
    
    // For now, return undefined to indicate insufficient data
    return undefined;
  }

  /**
   * Deduplicate results based on entityType + entityId
   */
  private deduplicateResults(results: NormalizedIntel[]): NormalizedIntel[] {
    const seen = new Set<string>();
    const deduplicated: NormalizedIntel[] = [];
    
    for (const result of results) {
      const key = `${result.entityType}:${result.entityId}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      } else {
        // Merge evidence from duplicate
        const existing = deduplicated.find(r => 
          r.entityType === result.entityType && r.entityId === result.entityId
        );
        if (existing) {
          existing.evidence.push(...result.evidence);
        }
      }
    }
    
    return deduplicated;
  }

  /**
   * Merge results from multiple providers for same entity
   */
  mergeEntityResults(results: NormalizedIntel[]): NormalizedIntel[] {
    const grouped = new Map<string, NormalizedIntel[]>();
    
    // Group by entityType:entityId
    for (const result of results) {
      const key = `${result.entityType}:${result.entityId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      const group = grouped.get(key);
      if (group) {
        group.push(result);
      }
    }
    
    // Merge each group
    const merged: NormalizedIntel[] = [];
    for (const group of grouped.values()) {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        merged.push(this.mergeGroup(group));
      }
    }
    
    return merged;
  }

  /**
   * Merge a group of results for same entity
   */
  private mergeGroup(group: NormalizedIntel[]): NormalizedIntel {
    const base = group[0];
    const merged: NormalizedIntel = {
      ...base,
      evidence: [],
      metrics: { ...base.metrics }
    };
    
    // Combine all evidence
    for (const item of group) {
      merged.evidence.push(...item.evidence);
    }
    
    // Merge metrics (take best/most recent values)
    for (const item of group) {
      if (item.metrics.traffic && !merged.metrics.traffic) {
        merged.metrics.traffic = item.metrics.traffic;
      }
      if (item.metrics.price && !merged.metrics.price) {
        merged.metrics.price = item.metrics.price;
      }
      if (item.metrics.rating && !merged.metrics.rating) {
        merged.metrics.rating = item.metrics.rating;
      }
      // Add other metric merging logic as needed
    }
    
    return merged;
  }
}

// Export singleton
export const resultNormalizer = new ResultNormalizer();
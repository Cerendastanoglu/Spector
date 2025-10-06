/**
 * Result Normalizer
 * 
 * Normalizes responses from different providers into a unified schema
 */

import type { 
  ProviderResponse, 
  NormalizedResult, 
  IntelRequest,
  SEOData,
  TrafficData,
  PricingData,
  SERPData,
  SocialData,
  ReviewData
} from './types';

export class ResultNormalizer {
  /**
   * Normalize multiple provider responses into unified result
   */
  async normalize(responses: ProviderResponse[], request: IntelRequest): Promise<NormalizedResult> {
    const successfulResponses = responses.filter(r => r.success);
    const providerIds = responses.map(r => r.providerId);
    
    const normalizedData = {
      seo: this.normalizeSEOData(successfulResponses),
      traffic: this.normalizeTrafficData(successfulResponses),
      pricing: this.normalizePricingData(successfulResponses),
      serp: this.normalizeSERPData(successfulResponses),
      social: this.normalizeSocialData(successfulResponses),
      reviews: this.normalizeReviewData(successfulResponses)
    };

    // Remove empty data sections
    Object.keys(normalizedData).forEach(key => {
      if (!normalizedData[key as keyof typeof normalizedData] || 
          Object.keys(normalizedData[key as keyof typeof normalizedData] || {}).length === 0) {
        delete normalizedData[key as keyof typeof normalizedData];
      }
    });

    return {
      type: request.type,
      target: request.target,
      data: normalizedData,
      metadata: {
        providers: providerIds,
        timestamp: Date.now(),
        freshness: 'fresh',
        completeness: successfulResponses.length / responses.length
      }
    };
  }

  /**
   * Normalize SEO data from providers
   */
  private normalizeSEOData(responses: ProviderResponse[]): SEOData | undefined {
    const seoResponses = responses.filter(r => 
      r.data?.domainAuthority !== undefined || 
      r.data?.backlinks !== undefined ||
      r.data?.organicKeywords !== undefined
    );

    if (seoResponses.length === 0) return undefined;

    const seoData: SEOData = {};
    
    // Aggregate data from multiple providers
    seoResponses.forEach(response => {
      if (response.data.domainAuthority !== undefined) {
        seoData.domainAuthority = Math.max(seoData.domainAuthority || 0, response.data.domainAuthority);
      }
      
      if (response.data.backlinks !== undefined) {
        seoData.backlinks = Math.max(seoData.backlinks || 0, response.data.backlinks);
      }
      
      if (response.data.organicKeywords !== undefined) {
        seoData.organicKeywords = Math.max(seoData.organicKeywords || 0, response.data.organicKeywords);
      }
      
      if (response.data.topKeywords && Array.isArray(response.data.topKeywords)) {
        if (!seoData.topKeywords) seoData.topKeywords = [];
        seoData.topKeywords.push(...response.data.topKeywords);
      }
    });

    // Deduplicate and sort top keywords
    if (seoData.topKeywords) {
      const uniqueKeywords = new Map();
      seoData.topKeywords.forEach(keyword => {
        if (!uniqueKeywords.has(keyword.keyword) || 
            uniqueKeywords.get(keyword.keyword).position > keyword.position) {
          uniqueKeywords.set(keyword.keyword, keyword);
        }
      });
      seoData.topKeywords = Array.from(uniqueKeywords.values())
        .sort((a, b) => a.position - b.position)
        .slice(0, 10);
    }

    return seoData;
  }

  /**
   * Normalize traffic data from providers
   */
  private normalizeTrafficData(responses: ProviderResponse[]): TrafficData | undefined {
    const trafficResponses = responses.filter(r => 
      r.data?.monthlyVisits !== undefined || 
      r.data?.bounceRate !== undefined
    );

    if (trafficResponses.length === 0) return undefined;

    const trafficData: TrafficData = {};
    
    trafficResponses.forEach(response => {
      if (response.data.monthlyVisits !== undefined) {
        trafficData.monthlyVisits = Math.max(trafficData.monthlyVisits || 0, response.data.monthlyVisits);
      }
      
      if (response.data.bounceRate !== undefined) {
        trafficData.bounceRate = response.data.bounceRate;
      }
      
      if (response.data.avgSessionDuration !== undefined) {
        trafficData.avgSessionDuration = response.data.avgSessionDuration;
      }
      
      if (response.data.trafficSources) {
        trafficData.trafficSources = response.data.trafficSources;
      }
    });

    return trafficData;
  }

  /**
   * Normalize pricing data from providers
   */
  private normalizePricingData(responses: ProviderResponse[]): PricingData | undefined {
    const pricingResponses = responses.filter(r => 
      r.data?.products !== undefined || 
      r.data?.priceRange !== undefined
    );

    if (pricingResponses.length === 0) return undefined;

    const pricingData: PricingData = {};
    const allProducts: any[] = [];
    
    pricingResponses.forEach(response => {
      if (response.data.products && Array.isArray(response.data.products)) {
        allProducts.push(...response.data.products);
      }
    });

    if (allProducts.length > 0) {
      pricingData.products = allProducts.slice(0, 20); // Limit to 20 products
      
      // Calculate price range from products
      const prices = allProducts.map(p => p.price).filter(p => typeof p === 'number');
      if (prices.length > 0) {
        pricingData.priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: prices.reduce((a, b) => a + b, 0) / prices.length,
          currency: allProducts[0]?.currency || 'USD'
        };
      }
    }

    return pricingData;
  }

  /**
   * Normalize SERP data from providers
   */
  private normalizeSERPData(responses: ProviderResponse[]): SERPData | undefined {
    const serpResponses = responses.filter(r => 
      r.data?.position !== undefined || 
      r.data?.featuredSnippet !== undefined
    );

    if (serpResponses.length === 0) return undefined;

    const serpData: SERPData = {};
    
    // Take the best (lowest) position found
    serpResponses.forEach(response => {
      if (response.data.position !== undefined) {
        serpData.position = Math.min(serpData.position || Infinity, response.data.position);
      }
      
      if (response.data.url) serpData.url = response.data.url;
      if (response.data.title) serpData.title = response.data.title;
      if (response.data.snippet) serpData.snippet = response.data.snippet;
      if (response.data.featuredSnippet) serpData.featuredSnippet = response.data.featuredSnippet;
    });

    return serpData;
  }

  /**
   * Normalize social data from providers
   */
  private normalizeSocialData(responses: ProviderResponse[]): SocialData | undefined {
    const socialResponses = responses.filter(r => 
      r.data?.platforms !== undefined || 
      r.data?.mentions !== undefined
    );

    if (socialResponses.length === 0) return undefined;

    const socialData: SocialData = {};
    
    socialResponses.forEach(response => {
      if (response.data.platforms) {
        socialData.platforms = { ...socialData.platforms, ...response.data.platforms };
      }
      
      if (response.data.mentions !== undefined) {
        socialData.mentions = Math.max(socialData.mentions || 0, response.data.mentions);
      }
      
      if (response.data.sentiment) {
        socialData.sentiment = response.data.sentiment;
      }
    });

    return socialData;
  }

  /**
   * Normalize review data from providers
   */
  private normalizeReviewData(responses: ProviderResponse[]): ReviewData | undefined {
    const reviewResponses = responses.filter(r => 
      r.data?.averageRating !== undefined || 
      r.data?.totalReviews !== undefined
    );

    if (reviewResponses.length === 0) return undefined;

    const reviewData: ReviewData = {};
    const ratings: number[] = [];
    let totalReviews = 0;
    
    reviewResponses.forEach(response => {
      if (response.data.averageRating !== undefined) {
        ratings.push(response.data.averageRating);
      }
      
      if (response.data.totalReviews !== undefined) {
        totalReviews = Math.max(totalReviews, response.data.totalReviews);
      }
      
      if (response.data.platforms) {
        reviewData.platforms = { ...reviewData.platforms, ...response.data.platforms };
      }
      
      if (response.data.sentiment) {
        reviewData.sentiment = response.data.sentiment;
      }
    });

    if (ratings.length > 0) {
      reviewData.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    
    if (totalReviews > 0) {
      reviewData.totalReviews = totalReviews;
    }

    return reviewData;
  }
}

export const resultNormalizer = new ResultNormalizer();
/**
 * Intel Provider Types and Interfaces
 * 
 * Unified type system for all intelligence providers
 */

export type ProviderType = 'seo' | 'traffic' | 'pricing' | 'serp' | 'social' | 'reviews';

export interface IntelRequest {
  type: 'competitor_analysis' | 'keyword_research' | 'market_analysis' | 'pricing_intelligence';
  target: string; // Domain, product, or keyword
  keywords?: string[];
  location?: string;
  providers: ProviderType[];
  options?: Record<string, any>;
}

export interface ProviderCredentials {
  providerId: string;
  apiKey: string;
  additionalConfig?: Record<string, string>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType[];
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
    exponential: boolean;
  };
  healthCheck: {
    endpoint: string;
    intervalMs: number;
  };
  supportedOperations: string[];
}

export interface ProviderResponse {
  providerId: string;
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: number;
    duration: number;
    cached: boolean;
    ttl?: number;
  };
}

export interface NormalizedResult {
  type: string;
  target: string;
  data: {
    seo?: SEOData;
    traffic?: TrafficData;
    pricing?: PricingData;
    serp?: SERPData;
    social?: SocialData;
    reviews?: ReviewData;
  };
  metadata: {
    providers: string[];
    timestamp: number;
    freshness: 'fresh' | 'cached' | 'stale';
    completeness: number; // 0-1 indicating how many providers responded
  };
}

// Normalized data schemas
export interface SEOData {
  domainAuthority?: number;
  backlinks?: number;
  referringDomains?: number;
  organicKeywords?: number;
  topKeywords?: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    difficulty: number;
  }>;
}

export interface TrafficData {
  monthlyVisits?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  pagesPerSession?: number;
  trafficSources?: {
    direct?: number;
    search?: number;
    social?: number;
    referral?: number;
    paid?: number;
  };
}

export interface PricingData {
  products?: Array<{
    name: string;
    price: number;
    currency: string;
    availability: boolean;
    lastUpdated: number;
  }>;
  priceRange?: {
    min: number;
    max: number;
    avg: number;
    currency: string;
  };
}

export interface SERPData {
  position?: number;
  url?: string;
  title?: string;
  snippet?: string;
  featuredSnippet?: boolean;
  localPack?: boolean;
  adsAbove?: number;
  adsBelow?: number;
}

export interface SocialData {
  platforms?: {
    facebook?: { followers: number; engagement: number };
    instagram?: { followers: number; engagement: number };
    twitter?: { followers: number; engagement: number };
    linkedin?: { followers: number; engagement: number };
  };
  mentions?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ReviewData {
  averageRating?: number;
  totalReviews?: number;
  platforms?: {
    google?: { rating: number; reviews: number };
    yelp?: { rating: number; reviews: number };
    trustpilot?: { rating: number; reviews: number };
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// Streaming response types
export interface StreamChunk {
  type: 'progress' | 'result' | 'complete' | 'error';
  providerId?: string;
  data?: any;
  progress?: {
    completed: number;
    total: number;
    message?: string;
  };
  error?: {
    message: string;
    code: string;
    providerId?: string;
  };
}

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // seconds
  tags?: string[];
}

// Metrics types
export interface ProviderMetrics {
  providerId: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  rateLimitHits: number;
  lastError?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number; // percentage
}

// Rate limiting types
export interface RateLimitState {
  requests: number;
  resetTime: number;
  remaining: number;
}

export interface RateLimiter {
  checkLimit(providerId: string): Promise<boolean>;
  recordRequest(providerId: string): Promise<void>;
  getRemainingRequests(providerId: string): Promise<number>;
  getResetTime(providerId: string): Promise<number>;
}
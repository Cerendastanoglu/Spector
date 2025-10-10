/**
 * Unified Intelligence Provider Interface v2
 * Complete type system for competitor analysis
 */

export type IntelCapability = 
  | 'keywords' 
  | 'traffic' 
  | 'pricing' 
  | 'serp' 
  | 'reviews' 
  | 'social' 
  | 'company_profile';

export interface IntelRequest {
  query: string;              // user query or product keywords
  domain?: string;            // competitor site
  locale?: string;            // 'en-US'
  market?: string;            // 'US','TR', etc.
  productIdentifiers?: string[]; // SKUs, GTINs, etc.
  maxResults?: number;        // default 20
  timeRange?: { from?: string; to?: string }; // ISO dates
  capabilities?: IntelCapability[]; // requested capabilities
  hasUserConsent?: boolean;   // explicit user consent for data collection
}

export interface IntelDatum {
  provider: string;
  capability: IntelCapability;
  payload: any; // raw provider payload
  meta?: { 
    currency?: string; 
    units?: string; 
    confidence?: number;
    timestamp?: string;
    source?: string;
  };
}

export interface IntelProvider {
  name: string;
  capabilities: IntelCapability[];
  isConfigured(shopId: string): Promise<boolean>;
  healthcheck(): Promise<{ ok: boolean; details?: any }>;
  fetch(req: IntelRequest): Promise<IntelDatum[]>;
}

export interface NormalizedIntel {
  entityType: 'competitor' | 'keyword' | 'product' | 'review' | 'mention';
  entityId: string;
  name: string;
  url?: string;
  country?: string;
  metrics: {
    price?: number;
    priceTrend?: { 
      period: '7d' | '30d';
      slope: number;
      change: number;
    };
    estRevenue?: {
      range: string; // "1M-10M"
      confidence: number;
    };
    traffic?: {
      monthlyVisits: number;
      sources: {
        organic: number;
        paid: number;
        referral: number;
        direct: number;
      };
      rank?: number;
    };
    ranking?: {
      position: number;
      keyword: string;
      url: string;
    };
    rating?: {
      average: number;
      count: number;
      platform: string;
    };
    reviews?: {
      count: number;
      lastReviewAt?: string;
      themes: string[];
    };
    keywords?: {
      keyword: string;
      volume: number;
      difficulty: number;
      cpc: number;
      position?: number;
    }[];
    social?: {
      mentions: number;
      sentiment: 'positive' | 'negative' | 'neutral';
      platform: string;
    };
  };
  evidence: Array<{
    provider: string;
    link?: string;
    retrievedAt: string;
  }>;
}

export interface ProviderError {
  provider: string;
  code: string;
  message: string;
  retryAfter?: number;
  budgetExceeded?: boolean;
}

export interface IntelStreamChunk {
  type: 'plan' | 'cache_hit' | 'provider_start' | 'provider_complete' | 'provider_error' | 'progress' | 'complete' | 'error';
  requestId: string;
  timestamp: number;
  provider?: string;
  capability?: IntelCapability;
  data?: NormalizedIntel[] | any;
  error?: ProviderError;
  plan?: {
    capabilities: IntelCapability[];
    providers: string[];
    estimatedCost: number;
    estimatedDuration: number;
    rateLimitWarnings: string[];
  };
  status?: {
    message: string;
    progress: number;
  };
  meta?: {
    duration?: number;
    resultCount?: number;
    cost?: number;
  };
  summary?: {
    totalResults: number;
    providersUsed: number;
    totalDuration: number;
    totalCost: number;
    capabilities: string[];
  };
}

export interface ShopSecrets {
  shopId: string;
  secrets: Record<string, string>; // provider -> encrypted API key
  lastUpdated: string;
}

export interface CacheConfig {
  ttlSeconds: number;
  staleWhileRevalidate?: boolean;
  noStore?: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  budgetLimit?: number; // daily cost limit
}

export interface QueryPlan {
  requestId: string;
  capabilities: IntelCapability[];
  selectedProviders: string[];
  estimatedCost: number;
  estimatedDuration: number;
  cacheStrategy: 'cache_first' | 'network_first' | 'no_cache';
  rateLimitWarnings: string[];
}

export interface ComplianceConfig {
  allowedProviders: string[];
  blockedRegions: string[];
  requiresExplicitConsent: boolean;
  robotsTxtRespect: boolean;
}

export interface ProviderComplianceConfig {
  allowedInRegions?: string[];
  blockedInRegions?: string[];
  requiresExplicitConsent: boolean;
  respectRobots: boolean;
  maxResultsPerQuery?: number;
  commercialUseRestricted?: boolean;
  dataRetentionDays?: number;
}

export interface ComplianceCheckResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
  requiresConsent?: boolean;
  dataRetentionDays?: number;
}

export interface ProviderStatus {
  name: string;
  status: 'active' | 'restricted' | 'blocked';
  restrictions?: string[];
  lastComplianceCheck?: string;
}

export interface IntelSnapshot {
  id: string;
  shopId: string;
  query: IntelRequest;
  results: NormalizedIntel[];
  exportedAt: string;
  format: 'json' | 'csv';
  integrityHash: string;
}

// Provider-specific payload types for normalization
export interface SEOPayload {
  keywords: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    cpc: number;
    position?: number;
    url?: string;
  }>;
  domains: Array<{
    domain: string;
    traffic: number;
    rank: number;
    keywords: number;
  }>;
}

export interface TrafficPayload {
  domain: string;
  monthlyVisits: number;
  trafficSources: {
    organic: number;
    paid: number;
    referral: number;
    direct: number;
    social: number;
  };
  globalRank?: number;
  countryRank?: number;
}

export interface PricingPayload {
  products: Array<{
    name: string;
    price: number;
    currency: string;
    seller: string;
    availability: 'in_stock' | 'out_of_stock' | 'limited';
    lastSeenAt: string;
    productId?: string;
  }>;
}

export interface ReviewsPayload {
  platform: string;
  ratings: {
    average: number;
    count: number;
    distribution: Record<string, number>; // "5": 120, "4": 45, etc.
  };
  reviews: Array<{
    id: string;
    rating: number;
    text?: string;
    date: string;
    verified: boolean;
  }>;
  themes?: string[];
}

export interface SocialPayload {
  mentions: Array<{
    platform: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    recentPosts: Array<{
      url: string;
      date: string;
      engagement: number;
    }>;
  }>;
}

export interface CompanyProfilePayload {
  company: string;
  hqCountry: string;
  employeeRange: string;
  founded?: number;
  industry: string;
  revenue?: {
    estimate: string;
    confidence: number;
    source: string;
  };
}
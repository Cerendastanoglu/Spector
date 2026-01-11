/**
 * Market Research Feature - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the Market Research feature.
 * Designed to be extensible for future additions (Google Trends, AI suggestions, etc.)
 */

// =============================================================================
// Product Performance Types
// =============================================================================

export interface ProductPerformance {
  productId: string;
  productGid: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: string;
  featuredImage: string | null;
  createdAt: string;
  
  // Pricing
  price: number;
  compareAtPrice: number | null;
  currency: string;
  
  // Inventory
  totalInventory: number;
  inventoryTracked: boolean;
  
  // Performance Metrics
  performance: {
    totalSales: number;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    salesVelocity: number; // units per day
    daysWithoutSale: number;
    lastSaleDate: string | null;
    conversionRate: number | null; // If we have view data
  };
  
  // Calculated Scores (0-100)
  scores: {
    overall: number;
    pricing: number;
    inventory: number;
    listing: number;
  };
  
  // Variants summary
  variantCount: number;
  variants: ProductVariantSummary[];
}

export interface ProductVariantSummary {
  variantId: string;
  title: string;
  sku: string | null;
  price: number;
  inventory: number;
  sales: number;
}

// =============================================================================
// Analysis & Insights Types
// =============================================================================

export interface ProductInsight {
  type: InsightType;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  recommendation: string;
  actionable: boolean;
  actionLabel?: string;
  actionType?: InsightActionType;
  metadata?: Record<string, unknown>;
}

export type InsightType = 
  | 'pricing_issue'
  | 'inventory_issue'
  | 'listing_quality'
  | 'no_sales'
  | 'declining_sales'
  | 'seasonal_trend'
  | 'competitor_price'
  | 'seo_opportunity'
  | 'image_quality'
  | 'description_quality';

export type InsightActionType = 
  | 'edit_price'
  | 'edit_inventory'
  | 'edit_listing'
  | 'view_trends'
  | 'run_promotion'
  | 'external_link';

// =============================================================================
// Market Trends Types (Future: Google Trends integration)
// =============================================================================

export interface TrendData {
  keyword: string;
  interest: number; // 0-100
  trend: 'rising' | 'stable' | 'declining';
  changePercent: number;
  timeframe: string;
  relatedQueries: string[];
  seasonalPattern?: SeasonalPattern;
}

export interface SeasonalPattern {
  peakMonths: number[]; // 1-12
  lowMonths: number[];
  isCurrentlyPeak: boolean;
  nextPeakIn: number; // days
}

// =============================================================================
// Price Intelligence Types (Future: Google Shopping, competitor data)
// =============================================================================

export interface PriceIntelligence {
  productId: string;
  yourPrice: number;
  marketData: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    medianPrice: number;
    pricePoints: number; // number of data points
  };
  positioning: 'below_market' | 'competitive' | 'above_market' | 'premium';
  positioningPercent: number; // -30% to +50%
  competitors: CompetitorPrice[];
  lastUpdated: string;
}

export interface CompetitorPrice {
  source: string;
  title: string;
  price: number;
  url: string;
  rating?: number;
  reviewCount?: number;
}

// =============================================================================
// AI Suggestions Types (Future: OpenAI integration)
// =============================================================================

export interface AISuggestion {
  id: string;
  category: 'title' | 'description' | 'pricing' | 'images' | 'tags' | 'general';
  priority: 'high' | 'medium' | 'low';
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
  estimatedImpact: string;
  confidence: number; // 0-1
}

// =============================================================================
// Analysis Request/Response Types
// =============================================================================

export interface AnalysisRequest {
  shop: string;
  productIds?: string[]; // If empty, analyze worst performers
  analysisType: AnalysisType;
  options?: AnalysisOptions;
}

export type AnalysisType = 
  | 'underperformers' // Find worst selling products
  | 'full_catalog'    // Analyze all products (paid feature)
  | 'single_product'  // Deep dive on one product
  | 'category';       // Analyze by product type

export interface AnalysisOptions {
  timeframeDays: number;
  includeVariants: boolean;
  includeTrends: boolean;
  includePriceIntel: boolean;
  includeAISuggestions: boolean;
  limit?: number;
}

export interface AnalysisResponse {
  success: boolean;
  timestamp: string;
  shop: string;
  analysisType: AnalysisType;
  
  // Summary stats
  summary: {
    productsAnalyzed: number;
    totalProducts: number;
    underperformersCount: number;
    averageScore: number;
    totalPotentialRevenue: number;
  };
  
  // Main data
  products: ProductPerformance[];
  insights: ProductInsight[];
  
  // Feature flags (what's available based on subscription)
  features: {
    trendsEnabled: boolean;
    priceIntelEnabled: boolean;
    aiSuggestionsEnabled: boolean;
    fullCatalogEnabled: boolean;
  };
  
  // Optional expanded data
  trends?: TrendData[];
  priceIntelligence?: PriceIntelligence[];
  aiSuggestions?: AISuggestion[];
  
  // Errors/warnings
  errors?: string[];
  warnings?: string[];
}

// =============================================================================
// Feature Access Types
// =============================================================================

export interface MarketResearchAccess {
  tier: 'free' | 'trial' | 'basic' | 'pro';
  limits: {
    productsPerAnalysis: number;
    analysesPerDay: number;
    trendsEnabled: boolean;
    priceIntelEnabled: boolean;
    aiSuggestionsEnabled: boolean;
    fullCatalogEnabled: boolean;
    exportEnabled: boolean;
  };
  usage: {
    analysesToday: number;
    lastAnalysisAt: string | null;
  };
}

// Default limits by tier
export const MARKET_RESEARCH_LIMITS: Record<string, MarketResearchAccess['limits']> = {
  free: {
    productsPerAnalysis: 3,
    analysesPerDay: 3,
    trendsEnabled: false,
    priceIntelEnabled: false,
    aiSuggestionsEnabled: false,
    fullCatalogEnabled: false,
    exportEnabled: false,
  },
  trial: {
    productsPerAnalysis: 3,
    analysesPerDay: 5,
    trendsEnabled: false,
    priceIntelEnabled: false,
    aiSuggestionsEnabled: false,
    fullCatalogEnabled: false,
    exportEnabled: false,
  },
  basic: {
    productsPerAnalysis: -1, // Unlimited
    analysesPerDay: -1,
    trendsEnabled: true,
    priceIntelEnabled: false, // Future paid add-on
    aiSuggestionsEnabled: false, // Future paid add-on
    fullCatalogEnabled: true,
    exportEnabled: true,
  },
  pro: {
    productsPerAnalysis: -1,
    analysesPerDay: -1,
    trendsEnabled: true,
    priceIntelEnabled: true,
    aiSuggestionsEnabled: true,
    fullCatalogEnabled: true,
    exportEnabled: true,
  },
};

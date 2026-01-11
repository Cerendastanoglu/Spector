/**
 * Market Research Service
 * 
 * Provides analysis of product performance, identifies underperformers,
 * and generates actionable insights for merchants.
 * 
 * Phase 1: Basic underperformer analysis
 * - Identify worst-selling products based on sales data
 * - Generate performance scores
 * - Provide basic insights and recommendations
 * 
 * Future Phases:
 * - Phase 2: Google Trends integration
 * - Phase 3: Price intelligence (Google Shopping)
 * - Phase 4: AI-powered suggestions (OpenAI)
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type {
  ProductPerformance,
  ProductInsight,
  AnalysisResponse,
  AnalysisOptions,
  MarketResearchAccess,
  InsightType,
} from "~/types/marketResearch";
import { MARKET_RESEARCH_LIMITS } from "~/types/marketResearch";
import { logger } from "~/utils/logger";
import { checkSubscriptionStatus } from "./billing.server";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ANALYSIS_DAYS = 30;
const MAX_ORDERS_TO_FETCH = 250;
const UNDERPERFORMER_THRESHOLD = 0.1; // Bottom 10% are underperformers

// =============================================================================
// GraphQL Queries
// =============================================================================

const GET_PRODUCTS_WITH_VARIANTS_QUERY = `#graphql
  query GetProductsForAnalysis($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          status
          createdAt
          totalInventory
          tracksInventory
          featuredMedia {
            preview {
              image {
                url(transform: { maxWidth: 100 })
              }
            }
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

const GET_ORDERS_QUERY = `#graphql
  query GetRecentOrders($first: Int!, $query: String!) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
      edges {
        node {
          id
          createdAt
          displayFinancialStatus
          lineItems(first: 50) {
            edges {
              node {
                id
                quantity
                originalTotalSet {
                  shopMoney {
                    amount
                  }
                }
                variant {
                  id
                  product {
                    id
                  }
                }
                product {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

// =============================================================================
// Feature Access
// =============================================================================

/**
 * Get market research access level for a shop
 */
export async function getMarketResearchAccess(
  graphql: any,
  shop: string
): Promise<MarketResearchAccess> {
  try {
    const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(graphql, shop);
    
    let tier: MarketResearchAccess['tier'] = 'free';
    
    if (hasActiveSubscription && subscription) {
      // Check if in trial
      const trialDays = subscription.trialDays || 0;
      const createdAt = new Date(subscription.createdAt);
      const trialEndDate = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const isInTrial = new Date() < trialEndDate;
      
      if (isInTrial) {
        tier = 'trial';
      } else if (subscription.name.toLowerCase().includes('pro')) {
        tier = 'pro';
      } else {
        tier = 'basic';
      }
    }
    
    const limits = MARKET_RESEARCH_LIMITS[tier];
    
    return {
      tier,
      limits,
      usage: {
        analysesToday: 0, // TODO: Track in database
        lastAnalysisAt: null,
      },
    };
  } catch (error) {
    logger.error('[MarketResearch] Error getting access level:', error);
    // Default to free tier on error
    return {
      tier: 'free',
      limits: MARKET_RESEARCH_LIMITS.free,
      usage: {
        analysesToday: 0,
        lastAnalysisAt: null,
      },
    };
  }
}

// =============================================================================
// Product Analysis
// =============================================================================

/**
 * Analyze product performance and identify underperformers
 */
export async function analyzeProducts(
  admin: AdminApiContext,
  shop: string,
  options: Partial<AnalysisOptions> = {}
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  
  const analysisOptions: AnalysisOptions = {
    timeframeDays: options.timeframeDays || DEFAULT_ANALYSIS_DAYS,
    includeVariants: options.includeVariants ?? true,
    includeTrends: options.includeTrends ?? false,
    includePriceIntel: options.includePriceIntel ?? false,
    includeAISuggestions: options.includeAISuggestions ?? false,
    limit: options.limit,
  };
  
  try {
    logger.info(`[MarketResearch] Starting analysis for ${shop}`, { options: analysisOptions });
    
    // Get access level
    const access = await getMarketResearchAccess(admin.graphql, shop);
    const productLimit = access.limits.productsPerAnalysis === -1 
      ? undefined 
      : access.limits.productsPerAnalysis;
    
    // Step 1: Fetch all products
    const products = await fetchAllProducts(admin);
    logger.info(`[MarketResearch] Fetched ${products.length} products`);
    
    // Step 2: Fetch orders for the timeframe
    const orders = await fetchOrders(admin, analysisOptions.timeframeDays);
    logger.info(`[MarketResearch] Fetched ${orders.length} orders`);
    
    // Step 3: Calculate sales data per product
    const salesMap = calculateProductSales(orders, analysisOptions.timeframeDays);
    
    // Step 4: Build product performance data
    const productPerformances = buildProductPerformances(products, salesMap, analysisOptions.timeframeDays);
    
    // Step 5: Sort by performance (worst first) and limit results
    const sortedProducts = productPerformances
      .sort((a, b) => a.scores.overall - b.scores.overall)
      .slice(0, productLimit);
    
    // Step 6: Generate insights for underperformers
    const insights = generateInsights(sortedProducts);
    
    // Calculate summary stats
    const avgScore = productPerformances.length > 0
      ? productPerformances.reduce((sum, p) => sum + p.scores.overall, 0) / productPerformances.length
      : 0;
    
    const underperformersCount = productPerformances.filter(
      p => p.scores.overall < avgScore * UNDERPERFORMER_THRESHOLD * 10
    ).length;
    
    const elapsed = Date.now() - startTime;
    logger.info(`[MarketResearch] Analysis complete in ${elapsed}ms`, {
      productsAnalyzed: sortedProducts.length,
      totalProducts: products.length,
      underperformersCount,
    });
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      shop,
      analysisType: 'underperformers',
      summary: {
        productsAnalyzed: sortedProducts.length,
        totalProducts: products.length,
        underperformersCount,
        averageScore: Math.round(avgScore),
        totalPotentialRevenue: 0, // TODO: Calculate potential improvement
      },
      products: sortedProducts,
      insights,
      features: {
        trendsEnabled: access.limits.trendsEnabled,
        priceIntelEnabled: access.limits.priceIntelEnabled,
        aiSuggestionsEnabled: access.limits.aiSuggestionsEnabled,
        fullCatalogEnabled: access.limits.fullCatalogEnabled,
      },
    };
  } catch (error) {
    logger.error('[MarketResearch] Analysis failed:', error);
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      shop,
      analysisType: 'underperformers',
      summary: {
        productsAnalyzed: 0,
        totalProducts: 0,
        underperformersCount: 0,
        averageScore: 0,
        totalPotentialRevenue: 0,
      },
      products: [],
      insights: [],
      features: {
        trendsEnabled: false,
        priceIntelEnabled: false,
        aiSuggestionsEnabled: false,
        fullCatalogEnabled: false,
      },
      errors: [error instanceof Error ? error.message : 'Analysis failed'],
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetch all products from the shop (with pagination)
 */
async function fetchAllProducts(admin: AdminApiContext): Promise<any[]> {
  const allProducts: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const pageSize = 100;
  
  while (hasNextPage && allProducts.length < 1000) { // Cap at 1000 for performance
    try {
      const response = await admin.graphql(GET_PRODUCTS_WITH_VARIANTS_QUERY, {
        variables: {
          first: pageSize,
          after: cursor,
        },
      });
      
      const data: any = await response.json();
      
      if (data.errors) {
        logger.error('[MarketResearch] Products query errors:', data.errors);
        break;
      }
      
      const products = data.data?.products?.edges?.map((e: any) => e.node) || [];
      allProducts.push(...products);
      
      hasNextPage = data.data?.products?.pageInfo?.hasNextPage || false;
      cursor = data.data?.products?.pageInfo?.endCursor || null;
      
      logger.debug(`[MarketResearch] Fetched page: ${products.length} products, hasNextPage: ${hasNextPage}`);
    } catch (error) {
      logger.error('[MarketResearch] Error fetching products:', error);
      break;
    }
  }
  
  return allProducts;
}

/**
 * Fetch orders for the analysis timeframe
 */
async function fetchOrders(admin: AdminApiContext, days: number): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateISO = startDate.toISOString().split('T')[0];
    
    const response = await admin.graphql(GET_ORDERS_QUERY, {
      variables: {
        first: MAX_ORDERS_TO_FETCH,
        query: `created_at:>='${startDateISO}'`,
      },
    });
    
    const data: any = await response.json();
    
    if (data.errors) {
      logger.warn('[MarketResearch] Orders query errors (may lack access):', data.errors);
      return [];
    }
    
    return data.data?.orders?.edges?.map((e: any) => e.node) || [];
  } catch (error) {
    logger.error('[MarketResearch] Error fetching orders:', error);
    return [];
  }
}

/**
 * Calculate sales metrics per product from order data
 */
function calculateProductSales(
  orders: any[],
  _timeframeDays: number
): Map<string, { totalSales: number; totalRevenue: number; orderCount: number; lastSaleDate: string | null }> {
  const salesMap = new Map<string, { 
    totalSales: number; 
    totalRevenue: number; 
    orderCount: number; 
    lastSaleDate: string | null;
  }>();
  
  for (const order of orders) {
    const lineItems = order.lineItems?.edges || [];
    
    for (const { node: item } of lineItems) {
      const productId = item.product?.id || item.variant?.product?.id;
      
      if (!productId) continue;
      
      const quantity = item.quantity || 0;
      const revenue = parseFloat(item.originalTotalSet?.shopMoney?.amount || '0');
      
      const existing = salesMap.get(productId) || {
        totalSales: 0,
        totalRevenue: 0,
        orderCount: 0,
        lastSaleDate: null,
      };
      
      existing.totalSales += quantity;
      existing.totalRevenue += revenue;
      existing.orderCount += 1;
      
      // Track most recent sale
      if (!existing.lastSaleDate || order.createdAt > existing.lastSaleDate) {
        existing.lastSaleDate = order.createdAt;
      }
      
      salesMap.set(productId, existing);
    }
  }
  
  return salesMap;
}

/**
 * Build product performance objects with calculated scores
 */
function buildProductPerformances(
  products: any[],
  salesMap: Map<string, { totalSales: number; totalRevenue: number; orderCount: number; lastSaleDate: string | null }>,
  timeframeDays: number
): ProductPerformance[] {
  const performances: ProductPerformance[] = [];
  const now = new Date();
  
  for (const product of products) {
    const productId = product.id;
    const sales = salesMap.get(productId);
    
    // Get price from first variant or price range
    const firstVariant = product.variants?.edges?.[0]?.node;
    const price = parseFloat(firstVariant?.price || product.priceRange?.minVariantPrice?.amount || '0');
    const compareAtPrice = firstVariant?.compareAtPrice 
      ? parseFloat(firstVariant.compareAtPrice) 
      : null;
    const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';
    
    // Calculate performance metrics
    const totalSales = sales?.totalSales || 0;
    const totalRevenue = sales?.totalRevenue || 0;
    const totalOrders = sales?.orderCount || 0;
    const lastSaleDate = sales?.lastSaleDate || null;
    
    // Calculate days without sale
    let daysWithoutSale = timeframeDays;
    if (lastSaleDate) {
      const lastSale = new Date(lastSaleDate);
      daysWithoutSale = Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Calculate sales velocity (units per day)
    const salesVelocity = totalSales / timeframeDays;
    
    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate scores (0-100)
    const scores = calculateScores({
      totalSales,
      totalRevenue,
      daysWithoutSale,
      inventory: product.totalInventory || 0,
      hasImage: !!product.featuredMedia?.preview?.image?.url,
      hasDescription: false, // Would need to fetch description
      price,
      compareAtPrice,
    }, timeframeDays);
    
    // Build variant summaries
    const variants = (product.variants?.edges || []).map((e: any) => ({
      variantId: e.node.id,
      title: e.node.title,
      sku: e.node.sku,
      price: parseFloat(e.node.price || '0'),
      inventory: e.node.inventoryQuantity || 0,
      sales: 0, // TODO: Track per-variant sales
    }));
    
    performances.push({
      productId: productId.replace('gid://shopify/Product/', ''),
      productGid: productId,
      title: product.title,
      handle: product.handle,
      vendor: product.vendor || '',
      productType: product.productType || '',
      status: product.status,
      featuredImage: product.featuredMedia?.preview?.image?.url || null,
      createdAt: product.createdAt,
      price,
      compareAtPrice,
      currency,
      totalInventory: product.totalInventory || 0,
      inventoryTracked: product.tracksInventory || false,
      performance: {
        totalSales,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        salesVelocity,
        daysWithoutSale,
        lastSaleDate,
        conversionRate: null, // Would need analytics data
      },
      scores,
      variantCount: variants.length,
      variants,
    });
  }
  
  return performances;
}

/**
 * Calculate performance scores for a product
 */
function calculateScores(
  data: {
    totalSales: number;
    totalRevenue: number;
    daysWithoutSale: number;
    inventory: number;
    hasImage: boolean;
    hasDescription: boolean;
    price: number;
    compareAtPrice: number | null;
  },
  timeframeDays: number
): ProductPerformance['scores'] {
  // Sales score (0-100 based on velocity)
  const maxExpectedDailySales = 2; // Adjust based on typical store
  const salesVelocity = data.totalSales / timeframeDays;
  const salesScore = Math.min(100, (salesVelocity / maxExpectedDailySales) * 100);
  
  // Recency score (penalize products with no recent sales)
  const recencyScore = Math.max(0, 100 - (data.daysWithoutSale * (100 / timeframeDays)));
  
  // Inventory score (penalize overstocking or zero inventory)
  let inventoryScore = 50;
  if (data.inventory === 0) {
    inventoryScore = 20; // Out of stock is bad
  } else if (data.inventory > 100) {
    inventoryScore = 30; // Overstocked
  } else if (data.inventory < 5) {
    inventoryScore = 60; // Low but available
  } else {
    inventoryScore = 80; // Healthy inventory
  }
  
  // Listing quality score
  let listingScore = 50;
  if (data.hasImage) listingScore += 25;
  if (data.hasDescription) listingScore += 25;
  
  // Pricing score (having compare-at price is good for conversions)
  let pricingScore = 50;
  if (data.compareAtPrice && data.compareAtPrice > data.price) {
    pricingScore = 80; // Has a discount displayed
  }
  
  // Overall score (weighted average)
  const overall = Math.round(
    salesScore * 0.4 +
    recencyScore * 0.3 +
    inventoryScore * 0.15 +
    listingScore * 0.1 +
    pricingScore * 0.05
  );
  
  return {
    overall,
    pricing: Math.round(pricingScore),
    inventory: Math.round(inventoryScore),
    listing: Math.round(listingScore),
  };
}

/**
 * Generate actionable insights for products
 */
function generateInsights(products: ProductPerformance[]): ProductInsight[] {
  const insights: ProductInsight[] = [];
  
  for (const product of products) {
    const { performance, title } = product;
    
    // No sales insight
    if (performance.totalSales === 0) {
      insights.push({
        type: 'no_sales' as InsightType,
        severity: 'critical',
        title: `"${title}" has no sales`,
        description: `This product hasn't sold any units in the analysis period.`,
        recommendation: 'Consider reviewing the pricing, improving product images, or running a promotion to generate initial sales.',
        actionable: true,
        actionLabel: 'Review Product',
        actionType: 'edit_listing',
        metadata: { productId: product.productId },
      });
    }
    
    // Long time without sale
    else if (performance.daysWithoutSale > 14) {
      insights.push({
        type: 'declining_sales' as InsightType,
        severity: 'warning',
        title: `"${title}" hasn't sold in ${performance.daysWithoutSale} days`,
        description: `This product had sales before but has gone ${performance.daysWithoutSale} days without a sale.`,
        recommendation: 'Review if the product is still relevant, check competitor pricing, or consider running a flash sale.',
        actionable: true,
        actionLabel: 'View Trends',
        actionType: 'view_trends',
        metadata: { productId: product.productId, daysWithoutSale: performance.daysWithoutSale },
      });
    }
    
    // Inventory issues
    if (product.totalInventory === 0 && product.inventoryTracked) {
      insights.push({
        type: 'inventory_issue' as InsightType,
        severity: 'critical',
        title: `"${title}" is out of stock`,
        description: `This product has zero inventory and cannot be sold.`,
        recommendation: 'Restock this product or mark it as unavailable if discontinued.',
        actionable: true,
        actionLabel: 'Update Inventory',
        actionType: 'edit_inventory',
        metadata: { productId: product.productId },
      });
    } else if (product.totalInventory > 100 && performance.totalSales < 5) {
      insights.push({
        type: 'inventory_issue' as InsightType,
        severity: 'warning',
        title: `"${title}" may be overstocked`,
        description: `You have ${product.totalInventory} units but only sold ${performance.totalSales} in the analysis period.`,
        recommendation: 'Consider running a discount to reduce excess inventory and free up capital.',
        actionable: true,
        actionLabel: 'Run Promotion',
        actionType: 'run_promotion',
        metadata: { productId: product.productId, inventory: product.totalInventory },
      });
    }
    
    // No featured image
    if (!product.featuredImage) {
      insights.push({
        type: 'image_quality' as InsightType,
        severity: 'warning',
        title: `"${title}" has no featured image`,
        description: `Products without images typically have lower conversion rates.`,
        recommendation: 'Add high-quality product images to improve visibility and trust.',
        actionable: true,
        actionLabel: 'Add Images',
        actionType: 'edit_listing',
        metadata: { productId: product.productId },
      });
    }
    
    // Pricing opportunity
    if (!product.compareAtPrice && performance.totalSales < 3) {
      insights.push({
        type: 'pricing_issue' as InsightType,
        severity: 'info',
        title: `"${title}" could benefit from a compare-at price`,
        description: `Adding a compare-at price creates urgency and can boost conversions.`,
        recommendation: 'Set a compare-at price to show savings to customers.',
        actionable: true,
        actionLabel: 'Edit Price',
        actionType: 'edit_price',
        metadata: { productId: product.productId, currentPrice: product.price },
      });
    }
  }
  
  return insights;
}

// =============================================================================
// Export additional utilities
// =============================================================================

export { MARKET_RESEARCH_LIMITS };

import { LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
import { encryptData, decryptData } from "../utils/encryption";
import { getRetentionPolicy, calculateExpirationDate } from "../utils/dataRetention";
import { applyRateLimit, getRateLimitHeaders } from "../utils/rateLimit";
import { RATE_LIMITS } from "../utils/security";
import logger from "../utils/logger";

const prisma = new PrismaClient();

// Maximum number of products to analyze
const MAX_PRODUCTS = 250;

// Define types for analytics data
type AnalyticsData = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  topProducts: Array<{ name: string; quantity: number; price: number; }>;
  recentActivity: Array<Record<string, never>>;  // Empty array as functionality removed
  dataSource: string;
  lastUpdated: string;
};

// Handler for GET requests to fetch analytics
export async function loader({ request }: LoaderFunctionArgs) {
  // Apply rate limiting - 30 requests per minute for analytics
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_ANALYTICS);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Fetch products using GraphQL (limited to MAX_PRODUCTS)
    const response = await admin.graphql(
      `#graphql
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              status
              updatedAt
              variants(first: 100) {
                edges {
                  node {
                    id
                    inventoryQuantity
                    price
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { first: MAX_PRODUCTS } }
    );

    const data = await response.json();
    const products = data.data.products.edges.map((edge: any) => edge.node);
    logger.debug(`📊 Analyzing ${products.length} products...`);

    let totalInventoryValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    // Process products
    const topProducts = products
      .map((product: any) => {
        // Track inventory stats
        let totalQuantity = 0;
        let avgPrice = 0;
        let hasVariants = false;

        const variants = product.variants || [];
        
        variants.forEach((variant: any) => {
          const quantity = variant.inventory_quantity || 0;
          const price = parseFloat(variant.price) || 0;
          
          // Update counters
          totalQuantity += quantity;
          avgPrice += price;
          
          if (quantity === 0) {
            outOfStockCount++;
          } else if (quantity <= 5) {
            lowStockCount++;
          }
          
          // Add to total inventory value
          totalInventoryValue += price * quantity;

          if (variants.length > 1) {
            hasVariants = true;
          }
        });

        if (hasVariants) {
          avgPrice = avgPrice / variants.length;
        }

        return {
          name: product.title,
          quantity: totalQuantity,
          price: avgPrice,
        };
      })
      .filter((product: any) => product.quantity > 0)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    const analyticsData: AnalyticsData = {
      totalRevenue: totalInventoryValue, // Using inventory value as proxy
      totalOrders: 0, // No order data available
      avgOrderValue: 0, // No order data available
      outOfStockCount,
      lowStockCount,
      topProducts,
      recentActivity: [], // Recent activity functionality removed
      dataSource: 'live',
      lastUpdated: new Date().toISOString(),
    };

    // Cache the data with encryption and retention
    try {
      const retentionDays = await getRetentionPolicy(shop, 'analytics');
      const expiresAt = calculateExpirationDate(retentionDays);
      
      await prisma.analyticsSnapshot.create({
        data: {
          shop,
          dataType: 'dashboard',
          encryptedData: encryptData(JSON.stringify(analyticsData)),
          expiresAt,
        }
      });
      
      logger.debug(`Analytics data cached for ${retentionDays} days`);
    } catch (error) {
      logger.error('Failed to cache analytics data:', error);
    }

    // Add rate limit headers to response
    const rateLimitHeaders = getRateLimitHeaders(request, RATE_LIMITS.API_ANALYTICS);
    return json(analyticsData, { headers: rateLimitHeaders });
    
  } catch (error: any) {
    logger.error('Error fetching analytics:', error.message);
    
    // Try to return cached data if available
    try {
      const latestSnapshot = await prisma.analyticsSnapshot.findFirst({
        where: {
          shop,
          dataType: 'dashboard',
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (latestSnapshot) {
        // Return cached data with source indicator
        const cachedData = JSON.parse(decryptData(latestSnapshot.encryptedData));
        return json({
          ...cachedData,
          dataSource: 'cached',
          error: error.message
        });
      }
    } catch (cacheError) {
      logger.error('Error fetching cached analytics:', cacheError);
    }

    // Return error response if no cached data available
    return json({ 
      error: 'Failed to fetch analytics data',
      dataSource: 'error',
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      topProducts: [],
      recentActivity: [],
      lastUpdated: new Date().toISOString(),
    }, { status: 500 });
  }
}

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
import { encryptData, decryptData } from "../utils/encryption";
import { getRetentionPolicy, calculateExpirationDate } from "../utils/dataRetention";

const prisma = new PrismaClient();

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  recentActivity: Array<{
    id: string;
    name: string;
    type: 'product' | 'inventory';
    value: number;
    date: string;
  }>;
  dataSource: 'live' | 'cached';
  lastUpdated: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Check for cached data first
    const cachedData = await prisma.analyticsSnapshot.findFirst({
      where: {
        shop,
        dataType: 'analytics',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If we have recent cached data (less than 1 hour old), use it
    if (cachedData && (Date.now() - cachedData.createdAt.getTime()) < 60 * 60 * 1000) {
      console.log("Using cached analytics data");
      const decryptedData = decryptData(cachedData.encryptedData);
      return json({ 
        success: true, 
        data: {
          ...decryptedData,
          dataSource: 'cached' as const,
          lastUpdated: cachedData.createdAt.toISOString(),
        }
      });
    }

    console.log("Fetching fresh analytics data from Shopify");

    // Fetch products data only (no orders due to Protected Customer Data requirements)
    const productsResponse = await admin.graphql(
      `#graphql
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              totalInventory
              status
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                    sku
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          first: 50,
        },
      }
    );

    const productsData: any = await productsResponse.json();

    if (productsData.errors) {
      console.error("GraphQL errors:", productsData.errors);
      throw new Error(`GraphQL Error: ${productsData.errors[0]?.message || "Unknown error"}`);
    }

    // Process products data
    const products = productsData.data?.products?.edges || [];
    const now = new Date();
    
    // Calculate analytics from product data only
    let totalInventoryValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const recentActivity: Array<{
      id: string;
      name: string;
      type: 'product' | 'inventory';
      value: number;
      date: string;
    }> = [];

    const topProducts = products
      .map((productEdge: any) => {
        const product = productEdge.node;
        const variants = product.variants?.edges || [];
        let totalQuantity = 0;
        let avgPrice = 0;
        let hasVariants = false;

        variants.forEach((variantEdge: any) => {
          const variant = variantEdge.node;
          const quantity = variant?.inventoryQuantity || 0;
          const price = parseFloat(variant?.price || "0");
          
          totalQuantity += quantity;
          avgPrice += price;
          hasVariants = true;
          
          // Track inventory value
          totalInventoryValue += quantity * price;
          
          // Count stock levels
          if (quantity === 0) {
            outOfStockCount++;
          } else if (quantity < 5) {
            lowStockCount++;
          }
        });

        if (hasVariants) {
          avgPrice = avgPrice / variants.length;
        }

        // Add to recent activity (based on recent updates)
        const updatedAt = new Date(product.updatedAt);
        if (updatedAt.getTime() > (now.getTime() - 7 * 24 * 60 * 60 * 1000)) { // Last 7 days
          recentActivity.push({
            id: product.id,
            name: product.title,
            type: 'product',
            value: totalQuantity,
            date: updatedAt.toLocaleDateString(),
          });
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

    // Sort recent activity by date
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const analyticsData: AnalyticsData = {
      totalRevenue: totalInventoryValue, // Using inventory value as proxy
      totalOrders: 0, // No order data available
      avgOrderValue: 0, // No order data available
      outOfStockCount,
      lowStockCount,
      topProducts,
      recentActivity: recentActivity.slice(0, 10),
      dataSource: 'live',
      lastUpdated: now.toISOString(),
    };

    // Cache the data with encryption and retention
    try {
      const retentionDays = await getRetentionPolicy(shop, 'analytics');
      const expiresAt = calculateExpirationDate(retentionDays);
      
      await prisma.analyticsSnapshot.create({
        data: {
          shop,
          dataType: 'analytics',
          encryptedData: encryptData(analyticsData),
          expiresAt,
        },
      });
      
      console.log(`Analytics data cached for ${retentionDays} days`);
    } catch (cacheError) {
      console.error("Failed to cache analytics data:", cacheError);
      // Continue without caching
    }

    return json({ success: true, data: analyticsData });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch analytics data" 
      },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  // Handle POST requests (same as loader for now)
  return loader({ request, params, context: {} });
}

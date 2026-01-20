import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { applyRateLimit } from "~/utils/rateLimit";
import { RATE_LIMITS } from "~/utils/security";
import { logger } from "~/utils/logger";

interface OutOfStockProduct {
  id: string;
  title: string;
  handle: string;
  sku: string;
  price: number;
  vendor: string;
  productType: string;
  totalVariants: number;
  outOfStockVariants: number;
  variantIds: string[];  // All variant IDs for inventory updates
  avgDailySales: number;  // From order history
  daysSinceLastSale: number;
  recommendedReorder: number;
  safetyStockBuffer: number | null;  // User-set buffer percentage
}

interface ProductAnalyticsData {
  totalProducts: number;
  activeProducts: number;
  totalCatalogValue: number;
  avgProductPrice: number;
  catalogHealth: number;
  topProducts: Array<{
    id: string;
    name: string;
    value: number;
    variants: number;
    inventoryStatus: string;
    priceRange: string;
  }>;
  inventoryDistribution: {
    wellStocked: number;
    lowStock: number;
    outOfStock: number;
  };
  outOfStockProducts: OutOfStockProduct[];  // Detailed list of OOS products
  lowStockProducts: OutOfStockProduct[];     // Detailed list of low stock products
  priceAnalysis: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    priceDistribution: Array<{
      range: string;
      count: number;
      orders: number;
    }>;
  };
  hasOrderAccess?: boolean; // Flag indicating if order data is available
}

// Function to create comprehensive price ranges that work for all price levels
function calculateDynamicPriceRanges(
  prices: number[], 
  priceToOrdersMap: { [price: string]: number } = {}
): Array<{ range: string; count: number; orders: number }> {
  if (prices.length === 0) {
    return [];
  }

  // Comprehensive price ranges that work for any store
  const ranges = {
    "Under $10": { count: 0, orders: 0 },
    "$10-$25": { count: 0, orders: 0 },
    "$25-$50": { count: 0, orders: 0 },
    "$50-$100": { count: 0, orders: 0 },
    "$100-$250": { count: 0, orders: 0 },
    "$250-$500": { count: 0, orders: 0 },
    "$500-$750": { count: 0, orders: 0 },
    "$750-$1,000": { count: 0, orders: 0 },
    "$1,000-$1,500": { count: 0, orders: 0 },
    "$1,500-$2,500": { count: 0, orders: 0 },
    "$2,500-$5,000": { count: 0, orders: 0 },
    "$5,000-$10,000": { count: 0, orders: 0 },
    "Over $10,000": { count: 0, orders: 0 }
  };
  
  // Check if we have enough real order data
  const totalRealOrders = Object.values(priceToOrdersMap).reduce((sum, orders) => sum + orders, 0);
  
  logger.info(`🔵 Total real orders: ${totalRealOrders}`);
  logger.info(`🔵 Real order data available: ${totalRealOrders > 0 ? 'Yes' : 'No'}`);
  
  prices.forEach((price) => {
    // Get real order data for this price point
    const realOrders = priceToOrdersMap[price.toFixed(2)] || 0;
    
    // Use only real order data - no simulation
    const ordersToAdd = realOrders;
    
    if (price < 10) {
      ranges["Under $10"].count++;
      ranges["Under $10"].orders += ordersToAdd;
    } else if (price < 25) {
      ranges["$10-$25"].count++;
      ranges["$10-$25"].orders += ordersToAdd;
    } else if (price < 50) {
      ranges["$25-$50"].count++;
      ranges["$25-$50"].orders += ordersToAdd;
    } else if (price < 100) {
      ranges["$50-$100"].count++;
      ranges["$50-$100"].orders += ordersToAdd;
    } else if (price < 250) {
      ranges["$100-$250"].count++;
      ranges["$100-$250"].orders += ordersToAdd;
    } else if (price < 500) {
      ranges["$250-$500"].count++;
      ranges["$250-$500"].orders += ordersToAdd;
    } else if (price < 750) {
      ranges["$500-$750"].count++;
      ranges["$500-$750"].orders += ordersToAdd;
    } else if (price < 1000) {
      ranges["$750-$1,000"].count++;
      ranges["$750-$1,000"].orders += ordersToAdd;
    } else if (price < 1500) {
      ranges["$1,000-$1,500"].count++;
      ranges["$1,000-$1,500"].orders += ordersToAdd;
    } else if (price < 2500) {
      ranges["$1,500-$2,500"].count++;
      ranges["$1,500-$2,500"].orders += ordersToAdd;
    } else if (price < 5000) {
      ranges["$2,500-$5,000"].count++;
      ranges["$2,500-$5,000"].orders += ordersToAdd;
    } else if (price < 10000) {
      ranges["$5,000-$10,000"].count++;
      ranges["$5,000-$10,000"].orders += ordersToAdd;
    } else {
      ranges["Over $10,000"].count++;
      ranges["Over $10,000"].orders += ordersToAdd;
    }
  });
  
  // Return all ranges, including those with 0 count for consistent slider display
  return Object.entries(ranges).map(([range, { count, orders }]) => ({ range, count, orders }));
}

// Shared function for both GET (loader) and POST (action) requests
async function getProductAnalytics(request: Request) {
  // Apply rate limiting (60 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_DEFAULT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    logger.info("🔵 Product Analytics API: Starting analysis...");
    logger.info("🔵 Product Analytics API: Request URL:", request.url);
    logger.info("🔵 Product Analytics API: Request method:", request.method);
    
    const { admin } = await authenticate.admin(request);
    logger.info("🔵 Product Analytics API: Authentication successful");

    // GraphQL query to get products and orders
    const productsResponse = await admin.graphql(`
      query {
        products(first: 50) {
          edges {
            node {
              id
              title
              status
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                    inventoryItem {
                      tracked
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    // GraphQL query to get recent orders (last 250 orders)
    // Note: Orders require protected customer data access
    let ordersData: any = { data: { orders: { edges: [] } } };
    let hasOrderAccess = true;
    
    try {
      const ordersResponse = await admin.graphql(`
        query {
          orders(first: 250, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                totalPriceSet {
                  shopMoney {
                    amount
                  }
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      quantity
                      variant {
                        id
                        price
                        product {
                          id
                          title
                        }
                      }
                      product {
                        id
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);
      
      ordersData = await ordersResponse.json();
      
      if (ordersData.errors) {
        logger.warn("⚠️ Product Analytics API: Orders access denied (protected customer data)");
        hasOrderAccess = false;
        ordersData = { data: { orders: { edges: [] } } };
      } else {
        logger.info("🔵 Product Analytics API: Orders fetched successfully");
      }
    } catch (orderError) {
      logger.warn("⚠️ Product Analytics API: Orders query failed, continuing without order data:", orderError);
      hasOrderAccess = false;
    }

    const productsData: any = await productsResponse.json();
    
    logger.info("🔵 Product Analytics API: Products fetched successfully");
    
    if (productsData.errors) {
      logger.error("🔴 Product Analytics API: GraphQL errors:", productsData.errors);
      return json({ 
        success: false, 
        error: `GraphQL Error: ${productsData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    const products = productsData.data?.products?.edges || [];
    const orders = ordersData.data?.orders?.edges || [];
    
    logger.info(`🔵 Product Analytics API: Found ${products.length} products`);
    logger.info(`🔵 Product Analytics API: Found ${orders.length} orders`);

    // Process product data
    const totalProducts = products.length;
    let activeProducts = 0;
    let totalCatalogValue = 0;
    let totalPrice = 0;
    let variantCount = 0;
    let wellStocked = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const topProducts: Array<{
      id: string;
      name: string;
      value: number;
      variants: number;
      inventoryStatus: string;
      priceRange: string;
    }> = [];

    // Lists for out-of-stock and low-stock products
    const outOfStockProducts: OutOfStockProduct[] = [];
    const lowStockProducts: OutOfStockProduct[] = [];

    // Dynamic price ranges that will be calculated based on actual data
    const allPrices: number[] = [];
    
    // Process orders to create price-to-orders mapping
    const priceToOrdersMap: { [price: string]: number } = {};
    let totalOrderItems = 0;
    let ordersWithValidPrices = 0;
    
    logger.info(`🔵 Processing ${orders.length} orders for price analysis...`);
    
    orders.forEach(({ node: order }: any) => {
      const lineItems = order.lineItems?.edges || [];
      
      lineItems.forEach(({ node: lineItem }: any) => {
        try {
          // Try to get price from variant first, then fallback to other sources
          let price = null;
          
          if (lineItem.variant?.price) {
            price = parseFloat(lineItem.variant.price);
          }
          
          if (price && !isNaN(price) && price > 0) {
            const quantity = parseInt(lineItem.quantity) || 1;
            const priceKey = price.toFixed(2);
            
            if (!priceToOrdersMap[priceKey]) {
              priceToOrdersMap[priceKey] = 0;
            }
            priceToOrdersMap[priceKey] += quantity;
            totalOrderItems += quantity;
            ordersWithValidPrices++;
          }
        } catch (e) {
          logger.warn(`🔴 Error processing line item:`, e);
        }
      });
    });
    
    logger.info(`🔵 Product Analytics API: Total order items processed: ${totalOrderItems}`);
    logger.info(`🔵 Product Analytics API: Orders with valid prices: ${ordersWithValidPrices}`);
    logger.info(`🔵 Product Analytics API: Unique price points: ${Object.keys(priceToOrdersMap).length}`);

    products.forEach(({ node: product }: any) => {
      if (product.status === 'ACTIVE') {
        activeProducts++;
        
        const variants = product.variants?.edges || [];
        let productValue = 0;
        let minPrice = Infinity;
        let maxPrice = 0;
        let totalInventory = 0;
        let validVariants = 0;
        let hasTrackedInventory = false;

        variants.forEach(({ node: variant }: any) => {
          try {
            const price = parseFloat(variant.price || "0");
            // Handle null/undefined inventory - treat as 0 for OOS detection
            const inventory = variant.inventoryQuantity !== null && variant.inventoryQuantity !== undefined 
              ? parseInt(variant.inventoryQuantity) 
              : 0;
            const isTracked = variant.inventoryItem?.tracked === true;
            
            if (isTracked) {
              hasTrackedInventory = true;
            }
            
            if (price > 0 && !isNaN(price)) {
              validVariants++;
              variantCount++;
              productValue += price;
              totalPrice += price;
              totalCatalogValue += price;
              
              minPrice = Math.min(minPrice, price);
              maxPrice = Math.max(maxPrice, price);
              totalInventory += inventory;
              
              // Collect prices for dynamic range calculation
              allPrices.push(price);
            }
          } catch (e) {
            logger.warn(`🔴 Error processing variant:`, e);
          }
        });

        // Only process products with valid variants
        // Consider product OOS if total inventory is 0 OR if inventory is not tracked
        if (validVariants > 0) {
          // Inventory status
          let inventoryStatus = 'Well Stocked';
          // Product is OOS if inventory is 0 (regardless of tracking status for display purposes)
          if (totalInventory === 0) {
            inventoryStatus = 'Out of Stock';
            outOfStock++;
            
            // Add to out-of-stock products list
            const firstVariant = variants[0]?.node;
            const variantIds = variants.map((v: any) => v.node?.id).filter(Boolean);
            outOfStockProducts.push({
              id: product.id,
              title: product.title || 'Unnamed Product',
              handle: product.handle || '',
              sku: firstVariant?.sku || '',
              price: minPrice !== Infinity ? minPrice : 0,
              vendor: product.vendor || '',
              productType: product.productType || '',
              totalVariants: validVariants,
              outOfStockVariants: validVariants, // All variants are OOS
              variantIds: variantIds,
              avgDailySales: 0, // Will be calculated from orders
              daysSinceLastSale: 0, // Will be calculated from orders
              recommendedReorder: 10, // Default recommendation
              safetyStockBuffer: null
            });
          } else if (totalInventory <= 10) {
            inventoryStatus = 'Low Stock';
            lowStock++;
            
            // Add to low-stock products list
            const firstVariant = variants[0]?.node;
            const lowStockVariantIds = variants.map((v: any) => v.node?.id).filter(Boolean);
            lowStockProducts.push({
              id: product.id,
              title: product.title || 'Unnamed Product',
              handle: product.handle || '',
              sku: firstVariant?.sku || '',
              price: minPrice !== Infinity ? minPrice : 0,
              vendor: product.vendor || '',
              productType: product.productType || '',
              totalVariants: validVariants,
              outOfStockVariants: variants.filter((v: any) => (parseInt(v.node.inventoryQuantity) || 0) === 0).length,
              variantIds: lowStockVariantIds,
              avgDailySales: 0,
              daysSinceLastSale: 0,
              recommendedReorder: Math.max(10, 20 - totalInventory), // Suggest bringing to 20 units
              safetyStockBuffer: null
            });
          } else {
            wellStocked++;
          }

          const priceRange = minPrice === maxPrice 
            ? `$${minPrice.toFixed(2)}`
            : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

          topProducts.push({
            id: product.id,
            name: product.title || 'Unnamed Product',
            value: productValue,
            variants: validVariants,
            inventoryStatus,
            priceRange
          });
        }
      }
    });

    // Calculate sales data for OOS and low-stock products from orders
    const productSalesData: { [productId: string]: { totalSold: number; lastSaleDate: string | null } } = {};
    
    orders.forEach(({ node: order }: any) => {
      const lineItems = order.lineItems?.edges || [];
      const orderDate = order.createdAt;
      
      lineItems.forEach(({ node: lineItem }: any) => {
        const productId = lineItem.variant?.product?.id;
        if (productId) {
          if (!productSalesData[productId]) {
            productSalesData[productId] = { totalSold: 0, lastSaleDate: null };
          }
          productSalesData[productId].totalSold += parseInt(lineItem.quantity) || 1;
          if (!productSalesData[productId].lastSaleDate || orderDate > productSalesData[productId].lastSaleDate) {
            productSalesData[productId].lastSaleDate = orderDate;
          }
        }
      });
    });

    // Update OOS products with sales data
    const now = new Date();
    const daysInPeriod = 60; // Orders are from last 60 days
    
    outOfStockProducts.forEach(product => {
      const salesData = productSalesData[product.id];
      if (salesData) {
        product.avgDailySales = Math.round((salesData.totalSold / daysInPeriod) * 100) / 100;
        if (salesData.lastSaleDate) {
          const lastSale = new Date(salesData.lastSaleDate);
          product.daysSinceLastSale = Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
        }
        // Recommended reorder: 7 days coverage + safety buffer
        product.recommendedReorder = Math.max(10, Math.ceil(product.avgDailySales * 7));
      }
    });

    lowStockProducts.forEach(product => {
      const salesData = productSalesData[product.id];
      if (salesData) {
        product.avgDailySales = Math.round((salesData.totalSold / daysInPeriod) * 100) / 100;
        if (salesData.lastSaleDate) {
          const lastSale = new Date(salesData.lastSaleDate);
          product.daysSinceLastSale = Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
        }
        // Recommended reorder to bring to 7 days coverage
        product.recommendedReorder = Math.max(10, Math.ceil(product.avgDailySales * 7));
      }
    });

    // Calculate final metrics
    const avgProductPrice = variantCount > 0 ? totalPrice / variantCount : 0;
    const catalogHealth = totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0;

    // Sort top products by value
    topProducts.sort((a, b) => b.value - a.value);

    // Ensure we have valid price data
    if (allPrices.length === 0) {
      logger.warn("🔴 No valid prices found in products");
    }

    const analyticsData: ProductAnalyticsData = {
      totalProducts,
      activeProducts,
      totalCatalogValue,
      avgProductPrice,
      catalogHealth,
      topProducts: topProducts.slice(0, 10),
      inventoryDistribution: {
        wellStocked,
        lowStock,
        outOfStock
      },
      outOfStockProducts,
      lowStockProducts,
      priceAnalysis: {
        avgPrice: avgProductPrice,
        minPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        priceDistribution: calculateDynamicPriceRanges(allPrices, priceToOrdersMap)
      },
      hasOrderAccess // Include flag to show if order data is available
    };

    logger.info("🟢 Product Analytics API: Analysis complete:", {
      totalProducts: analyticsData.totalProducts,
      activeProducts: analyticsData.activeProducts,
      catalogValue: analyticsData.totalCatalogValue.toFixed(2),
      avgPrice: analyticsData.avgProductPrice.toFixed(2),
      catalogHealth: analyticsData.catalogHealth.toFixed(1) + '%',
      wellStocked: analyticsData.inventoryDistribution.wellStocked,
      lowStock: analyticsData.inventoryDistribution.lowStock,
      outOfStock: analyticsData.inventoryDistribution.outOfStock,
      priceRangesWithData: analyticsData.priceAnalysis.priceDistribution.filter(p => p.count > 0).length
    });

    return json({
      success: true,
      data: analyticsData,
    });

  } catch (error) {
    logger.error("🔴 Product Analytics API Error:", error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Export loader for GET requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return getProductAnalytics(request);
};

// Export action for POST requests  
export const action = async ({ request }: ActionFunctionArgs) => {
  return getProductAnalytics(request);
};
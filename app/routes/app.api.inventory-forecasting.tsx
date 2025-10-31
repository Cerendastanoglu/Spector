import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";

interface ForecastItem {
  id: string;
  title: string;
  sku: string;
  handle: string;
  currentStock: number;
  averageDailyDemand: number;
  forecastDays: number;
  reorderPoint: number;
  status: 'critical' | 'low' | 'healthy';
  vendor: string;
  category: string;
  lastOrderDate: string;
  suggestedReorderQuantity: number;
  profitMargin: number;
  leadTime: number;
  velocity: 'fast' | 'medium' | 'slow';
  price: number;
  totalRevenue60Days: number;
  totalSold60Days: number;
}

interface InventoryForecastingData {
  forecastItems: ForecastItem[];
  summary: {
    totalProducts: number;
    criticalItems: number;
    lowStockItems: number;
    healthyItems: number;
    totalRevenue60Days: number;
    averageDailyRevenue: number;
    fastMovingItems: number;
    mediumMovingItems: number;
    slowMovingItems: number;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    logger.info("🔵 Inventory Forecasting API: Starting analysis...");
    logger.info(`🔵 Inventory Forecasting API: Request URL: ${request.url}`);
    
    const { admin } = await authenticate.admin(request);
    logger.info("🔵 Inventory Forecasting API: Authentication successful");

    // Calculate 60 days ago date
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();
    
    logger.info(`🔵 Fetching orders from last 60 days (since ${sixtyDaysAgoISO})`);

    // GraphQL query to get all products with inventory and variants
    const productsResponse = await admin.graphql(`
      query {
        products(first: 250) {
          edges {
            node {
              id
              title
              handle
              vendor
              productType
              status
              createdAt
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
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

    // GraphQL query to get orders from the last 60 days
    const ordersResponse = await admin.graphql(`
      query {
        orders(first: 250, sortKey: CREATED_AT, reverse: true, query: "created_at:>='${sixtyDaysAgoISO}'") {
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
                      sku
                      product {
                        id
                        title
                        handle
                      }
                    }
                    product {
                      id
                      title
                      handle
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const productsData: any = await productsResponse.json();
    const ordersData: any = await ordersResponse.json();
    
    logger.info("🔵 Inventory Forecasting API: Products fetched successfully");
    logger.info("🔵 Inventory Forecasting API: Orders fetched successfully");
    
    if (productsData.errors) {
      logger.error("🔴 Inventory Forecasting API: GraphQL errors:", productsData.errors);
      return json({ 
        success: false, 
        error: `GraphQL Error: ${productsData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    if (ordersData.errors) {
      logger.error("🔴 Inventory Forecasting API: Orders GraphQL errors:", ordersData.errors);
      return json({ 
        success: false, 
        error: `Orders GraphQL Error: ${ordersData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    const products = productsData.data?.products?.edges || [];
    const orders = ordersData.data?.orders?.edges || [];
    
    logger.info(`🔵 Inventory Forecasting API: Found ${products.length} products`);
    logger.info(`🔵 Inventory Forecasting API: Found ${orders.length} orders from last 60 days`);

    // Process orders to create product sales data
    const productSalesMap: { [variantId: string]: { 
      totalSold: number; 
      totalRevenue: number; 
      productInfo: any;
      dates: string[];
    } } = {};

    logger.info(`🔵 Processing ${orders.length} orders for sales analysis...`);
    
    orders.forEach(({ node: order }: any) => {
      const lineItems = order.lineItems?.edges || [];
      const orderDate = order.createdAt;
      
      lineItems.forEach(({ node: lineItem }: any) => {
        try {
          const variantId = lineItem.variant?.id;
          const quantity = parseInt(lineItem.quantity) || 0;
          const price = parseFloat(lineItem.variant?.price) || 0;
          const revenue = quantity * price;
          
          if (variantId && quantity > 0) {
            if (!productSalesMap[variantId]) {
              productSalesMap[variantId] = {
                totalSold: 0,
                totalRevenue: 0,
                productInfo: {
                  title: lineItem.variant?.product?.title || lineItem.product?.title,
                  handle: lineItem.variant?.product?.handle || lineItem.product?.handle,
                  sku: lineItem.variant?.sku
                },
                dates: []
              };
            }
            
            productSalesMap[variantId].totalSold += quantity;
            productSalesMap[variantId].totalRevenue += revenue;
            productSalesMap[variantId].dates.push(orderDate);
          }
        } catch (e) {
          logger.warn(`🔴 Error processing line item:`, e);
        }
      });
    });
    
    logger.info(`🔵 Inventory Forecasting API: Processed sales data for ${Object.keys(productSalesMap).length} variants`);

    // Process products to create forecast items
    const forecastItems: ForecastItem[] = [];
    let totalRevenue60Days = 0;
    let criticalItems = 0;
    let lowStockItems = 0;
    let healthyItems = 0;
    let fastMovingItems = 0;
    let mediumMovingItems = 0;
    let slowMovingItems = 0;

    products.forEach(({ node: product }: any) => {
      if (product.status === 'ACTIVE') {
        const variants = product.variants?.edges || [];
        
        variants.forEach(({ node: variant }: any, index: number) => {
          try {
            const variantId = variant.id;
            const currentStock = parseInt(variant.inventoryQuantity) || 0;
            const price = parseFloat(variant.price) || 0;
            const salesData = productSalesMap[variantId];
            
            // Calculate sales metrics
            const totalSold60Days = salesData?.totalSold || 0;
            const totalRevenue = salesData?.totalRevenue || 0;
            const averageDailyDemand = totalSold60Days / 60; // 60 days
            
            // Calculate forecast days (when will we run out of stock)
            const forecastDays = averageDailyDemand > 0 ? Math.floor(currentStock / averageDailyDemand) : 999;
            
            // Determine status based on forecast days and current stock
            let status: 'critical' | 'low' | 'healthy';
            if (currentStock <= 5 || forecastDays <= 7) {
              status = 'critical';
              criticalItems++;
            } else if (currentStock <= 15 || forecastDays <= 21) {
              status = 'low';
              lowStockItems++;
            } else {
              status = 'healthy';
              healthyItems++;
            }
            
            // Determine velocity based on average daily demand
            let velocity: 'fast' | 'medium' | 'slow';
            if (averageDailyDemand >= 2) {
              velocity = 'fast';
              fastMovingItems++;
            } else if (averageDailyDemand >= 0.5) {
              velocity = 'medium';
              mediumMovingItems++;
            } else {
              velocity = 'slow';
              slowMovingItems++;
            }
            
            // Calculate suggested reorder quantity (based on 30 days supply + safety stock)
            const suggestedReorderQuantity = Math.max(
              Math.ceil(averageDailyDemand * 30 + averageDailyDemand * 7), // 30 days + 7 days safety stock
              10 // Minimum order quantity
            );
            
            // Calculate lead time (estimated based on velocity)
            const leadTime = velocity === 'fast' ? 7 : velocity === 'medium' ? 14 : 21;
            
            // Calculate reorder point (lead time demand + safety stock)
            const reorderPoint = Math.ceil(averageDailyDemand * leadTime + averageDailyDemand * 3);
            
            // Estimate profit margin (simplified calculation)
            const profitMargin = Math.random() * 50 + 10; // 10-60% range (placeholder)
            
            // Find last order date from sales data
            const lastOrderDate = salesData?.dates.length > 0 
              ? new Date(Math.max(...salesData.dates.map(d => new Date(d).getTime()))).toISOString().split('T')[0]
              : new Date(sixtyDaysAgo).toISOString().split('T')[0];
            
            totalRevenue60Days += totalRevenue;
            
            // Only include items with meaningful data or critical status
            if (totalSold60Days > 0 || status === 'critical' || currentStock > 0) {
              forecastItems.push({
                id: variantId,
                title: `${product.title}${variants.length > 1 ? ` - ${variant.title}` : ''}`,
                sku: variant.sku || `SKU-${product.handle}-${index + 1}`,
                handle: product.handle,
                currentStock,
                averageDailyDemand: Math.round(averageDailyDemand * 100) / 100,
                forecastDays: Math.min(forecastDays, 999),
                reorderPoint,
                status,
                vendor: product.vendor || 'Unknown',
                category: product.productType || 'Uncategorized',
                lastOrderDate,
                suggestedReorderQuantity,
                profitMargin: Math.round(profitMargin * 10) / 10,
                leadTime,
                velocity,
                price,
                totalRevenue60Days: totalRevenue,
                totalSold60Days
              });
            }
          } catch (e) {
            logger.warn(`🔴 Error processing variant ${variant.id}:`, e);
          }
        });
      }
    });

    // Sort forecast items by priority (critical first, then by forecast days)
    forecastItems.sort((a, b) => {
      const statusPriority = { critical: 0, low: 1, healthy: 2 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return a.forecastDays - b.forecastDays;
    });

    const summary = {
      totalProducts: forecastItems.length,
      criticalItems,
      lowStockItems,
      healthyItems,
      totalRevenue60Days: Math.round(totalRevenue60Days * 100) / 100,
      averageDailyRevenue: Math.round((totalRevenue60Days / 60) * 100) / 100,
      fastMovingItems,
      mediumMovingItems,
      slowMovingItems
    };

    logger.info(`🟢 Inventory Forecasting API: Analysis complete`);
    logger.info(`🔵 Summary: ${summary.totalProducts} products, ${criticalItems} critical, ${lowStockItems} low stock`);
    logger.info(`🔵 Revenue (60 days): $${summary.totalRevenue60Days}, Daily avg: $${summary.averageDailyRevenue}`);

    const responseData: InventoryForecastingData = {
      forecastItems,
      summary
    };

    return json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error("🔴 Inventory Forecasting API Error:", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown server error" 
    }, { status: 500 });
  }
}
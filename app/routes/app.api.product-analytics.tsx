import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
  
  console.log(`🔵 Total real orders: ${totalRealOrders}`);
  console.log(`🔵 Real order data available: ${totalRealOrders > 0 ? 'Yes' : 'No'}`);
  
  prices.forEach((price) => {
    // Get real order data for this price point
    const realOrders = priceToOrdersMap[price.toString()] || 0;
    
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log("🔵 Product Analytics API: Starting analysis...");
    console.log("🔵 Product Analytics API: Request URL:", request.url);
    
    const { admin } = await authenticate.admin(request);
    console.log("🔵 Product Analytics API: Authentication successful");

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
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `);

    // GraphQL query to get recent orders (last 250 orders)
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
                      }
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
    
    console.log("🔵 Product Analytics API: Products response:", JSON.stringify(productsData, null, 2));
    console.log("🔵 Product Analytics API: Orders response:", JSON.stringify(ordersData, null, 2));
    
    if (productsData.errors) {
      console.error("🔴 Product Analytics API: GraphQL errors:", productsData.errors);
      return json({ 
        success: false, 
        error: `GraphQL Error: ${productsData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    if (ordersData.errors) {
      console.error("🔴 Product Analytics API: Orders GraphQL errors:", ordersData.errors);
      return json({ 
        success: false, 
        error: `Orders GraphQL Error: ${ordersData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    const products = productsData.data?.products?.edges || [];
    const orders = ordersData.data?.orders?.edges || [];
    
    console.log(`🔵 Product Analytics API: Found ${products.length} products`);
    console.log(`🔵 Product Analytics API: Found ${orders.length} orders`);

    // Process product data
    let totalProducts = products.length;
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

    // Dynamic price ranges that will be calculated based on actual data
    let allPrices: number[] = [];
    
    // Process orders to create price-to-orders mapping
    const priceToOrdersMap: { [price: string]: number } = {};
    let totalOrderItems = 0;
    
    console.log(`🔵 Processing ${orders.length} orders for price analysis...`);
    
    orders.forEach(({ node: order }: any, orderIndex: number) => {
      console.log(`🔵 Order ${orderIndex + 1}: ${order.name} - ${order.lineItems?.edges?.length || 0} line items`);
      
      order.lineItems?.edges?.forEach(({ node: lineItem }: any, itemIndex: number) => {
        if (lineItem.variant?.price) {
          const price = parseFloat(lineItem.variant.price);
          const quantity = lineItem.quantity || 1;
          const priceKey = price.toString();
          
          console.log(`🔵   Line Item ${itemIndex + 1}: Price $${price}, Quantity ${quantity}`);
          
          if (!priceToOrdersMap[priceKey]) {
            priceToOrdersMap[priceKey] = 0;
          }
          priceToOrdersMap[priceKey] += quantity;
          totalOrderItems += quantity;
        } else {
          console.log(`🔴   Line Item ${itemIndex + 1}: Missing price data`, lineItem);
        }
      });
    });
    
    console.log(`🔵 Product Analytics API: Total order items processed: ${totalOrderItems}`);
    console.log(`🔵 Product Analytics API: Price-to-orders mapping:`, priceToOrdersMap);
    console.log(`🔵 Product Analytics API: Unique price points with orders: ${Object.keys(priceToOrdersMap).length}`);

    products.forEach(({ node: product }: any) => {
      if (product.status === 'ACTIVE') {
        activeProducts++;
        
        const variants = product.variants?.edges || [];
        let productValue = 0;
        let minPrice = Infinity;
        let maxPrice = 0;
        let totalInventory = 0;

        variants.forEach(({ node: variant }: any) => {
          const price = parseFloat(variant.price || "0");
          const inventory = variant.inventoryQuantity || 0;
          
          if (price > 0) {
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
        });

        // Inventory status
        let inventoryStatus = 'Well Stocked';
        if (totalInventory === 0) {
          inventoryStatus = 'Out of Stock';
          outOfStock++;
        } else if (totalInventory <= 10) {
          inventoryStatus = 'Low Stock';
          lowStock++;
        } else {
          wellStocked++;
        }

        const priceRange = minPrice === maxPrice 
          ? `$${minPrice.toFixed(2)}`
          : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

        topProducts.push({
          id: product.id,
          name: product.title,
          value: productValue,
          variants: variants.length,
          inventoryStatus,
          priceRange
        });
      }
    });

    // Calculate final metrics
    const avgProductPrice = variantCount > 0 ? totalPrice / variantCount : 0;
    const catalogHealth = totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0;

    // Sort top products by value
    topProducts.sort((a, b) => b.value - a.value);

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
      priceAnalysis: {
        avgPrice: avgProductPrice,
        minPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        priceDistribution: calculateDynamicPriceRanges(allPrices, priceToOrdersMap)
      }
    };

    console.log("🟢 Product Analytics API: Analysis complete:", {
      totalProducts: analyticsData.totalProducts,
      activeProducts: analyticsData.activeProducts,
      catalogValue: analyticsData.totalCatalogValue.toFixed(2),
      avgPrice: analyticsData.avgProductPrice.toFixed(2),
      catalogHealth: analyticsData.catalogHealth.toFixed(1) + '%',
      wellStocked: analyticsData.inventoryDistribution.wellStocked,
      lowStock: analyticsData.inventoryDistribution.lowStock,
      outOfStock: analyticsData.inventoryDistribution.outOfStock
    });

    return json({
      success: true,
      data: analyticsData,
    });

  } catch (error) {
    console.error("🔴 Product Analytics API Error:", error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
};
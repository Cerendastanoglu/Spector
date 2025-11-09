import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";

interface InventoryData {
  outOfStock: number;
  lowStock: number;
  wellStocked: number;
  totalValue: number;
  criticalItems: Array<{
    id: string;
    title: string;
    inventoryQuantity: number;
    variants: number;
  }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "30";
    
    logger.debug(`Inventory API called with period: ${period}`);
    
    // Fetch products with inventory data
    const response = await admin.graphql(
      `#graphql
        query getInventoryData($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                status
                totalInventory
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
      {
        variables: {
          first: 250, // Get up to 250 products
        },
      }
    );

    const responseJson: any = await response.json();
    
    if (responseJson.errors) {
      logger.error("GraphQL Errors:", responseJson.errors);
      return json({ 
        success: false, 
        error: "Failed to fetch inventory data" 
      }, { status: 500 });
    }

    const products = responseJson.data?.products?.edges?.map((edge: any) => edge.node) || [];
    
    logger.debug(`Inventory API: Found ${products.length} products`);
    
    // If no products, return empty state
    if (products.length === 0) {
      logger.info("Inventory API: No products found in store");
      return json({ 
        success: true, 
        data: {
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0,
          totalValue: 0,
          criticalItems: [],
        },
        warning: "No products found in your store.",
      });
    }
    
    // Calculate inventory metrics
    let outOfStock = 0;
    let lowStock = 0;
    let wellStocked = 0;
    let totalValue = 0;
    const criticalItems: any[] = [];
    
    products.forEach((product: any) => {
      if (product.status !== 'ACTIVE') return;
      
      const inventory = product.totalInventory || 0;
      
      // Calculate total value
      product.variants?.edges?.forEach((edge: any) => {
        const variant = edge.node;
        const price = parseFloat(variant.price || '0');
        const quantity = variant.inventoryQuantity || 0;
        totalValue += price * quantity;
      });
      
      // Categorize inventory status
      if (inventory === 0) {
        outOfStock++;
        criticalItems.push({
          id: product.id,
          title: product.title,
          inventoryQuantity: 0,
          variants: product.variants?.edges?.length || 0,
        });
      } else if (inventory < 10) {
        lowStock++;
        if (criticalItems.length < 10) { // Limit to top 10
          criticalItems.push({
            id: product.id,
            title: product.title,
            inventoryQuantity: inventory,
            variants: product.variants?.edges?.length || 0,
          });
        }
      } else {
        wellStocked++;
      }
    });
    
    // Sort critical items by inventory (lowest first)
    criticalItems.sort((a, b) => a.inventoryQuantity - b.inventoryQuantity);
    
    const inventoryData: InventoryData = {
      outOfStock,
      lowStock,
      wellStocked,
      totalValue,
      criticalItems: criticalItems.slice(0, 5), // Return top 5 critical items
    };
    
    logger.debug("Inventory data calculated:", {
      outOfStock,
      lowStock,
      wellStocked,
      totalProducts: products.length,
    });
    
    return json({ 
      success: true, 
      data: inventoryData 
    });
    
  } catch (error) {
    logger.error("Error in inventory API:", error);
    return json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
};

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
    }>;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log("🔵 Product Analytics API: Starting analysis...");
    console.log("🔵 Product Analytics API: Request URL:", request.url);
    
    const { admin } = await authenticate.admin(request);
    console.log("🔵 Product Analytics API: Authentication successful");

    // Simple GraphQL query to get products
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

    const productsData: any = await productsResponse.json();
    console.log("🔵 Product Analytics API: GraphQL response:", JSON.stringify(productsData, null, 2));
    
    if (productsData.errors) {
      console.error("🔴 Product Analytics API: GraphQL errors:", productsData.errors);
      return json({ 
        success: false, 
        error: `GraphQL Error: ${productsData.errors[0]?.message || "Unknown error"}` 
      }, { status: 500 });
    }

    const products = productsData.data?.products?.edges || [];
    console.log(`🔵 Product Analytics API: Found ${products.length} products`);

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

    const priceRanges = {
      "Under $25": 0,
      "$25-$50": 0,
      "$50-$100": 0,
      "$100-$250": 0,
      "Over $250": 0
    };

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
            
            // Price categorization
            if (price < 25) priceRanges["Under $25"]++;
            else if (price < 50) priceRanges["$25-$50"]++;
            else if (price < 100) priceRanges["$50-$100"]++;
            else if (price < 250) priceRanges["$100-$250"]++;
            else priceRanges["Over $250"]++;
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
        minPrice: variantCount > 0 ? Math.min(...topProducts.map(p => parseFloat(p.priceRange.split(' ')[0].substring(1)))) : 0,
        maxPrice: variantCount > 0 ? Math.max(...topProducts.map(p => {
          const range = p.priceRange.split(' - ');
          return parseFloat(range[range.length - 1].substring(1));
        })) : 0,
        priceDistribution: Object.entries(priceRanges).map(([range, count]) => ({
          range,
          count
        }))
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
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface StoreAnalysis {
  storeName: string;
  domain: string;
  storeType: string;
  primaryCategories: string[];
  totalProducts: number;
  totalVariants: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  pricingStats: {
    medianPrice: number;
    stdDeviation: number;
    coefficientOfVariation: number;
    topCategory: string | null;
    topCategoryShare: number | null; // 0-1 ratio
  };
  topVendors: string[];
  productTypes: { [key: string]: number };
  marketInsights: {
    storeCategory: string;
    marketDescription: string;
    competitorExamples: string[];
    marketSize: string;
    growthTrends: string[];
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log("🔍 Market Analysis API: Starting store analysis...");
    
    const { admin } = await authenticate.admin(request);
    console.log("✅ Market Analysis API: Authentication successful");

    // Fetch shop information
    const shopResponse = await admin.graphql(`
      query getShop {
        shop {
          id
          name
          myshopifyDomain
          primaryDomain {
            host
          }
          description
          plan {
            displayName
          }
        }
      }
    `);

    const shopData = await shopResponse.json();
    const shop = shopData.data?.shop;

    // Fetch products for analysis
    const productsResponse = await admin.graphql(`
      query getProducts {
        products(first: 250) {
          edges {
            node {
              id
              title
              handle
              vendor
              productType
              status
              variants(first: 10) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }
    `);

    const productsData = await productsResponse.json();
    const products = productsData.data?.products?.edges || [];

    console.log(`📊 Analyzing ${products.length} products for market insights...`);

    // Analyze store data
    const analysis = analyzeStore(shop, products);
    
    console.log("✅ Market Analysis completed successfully");

    return json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error("❌ Market Analysis API Error:", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown server error" 
    }, { status: 500 });
  }
}

function analyzeStore(shop: any, products: any[]): StoreAnalysis {
  // Extract product data
  const productTypes: { [key: string]: number } = {};
  const vendors = new Set<string>();
  const prices: number[] = [];
  
  products.forEach(({ node: product }) => {
    // Count product types
    if (product.productType) {
      productTypes[product.productType] = (productTypes[product.productType] || 0) + 1;
    }
    
    // Collect vendors
    if (product.vendor && product.vendor !== shop.name) {
      vendors.add(product.vendor);
    }
    
    // Collect prices
    product.variants.edges.forEach(({ node: variant }: any) => {
      const price = parseFloat(variant.price);
      if (price > 0) {
        prices.push(price);
      }
    });
  });

  // Calculate statistics
  const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const medianPrice = prices.length ? computeMedian(prices) : 0;
  const stdDev = prices.length ? computeStdDeviation(prices, averagePrice) : 0;
  const cv = averagePrice > 0 ? stdDev / averagePrice : 0;
  
  // Determine store type and category
  const primaryCategories = Object.keys(productTypes)
    .sort((a, b) => productTypes[b] - productTypes[a])
    .slice(0, 5);
  
  const storeCategory = determineStoreCategory(primaryCategories, products, averagePrice);
  const marketInsights = generateMarketInsights(storeCategory, primaryCategories, averagePrice);

  return {
    storeName: shop.name,
    domain: shop.myshopifyDomain,
    storeType: storeCategory.type,
    primaryCategories,
    totalProducts: products.length,
    totalVariants: products.reduce((total, { node }) => total + node.variants.edges.length, 0),
    averagePrice: Math.round(averagePrice * 100) / 100,
    priceRange: {
      min: Math.round(minPrice * 100) / 100,
      max: Math.round(maxPrice * 100) / 100
    },
    pricingStats: {
      medianPrice: Math.round(medianPrice * 100) / 100,
      stdDeviation: Math.round(stdDev * 100) / 100,
      coefficientOfVariation: Math.round(cv * 1000) / 1000, // 3 decimals
      topCategory: primaryCategories.length ? primaryCategories[0] : null,
      topCategoryShare: primaryCategories.length && products.length
        ? productTypes[primaryCategories[0]] / products.length
        : null
    },
    topVendors: Array.from(vendors).slice(0, 5),
    productTypes,
    marketInsights: {
      storeCategory: storeCategory.category,
      marketDescription: marketInsights.description,
      competitorExamples: marketInsights.competitors,
      marketSize: marketInsights.marketSize,
      growthTrends: marketInsights.trends,
      opportunities: marketInsights.opportunities,
      challenges: marketInsights.challenges,
      recommendations: marketInsights.recommendations
    }
  };
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function computeStdDeviation(values: number[], mean: number): number {
  if (!values.length) return 0;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function determineStoreCategory(categories: string[], products: any[], avgPrice: number): { type: string; category: string } {
  const categoryKeywords = {
    fashion: ['clothing', 'apparel', 'shirt', 'dress', 'pants', 'accessories', 'jewelry', 'fashion', 'wear'],
    electronics: ['electronics', 'tech', 'computer', 'phone', 'gadget', 'device', 'audio', 'camera', 'digital'],
    home: ['home', 'furniture', 'decor', 'kitchen', 'bedding', 'lighting', 'garden', 'living', 'house'],
    beauty: ['beauty', 'cosmetics', 'skincare', 'makeup', 'fragrance', 'hair', 'nail', 'spa'],
    health: ['health', 'wellness', 'supplement', 'vitamin', 'medical', 'care', 'pharmacy'],
    sports: ['sports', 'ski', 'skiing', 'snowboard', 'fitness', 'outdoor', 'athletic', 'exercise', 'recreation', 'gear', 'bike', 'cycling', 'running', 'tennis', 'golf', 'basketball', 'football', 'soccer', 'hockey', 'baseball', 'swimming', 'yoga', 'gym', 'workout', 'training', 'mountain', 'hiking', 'camping'],
    toys: ['toys', 'games', 'kids', 'children', 'baby', 'educational', 'play', 'puzzle'],
    food: ['food', 'beverage', 'snack', 'drink', 'organic', 'gourmet', 'specialty', 'coffee', 'tea'],
    books: ['book', 'media', 'education', 'learning', 'magazine', 'publication', 'reading'],
    automotive: ['auto', 'car', 'vehicle', 'automotive', 'parts', 'tools', 'garage', 'motorcycle']
  };

  // Also check product titles and vendors for better detection
  const allText = [
    ...categories,
    ...products.map(p => p.node.title?.toLowerCase() || ''),
    ...products.map(p => p.node.vendor?.toLowerCase() || ''),
    ...products.map(p => p.node.productType?.toLowerCase() || '')
  ].filter(text => text && text.length > 0);

  // Check categories against keywords
  let bestMatch = { category: 'General Retail', score: 0 };
  
  for (const [key, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    allText.forEach(text => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
          // Give extra weight to exact matches
          if (text === keyword) {
            score += 2;
          }
        }
      });
    });
    
    if (score > bestMatch.score) {
      bestMatch = { category: key.charAt(0).toUpperCase() + key.slice(1), score };
    }
  }

  // Determine type based on price range
  let type = 'Mid-Range';
  if (avgPrice < 25) type = 'Budget';
  else if (avgPrice > 100) type = 'Premium';
  else if (avgPrice > 250) type = 'Luxury';

  return {
    type: `${type} ${bestMatch.category}`,
    category: bestMatch.category
  };
}

function generateMarketInsights(storeCategory: { type: string; category: string }, _categories: string[], _avgPrice: number) {
  const category = storeCategory.category.toLowerCase();
  
  const marketData: { [key: string]: any } = {
    fashion: {
      description: "The global fashion e-commerce market is experiencing rapid growth, driven by changing consumer preferences, social media influence, and the rise of direct-to-consumer brands.",
      competitors: ["SHEIN", "H&M", "Zara", "ASOS", "Boohoo", "Fashion Nova"],
      marketSize: "$759.5 billion globally (2022), expected to reach $1.2 trillion by 2027",
      trends: ["Sustainable fashion growing at 15% annually", "Social commerce integration", "AR/VR try-on experiences", "Personalized recommendations"],
      opportunities: ["Sustainable product lines", "Social media marketing", "Influencer collaborations", "Subscription box services"],
      challenges: ["High return rates (20-30%)", "Fast fashion competition", "Inventory management", "Seasonal demand fluctuations"],
      recommendations: ["Focus on quality over quantity", "Invest in sustainable materials", "Leverage user-generated content", "Implement size guides and AR fitting"]
    },
    electronics: {
      description: "The consumer electronics market is highly competitive with rapid technological advancement and changing consumer demands for smart, connected devices.",
      competitors: ["Amazon", "Best Buy", "Newegg", "B&H Photo", "Micro Center"],
      marketSize: "$1.8 trillion globally, growing at 7.5% CAGR",
      trends: ["IoT and smart home integration", "5G-enabled devices", "Sustainable electronics", "Direct-to-consumer sales"],
      opportunities: ["Smart home ecosystem products", "Repair and refurbishment services", "Educational content marketing", "B2B enterprise solutions"],
      challenges: ["Rapid product obsolescence", "Supply chain disruptions", "Price competition", "Technical support requirements"],
      recommendations: ["Focus on emerging technologies", "Provide excellent technical support", "Offer extended warranties", "Create educational content"]
    },
    home: {
      description: "The home goods market has seen significant growth, especially post-pandemic, as consumers invest more in their living spaces and work-from-home setups.",
      competitors: ["Wayfair", "Overstock", "West Elm", "CB2", "Article", "Burrow"],
      marketSize: "$664 billion globally, expected 4.2% annual growth",
      trends: ["Sustainable and eco-friendly products", "Smart home integration", "Minimalist design", "Multifunctional furniture"],
      opportunities: ["Eco-friendly product lines", "Smart home accessories", "Custom/personalized items", "Room design services"],
      challenges: ["High shipping costs", "Seasonal demand", "Quality perception", "Assembly requirements"],
      recommendations: ["Offer virtual room planning", "Focus on sustainable materials", "Provide detailed product videos", "Optimize shipping costs"]
    },
    sports: {
      description: "The global sports and outdoor equipment market is experiencing steady growth, driven by increasing health consciousness, outdoor recreation popularity, and seasonal sports activities.",
      competitors: ["Dick's Sporting Goods", "REI", "Sports Authority", "Decathlon", "Backcountry", "Evo"],
      marketSize: "$473 billion globally, growing at 6.1% CAGR",
      trends: ["Sustainable outdoor gear", "Direct-to-consumer ski brands", "Smart fitness equipment", "Seasonal rental models"],
      opportunities: ["Gear rental services", "Local community events", "Seasonal promotions", "Equipment trade-in programs"],
      challenges: ["Seasonal demand fluctuations", "Weather dependency", "High shipping costs for large items", "Equipment authenticity concerns"],
      recommendations: ["Focus on seasonal marketing", "Offer equipment servicing", "Build local community partnerships", "Provide detailed sizing guides"]
    }
  };

  // Default market insights for uncategorized stores
  const defaultInsights = {
    description: "The general retail e-commerce market continues to grow as consumers increasingly prefer online shopping for convenience, selection, and competitive pricing.",
    competitors: ["Amazon", "eBay", "Walmart", "Target", "Shopify stores"],
    marketSize: "$5.7 trillion globally in e-commerce sales",
    trends: ["Mobile commerce growth", "Social selling", "Subscription models", "Personalization"],
    opportunities: ["Niche market specialization", "Customer loyalty programs", "Cross-selling and upselling", "International expansion"],
    challenges: ["Market saturation", "Customer acquisition costs", "Competition from giants", "Supply chain management"],
    recommendations: ["Focus on customer experience", "Build brand loyalty", "Optimize for mobile", "Leverage social proof"]
  };

  return marketData[category] || defaultInsights;
}
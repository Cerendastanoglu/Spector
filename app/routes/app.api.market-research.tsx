/**
 * Market Research API Route
 * 
 * API endpoint for market research and product analysis.
 * Supports multiple action types for different analysis needs.
 * 
 * Actions:
 * - analyze: Run product performance analysis
 * - get-access: Check user's feature access level
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { analyzeProducts, getMarketResearchAccess } from "~/services/marketResearch.server";
import { applyRateLimit } from "~/utils/rateLimit";
import { RATE_LIMITS } from "~/utils/security";
import { logger } from "~/utils/logger";

/**
 * Loader - Basic endpoint info
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ 
    message: "Market Research API endpoint",
    version: "1.0.0",
    actions: ["analyze", "get-access"],
  });
};

/**
 * Action - Handle API requests
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // Apply rate limiting (50 requests per minute for analysis API)
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_PRODUCTS);
  if (rateLimitResponse) return rateLimitResponse;

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  try {
    // Parse request body
    const requestData = await request.json();
    const action = requestData.action;
    
    logger.info(`[MarketResearch API] Action: ${action} for shop: ${shop}`);
    
    switch (action) {
      case "get-access": {
        const access = await getMarketResearchAccess(admin.graphql, shop);
        return json({ success: true, access });
      }
      
      case "analyze": {
        const options = {
          timeframeDays: requestData.timeframeDays || 30,
          includeVariants: requestData.includeVariants ?? true,
          includeTrends: requestData.includeTrends ?? false,
          includePriceIntel: requestData.includePriceIntel ?? false,
          includeAISuggestions: requestData.includeAISuggestions ?? false,
          limit: requestData.limit,
        };
        
        const result = await analyzeProducts(admin, shop, options);
        return json(result);
      }
      
      default:
        return json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('[MarketResearch API] Error:', error);
    
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
};

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate, login } from "../shopify.server";
import db from "../db.server";

/**
 * OAuth Enforcement Route
 * 
 * SHOPIFY REQUIREMENT: Apps must immediately authenticate using OAuth before any other steps occur,
 * even if the merchant has previously installed and then uninstalled your app.
 * 
 * This route ensures that:
 * 1. All app access goes through OAuth first
 * 2. No cached sessions are used for previously uninstalled apps
 * 3. Merchants get a fresh authentication flow
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    // If no shop parameter, redirect to Shopify OAuth
    if (!shop) {
      console.log("🔒 No shop parameter - redirecting to login");
      return await login(request);
    }
    
    // Validate shop domain format
    if (!isValidShopDomain(shop)) {
      console.log(`🚫 Invalid shop domain: ${shop}`);
      throw new Response("Invalid shop domain", { status: 400 });
    }
    
    console.log(`🔍 OAuth enforcement check for shop: ${shop}`);
    
    // Check if we have a valid session
    try {
      const { session } = await authenticate.admin(request);
      
      if (session && session.shop === shop) {
        // Valid session exists, allow access
        console.log(`✅ Valid session found for shop: ${shop}`);
        
        // Redirect to main app
        const targetUrl = url.searchParams.get("return_to") || "/app";
        return redirect(targetUrl);
      }
    } catch (authError) {
      // Authentication failed - force OAuth
      console.log(`🔒 Authentication failed for shop: ${shop} - forcing OAuth`);
    }
    
    // Check if this shop previously had sessions (was uninstalled)
    const previousSessions = await db.session.findMany({
      where: { shop },
      orderBy: { id: 'desc' },
      take: 1
    });
    
    if (previousSessions.length > 0) {
      console.log(`🔄 Shop ${shop} had previous sessions - forcing fresh OAuth`);
      // Clean up any stale sessions
      await db.session.deleteMany({ where: { shop } });
    }
    
    // Force OAuth flow
    console.log(`🔐 Forcing OAuth authentication for shop: ${shop}`);
    return await login(request);
    
  } catch (error) {
    console.error("OAuth enforcement error:", error);
    
    // If anything fails, force OAuth
    return await login(request);
  }
};

/**
 * Validate Shopify shop domain format
 * SHOPIFY REQUIREMENT: Apps must not request manual entry of myshopify.com URL
 */
function isValidShopDomain(shop: string): boolean {
  // Basic validation for .myshopify.com domains
  const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9-_]*\.myshopify\.com$/;
  
  if (!shopPattern.test(shop)) {
    return false;
  }
  
  // Additional security checks
  if (shop.includes('..') || shop.includes('//')) {
    return false;
  }
  
  return true;
}
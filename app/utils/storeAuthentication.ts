import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Store Installation Tracking Service
 * 
 * This service tracks which stores have installed the app and provides
 * utilities for managing store installations and authentication.
 */

export interface StoreInstallation {
  shop: string;
  installed: boolean;
  installedAt: Date;
  lastSeen: Date;
  scopes: string[];
  accessToken?: string;
}

/**
 * Track a store installation when OAuth completes
 */
export async function trackStoreInstallation(shop: string, scopes: string[], _accessToken?: string) {
  try {
    // Check if installation already exists
    const existingSession = await db.session.findFirst({
      where: { shop }
    });

    if (existingSession) {
      // Update existing installation
      await db.session.update({
        where: { id: existingSession.id },
        data: {
          scope: scopes.join(','),
          // Update other fields as needed
        }
      });
      console.log(`📝 Updated installation for shop: ${shop}`);
    } else {
      console.log(`🎉 New shop installation detected: ${shop}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to track store installation:', error);
    return false;
  }
}

/**
 * Check if a store is properly installed and authenticated
 */
export async function isStoreInstalled(shop: string): Promise<boolean> {
  try {
    const session = await db.session.findFirst({
      where: { shop }
    });

    return !!session;
  } catch (error) {
    console.error('❌ Failed to check store installation:', error);
    return false;
  }
}

/**
 * Get all installed stores
 */
export async function getInstalledStores(): Promise<string[]> {
  try {
    const sessions = await db.session.findMany({
      select: { shop: true }
    });

    return sessions.map(session => session.shop);
  } catch (error) {
    console.error('❌ Failed to get installed stores:', error);
    return [];
  }
}

/**
 * Remove a store installation (called from app/uninstalled webhook)
 */
export async function removeStoreInstallation(shop: string) {
  try {
    await db.session.deleteMany({
      where: { shop }
    });
    console.log(`🗑️ Removed installation for shop: ${shop}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to remove store installation:', error);
    return false;
  }
}

/**
 * Enhanced authentication middleware that ensures OAuth is complete
 * before allowing access to any app functionality
 */
export async function requireAuthentication(request: Request) {
  try {
    // This will throw if OAuth is not complete or session is invalid
    const { admin, session } = await authenticate.admin(request);
    
    // Ensure we have a valid session and admin API access
    if (!session || !admin) {
      throw new Error('Invalid authentication session');
    }

    // Track that this store is active
    await trackStoreInstallation(session.shop, session.scope?.split(',') || []);

    return { admin, session, shop: session.shop };
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error; // This will redirect to OAuth flow
  }
}

/**
 * Middleware for loader functions that require authentication
 */
export async function authenticatedLoader(
  request: Request,
  loaderFunction?: (args: { admin: any, session: any, shop: string }) => Promise<any>
) {
  const { admin, session, shop } = await requireAuthentication(request);
  
  if (loaderFunction) {
    return await loaderFunction({ admin, session, shop });
  }
  
  return { shop, apiKey: process.env.SHOPIFY_API_KEY || "" };
}

/**
 * Middleware for action functions that require authentication
 */
export async function authenticatedAction(
  request: Request,
  actionFunction: (args: { admin: any, session: any, shop: string, request: Request }) => Promise<any>
) {
  const { admin, session, shop } = await requireAuthentication(request);
  return await actionFunction({ admin, session, shop, request });
}
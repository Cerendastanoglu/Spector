/**
 * Billing Service for Spector App (Managed Pricing)
 * 
 * With Managed Pricing, Shopify handles all billing operations through Partner Dashboard.
 * This service only checks subscription status from Shopify.
 * 
 * Key differences with Managed Pricing:
 * - Shopify prompts users to subscribe when they install the app
 * - Pricing plans are configured in Partner Dashboard (not in code)
 * - No programmatic charge creation or cancellation
 * - We only query subscription status to control app access
 * - Merchants manage billing through Shopify admin
 * 
 * IMPORTANT: Webhook Delays
 * - APP_SUBSCRIPTIONS_UPDATE webhooks can take several minutes to deliver
 * - Always use checkSubscriptionStatus() for real-time checks (not webhook data)
 * - Webhooks are for background database sync only, not immediate status checks
 * - See: https://shopify.dev/docs/apps/build/webhooks/best-practices#manage-delays
 */

import prisma from "~/db.server";
import { logger } from "~/utils/logger";

// GraphQL query to check active subscriptions from Shopify
const GET_ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query GetActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        currentPeriodEnd
        trialDays
        createdAt
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

interface ShopifySubscription {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd?: string;
  trialDays?: number;
  createdAt: string;
  test: boolean;
  lineItems: Array<{
    plan: {
      pricingDetails: {
        price: {
          amount: string;
          currencyCode: string;
        };
        interval: string;
      };
    };
  }>;
}

/**
 * Check subscription status from Shopify (Real-time)
 * 
 * This is the source of truth for subscription status.
 * Always use this for real-time checks, not webhook data.
 * 
 * Returns whether shop has an active subscription
 * 
 * Error Handling:
 * - Returns hasActiveSubscription: false on any error
 * - Logs errors for debugging
 * - Gracefully handles network failures and API errors
 */
export async function checkSubscriptionStatus(
  graphql: any,
  shop: string
): Promise<{
  hasActiveSubscription: boolean;
  subscription: ShopifySubscription | null;
  error?: string;
}> {
  try {
    // Query Shopify for current subscription status
    const response = await graphql(GET_ACTIVE_SUBSCRIPTIONS_QUERY);
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMessages = data.errors.map((e: any) => e.message).join(', ');
      logger.error('[Billing] GraphQL errors:', errorMessages);
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }
    
    const activeSubscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];
    
    // Check if there's at least one active subscription
    const activeSubscription = activeSubscriptions.find(
      (sub: ShopifySubscription) => sub.status === 'ACTIVE'
    );

    // Also accept PENDING status during charge approval
    const pendingSubscription = activeSubscriptions.find(
      (sub: ShopifySubscription) => sub.status === 'PENDING'
    );

    const subscription = activeSubscription || pendingSubscription || null;
    const hasActiveSubscription = !!activeSubscription;

    // Cache status in database for performance
    if (subscription) {
      try {
        const now = new Date();
        const trialDays = subscription.trialDays || 0;
        const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
        
        await prisma.subscription.upsert({
          where: { shop },
          create: {
            shop,
            shopifyChargeId: subscription.id,
            plan: subscription.name,
            status: subscription.status.toLowerCase(),
            price: parseFloat(subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || '0'),
            currency: subscription.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode || 'USD',
            trialEndsAt: trialEnd,
            currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
            lastCheckedAt: now,
          },
          update: {
            shopifyChargeId: subscription.id,
            plan: subscription.name,
            status: subscription.status.toLowerCase(),
            price: parseFloat(subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || '0'),
            currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
            lastCheckedAt: now,
            updatedAt: now,
          },
        });
        
        logger.info(`[Billing] ✅ Cached subscription for ${shop}:`, {
          plan: subscription.name,
          status: subscription.status,
        });
      } catch (dbError) {
        logger.warn('[Billing] ⚠️ Failed to cache subscription status (non-critical):', dbError);
        // Continue even if caching fails - this is not critical
      }
    } else {
      logger.info(`[Billing] ℹ️ No active subscription found for ${shop}`);
    }

    return {
      hasActiveSubscription,
      subscription,
    };
  } catch (error) {
    // Log error for debugging
    logger.error('[Billing] ❌ Error checking subscription status:', {
      shop,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return safe default: no access
    return {
      hasActiveSubscription: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Failed to check subscription status',
    };
  }
}

/**
 * Check if shop has access to app features
 * Can be used to block access for shops without active subscription
 */
export async function checkAccess(
  graphql: any,
  shop: string
): Promise<{
  hasAccess: boolean;
  reason?: string;
  subscription?: ShopifySubscription | null;
}> {
  // Allow development/test stores to bypass subscription requirement
  const devStores = [
    'spector-test-store.myshopify.com',
    // Add more dev/test stores here if needed
  ];
  
  if (devStores.includes(shop)) {
    logger.info(`[Billing] ✅ Development store "${shop}" granted free access (no subscription required)`);
    return {
      hasAccess: true,
      reason: 'DEV_STORE_EXCEPTION',
      subscription: null,
    };
  }

  const { hasActiveSubscription, subscription, error } = await checkSubscriptionStatus(graphql, shop);

  if (error) {
    // On error, allow access but log the issue
    logger.error('[Billing] Error checking access, allowing access:', error);
    return {
      hasAccess: true,
      reason: 'ERROR_CHECKING_STATUS',
    };
  }

  if (!hasActiveSubscription) {
    return {
      hasAccess: false,
      reason: subscription?.status === 'PENDING' ? 'PENDING_APPROVAL' : 'NO_ACTIVE_SUBSCRIPTION',
      subscription,
    };
  }

  return {
    hasAccess: true,
    subscription,
  };
}

/**
 * Get managed pricing subscription URL for shop
 * This directs users to Shopify's hosted subscription page where they can:
 * - Select a pricing plan
 * - Upgrade/downgrade plans
 * - View billing history
 * - Cancel subscription
 * 
 * Format: https://{shop}/admin/charges/{app_id}/pricing_plans
 */
export function getManagedPricingUrl(shop: string): string {
  // App ID from shopify.app.toml (client_id)
  const appId = '035bb80387ae6ea29247c8d0b706f67a';
  return `https://${shop}/admin/charges/${appId}/pricing_plans`;
}

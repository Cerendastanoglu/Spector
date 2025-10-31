/**
 * Billing API Routes (Managed Pricing)
 * 
 * Simplified endpoint for checking subscription status only.
 * With Managed Pricing, Shopify handles all billing operations.
 * 
 * Endpoints:
 * - GET /app/api/billing - Get subscription status from Shopify
 */

import { logger } from "~/utils/logger";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { checkSubscriptionStatus, getManagedPricingUrl } from "~/services/billing.server";

/**
 * GET /app/api/billing
 * Returns current subscription status from Shopify
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const { hasActiveSubscription, subscription, error } = await checkSubscriptionStatus(admin.graphql, shop);

    if (error) {
      return json(
        {
          success: false,
          error,
        },
        { status: 500 }
      );
    }

    return json({
      success: true,
      hasActiveSubscription,
      subscription: subscription ? {
        id: subscription.id,
        name: subscription.name,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        price: subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount,
        currency: subscription.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode,
        test: subscription.test,
      } : null,
      managedPricingUrl: getManagedPricingUrl(shop),
      message: hasActiveSubscription 
        ? 'Active subscription found' 
        : 'No active subscription. Please manage your subscription through Shopify.',
    });
  } catch (error) {
    logger.error('[Billing API] Error fetching subscription:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription',
      },
      { status: 500 }
    );
  }
}

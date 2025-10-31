import { logger } from "~/utils/logger";
/**
 * Billing Webhook Handler (Managed Pricing)
 * 
 * Handles APP_SUBSCRIPTIONS_UPDATE webhook when subscription status changes.
 * Note: Webhooks can take several minutes to deliver, so don't rely on them
 * for real-time subscription status. Use GraphQL queries for immediate checks.
 * 
 * Possible statuses from Shopify:
 * - ACTIVE: Subscription is active and being billed
 * - PENDING: Charge created but not yet approved by merchant
 * - CANCELLED: Merchant cancelled the subscription
 * - DECLINED: Merchant declined the charge
 * - EXPIRED: Subscription expired (e.g., trial ended without payment)
 * - FROZEN: Subscription frozen due to payment issues
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  logger.info(`[Billing Webhook] Received ${topic} for shop: ${shop}`);

  if (!admin) {
    logger.error("[Billing Webhook] Admin API not available");
    return new Response("Admin API not available", { status: 500 });
  }

  try {
    switch (topic) {
      case "APP_SUBSCRIPTIONS_UPDATE":
        await handleSubscriptionUpdate(shop, payload);
        break;

      default:
        logger.warn(`[Billing Webhook] Unhandled webhook topic: ${topic}`);
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    logger.error(`[Billing Webhook] Error processing ${topic}:`, error);
    return new Response("Error processing webhook", { status: 500 });
  }
};

/**
 * Handle subscription update webhook
 * This fires when subscription status changes (activated, cancelled, frozen, etc.)
 * 
 * Important: This is for database sync only. For real-time checks, use GraphQL queries.
 */
async function handleSubscriptionUpdate(shop: string, payload: any) {
  logger.info(`[Billing Webhook] Processing subscription update for ${shop}`, {
    id: payload.app_subscription?.id,
    status: payload.app_subscription?.status,
    name: payload.app_subscription?.name,
  });

  const appSubscription = payload.app_subscription;
  
  if (!appSubscription) {
    logger.warn("[Billing Webhook] No app_subscription in payload");
    return;
  }

  const { 
    id, 
    status, 
    name, 
    current_period_end,
    trial_days,
  } = appSubscription;

  // Map Shopify status to our database status
  let dbStatus: string;
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      dbStatus = 'active';
      break;
    case 'CANCELLED':
    case 'DECLINED':
      dbStatus = 'cancelled';
      break;
    case 'FROZEN':
      dbStatus = 'frozen';
      break;
    case 'PENDING':
      dbStatus = 'pending';
      break;
    case 'EXPIRED':
      dbStatus = 'expired';
      break;
    default:
      logger.warn(`[Billing Webhook] Unknown status: ${status}, storing as-is`);
      dbStatus = status.toLowerCase();
  }

  logger.info(`[Billing Webhook] Mapped status ${status} → ${dbStatus}`);

  // Update or create subscription in database
  try {
    const subscription = await prisma.subscription.upsert({
      where: { shop },
      create: {
        shop,
        shopifyChargeId: id,
        plan: name || 'basic',
        status: dbStatus,
        trialEndsAt: trial_days && trial_days > 0 
          ? new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000)
          : new Date(),
        currentPeriodEnd: current_period_end ? new Date(current_period_end) : null,
        billingStartedAt: dbStatus === 'active' ? new Date() : null,
        lastCheckedAt: new Date(),
      },
      update: {
        shopifyChargeId: id,
        plan: name || 'basic',
        status: dbStatus,
        currentPeriodEnd: current_period_end ? new Date(current_period_end) : null,
        updatedAt: new Date(),
        lastCheckedAt: new Date(),
        // Set billing started date only if transitioning to active and not already set
        ...(dbStatus === 'active' && {
          billingStartedAt: new Date(),
          currentPeriodStart: new Date(),
        }),
        // Set cancelled date only if transitioning to cancelled and not already set
        ...(dbStatus === 'cancelled' && {
          cancelledAt: new Date(),
        }),
      },
    });

    logger.info(`[Billing Webhook] ✅ Updated subscription for ${shop}:`, {
      id: subscription.id,
      status: subscription.status,
      plan: subscription.plan,
      shopifyChargeId: subscription.shopifyChargeId,
    });
  } catch (error) {
    logger.error(`[Billing Webhook] ❌ Database error for ${shop}:`, error);
    throw error;
  }
}

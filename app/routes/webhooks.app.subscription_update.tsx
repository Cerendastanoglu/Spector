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
import { queueWebhook } from "~/utils/queue.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  logger.info(`[Billing Webhook] Received ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Queue webhook and respond with 200 OK immediately (Shopify requirement)
  if (admin && topic === "APP_SUBSCRIPTIONS_UPDATE") {
    queueWebhook({
      type: 'app_subscriptions/update',
      shop,
      topic,
      payload,
    }).catch(error => {
      logger.error('❌ Failed to queue webhook:', error);
    });
  }

  return new Response();
};

/**
 * @todo Implement subscription update handler in the queue worker
 * 
 * This function should process subscription status changes (ACTIVE, CANCELLED, FROZEN, etc.)
 * and update the database accordingly. For real-time checks, use GraphQL queries.
 * 
 * Reference implementation has been removed to avoid Remix client/server bundle issues.
 * See git history for the full implementation to port to the queue worker.
 */

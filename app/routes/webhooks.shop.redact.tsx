import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";
import { queueWebhook } from "~/utils/queue.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  logger.info(`✅ Verified webhook: ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Queue webhook and respond with 200 OK immediately (Shopify requirement)
  queueWebhook({
    type: 'shop/redact',
    shop,
    topic,
    payload,
  }).catch(error => {
    logger.error('❌ Failed to queue webhook:', error);
  });

  return new Response();
};

/**
 * @todo Implement shop redaction handler in the queue worker
 * 
 * This function should handle GDPR/CCPA compliance by deleting all shop data:
 * - OAuth sessions
 * - Analytics snapshots
 * - Product analytics cache
 * - Data retention policies
 * - Old compliance audit records (keep recent ones for 30 days)
 * 
 * Reference implementation has been removed to avoid Remix client/server bundle issues.
 * See git history for the full implementation to port to the queue worker.
 */
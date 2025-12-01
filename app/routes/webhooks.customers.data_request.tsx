import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";
import { queueWebhook } from "~/utils/queue.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  logger.info(`✅ Verified webhook: ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Queue webhook and respond with 200 OK immediately (Shopify requirement)
  queueWebhook({
    type: 'customers/data_request',
    shop,
    topic,
    payload,
  }).catch(error => {
    logger.error('❌ Failed to queue webhook:', error);
  });

  return new Response();
};
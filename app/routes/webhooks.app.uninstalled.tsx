import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { queueWebhook } from "~/utils/queue.server";
import { logger } from "~/utils/logger";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  logger.info(`Received ${topic} webhook for ${shop}`);

  // 🚀 CRITICAL: Queue webhook and respond with 200 OK immediately (Shopify requirement)
  // Queue handles retries and ensures no webhooks are lost
  queueWebhook({
    type: 'app/uninstalled',
    shop,
    topic,
  }).catch(error => {
    logger.error('❌ Failed to queue webhook:', error);
  });

  return new Response();
};

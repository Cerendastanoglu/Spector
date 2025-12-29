import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { queueWebhook } from "~/utils/queue.server";
import { logger } from "~/utils/logger";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  logger.info(`Received ${topic} webhook for ${shop}`);

  // Queue webhook for async processing
  queueWebhook({
    type: 'shop/update',
    shop,
    topic,
  }).catch(error => {
    logger.error('❌ Failed to queue shop/update webhook:', error);
  });

  return new Response();
};

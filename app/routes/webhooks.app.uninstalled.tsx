import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logger } from "~/utils/logger";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  logger.info(`Received ${topic} webhook for ${shop}`);

  // 🚀 CRITICAL: Respond with 200 OK immediately (Shopify requirement)
  // Process cleanup asynchronously to avoid timeout
  if (session) {
    // Don't await - let it run in background
    processUninstallAsync(shop).catch(error => {
      logger.error('❌ Background cleanup failed:', error);
    });
  }

  return new Response();
};

// Process uninstall cleanup asynchronously after sending 200 OK
async function processUninstallAsync(shop: string) {
  try {
    // Webhook requests can trigger multiple times and after an app has already been uninstalled.
    // If this webhook already ran, the session may have been deleted previously.
    await db.session.deleteMany({ where: { shop } });
    logger.info(`✅ Cleaned up sessions for uninstalled shop: ${shop}`);
  } catch (error) {
    logger.error('❌ Failed to clean up uninstalled shop:', error);
  }
}

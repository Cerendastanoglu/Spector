import { logger } from "~/utils/logger";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { queueWebhook } from "~/utils/queue.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    logger.info(`Received ${topic} webhook for ${shop}`);

    // 🚀 CRITICAL: Queue webhook and respond with 200 OK immediately (Shopify requirement)
    if (session) {
        const current = payload.current as string[];
        queueWebhook({
            type: 'app/scopes_update',
            shop,
            topic,
            sessionId: session.id,
            scopes: current,
        }).catch(error => {
            logger.error('❌ Failed to queue webhook:', error);
        });
    }
    
    return new Response();
};
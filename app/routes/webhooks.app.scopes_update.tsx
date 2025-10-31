import { logger } from "~/utils/logger";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    logger.info(`Received ${topic} webhook for ${shop}`);

    // 🚀 CRITICAL: Respond with 200 OK immediately (Shopify requirement)
    // Process scope update asynchronously to avoid timeout
    if (session) {
        const current = payload.current as string[];
        processScopeUpdateAsync(session.id, current);
    }
    
    return new Response();
};

// Process scope update asynchronously after sending 200 OK
async function processScopeUpdateAsync(sessionId: string, scopes: string[]) {
    try {
        await db.session.update({   
            where: {
                id: sessionId
            },
            data: {
                scope: scopes.toString(),
            },
        });
        logger.info(`✅ Updated session scopes: ${scopes.join(', ')}`);
    } catch (error) {
        logger.error('❌ Failed to update session scopes:', error);
    }
}

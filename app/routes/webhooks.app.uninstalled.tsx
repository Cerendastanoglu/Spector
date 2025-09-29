import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Clone the request to avoid body reading conflicts
    const webhookRequest = request.clone();
    
    // authenticate.webhook automatically verifies HMAC signature
    const { shop, session, topic, payload } = await authenticate.webhook(webhookRequest);

    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);

    // Webhook requests can trigger multiple times and after an app has already been uninstalled.
    // If this webhook already ran, the session may have been deleted previously.
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log(`🗑️ Cleaned up sessions for shop: ${shop}`);
    }

    // Log payload for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook payload:', payload);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    
    // Return 401 for authentication failures (invalid HMAC)
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    // Return 500 for other errors
    return new Response('Internal Server Error', { status: 500 });
  }
};

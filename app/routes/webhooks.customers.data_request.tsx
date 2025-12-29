import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`✅ GDPR customers/data_request webhook verified for shop: ${shop}`);
    
    // Process asynchronously - don't block the response
    // In production, queue this for processing
    setImmediate(() => {
      console.log(`Processing data request for shop: ${shop}`, payload);
    });
    
    // Return 200 OK immediately - this is critical for Shopify's verification
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    return new Response('Webhook verification failed', { status: 401 });
  }
};
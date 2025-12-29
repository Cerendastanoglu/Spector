import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Combined compliance webhook handler for GDPR webhooks
 * Handles: customers/data_request, customers/redact, shop/redact
 * 
 * This single endpoint receives all compliance webhooks and routes
 * them based on the X-Shopify-Topic header.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`✅ Compliance webhook verified: ${topic} for shop: ${shop}`);
    
    // Route based on topic
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
      case "customers/data_request":
        console.log(`Processing customer data request for shop: ${shop}`, payload);
        // In production: compile and send customer data to shop owner
        break;
        
      case "CUSTOMERS_REDACT":
      case "customers/redact":
        console.log(`Processing customer redact for shop: ${shop}`, payload);
        // In production: delete customer data from your database
        break;
        
      case "SHOP_REDACT":
      case "shop/redact":
        console.log(`Processing shop redact for shop: ${shop}`, payload);
        // In production: delete all shop data from your database
        break;
        
      default:
        console.log(`Unknown compliance topic: ${topic}`);
    }
    
    // Return 200 OK immediately - required by Shopify
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Compliance webhook verification failed:', error);
    return new Response('Webhook verification failed', { status: 401 });
  }
};

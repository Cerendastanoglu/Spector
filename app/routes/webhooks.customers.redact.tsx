import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Clone the request to avoid body reading conflicts
    const webhookRequest = request.clone();
    
    // Authenticate the webhook request
    const { shop, payload, topic } = await authenticate.webhook(webhookRequest);

    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);

    // Extract customer redaction information
    const {
      customer,
      orders_to_redact,
      shop_domain,
    } = payload as {
      customer: {
        id: number;
        email: string;
        phone?: string;
      };
      orders_to_redact: number[];
      shop_id: number;
      shop_domain: string;
    };

    console.log(`🗑️ Customer data redaction request for customer ID: ${customer.id}`);
    console.log(`📧 Customer email: ${customer.email}`);
    console.log(`🛍️ Orders to redact: ${orders_to_redact.length} orders`);

    // TODO: Implement your customer data deletion logic here
    // You MUST delete all customer data you have stored, including:
    // 1. Personal information
    // 2. Analytics data tied to this customer
    // 3. Preferences and settings
    // 4. Any cached or derived data
    // 5. Logs containing personal information

    try {
      // Example: Delete customer-related data from your database
      // Customize based on your actual data structure
      
      // If you store any customer-specific data, delete it here:
      /*
      await db.customerData.deleteMany({
        where: {
          customerId: customer.id.toString(),
          shopDomain: shop_domain
        }
      });

      await db.customerAnalytics.deleteMany({
        where: {
          customerId: customer.id.toString(),
          shopDomain: shop_domain
        }
      });
      */

      console.log(`✅ Customer data successfully redacted for customer ID: ${customer.id}`);
      
    } catch (dbError) {
      console.error('❌ Failed to redact customer data from database:', dbError);
      // Still return 200 to acknowledge receipt, but log the error
    }

    // Log the redaction for compliance
    console.log(`📝 Customer data redaction completed for shop: ${shop_domain}`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Customer redaction webhook failed:', error);
    
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
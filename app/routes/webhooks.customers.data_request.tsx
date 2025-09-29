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

    // Extract customer data request information
    const {
      customer,
      orders_requested,
      shop_domain,
    } = payload as {
      customer: {
        id: number;
        email: string;
        phone?: string;
      };
      orders_requested: number[];
      shop_id: number;
      shop_domain: string;
    };

    console.log(`📋 Customer data request for customer ID: ${customer.id}`);
    console.log(`📧 Customer email: ${customer.email}`);
    console.log(`🛍️ Orders requested: ${orders_requested.length} orders`);

    // TODO: Implement your customer data collection logic here
    // You should:
    // 1. Collect all customer data you have stored
    // 2. Format it according to your privacy policy
    // 3. Send it to the customer via secure method
    // 4. Log the request for compliance records

    // Example implementation (customize based on your data structure):
    /*
    const customerData = {
      personal_info: {
        email: customer.email,
        phone: customer.phone,
      },
      // Include any data you store about this customer:
      // - Analytics data
      // - Preferences
      // - Custom app data
      // - etc.
    };

    // Send data to customer (implement your preferred method)
    // await sendCustomerDataResponse(customer.email, customerData);
    */

    // Log the request for compliance
    console.log(`📝 Customer data request processed for shop: ${shop_domain}`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Customer data request webhook failed:', error);
    
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
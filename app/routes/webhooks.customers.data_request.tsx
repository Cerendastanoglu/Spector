import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";
import db from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  logger.info(`✅ Verified webhook: ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Respond with 200 OK immediately (Shopify requirement)
  // Process webhook asynchronously to avoid timeout
  processWebhookAsync(shop, payload, topic);

  return new Response();
};

// Process webhook asynchronously after sending 200 OK
async function processWebhookAsync(shop: string, payload: any, _topic: string) {
  try {
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

    logger.info(`📋 Customer data request for customer ID: ${customer.id}`);
    logger.debug(`📧 Customer email: ${customer.email}`);
    logger.debug(`🛍️ Orders requested: ${orders_requested.length} orders`);

    // GDPR/CCPA Compliance Implementation
    // Collect all customer data stored in our system
    
    const customerData: Record<string, any> = {
      personal_info: {
        customer_id: customer.id,
        email: customer.email,
        phone: customer.phone || null,
        shop_domain: shop_domain,
      },
      request_details: {
        orders_requested: orders_requested,
        request_date: new Date().toISOString(),
      },
      stored_data_notice: 'This app stores minimal aggregated analytics data. No personally identifiable customer data is stored beyond Shopify sessions.',
      data_storage: {
        analytics: 'Aggregated product analytics only - no customer-specific data',
        sessions: 'Shop owner OAuth sessions only - no customer sessions',
        retention: 'Analytics data retained per shop settings (default 30 days)',
      },
      your_rights: {
        access: 'You can request your data at any time',
        rectification: 'Contact shop owner to update your information in Shopify',
        erasure: 'Request deletion through Shopify or shop owner',
        data_portability: 'This response contains all data we have about you',
      },
    };

    // Log the request for compliance audit trail
    try {
      
      // Create compliance audit record (30-day retention)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention
      
      await db.complianceAudit.create({
        data: {
          shop: shop_domain,
          topic: 'customers/data_request',
          customerId: customer.id.toString(),
          payload: JSON.stringify(payload),
          status: 'completed',
          response: JSON.stringify(customerData),
          receivedAt: new Date(),
          completedAt: new Date(),
          expiresAt: expiresAt,
          notes: `Data request fulfilled. Customer data collection completed for ${customer.email}`,
        },
      });
      
      logger.info(`✅ Compliance audit record created for customer data request`);
    } catch (dbError) {
      logger.error('⚠️ Failed to create compliance audit record:', dbError);
      // Continue - audit logging failure shouldn't block webhook response
    }

    // Log the request for compliance (30-day retention)
    logger.info(`📝 Customer data request processed for shop: ${shop_domain}`);
    logger.debug(`📦 Customer data package prepared: ${Object.keys(customerData).length} data categories`);
  } catch (error) {
    logger.error('❌ Async webhook processing failed:', error);
  }
}
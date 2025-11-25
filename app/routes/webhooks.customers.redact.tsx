import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";
import db from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  logger.info(`✅ Verified webhook: ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Respond with 200 OK immediately (Shopify requirement)
  // Process webhook asynchronously to avoid timeout
  processRedactionAsync(shop, payload, topic);

  return new Response();
};

// Process webhook asynchronously after sending 200 OK
async function processRedactionAsync(shop: string, payload: any, _topic: string) {
  try {
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

    logger.info(`🗑️ Customer data redaction request for customer ID: ${customer.id}`);
    logger.debug(`📧 Customer email: ${customer.email}`);
    logger.debug(`🛍️ Orders to redact: ${orders_to_redact.length} orders`);

    // GDPR/CCPA Compliance Implementation
    // Delete all customer data stored in our system
    
    const deletionResults = {
      analyticsSnapshots: 0,
      productAnalytics: 0,
      complianceAudits: 0,
      notes: [] as string[],
    };

    try {
      
      // Note: This app stores minimal customer data
      // Most data is shop-level aggregated analytics, not customer-specific
      
      // 1. Delete any analytics snapshots that might contain customer references
      // (Our analytics are shop-level, but delete any that reference this customer)
      const analyticsDeleted = await db.analyticsSnapshot.deleteMany({
        where: {
          shop: shop_domain,
          // If analytics contain customer references in metadata
          metadata: {
            contains: customer.id.toString(),
          },
        },
      });
      deletionResults.analyticsSnapshots = analyticsDeleted.count;
      
      // 2. Delete product analytics cache entries (shop-level, no customer data)
      // These are aggregated by product, not customer, so typically nothing to delete
      deletionResults.notes.push('Product analytics are shop-level aggregates, no customer-specific data');
      
      // 3. Delete old compliance audit records for this customer (keep current one)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const auditDeleted = await db.complianceAudit.deleteMany({
        where: {
          shop: shop_domain,
          customerId: customer.id.toString(),
          topic: { in: ['customers/data_request', 'customers/redact'] },
          receivedAt: { lt: thirtyDaysAgo }, // Keep recent audits for 30 days
        },
      });
      deletionResults.complianceAudits = auditDeleted.count;

      logger.info(`✅ Customer data redaction completed:`, deletionResults);
      
      // Create compliance audit record for this redaction
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention for audit trail
        
        await db.complianceAudit.create({
          data: {
            shop: shop_domain,
            topic: 'customers/redact',
            customerId: customer.id.toString(),
            payload: JSON.stringify(payload),
            status: 'completed',
            response: JSON.stringify(deletionResults),
            receivedAt: new Date(),
            completedAt: new Date(),
            expiresAt: expiresAt,
            notes: `Customer data redacted. ${deletionResults.analyticsSnapshots} analytics deleted, ${deletionResults.complianceAudits} old audits removed.`,
          },
        });
        
        logger.info(`✅ Compliance audit record created for customer redaction`);
      } catch (auditError) {
        logger.error('⚠️ Failed to create compliance audit record:', auditError);
      }
      
    } catch (dbError) {
      logger.error('❌ Failed to redact customer data from database:', dbError);
      deletionResults.notes.push(`Error during deletion: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      
      // Log the failed attempt for compliance
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        await db.complianceAudit.create({
          data: {
            shop: shop_domain,
            topic: 'customers/redact',
            customerId: customer.id.toString(),
            payload: JSON.stringify(payload),
            status: 'error',
            receivedAt: new Date(),
            expiresAt: expiresAt,
            notes: `Redaction failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          },
        });
      } catch (auditError) {
        logger.error('⚠️ Failed to log error in compliance audit:', auditError);
      }
    }

    // Log the redaction for compliance
    logger.info(`📝 Customer data redaction completed for shop: ${shop_domain}`);
    logger.debug(`🗑️ Deletion summary:`, deletionResults);
  } catch (error) {
    logger.error('❌ Async redaction processing failed:', error);
  }
}
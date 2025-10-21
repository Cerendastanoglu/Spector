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

    // GDPR/CCPA Compliance Implementation
    // Delete all customer data stored in our system
    
    const deletionResults = {
      analyticsSnapshots: 0,
      productAnalytics: 0,
      complianceAudits: 0,
      notes: [] as string[],
    };

    try {
      const db = (await import("../db.server")).default;
      
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

      console.log(`✅ Customer data redaction completed:`, deletionResults);
      
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
        
        console.log(`✅ Compliance audit record created for customer redaction`);
      } catch (auditError) {
        console.error('⚠️ Failed to create compliance audit record:', auditError);
      }
      
    } catch (dbError) {
      console.error('❌ Failed to redact customer data from database:', dbError);
      deletionResults.notes.push(`Error during deletion: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      
      // Log the failed attempt for compliance
      try {
        const db = (await import("../db.server")).default;
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
        console.error('⚠️ Failed to log error in compliance audit:', auditError);
      }
    }

    // Log the redaction for compliance
    console.log(`📝 Customer data redaction completed for shop: ${shop_domain}`);
    console.log(`🗑️ Deletion summary:`, deletionResults);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Customer redaction webhook failed:', error);
    
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
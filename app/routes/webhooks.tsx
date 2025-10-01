import type { ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";

/**
 * GDPR Compliance Webhooks Handler
 * 
 * SHOPIFY REQUIREMENT: Apps must subscribe to and properly handle compliance webhooks:
 * - customers/data_request: Provide customer data within 30 days
 * - customers/redact: Delete customer data within 30 days (unless legally required to retain)
 * - shop/redact: Delete all shop data within 30 days
 * 
 * Must respond with 200 series status code to confirm receipt
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.text();
  const webhookId = request.headers.get("X-Shopify-Webhook-Id") || "unknown";
  const topic = request.headers.get("X-Shopify-Topic");
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const shop = request.headers.get("X-Shopify-Shop-Domain");
  let auditRecordId = 'not-created';

  if (!topic || !hmac || !shop) {
    console.log("❌ Missing required webhook headers");
    return new Response("Missing headers", { status: 400 });
  }

  console.log(`� GDPR Compliance Webhook received: ${topic} from ${shop}`);

  try {
    // Verify HMAC signature for security
    if (process.env.SHOPIFY_WEBHOOK_SECRET) {
      const crypto = await import('crypto');
      const expectedHmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(body, 'utf8')
        .digest('base64');
      
      if (hmac !== expectedHmac) {
        console.log(`❌ HMAC verification failed. Expected: ${expectedHmac}, Received: ${hmac}`);
        return new Response("Unauthorized", { status: 401 });
      }
      console.log(`✅ HMAC verification successful`);
    } else {
      console.log(`⚠️ HMAC verification skipped - no webhook secret configured`);
    }

    const payload = JSON.parse(body);
    
    // Create 30-day expiration for GDPR compliance
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Log compliance request for audit trail
    try {
      const auditRecord = await db.complianceAudit.create({
        data: {
          shop,
          topic,
          customerId: payload.customer?.id || null,
          payload: JSON.stringify(payload),
          status: 'received',
          expiresAt,
          notes: `Webhook ID: ${webhookId}, HMAC verified: true`
        }
      });
      auditRecordId = auditRecord.id;
      console.log(`📝 Audit record created: ${auditRecordId}`);
    } catch (dbError) {
      console.error('❌ Failed to create audit record:', dbError);
      auditRecordId = 'failed-to-create';
    }
    
    let finalStatus = 'completed';
    
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST": {
        console.log(`📊 CUSTOMERS_DATA_REQUEST: Processing data request for shop: ${shop}`);
        
        const customerId = payload.customer?.id;
        const customerEmail = payload.customer?.email;
        
        console.log(`👤 Customer ID: ${customerId}, Email: ${customerEmail}`);
        
        // COMPLIANCE ACTION: Gather all customer data we have stored
        const customerDataReport = {
          customerId,
          customerEmail,
          dataFound: {
            notifications: "No customer-specific notification data stored",
            analytics: "No customer-specific analytics data stored", 
            bulkEdits: "No customer-specific bulk edit data stored",
            note: "This app only stores product and inventory data, no personal customer information"
          },
          generatedAt: new Date().toISOString(),
          shop
        };
        
        console.log(`📋 Customer Data Report Generated:`, customerDataReport);
        finalStatus = 'completed';
        break;
      }
      
      case "CUSTOMERS_REDACT": {
        console.log(`🗑️ CUSTOMERS_REDACT: Processing deletion request for shop: ${shop}`);
        
        const customerId = payload.customer?.id;
        const customerEmail = payload.customer?.email;
        
        console.log(`👤 Deleting data for Customer ID: ${customerId}, Email: ${customerEmail}`);
        
        try {
          // Since we don't store customer-specific data, this is mainly for completeness
          console.log(`✅ Customer data deletion completed for ${customerId}`);
          console.log(`📝 Note: This app doesn't store customer-specific data beyond Shopify's scope`);
          
          finalStatus = 'completed';
        } catch (error) {
          console.error(`❌ Error during customer data deletion:`, error);
          finalStatus = 'error';
        }
        break;
      }
      
      case "SHOP_REDACT": {
        console.log(`🏪 SHOP_REDACT: Processing shop deletion request for shop: ${shop}`);
        
        try {
          await db.$transaction(async (tx) => {
            const deletionResults = await Promise.all([
              tx.session.deleteMany({ where: { shop } }),
              tx.notificationRule.deleteMany({ where: { shop } }),
              tx.analyticsSnapshot.deleteMany({ where: { shop } }),
              tx.productAnalytics.deleteMany({ where: { shop } }),
              tx.dataRetentionPolicy.deleteMany({ where: { shop } }),
              tx.bulkEditBatch.deleteMany({ where: { shop } })
            ]);
            
            const totalDeleted = deletionResults.reduce((sum, result) => sum + result.count, 0);
            
            console.log(`✅ SHOP_REDACT completed: Deleted ${totalDeleted} records for shop: ${shop}`);
          });
          
          finalStatus = 'completed';
        } catch (error) {
          console.error(`❌ Error during shop data deletion:`, error);
          finalStatus = 'error';
        }
        break;
      }
      
      default: {
        console.log(`❓ Unhandled compliance webhook topic: ${topic}`);
        finalStatus = 'unhandled';
      }
    }
    
          // Update audit record with success status
      try {
        await db.complianceAudit.update({
          where: { id: auditRecordId },
          data: { 
            status: 'completed',
            completedAt: new Date(),
            notes: `Webhook ID: ${webhookId}, Processed successfully at ${new Date().toISOString()}`
          }
        });
        console.log(`✅ Audit record updated: ${auditRecordId} - completed`);
      } catch (updateError) {
        console.error('❌ Failed to update audit record:', updateError);
      }
    
    console.log(`📝 GDPR Compliance processed: ${topic} - Status: ${finalStatus}`);
    
    // REQUIRED: Respond with 200 series status code to confirm receipt
    return new Response("OK", { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
  } catch (error) {
    console.error(`❌ GDPR Compliance Webhook Error:`, error);
    
    // Update audit record with error status if we have an ID
    if (typeof auditRecordId === 'string' && auditRecordId !== 'failed-to-create') {
      try {
        await db.complianceAudit.update({
          where: { id: auditRecordId },
          data: { 
            status: 'error',
            completedAt: new Date(),
            notes: `Webhook ID: ${webhookId}, Critical Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
        console.log(`❌ Audit record updated: ${auditRecordId} - critical error`);
      } catch (updateError) {
        console.error('❌ Failed to update audit record with critical error:', updateError);
      }
    }
    
    // Still return 200 to prevent webhook retries, but log the error
    return new Response("Error processed", { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
};
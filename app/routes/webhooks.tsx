import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
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
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);
    
    console.log(`🔐 GDPR Compliance Webhook: ${topic} for shop: ${shop}`);
    console.log(`📋 Payload received:`, JSON.stringify(payload, null, 2));
    
    // Log compliance request for audit trail (30-day retention)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    let auditRecordId: string;
    try {
      const auditRecord = await db.complianceAudit.create({
        data: {
          shop,
          topic,
          customerId: payload.customer?.id || null,
          payload: JSON.stringify(payload),
          status: 'received',
          expiresAt
        }
      });
      auditRecordId = auditRecord.id;
    } catch (dbError) {
      console.error('Failed to create audit record:', dbError);
      // Continue processing even if audit logging fails
      auditRecordId = 'failed-to-create';
    }
    
    let finalStatus = 'completed';
    let responseData: string | null = null;
    let notes: string | null = null;
    
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
        responseData = JSON.stringify(customerDataReport);
        finalStatus = 'completed';
        notes = 'Customer data report generated - no personal data stored by app';
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
          notes = 'No customer-specific data to delete - app only stores product data';
        } catch (error) {
          console.error(`❌ Error during customer data deletion:`, error);
          finalStatus = 'error';
          notes = `Error during deletion: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
            notes = `Successfully deleted ${totalDeleted} records`;
          });
          
          finalStatus = 'completed';
        } catch (error) {
          console.error(`❌ Error during shop data deletion:`, error);
          finalStatus = 'error';
          notes = `Error during shop deletion: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        break;
      }
      
      default: {
        console.log(`❓ Unhandled compliance webhook topic: ${topic}`);
        finalStatus = 'unhandled';
        notes = `Unhandled webhook topic: ${topic}`;
      }
    }
    
    // Update the audit record with completion status
    try {
      if (auditRecordId !== 'failed-to-create') {
        await db.complianceAudit.update({
          where: { id: auditRecordId },
          data: {
            status: finalStatus,
            response: responseData,
            completedAt: new Date(),
            notes
          }
        });
      }
    } catch (updateError) {
      console.error('Failed to update audit record:', updateError);
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
    
    // Still return 200 to prevent webhook retries, but log the error
    return new Response("Error processed", { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
};
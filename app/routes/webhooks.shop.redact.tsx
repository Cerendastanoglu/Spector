import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Clone the request to avoid body reading conflicts
    const webhookRequest = request.clone();
    
    // Authenticate the webhook request
    const { shop, payload, topic } = await authenticate.webhook(webhookRequest);

    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);

    // Extract shop redaction information
    const {
      shop_id,
      shop_domain,
    } = payload as {
      shop_id: number;
      shop_domain: string;
    };

    console.log(`🗑️ Shop data redaction request for shop: ${shop_domain}`);
    console.log(`🏪 Shop ID: ${shop_id}`);

    // GDPR/CCPA Compliance Implementation
    // Delete ALL data associated with this shop
    
    const deletionResults = {
      sessions: 0,
      analyticsSnapshots: 0,
      productAnalytics: 0,
      dataRetentionPolicies: 0,
      complianceAudits: 0,
      errors: [] as string[],
    };

    try {
      // 1. Delete all OAuth sessions for this shop
      const sessionsDeleted = await db.session.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.sessions = sessionsDeleted.count;
      console.log(`✅ Deleted ${sessionsDeleted.count} sessions`);

      // 2. Delete all analytics snapshots for this shop
      const analyticsDeleted = await db.analyticsSnapshot.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.analyticsSnapshots = analyticsDeleted.count;
      console.log(`✅ Deleted ${analyticsDeleted.count} analytics snapshots`);

      // 3. Delete all product analytics cache for this shop
      const productAnalyticsDeleted = await db.productAnalytics.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.productAnalytics = productAnalyticsDeleted.count;
      console.log(`✅ Deleted ${productAnalyticsDeleted.count} product analytics entries`);

      // 4. Delete data retention policies for this shop
      const retentionPoliciesDeleted = await db.dataRetentionPolicy.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.dataRetentionPolicies = retentionPoliciesDeleted.count;
      console.log(`✅ Deleted ${retentionPoliciesDeleted.count} data retention policies`);

      // 5. Delete old compliance audit records (keep this one for 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const auditsDeleted = await db.complianceAudit.deleteMany({
        where: {
          shop: shop_domain,
          receivedAt: { lt: thirtyDaysAgo }, // Keep recent audits
        },
      });
      deletionResults.complianceAudits = auditsDeleted.count;
      console.log(`✅ Deleted ${auditsDeleted.count} old compliance audit records`);

      console.log(`✅ Shop data successfully redacted for shop: ${shop_domain}`);
      console.log(`📊 Deletion summary:`, deletionResults);
      
      // Create final compliance audit record (will auto-expire in 30 days)
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention
        
        await db.complianceAudit.create({
          data: {
            shop: shop_domain,
            topic: 'shop/redact',
            payload: JSON.stringify(payload),
            status: 'completed',
            response: JSON.stringify(deletionResults),
            receivedAt: new Date(),
            completedAt: new Date(),
            expiresAt: expiresAt,
            notes: `Shop uninstalled. All data deleted: ${deletionResults.sessions} sessions, ${deletionResults.analyticsSnapshots} analytics, ${deletionResults.productAnalytics} products, ${deletionResults.dataRetentionPolicies} policies, ${deletionResults.complianceAudits} old audits.`,
          },
        });
        
        console.log(`✅ Final compliance audit record created`);
      } catch (auditError) {
        console.error('⚠️ Failed to create final compliance audit record:', auditError);
      }
      
    } catch (dbError) {
      console.error('❌ Failed to redact shop data from database:', dbError);
      deletionResults.errors.push(dbError instanceof Error ? dbError.message : 'Unknown error');
      
      // Log the failed attempt for compliance
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        await db.complianceAudit.create({
          data: {
            shop: shop_domain,
            topic: 'shop/redact',
            payload: JSON.stringify(payload),
            status: 'error',
            receivedAt: new Date(),
            expiresAt: expiresAt,
            notes: `Shop redaction failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          },
        });
      } catch (auditError) {
        console.error('⚠️ Failed to log error in compliance audit:', auditError);
      }
      
      // Still return 200 to acknowledge receipt
    }

    // Log the redaction for compliance
    console.log(`📝 Shop data redaction completed for shop: ${shop_domain}`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Shop redaction webhook failed:', error);
    
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
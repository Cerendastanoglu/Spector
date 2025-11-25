import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "~/db.server";
import { logger } from "~/utils/logger";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  logger.info(`✅ Verified webhook: ${topic} for shop: ${shop}`);

  // 🚀 CRITICAL: Respond with 200 OK immediately (Shopify requirement)
  // Process webhook asynchronously to avoid timeout
  processShopRedactionAsync(shop, payload, topic);

  return new Response();
};

// Process webhook asynchronously after sending 200 OK
async function processShopRedactionAsync(shop: string, payload: any, _topic: string) {
  try {
    // Extract shop redaction information
    const {
      shop_id,
      shop_domain,
    } = payload as {
      shop_id: number;
      shop_domain: string;
    };

    logger.info(`🗑️ Shop data redaction request for shop: ${shop_domain}`);
    logger.debug(`🏪 Shop ID: ${shop_id}`);

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
      logger.info(`✅ Deleted ${sessionsDeleted.count} sessions`);

      // 2. Delete all analytics snapshots for this shop
      const analyticsDeleted = await db.analyticsSnapshot.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.analyticsSnapshots = analyticsDeleted.count;
      logger.info(`✅ Deleted ${analyticsDeleted.count} analytics snapshots`);

      // 3. Delete all product analytics cache for this shop
      const productAnalyticsDeleted = await db.productAnalytics.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.productAnalytics = productAnalyticsDeleted.count;
      logger.info(`✅ Deleted ${productAnalyticsDeleted.count} product analytics entries`);

      // 4. Delete data retention policies for this shop
      const retentionPoliciesDeleted = await db.dataRetentionPolicy.deleteMany({
        where: { shop: shop_domain }
      });
      deletionResults.dataRetentionPolicies = retentionPoliciesDeleted.count;
      logger.info(`✅ Deleted ${retentionPoliciesDeleted.count} data retention policies`);

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
      logger.info(`✅ Deleted ${auditsDeleted.count} old compliance audit records`);

      logger.info(`✅ Shop data successfully redacted for shop: ${shop_domain}`);
      logger.debug(`📊 Deletion summary:`, deletionResults);
      
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
        
        logger.info(`✅ Final compliance audit record created`);
      } catch (auditError) {
        logger.error('⚠️ Failed to create final compliance audit record:', auditError);
      }
      
    } catch (dbError) {
      logger.error('❌ Failed to redact shop data from database:', dbError);
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
        logger.error('⚠️ Failed to log error in compliance audit:', auditError);
      }
      
    }

    // Log the redaction for compliance
    logger.info(`📝 Shop data redaction completed for shop: ${shop_domain}`);
  } catch (error) {
    logger.error('❌ Async shop redaction processing failed:', error);
  }
}
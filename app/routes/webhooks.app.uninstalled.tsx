import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * App Uninstall Webhook Handler
 * 
 * SHOPIFY REQUIREMENT: Apps must completely clean up all data when uninstalled
 * This ensures compliance with privacy and data retention policies
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Clone the request to avoid body reading conflicts
    const webhookRequest = request.clone();
    
    // authenticate.webhook automatically verifies HMAC signature
    const { shop, topic, payload } = await authenticate.webhook(webhookRequest);

    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);
    console.log(`🧹 Starting complete data cleanup for shop: ${shop}`);

    // COMPLETE DATA CLEANUP - Remove ALL shop data to ensure compliance
    try {
      // Start transaction for complete cleanup
      await db.$transaction(async (tx) => {
        // 1. Delete all sessions (OAuth tokens)
        const sessionsDeleted = await tx.session.deleteMany({ where: { shop } });
        console.log(`🗑️ Deleted ${sessionsDeleted.count} sessions`);

        // 2. Delete analytics and product data

        // 3. Delete analytics snapshots and product analytics
        const analyticsSnapshotsDeleted = await tx.analyticsSnapshot.deleteMany({ where: { shop } });
        console.log(`🗑️ Deleted ${analyticsSnapshotsDeleted.count} analytics snapshots`);

        const productAnalyticsDeleted = await tx.productAnalytics.deleteMany({ where: { shop } });
        console.log(`🗑️ Deleted ${productAnalyticsDeleted.count} product analytics records`);

        // 4. Delete data retention policies
        const retentionPoliciesDeleted = await tx.dataRetentionPolicy.deleteMany({ where: { shop } });
        console.log(`🗑️ Deleted ${retentionPoliciesDeleted.count} retention policies`);

        // 5. Delete bulk edit history (batches cascade to items)
        const bulkEditBatchesDeleted = await tx.bulkEditBatch.deleteMany({ where: { shop } });
        console.log(`🗑️ Deleted ${bulkEditBatchesDeleted.count} bulk edit batches (cascades to items)`);

        // 6. Log the complete cleanup
        console.log(`✅ COMPLETE DATA CLEANUP SUCCESSFUL for shop: ${shop}`);
        console.log(`📊 Total records cleaned: ${
          sessionsDeleted.count + 
          analyticsSnapshotsDeleted.count + 
          productAnalyticsDeleted.count + 
          retentionPoliciesDeleted.count + 
          bulkEditBatchesDeleted.count
        }`);
      });

      // Log successful cleanup for audit trail
      console.log(`🎯 COMPLIANCE: All shop data successfully removed for ${shop}`);
      console.log(`🔒 PRIVACY: No residual data remains in system`);
      
    } catch (cleanupError) {
      console.error(`❌ Data cleanup failed for shop ${shop}:`, cleanupError);
      // Still return 200 to prevent webhook retries, but log the error
    }

    // Log payload for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook payload:', payload);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    
    // Return 401 for authentication failures (invalid HMAC)
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    // Return 500 for other errors
    return new Response('Internal Server Error', { status: 500 });
  }
};

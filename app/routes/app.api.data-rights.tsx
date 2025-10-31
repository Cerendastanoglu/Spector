import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { decryptData } from "../utils/encryption";
import { logger } from "~/utils/logger";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (!session) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const shop = session.shop;

  switch (action) {
    case "export_data": {
      try {
        // Export all data we have for this shop
        const exportData: any = {
          shop: shop,
          exportDate: new Date().toISOString(),
          dataTypes: {},
          metadata: {
            note: "Spector does not store protected customer data (names, emails, addresses, phone numbers)",
            retentionPolicies: "Data is automatically deleted according to configured retention periods"
          }
        };

        // Get notification rules (no customer data)
        const notificationRules = await db.$queryRaw`
          SELECT * FROM NotificationRule WHERE shop = ${shop}
        `;
        exportData.dataTypes.notificationRules = notificationRules;

        // Get notification channels (only contains notification emails, not customer emails)
        const notificationChannels = await db.$queryRaw`
          SELECT nc.* FROM NotificationChannel nc 
          INNER JOIN NotificationRule nr ON nc.ruleId = nr.id 
          WHERE nr.shop = ${shop}
        `;
        exportData.dataTypes.notificationChannels = notificationChannels;

        // Get product analytics (no customer data)
        const productAnalytics = await db.$queryRaw`
          SELECT * FROM ProductAnalytics WHERE shop = ${shop}
        `;
        exportData.dataTypes.productAnalytics = productAnalytics;

        // Get analytics snapshots (decrypt for export)
        const analyticsSnapshots = await db.$queryRaw`
          SELECT * FROM AnalyticsSnapshot WHERE shop = ${shop}
        ` as any[];

        const decryptedAnalytics = analyticsSnapshots.map(snapshot => {
          try {
            const decryptedData = decryptData(snapshot.encryptedData);
            return {
              id: snapshot.id,
              dataType: snapshot.dataType,
              createdAt: snapshot.createdAt,
              data: decryptedData
            };
          } catch (error) {
            logger.error('Error decrypting analytics data:', error);
            return {
              id: snapshot.id,
              dataType: snapshot.dataType,
              createdAt: snapshot.createdAt,
              data: "Error decrypting data"
            };
          }
        });
        exportData.dataTypes.analyticsData = decryptedAnalytics;

        // Get data retention policies
        const retentionPolicies = await db.$queryRaw`
          SELECT * FROM DataRetentionPolicy WHERE shop = ${shop}
        `;
        exportData.dataTypes.retentionPolicies = retentionPolicies;

        return json({
          success: true,
          data: exportData,
          message: "Data export completed successfully"
        });

      } catch (error) {
        logger.error('Error exporting data:', error);
        return json({
          success: false,
          error: "Failed to export data"
        }, { status: 500 });
      }
    }

    case "delete_all_data": {
      try {
        // Delete all data for this shop (same as shop redact webhook)
        await db.$executeRaw`DELETE FROM NotificationLog WHERE ruleId IN (SELECT id FROM NotificationRule WHERE shop = ${shop})`;
        await db.$executeRaw`DELETE FROM NotificationChannel WHERE ruleId IN (SELECT id FROM NotificationRule WHERE shop = ${shop})`;
        await db.$executeRaw`DELETE FROM NotificationRule WHERE shop = ${shop}`;
        await db.$executeRaw`DELETE FROM AnalyticsSnapshot WHERE shop = ${shop}`;
        await db.$executeRaw`DELETE FROM ProductAnalytics WHERE shop = ${shop}`;
        await db.$executeRaw`DELETE FROM DataRetentionPolicy WHERE shop = ${shop}`;

        // Log the deletion
        logger.info(`Manual data deletion completed for shop: ${shop}`);

        return json({
          success: true,
          message: "All data has been permanently deleted"
        });

      } catch (error) {
        logger.error('Error deleting data:', error);
        return json({
          success: false,
          error: "Failed to delete data"
        }, { status: 500 });
      }
    }

    case "get_data_summary": {
      try {
        // Get summary of data we store
        const summary: any = {
          shop,
          summaryDate: new Date().toISOString(),
          dataCounts: {}
        };

        const notificationRulesCount = await db.$queryRaw`
          SELECT COUNT(*) as count FROM NotificationRule WHERE shop = ${shop}
        ` as any[];
        summary.dataCounts.notificationRules = notificationRulesCount[0]?.count || 0;

        const analyticsCount = await db.$queryRaw`
          SELECT COUNT(*) as count FROM AnalyticsSnapshot WHERE shop = ${shop}
        ` as any[];
        summary.dataCounts.analyticsSnapshots = analyticsCount[0]?.count || 0;

        const productAnalyticsCount = await db.$queryRaw`
          SELECT COUNT(*) as count FROM ProductAnalytics WHERE shop = ${shop}
        ` as any[];
        summary.dataCounts.productAnalytics = productAnalyticsCount[0]?.count || 0;

        return json({
          success: true,
          summary
        });

      } catch (error) {
        logger.error('Error getting data summary:', error);
        return json({
          success: false,
          error: "Failed to get data summary"
        }, { status: 500 });
      }
    }

    default:
      return json({
        success: false,
        error: "Invalid action"
      }, { status: 400 });
  }
};
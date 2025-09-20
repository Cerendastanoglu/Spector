import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { runScheduledCleanup, getDataUsageStats, cleanupExpiredData } from "../utils/dataRetention";

/**
 * Data cleanup API endpoint
 * This should be called periodically (e.g., via cron job) to clean up expired data
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Get URL parameters
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'cleanup';
    const dataType = url.searchParams.get('dataType') as any;
    
    console.log(`🧹 Cleanup API: ${action} for shop ${shop}`);
    
    if (action === 'stats') {
      // Return data usage statistics
      const stats = await getDataUsageStats(shop);
      return json({
        success: true,
        data: {
          shop,
          stats,
          message: 'Data usage statistics retrieved'
        }
      });
    }
    
    if (action === 'cleanup') {
      // Run cleanup for specific data type or all
      if (dataType) {
        const deletedCount = await cleanupExpiredData(dataType, shop);
        
        return json({
          success: true,
          data: {
            shop,
            dataType,
            deletedCount,
            message: `Cleaned up ${deletedCount} expired ${dataType} records`
          }
        });
      } else {
        // Clean up all expired data
        const results = await runScheduledCleanup();
        
        return json({
          success: true,
          data: {
            shop,
            results,
            message: 'Scheduled cleanup completed'
          }
        });
      }
    }
    
    return json({
      success: false,
      error: 'Invalid action. Use "cleanup" or "stats"'
    }, { status: 400 });
    
  } catch (error) {
    console.error("Cleanup API Error:", error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Cleanup failed" 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual cleanup triggers
 */
export async function action({ request, params, context }: LoaderFunctionArgs) {
  return loader({ request, params, context });
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default retention policies (in days)
export const DEFAULT_RETENTION_POLICIES = {
  analytics: 90,      // Keep analytics data for 90 days
  logs: 30,          // Keep logs for 30 days
  products: 180,     // Keep product data for 180 days
} as const;

export type DataType = keyof typeof DEFAULT_RETENTION_POLICIES;

/**
 * Get retention policy for a specific data type and shop
 */
export async function getRetentionPolicy(shop: string, dataType: DataType): Promise<number> {
  try {
    const policy = await prisma.dataRetentionPolicy.findUnique({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
    });

    if (policy && policy.isActive) {
      return policy.retentionDays;
    }

    // Return default policy if no custom policy exists
    return DEFAULT_RETENTION_POLICIES[dataType];
  } catch (error) {
    console.error(`Error getting retention policy for ${dataType}:`, error);
    return DEFAULT_RETENTION_POLICIES[dataType];
  }
}

/**
 * Set custom retention policy for a shop
 */
export async function setRetentionPolicy(
  shop: string, 
  dataType: DataType, 
  retentionDays: number
): Promise<void> {
  try {
    await prisma.dataRetentionPolicy.upsert({
      where: {
        shop_dataType: {
          shop,
          dataType,
        },
      },
      update: {
        retentionDays,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        shop,
        dataType,
        retentionDays,
        isActive: true,
      },
    });
  } catch (error) {
    console.error(`Error setting retention policy for ${dataType}:`, error);
    throw error;
  }
}

/**
 * Calculate expiration date based on retention policy
 */
export function calculateExpirationDate(retentionDays: number): Date {
  const now = new Date();
  now.setDate(now.getDate() + retentionDays);
  return now;
}

/**
 * Clean up expired data for a specific data type
 */
export async function cleanupExpiredData(dataType: DataType, shop?: string): Promise<number> {
  const now = new Date();
  let deletedCount = 0;

  try {
    switch (dataType) {
      case 'analytics': {
        const analyticsResult = await prisma.analyticsSnapshot.deleteMany({
          where: {
            ...(shop && { shop }),
            expiresAt: {
              lt: now,
            },
          },
        });
        deletedCount += analyticsResult.count;
        break;
      }

      case 'products': {
        const productsResult = await prisma.productAnalytics.deleteMany({
          where: {
            ...(shop && { shop }),
            expiresAt: {
              lt: now,
            },
          },
        });
        deletedCount += productsResult.count;
        break;
      }

      case 'logs': {
        // No specific log cleanup needed currently
        deletedCount = 0;
        break;
      }



      default:
        console.warn(`Unknown data type for cleanup: ${dataType}`);
    }

    console.log(`Cleaned up ${deletedCount} expired ${dataType} records`);
    return deletedCount;
  } catch (error) {
    console.error(`Error cleaning up ${dataType} data:`, error);
    throw error;
  }
}

/**
 * Clean up all expired data for a shop
 */
export async function cleanupAllExpiredData(shop: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const dataType of Object.keys(DEFAULT_RETENTION_POLICIES) as DataType[]) {
    try {
      results[dataType] = await cleanupExpiredData(dataType, shop);
    } catch (error) {
      console.error(`Failed to cleanup ${dataType} for shop ${shop}:`, error);
      results[dataType] = 0;
    }
  }

  return results;
}

/**
 * Get data usage statistics for a shop
 */
export async function getDataUsageStats(shop: string): Promise<{
  analytics: number;
  products: number;
  logs: number;
  totalSize: number;
}> {
  try {
    const [analyticsCount, productsCount] = await Promise.all([
      prisma.analyticsSnapshot.count({ where: { shop } }),
      prisma.productAnalytics.count({ where: { shop } }),
    ]);
    
    const logsCount = 0; // No logs currently tracked

    // Estimate size (rough calculation)
    const totalSize = (analyticsCount * 1024) + (productsCount * 512) + (logsCount * 256);

    return {
      analytics: analyticsCount,
      products: productsCount,
      logs: logsCount,
      totalSize,
    };
  } catch (error) {
    console.error('Error getting data usage stats:', error);
    return {
      analytics: 0,
      products: 0,
      logs: 0,
      totalSize: 0,
    };
  }
}

/**
 * Schedule cleanup job (call this periodically)
 */
export async function runScheduledCleanup(): Promise<void> {
  console.log('Starting scheduled data cleanup...');
  
  try {
    // Get all unique shops
    const shops = await prisma.session.findMany({
      select: { shop: true },
      distinct: ['shop'],
    });

    for (const { shop } of shops) {
      console.log(`Cleaning up data for shop: ${shop}`);
      await cleanupAllExpiredData(shop);
    }

    console.log('Scheduled cleanup completed');
  } catch (error) {
    console.error('Scheduled cleanup failed:', error);
  }
}

#!/usr/bin/env node

/**
 * Data Cleanup Script
 * 
 * This script should be run periodically (e.g., daily via cron) to clean up expired data.
 * 
 * Usage:
 *   node scripts/cleanup-data.js [shop_domain]
 * 
 * Examples:
 *   node scripts/cleanup-data.js                    # Clean up all shops
 *   node scripts/cleanup-data.js mystore.myshopify.com  # Clean up specific shop
 * 
 * Cron job example (daily at 2 AM):
 *   0 2 * * * cd /path/to/spector && node scripts/cleanup-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupExpiredData(shop = null) {
  console.log(`🧹 Starting data cleanup${shop ? ` for shop: ${shop}` : ' for all shops'}...`);
  
  try {
    const now = new Date();
    let totalDeleted = 0;
    
    // Clean up expired analytics snapshots
    const analyticsResult = await prisma.analyticsSnapshot.deleteMany({
      where: {
        ...(shop && { shop }),
        expiresAt: {
          lt: now,
        },
      },
    });
    totalDeleted += analyticsResult.count;
    console.log(`✅ Deleted ${analyticsResult.count} expired analytics snapshots`);
    
    // Clean up expired product analytics
    const productsResult = await prisma.productAnalytics.deleteMany({
      where: {
        ...(shop && { shop }),
        expiresAt: {
          lt: now,
        },
      },
    });
    totalDeleted += productsResult.count;
    console.log(`✅ Deleted ${productsResult.count} expired product analytics records`);
    
    // Clean up old notification logs (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const logsResult = await prisma.notificationLog.deleteMany({
      where: {
        ...(shop && { rule: { shop } }),
        sentAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    totalDeleted += logsResult.count;
    console.log(`✅ Deleted ${logsResult.count} old notification logs`);
    
    console.log(`🎉 Cleanup completed! Total records deleted: ${totalDeleted}`);
    
    // Get current data usage stats
    const shops = shop ? [shop] : await prisma.session.findMany({
      select: { shop: true },
      distinct: ['shop'],
    }).then(sessions => sessions.map(s => s.shop));
    
    for (const shopDomain of shops) {
      const stats = await getDataUsageStats(shopDomain);
      console.log(`📊 ${shopDomain}: ${stats.analytics} analytics, ${stats.products} products, ${stats.logs} logs (${Math.round(stats.totalSize / 1024)}KB)`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function getDataUsageStats(shop) {
  try {
    const [analyticsCount, productsCount, logsCount] = await Promise.all([
      prisma.analyticsSnapshot.count({ where: { shop } }),
      prisma.productAnalytics.count({ where: { shop } }),
      prisma.notificationLog.count({ where: { rule: { shop } } }),
    ]);

    const totalSize = (analyticsCount * 1024) + (productsCount * 512) + (logsCount * 256);

    return {
      analytics: analyticsCount,
      products: productsCount,
      logs: logsCount,
      totalSize,
    };
  } catch (error) {
    console.error('Error getting data usage stats:', error);
    return { analytics: 0, products: 0, logs: 0, totalSize: 0 };
  }
}

// Main execution
const shop = process.argv[2];
cleanupExpiredData(shop);

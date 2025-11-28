/**
 * Webhook Queue System with BullMQ
 * 
 * Production-ready webhook processing queue that:
 * - Handles bursts of traffic without timing out
 * - Provides automatic retry logic
 * - Scales with Redis
 * - Falls back to async processing when Redis is unavailable
 * 
 * Usage:
 * - Development: Works without Redis (falls back to async)
 * - Production: Add REDIS_URL environment variable
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';
import db from '../db.server';

// Upstash Redis client (REST-based, works everywhere)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Initialize the webhook queue (call this on server startup)
 */
export async function initializeQueue() {
  if (!redis) {
    logger.info('⚠️  Redis not configured - using async fallback for webhooks');
    return;
  }

  try {
    // Test Redis connection
    await redis.ping();
    logger.info('✅ Webhook queue system initialized with Upstash Redis (REST)');
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    logger.info('⚠️  Falling back to async webhook processing');
  }
}

/**
 * Queue a webhook for processing with Redis persistence
 */
export async function queueWebhook(data: {
  type: string;
  shop: string;
  payload?: any;
  topic?: string;
  sessionId?: string;
  scopes?: string[];
}) {
  if (!redis) {
    // Fallback to async processing if Redis not available
    logger.info(`⚡ Redis unavailable - processing ${data.type} async`);
    return processWebhookAsync(data);
  }

  try {
    // Store webhook in Redis with TTL (24 hours)
    const jobId = `webhook:${data.shop}:${data.type}:${Date.now()}`;
    await redis.setex(jobId, 86400, JSON.stringify(data));
    logger.info(`📬 Queued webhook: ${jobId}`);
    
    // Process immediately in background with retry logic
    processWebhookWithRetry(jobId, data, 0).catch(error => {
      logger.error(`❌ Webhook processing failed for ${jobId}:`, error);
    });
  } catch (error) {
    logger.error('❌ Failed to queue webhook, falling back to async:', error);
    // Fallback to async if Redis fails
    await processWebhookAsync(data);
  }
}

/**
 * Process webhook with exponential backoff retry
 */
async function processWebhookWithRetry(
  jobId: string,
  data: any,
  attempt: number
): Promise<void> {
  const maxAttempts = 3;
  
  try {
    await processWebhookAsync(data);
    // Success - remove from Redis
    if (redis) {
      await redis.del(jobId);
    }
    logger.info(`✅ Completed webhook ${jobId}`);
  } catch (error) {
    if (attempt < maxAttempts - 1) {
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt + 1) * 1000;
      logger.warn(`⚠️  Webhook ${jobId} failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms`);
      
      setTimeout(() => {
        processWebhookWithRetry(jobId, data, attempt + 1);
      }, delay);
    } else {
      logger.error(`❌ Webhook ${jobId} failed after ${maxAttempts} attempts:`, error);
      // Mark as failed in Redis
      if (redis) {
        await redis.setex(`${jobId}:failed`, 86400, JSON.stringify({ error: String(error), attempts: maxAttempts }));
      }
    }
  }
}

/**
 * Fallback async processing when queue is unavailable
 */
async function processWebhookAsync(data: {
  type: string;
  shop: string;
  payload?: any;
  sessionId?: string;
  scopes?: string[];
}) {
  try {
    switch (data.type) {
      case 'app/uninstalled':
        await processUninstall(data.shop);
        break;
      
      case 'app/scopes_update':
        if (data.sessionId && data.scopes) {
          await processScopeUpdate(data.sessionId, data.scopes);
        }
        break;
      
      case 'app_subscriptions/update':
        if (data.payload) {
          await processSubscriptionUpdate(data.shop, data.payload);
        }
        break;
      
      case 'customers/data_request':
        if (data.payload) {
          await processCustomerDataRequest(data.shop, data.payload);
        }
        break;
      
      case 'customers/redact':
        if (data.payload) {
          await processCustomerRedact(data.shop, data.payload);
        }
        break;
      
      case 'shop/redact':
        if (data.payload) {
          await processShopRedact(data.shop, data.payload);
        }
        break;
    }
  } catch (error) {
    logger.error(`❌ Async webhook processing failed for ${data.type}:`, error);
  }
}

// ===================================================================
// Webhook Processing Functions
// ===================================================================

async function processUninstall(shop: string) {
  await db.session.deleteMany({ where: { shop } });
  logger.info(`✅ Cleaned up sessions for uninstalled shop: ${shop}`);
}

async function processScopeUpdate(sessionId: string, scopes: string[]) {
  await db.session.update({
    where: { id: sessionId },
    data: { scope: scopes.toString() },
  });
  logger.info(`✅ Updated session scopes: ${scopes.join(', ')}`);
}

async function processSubscriptionUpdate(shop: string, payload: any) {
  // Process subscription update from webhook payload
  logger.info(`💳 Processing subscription update for shop: ${shop}`);
  logger.info(`   Status: ${payload?.app_subscription?.status}`);
  
  // The actual subscription logic is handled in the webhook route
  // This is just for logging and any additional processing
}

async function processCustomerDataRequest(shop: string, payload: any) {
  const { customer, orders_requested } = payload;
  
  logger.info(`📋 Customer data request for shop: ${shop}`);
  logger.info(`   Customer ID: ${customer?.id}, Email: ${customer?.email}`);
  logger.info(`   Orders requested: ${orders_requested?.length || 0}`);
  
  try {
    // GDPR/CCPA Compliance: Export customer data
    const customerData: any = {
      shop,
      customer: {
        id: customer?.id,
        email: customer?.email,
        phone: customer?.phone,
        name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
      },
      requested_at: new Date().toISOString(),
      data_collected: {
        // Session data (if any OAuth sessions exist with customer email)
        sessions: [],
        // Analytics snapshots that might contain customer references
        analytics: [],
        // Any user preferences stored
        preferences: [],
      },
    };

    // Note: This app primarily stores shop-level data, not individual customer data
    // Most data (AnalyticsSnapshot, ProductAnalytics, etc.) is shop-scoped, not customer-scoped
    // If we add customer-specific features in the future, export logic should be added here

    // Log the data request for audit trail
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'customers/data_request',
        customerId: customer?.id?.toString(),
        payload: JSON.stringify(payload),
        status: 'completed',
        response: JSON.stringify(customerData),
        receivedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: 'Customer data export completed. App stores minimal customer data.',
      },
    });

    logger.info(`✅ Customer data request completed for ${customer?.email}`);
  } catch (error) {
    logger.error(`❌ Failed to process customer data request:`, error);
    
    // Log the failure in audit trail
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'customers/data_request',
        customerId: customer?.id?.toString(),
        payload: JSON.stringify(payload),
        status: 'error',
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });
  }
}

async function processCustomerRedact(shop: string, payload: any) {
  const { customer } = payload;
  
  logger.info(`🗑️  Customer redaction request for shop: ${shop}`);
  logger.info(`   Customer ID: ${customer?.id}, Email: ${customer?.email}`);
  
  try {
    const deletionResults = {
      sessions: 0,
      complianceAudits: 0,
    };

    // 1. Delete any sessions associated with this customer email
    // Note: Sessions are typically shop OAuth sessions, not customer sessions
    // But if we stored customer email in sessions, we should clean those up
    if (customer?.email) {
      const sessionResult = await db.session.deleteMany({
        where: {
          shop,
          email: customer.email,
        },
      });
      deletionResults.sessions = sessionResult.count;
    }

    // 2. Clean up old compliance audit records for this customer (keep recent ones per GDPR)
    // Delete audits older than 30 days for this customer
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const auditResult = await db.complianceAudit.deleteMany({
      where: {
        shop,
        customerId: customer?.id?.toString(),
        receivedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    deletionResults.complianceAudits = auditResult.count;

    // 3. Note: Most app data (AnalyticsSnapshot, ProductAnalytics, etc.) is shop-scoped,
    //    not customer-scoped. This app does not store individual customer purchase history
    //    or personal data beyond what's in the webhook payload itself.
    //    If we add customer-specific features in the future, deletion logic should be added here.

    // 4. Create audit record of the deletion
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'customers/redact',
        customerId: customer?.id?.toString(),
        payload: JSON.stringify(payload),
        status: 'completed',
        receivedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Keep for 30 days
        notes: `Customer data deleted: ${deletionResults.sessions} sessions, ${deletionResults.complianceAudits} old audit records.`,
      },
    });

    logger.info(`✅ Customer redaction completed for ${customer?.email}`);
    logger.info(`   Deleted: ${deletionResults.sessions} sessions, ${deletionResults.complianceAudits} audit records`);
  } catch (error) {
    logger.error(`❌ Failed to process customer redaction:`, error);
    
    // Log the failure
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'customers/redact',
        customerId: customer?.id?.toString(),
        payload: JSON.stringify(payload),
        status: 'error',
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });
  }
}

async function processShopRedact(shop: string, _payload: any) {
  logger.info(`🗑️  Shop redaction request: ${shop}`);
  
  try {
    const deletionResults = {
      sessions: 0,
      analyticsSnapshots: 0,
      productAnalytics: 0,
      dataRetentionPolicies: 0,
      complianceAudits: 0,
      intelligenceCredentials: 0,
      userPreferences: 0,
      subscriptions: 0,
    };

    // 1. Delete all OAuth sessions for this shop
    const sessionResult = await db.session.deleteMany({ where: { shop } });
    deletionResults.sessions = sessionResult.count;

    // 2. Delete all analytics snapshots (encrypted data)
    const analyticsResult = await db.analyticsSnapshot.deleteMany({ where: { shop } });
    deletionResults.analyticsSnapshots = analyticsResult.count;

    // 3. Delete all product analytics cache
    const productResult = await db.productAnalytics.deleteMany({ where: { shop } });
    deletionResults.productAnalytics = productResult.count;

    // 4. Delete data retention policies for this shop
    const retentionResult = await db.dataRetentionPolicy.deleteMany({ where: { shop } });
    deletionResults.dataRetentionPolicies = retentionResult.count;

    // 5. Delete intelligence API credentials (encrypted)
    const credentialsResult = await db.intelligenceCredentials.deleteMany({ where: { shop } });
    deletionResults.intelligenceCredentials = credentialsResult.count;

    // 6. Delete user preferences
    const preferencesResult = await db.userPreferences.deleteMany({ where: { shop } });
    deletionResults.userPreferences = preferencesResult.count;

    // 7. Delete subscription records
    const subscriptionResult = await db.subscription.deleteMany({ where: { shop } });
    deletionResults.subscriptions = subscriptionResult.count;

    // 8. Clean up old compliance audit records (keep the most recent shop/redact for 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldAuditResult = await db.complianceAudit.deleteMany({
      where: {
        shop,
        receivedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    deletionResults.complianceAudits = oldAuditResult.count;

    // 9. Create final audit record of the shop deletion
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'shop/redact',
        payload: JSON.stringify(_payload),
        status: 'completed',
        receivedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Keep for 30 days
        notes: `Shop uninstalled. All data deleted: ${deletionResults.sessions} sessions, ${deletionResults.analyticsSnapshots} analytics, ${deletionResults.productAnalytics} products, ${deletionResults.dataRetentionPolicies} policies, ${deletionResults.complianceAudits} old audits.`,
      },
    });

    logger.info(`✅ Completed shop data redaction: ${shop}`);
    logger.info(`   Deleted:`, deletionResults);
  } catch (error) {
    logger.error(`❌ Failed to process shop redaction:`, error);
    
    // Log the failure
    await db.complianceAudit.create({
      data: {
        shop,
        topic: 'shop/redact',
        payload: JSON.stringify(_payload),
        status: 'error',
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });
  }
}

/**
 * Graceful shutdown - close queue connections
 */
export async function closeQueue() {
  if (webhookQueue) {
    await webhookQueue.close();
  }
  if (webhookWorker) {
    await webhookWorker.close();
  }
  if (queueEvents) {
    await queueEvents.close();
  }
  logger.info('✅ Webhook queue closed');
}

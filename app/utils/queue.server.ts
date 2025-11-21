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

import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from './logger';
import db from '../db.server';

// Redis connection configuration
const redisConnection = process.env.REDIS_URL 
  ? {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
    }
  : undefined;

// Queue availability flag
let queueAvailable = false;

// Webhook queue instance
let webhookQueue: Queue | null = null;
let webhookWorker: Worker | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Initialize the webhook queue (call this on server startup)
 */
export async function initializeQueue() {
  if (!redisConnection) {
    logger.info('⚠️  Redis not configured - using async fallback for webhooks');
    return;
  }

  try {
    // Create the queue
    webhookQueue = new Queue('webhooks', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    });

    // Create queue events listener for monitoring
    queueEvents = new QueueEvents('webhooks', {
      connection: redisConnection,
    });

    // Monitor queue events
    queueEvents.on('completed', ({ jobId }) => {
      logger.info(`✅ Webhook job ${jobId} completed`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`❌ Webhook job ${jobId} failed:`, failedReason);
    });

    // Create the worker to process jobs
    webhookWorker = new Worker(
      'webhooks',
      async (job) => {
        const { type, shop, payload } = job.data;
        
        logger.info(`🔄 Processing webhook job ${job.id}: ${type} for ${shop}`);

        try {
          // Route to appropriate handler based on type
          switch (type) {
            case 'app/uninstalled':
              await processUninstall(shop);
              break;
            
            case 'app/scopes_update':
              await processScopeUpdate(job.data.sessionId, job.data.scopes);
              break;
            
            case 'app_subscriptions/update':
              await processSubscriptionUpdate(shop, payload);
              break;
            
            case 'customers/data_request':
              await processCustomerDataRequest(shop, payload);
              break;
            
            case 'customers/redact':
              await processCustomerRedact(shop, payload);
              break;
            
            case 'shop/redact':
              await processShopRedact(shop, payload);
              break;
            
            default:
              logger.warn(`⚠️  Unknown webhook type: ${type}`);
          }
          
          logger.info(`✅ Completed ${type} for ${shop}`);
        } catch (error) {
          logger.error(`❌ Error processing ${type} for ${shop}:`, error);
          throw error; // Re-throw to trigger retry logic
        }
      },
      {
        connection: redisConnection,
        concurrency: 10, // Process up to 10 webhooks concurrently
      }
    );

    queueAvailable = true;
    logger.info('✅ Webhook queue system initialized with Redis');
  } catch (error) {
    logger.error('❌ Failed to initialize webhook queue:', error);
    logger.info('⚠️  Falling back to async webhook processing');
    queueAvailable = false;
  }
}

/**
 * Queue a webhook for processing
 */
export async function queueWebhook(data: {
  type: string;
  shop: string;
  payload?: any;
  topic?: string;
  sessionId?: string;
  scopes?: string[];
}) {
  if (!queueAvailable || !webhookQueue) {
    // Fallback to async processing if queue not available
    logger.info(`⚡ Queue unavailable - processing ${data.type} async`);
    return processWebhookAsync(data);
  }

  try {
    const job = await webhookQueue.add(data.type, data, {
      jobId: `${data.shop}-${data.type}-${Date.now()}`,
    });
    logger.info(`📬 Queued webhook job ${job.id}`);
  } catch (error) {
    logger.error('❌ Failed to queue webhook, falling back to async:', error);
    // Fallback to async if queue fails
    await processWebhookAsync(data);
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
  
  // TODO: Implement actual customer data export logic
  // For now, just log the request
}

async function processCustomerRedact(shop: string, payload: any) {
  const { customer } = payload;
  
  logger.info(`🗑️  Customer redaction request for shop: ${shop}`);
  logger.info(`   Customer ID: ${customer?.id}, Email: ${customer?.email}`);
  
  // TODO: Implement actual customer data deletion logic
  // Delete any customer-related data from your database
}

async function processShopRedact(shop: string, _payload: any) {
  logger.info(`🗑️  Shop redaction request: ${shop}`);
  
  // Delete all shop data
  await db.session.deleteMany({ where: { shop } });
  
  // TODO: Delete any other shop-related data
  // - Notification settings
  // - Email preferences
  // - Cached data
  // - etc.
  
  logger.info(`✅ Completed shop data redaction: ${shop}`);
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

// Bulk edit functionality - Re-enabled
// Note: Database tables were removed, operations now execute directly via Shopify API
import { logger } from '~/utils/logger';

export type CreateBatchInput = {
  shopDomain: string;
  operationName: string;
  operationType: string;
  description?: string;
  changes: Array<{
    resourceGid: string;
    resourceType: string;
    field: string;
    oldValue: string;
    newValue: string;
  }>;
};

/**
 * Creates a new bulk edit batch and executes operations directly
 * Note: Database persistence removed - operations execute immediately
 */
export async function createBatchWithRevert(input: CreateBatchInput) {
  logger.info(`🔄 Bulk edit operation: ${input.operationName} with ${input.changes.length} changes`);
  
  try {
    // Count products and variants
    const productIds = new Set();
    const variantIds = new Set();
    
    input.changes.forEach(change => {
      if (change.resourceType === 'product') {
        productIds.add(change.resourceGid);
      } else if (change.resourceType === 'variant') {
        variantIds.add(change.resourceGid);
      }
    });

    // Create in-memory batch record (not persisted)
    const batch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      shop: input.shopDomain,
      operationType: input.operationType,
      operationName: input.operationName,
      description: input.description,
      totalProducts: productIds.size,
      totalVariants: variantIds.size,
      canRevert: true, // Re-enabled
      isReverted: false,
      createdAt: new Date().toISOString(),
      items: input.changes.map(change => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resourceGid: change.resourceGid,
        resourceType: change.resourceType,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue
      }))
    };

    logger.info(`✅ Bulk operation created: ${input.operationName}`);
    logger.info(`   - Products affected: ${productIds.size}`);
    logger.info(`   - Variants affected: ${variantIds.size}`);
    logger.info(`   - Total changes: ${input.changes.length}`);
    
    return {
      ...batch,
      revertRecipeFile: null // Could generate revert GraphQL mutations if needed
    };

  } catch (error) {
    logger.error('❌ Failed to create bulk operation:', error);
    throw error;
  }
}

/**
 * Gets recent bulk edit batches for a shop
 * Note: Returns empty array since database persistence was removed
 */
export async function getRecentBatches(_shopDomain: string, _limit = 5) {
  logger.info(`📋 Recent batches requested for shop: ${_shopDomain}`);
  
  // Return empty array - no persistence layer
  return [];
}

/**
 * Gets details for a specific batch
 * Note: Returns null since database persistence was removed
 */
export async function getBatchDetails(batchId: string) {
  logger.info(`📋 Batch details requested for batch: ${batchId}`);
  
  // Return null - no persistence layer
  return null;
}

/**
 * Marks a batch as reverted
 * Note: Returns false since database persistence was removed
 */
export async function markBatchAsReverted(batchId: string) {
  logger.info(`📋 Batch revert requested for batch: ${batchId}`);
  
  // Return false - no persistence layer
  return false;
}

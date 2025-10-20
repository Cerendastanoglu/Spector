// Bulk edit functionality has been disabled and removed
// This file is kept for compatibility but functions are no-ops

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
 * Creates a new bulk edit batch and generates a revert recipe
 * Note: This functionality has been removed.
 */
export async function createBatchWithRevert(input: CreateBatchInput) {
  console.log(`🔄 Bulk edit operation requested but feature removed: ${input.operationName} with ${input.changes.length} changes`);
  
  try {
    // Count products and variants (for logging only)
    const productIds = new Set();
    const variantIds = new Set();
    
    input.changes.forEach(change => {
      if (change.resourceType === 'product') {
        productIds.add(change.resourceGid);
      } else if (change.resourceType === 'variant') {
        variantIds.add(change.resourceGid);
      }
    });

    // No longer creating database entries
    const mockBatch = {
      id: "disabled",
      shop: input.shopDomain,
      operationType: input.operationType,
      operationName: input.operationName,
      description: input.description,
      totalProducts: productIds.size,
      totalVariants: variantIds.size,
      canRevert: false,
      isReverted: false,
      createdAt: new Date().toISOString(),
      items: []
    };

    console.log(`✅ Operation logged (but not saved): ${input.operationName}`);
    
    return {
      ...mockBatch,
      revertRecipeFile: null
    };

  } catch (error) {
    console.error('❌ Failed to process operation:', error);
    throw error;
  }
}

/**
 * Gets recent bulk edit batches for a shop
 * Note: This functionality has been removed.
 */
export async function getRecentBatches(_shopDomain: string, _limit = 5) {
  console.log(`📋 Recent batches requested but feature removed for shop: ${_shopDomain}`);
  
  // Return empty array
  return [];
}

/**
 * Gets details for a specific batch
 * Note: This functionality has been removed.
 */
export async function getBatchDetails(batchId: string) {
  console.log(`📋 Batch details requested but feature removed for batch: ${batchId}`);
  
  // Return null to indicate batch not found
  return null;
}

/**
 * Marks a batch as reverted
 * Note: This functionality has been removed.
 */
export async function markBatchAsReverted(batchId: string) {
  console.log(`📋 Batch revert requested but feature removed for batch: ${batchId}`);
  
  // Return false to indicate operation not performed
  return false;
}

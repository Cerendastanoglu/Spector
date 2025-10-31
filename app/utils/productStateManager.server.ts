import fs from 'fs/promises';
import path from 'path';
import { logger } from "~/utils/logger";

export interface ProductState {
  timestamp: string;
  batchId: string;
  operationName: string;
  products: Record<string, {
    title?: string;
    tags?: string[];
    productType?: string;
    vendor?: string;
    description?: string;
    status?: string;
    variants?: Record<string, {
      price?: string;
      compareAtPrice?: string;
      sku?: string;
      inventoryQuantity?: number;
      title?: string;
    }>;
  }>;
}

export interface ProductStateHistory {
  current: ProductState | null;
  previous: ProductState | null;
}

export class ProductStateManager {
  private static getStateDir(): string {
    return path.join(process.cwd(), 'product-states');
  }

  private static async ensureStateDir(): Promise<void> {
    const dir = this.getStateDir();
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private static getStateFilePath(shopDomain: string): string {
    return path.join(this.getStateDir(), `${shopDomain}_state.json`);
  }

  /**
   * Save a new product state and automatically manage the current/previous rotation
   */
  static async saveProductState(
    shopDomain: string,
    batchId: string,
    operationName: string,
    productChanges: Array<{
      productGid: string;
      field: string;
      newValue: string;
      variantGid?: string;
    }>
  ): Promise<void> {
    await this.ensureStateDir();
    
    logger.info(`💾 Saving product state for shop: ${shopDomain}, batch: ${batchId}`);

    // Load existing history
    const history = await this.loadProductStateHistory(shopDomain);
    
    // Move current to previous (if exists)
    if (history.current) {
      history.previous = history.current;
    }

    // Create new current state by merging changes
    const newState: ProductState = {
      timestamp: new Date().toISOString(),
      batchId,
      operationName,
      products: {}
    };

    // If we have a previous state, start with its products
    if (history.previous) {
      newState.products = JSON.parse(JSON.stringify(history.previous.products));
    }

          // Apply new changes to create the current state
    for (const change of productChanges) {
      const productId = change.productGid.split('/').pop() || change.productGid;
      
      if (!newState.products[productId]) {
        newState.products[productId] = {};
      }

      // Store both old and new values in a more robust way
      if (change.variantGid) {
        // Variant change
        const variantId = change.variantGid.split('/').pop() || change.variantGid;
        if (!newState.products[productId].variants) {
          newState.products[productId].variants = {};
        }
        const variants = newState.products[productId].variants;
        if (variants && !variants[variantId]) {
          variants[variantId] = {};
        }
        if (variants && variants[variantId]) {
          // Store the current value
          (variants[variantId] as any)[change.field] = change.newValue;
          
          // Also store the original value if it's not already there (for better revert handling)
          const fieldHistoryKey = `${change.field}_history`;
          if (!(variants[variantId] as any)[fieldHistoryKey]) {
            // Get the old value safely
            let oldValue = null;
            if (history.previous?.products[productId]?.variants?.[variantId]) {
              oldValue = (history.previous.products[productId].variants[variantId] as any)[change.field];
            }
            
            (variants[variantId] as any)[fieldHistoryKey] = {
              original: oldValue !== undefined ? oldValue : null,
              changes: [change.newValue]
            };
          } else {
            // Add to existing history
            (variants[variantId] as any)[fieldHistoryKey].changes.push(change.newValue);
          }
        }
      } else {
        // Product change
        (newState.products[productId] as any)[change.field] = change.newValue;
        
        // Also store the original value if it's not already there (for better revert handling)
        const fieldHistoryKey = `${change.field}_history`;
        if (!(newState.products[productId] as any)[fieldHistoryKey]) {
          // Get the old value safely
          let oldValue = null;
          if (history.previous?.products[productId]) {
            oldValue = (history.previous.products[productId] as any)[change.field];
          }
          
          (newState.products[productId] as any)[fieldHistoryKey] = {
            original: oldValue !== undefined ? oldValue : null,
            changes: [change.newValue]
          };
        } else {
          // Add to existing history
          (newState.products[productId] as any)[fieldHistoryKey].changes.push(change.newValue);
        }
      }
    }

    // Set as current
    history.current = newState;

    // Save to file with backup
    const filePath = this.getStateFilePath(shopDomain);
    const backupPath = `${filePath}.backup`;
    
    try {
      // Create backup of existing file
      try {
        await fs.access(filePath);
        await fs.copyFile(filePath, backupPath);
      } catch {
        // No existing file, no backup needed
      }

      // Save new state
      await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf-8');
      
      logger.info(`✅ Product state saved successfully for ${shopDomain} - Current: ${operationName}, Previous: ${history.previous?.operationName || 'none'}`);
      
      // Remove backup on success
      try {
        await fs.unlink(backupPath);
      } catch {
        // Backup might not exist
      }
      
    } catch (error) {
      logger.error(`❌ Failed to save product state for ${shopDomain}:`, error);
      
      // Restore from backup if save failed
      try {
        await fs.access(backupPath);
        await fs.copyFile(backupPath, filePath);
        await fs.unlink(backupPath);
        logger.info(`🔄 Restored from backup for ${shopDomain}`);
      } catch {
        // No backup to restore
      }
      
      throw error;
    }
  }

  /**
   * Load the product state history for a shop
   */
  static async loadProductStateHistory(shopDomain: string): Promise<ProductStateHistory> {
    const filePath = this.getStateFilePath(shopDomain);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const history = JSON.parse(content) as ProductStateHistory;
      
      // Validate structure
      if (!history.current && !history.previous) {
        return { current: null, previous: null };
      }
      
      return history;
    } catch {
      // File doesn't exist or is corrupted, return empty history
      return { current: null, previous: null };
    }
  }

  /**
   * Get revert data for a batch - compares current to previous state
   */
  static async getRevertData(
    shopDomain: string,
    batchId: string
  ): Promise<{
    canRevert: boolean;
    revertChanges: Array<{
      resourceGid: string;
      resourceType: 'product' | 'variant';
      field: string;
      currentValue: string;
      revertToValue: string;
    }>;
  }> {
    const history = await this.loadProductStateHistory(shopDomain);
    
    if (!history.current || !history.previous || history.current.batchId !== batchId) {
      return { canRevert: false, revertChanges: [] };
    }

    const revertChanges: Array<{
      resourceGid: string;
      resourceType: 'product' | 'variant';
      field: string;
      currentValue: string;
      revertToValue: string;
    }> = [];

    // Check for field history and use that for more accurate reverts
    for (const [productId, currentProduct] of Object.entries(history.current.products)) {
      const previousProduct = history.previous.products[productId] || {};
      const productGid = `gid://shopify/Product/${productId}`;

      // Compare product-level fields
      for (const field of ['title', 'productType', 'vendor', 'description', 'status', 'tags']) {
        const currentValue = (currentProduct as any)[field];
        const fieldHistoryKey = `${field}_history`;
        
        // First check if we have a history record with original value
        if ((currentProduct as any)[fieldHistoryKey] && (currentProduct as any)[fieldHistoryKey].original !== null) {
          const originalValue = (currentProduct as any)[fieldHistoryKey].original;
          
          if (currentValue !== originalValue) {
            revertChanges.push({
              resourceGid: productGid,
              resourceType: 'product',
              field,
              currentValue: Array.isArray(currentValue) ? currentValue.join(',') : String(currentValue || ''),
              revertToValue: Array.isArray(originalValue) ? originalValue.join(',') : String(originalValue || '')
            });
          }
        } 
        // Fall back to previous state comparison
        else {
          const previousValue = (previousProduct as any)[field];
          
          if (currentValue !== undefined && previousValue !== undefined && currentValue !== previousValue) {
            revertChanges.push({
              resourceGid: productGid,
              resourceType: 'product',
              field,
              currentValue: Array.isArray(currentValue) ? currentValue.join(',') : String(currentValue || ''),
              revertToValue: Array.isArray(previousValue) ? previousValue.join(',') : String(previousValue || '')
            });
          }
        }
      }

      // Compare variant-level fields
      if (currentProduct.variants) {
        for (const [variantId, currentVariant] of Object.entries(currentProduct.variants)) {
          const previousVariant = previousProduct.variants?.[variantId] || {};
          const variantGid = `gid://shopify/ProductVariant/${variantId}`;

          for (const field of ['price', 'compareAtPrice', 'sku', 'inventoryQuantity', 'title']) {
            const currentValue = (currentVariant as any)[field];
            const fieldHistoryKey = `${field}_history`;
            
            // First check if we have a history record with original value
            if ((currentVariant as any)[fieldHistoryKey] && (currentVariant as any)[fieldHistoryKey].original !== null) {
              const originalValue = (currentVariant as any)[fieldHistoryKey].original;
              
              if (currentValue !== originalValue) {
                revertChanges.push({
                  resourceGid: variantGid,
                  resourceType: 'variant',
                  field,
                  currentValue: String(currentValue || ''),
                  revertToValue: String(originalValue || '')
                });
              }
            } 
            // Fall back to previous state comparison
            else {
              const previousValue = (previousVariant as any)[field];
              
              if (currentValue !== undefined && previousValue !== undefined && currentValue !== previousValue) {
                revertChanges.push({
                  resourceGid: variantGid,
                  resourceType: 'variant',
                  field,
                  currentValue: String(currentValue || ''),
                  revertToValue: String(previousValue || '')
                });
              }
            }
          }
        }
      }
    }

    return { 
      canRevert: revertChanges.length > 0, 
      revertChanges 
    };
  }

  /**
   * Clean up old state files (keep only current and previous)
   */
  static async cleanup(shopDomain: string): Promise<void> {
    // This is already handled by our two-state system, but we can clean up any old backup files
    const dir = this.getStateDir();
    try {
      const files = await fs.readdir(dir);
      const backupFiles = files.filter(file => file.includes(shopDomain) && file.endsWith('.backup'));
      
      for (const backupFile of backupFiles) {
        try {
          await fs.unlink(path.join(dir, backupFile));
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Get a summary of the current state for display
   */
  static async getStateSummary(shopDomain: string): Promise<{
    hasStates: boolean;
    currentOperation?: string;
    previousOperation?: string;
    currentTimestamp?: string;
    previousTimestamp?: string;
    canRevert: boolean;
  }> {
    const history = await this.loadProductStateHistory(shopDomain);
    
    return {
      hasStates: !!(history.current || history.previous),
      currentOperation: history.current?.operationName,
      previousOperation: history.previous?.operationName,
      currentTimestamp: history.current?.timestamp,
      previousTimestamp: history.previous?.timestamp,
      canRevert: !!(history.current && history.previous)
    };
  }
}
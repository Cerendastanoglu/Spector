import fs from 'fs/promises';
import path from 'path';

export interface RevertRecipe {
  metadata: {
    operation_name: string;
    operation_type: string;
    created_at: string;
    total_products: number;
    total_variants: number;
    description?: string;
  };
  changes: RevertChange[];
}

export interface RevertChange {
  resourceGid: string;
  resourceType: 'product' | 'variant';
  field: string;
  currentValue: string;
  revertToValue: string;
  changeType: 'update' | 'add' | 'remove';
}

export class RevertRecipeManager {
  private static getRecipesDir(): string {
    return path.join(process.cwd(), 'revert-recipes');
  }

  private static async ensureRecipesDir(): Promise<void> {
    const dir = this.getRecipesDir();
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Generate a revert recipe file for a bulk edit operation
   */
  static async generateRecipe(
    batchId: string,
    operationName: string,
    operationType: string,
    changes: Array<{
      resourceGid: string;
      resourceType: string;
      field: string;
      oldValue: string;
      newValue: string;
    }>,
    description?: string
  ): Promise<string> {
    await this.ensureRecipesDir();
    
    const timestamp = new Date().toISOString();
    const filename = `${batchId}_${Date.now()}.ini`;
    const filepath = path.join(this.getRecipesDir(), filename);

    // Generate INI content
    let iniContent = `# Bulk Edit Revert Recipe\n`;
    iniContent += `# Generated: ${timestamp}\n`;
    iniContent += `# Operation: ${operationName}\n`;
    iniContent += `# Batch ID: ${batchId}\n\n`;

    // Metadata section
    iniContent += `[metadata]\n`;
    iniContent += `operation_name=${operationName}\n`;
    iniContent += `operation_type=${operationType}\n`;
    iniContent += `created_at=${timestamp}\n`;
    iniContent += `batch_id=${batchId}\n`;
    iniContent += `total_changes=${changes.length}\n`;
    if (description) {
      iniContent += `description=${description}\n`;
    }
    iniContent += `\n`;

    // Changes sections
    const groupedChanges = changes.reduce((acc, change) => {
      if (!acc[change.resourceGid]) {
        acc[change.resourceGid] = [];
      }
      acc[change.resourceGid].push(change);
      return acc;
    }, {} as Record<string, typeof changes>);

    for (const [resourceGid, resourceChanges] of Object.entries(groupedChanges)) {
      iniContent += `[${resourceGid}]\n`;
      iniContent += `resource_type=${resourceChanges[0].resourceType}\n`;
      
      for (const change of resourceChanges) {
        iniContent += `${change.field}.old=${change.oldValue}\n`;
        iniContent += `${change.field}.new=${change.newValue}\n`;
        iniContent += `# Revert: Set ${change.field} back to "${change.oldValue}"\n`;
      }
      iniContent += `\n`;
    }

    await fs.writeFile(filepath, iniContent, 'utf-8');
    console.log(`📄 Generated revert recipe: ${filename}`);
    
    return filename;
  }

  /**
   * Parse a revert recipe file
   */
  static async parseRecipe(filename: string): Promise<RevertRecipe> {
    const filepath = path.join(this.getRecipesDir(), filename);
    const content = await fs.readFile(filepath, 'utf-8');
    
    const lines = content.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );

    const recipe: RevertRecipe = {
      metadata: {} as any,
      changes: []
    };

    let currentSection = '';
    let currentResource: any = {};

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Section headers
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // Save previous resource if it exists
        if (currentSection && currentSection !== 'metadata' && Object.keys(currentResource).length > 0) {
          this.processResourceSection(currentSection, currentResource, recipe.changes);
        }
        
        currentSection = trimmed.slice(1, -1);
        currentResource = { resourceGid: currentSection };
        continue;
      }

      // Key-value pairs
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.slice(0, equalIndex);
        const value = trimmed.slice(equalIndex + 1);

        if (currentSection === 'metadata') {
          (recipe.metadata as any)[key] = this.parseValue(value);
        } else {
          currentResource[key] = value;
        }
      }
    }

    // Process the last resource
    if (currentSection && currentSection !== 'metadata' && Object.keys(currentResource).length > 0) {
      this.processResourceSection(currentSection, currentResource, recipe.changes);
    }

    return recipe;
  }

  private static processResourceSection(resourceGid: string, resourceData: any, changes: RevertChange[]): void {
    const fields = new Set<string>();
    
    // Find all fields that have .old and .new values
    for (const key of Object.keys(resourceData)) {
      if (key.endsWith('.old') || key.endsWith('.new')) {
        const field = key.split('.')[0];
        fields.add(field);
      }
    }

    // Create revert changes for each field
    for (const field of fields) {
      const oldValue = resourceData[`${field}.old`];
      const newValue = resourceData[`${field}.new`];
      
      if (oldValue !== undefined && newValue !== undefined) {
        changes.push({
          resourceGid,
          resourceType: resourceData.resource_type || 'product',
          field,
          currentValue: newValue,
          revertToValue: oldValue,
          changeType: 'update'
        });
      }
    }
  }

  private static parseValue(value: string): any {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    // Return as string
    return value;
  }

  /**
   * List all available revert recipes
   */
  static async listRecipes(): Promise<string[]> {
    try {
      await this.ensureRecipesDir();
      const files = await fs.readdir(this.getRecipesDir());
      return files.filter(file => file.endsWith('.ini'));
    } catch {
      return [];
    }
  }

  /**
   * Delete a revert recipe file
   */
  static async deleteRecipe(filename: string): Promise<void> {
    const filepath = path.join(this.getRecipesDir(), filename);
    await fs.unlink(filepath);
    console.log(`🗑️ Deleted revert recipe: ${filename}`);
  }
}

/**
 * Execute a revert operation using Shopify GraphQL mutations
 */
export async function executeRevert(
  recipe: RevertRecipe,
  adminApiClient: any
): Promise<{ success: boolean; processedChanges: number; errors: string[] }> {
  const errors: string[] = [];
  let processedChanges = 0;

  console.log(`🔄 Starting revert operation: ${recipe.metadata.operation_name}`);
  
  // Group changes by resource type for batch processing
  const productChanges = recipe.changes.filter(c => c.resourceType === 'product');
  const variantChanges = recipe.changes.filter(c => c.resourceType === 'variant');

  // Process product changes
  if (productChanges.length > 0) {
    try {
      const result = await processProductChanges(productChanges, adminApiClient);
      processedChanges += result.processed;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Product changes error: ${error}`);
    }
  }

  // Process variant changes
  if (variantChanges.length > 0) {
    try {
      const result = await processVariantChanges(variantChanges, adminApiClient);
      processedChanges += result.processed;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Variant changes error: ${error}`);
    }
  }

  const success = errors.length === 0;
  console.log(`${success ? '✅' : '❌'} Revert completed: ${processedChanges} changes processed`);
  
  return { success, processedChanges, errors };
}

async function processProductChanges(
  changes: RevertChange[],
  adminApiClient: any
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Group by product
  const productGroups = changes.reduce((acc, change) => {
    if (!acc[change.resourceGid]) {
      acc[change.resourceGid] = [];
    }
    acc[change.resourceGid].push(change);
    return acc;
  }, {} as Record<string, RevertChange[]>);

  for (const [productGid, productChanges] of Object.entries(productGroups)) {
    try {
      const productId = productGid.split('/').pop();
      const input: any = { id: productGid };

      for (const change of productChanges) {
        switch (change.field) {
          case 'title':
            input.title = change.revertToValue;
            break;
          case 'tags':
            input.tags = change.revertToValue.split(',').map(t => t.trim()).filter(Boolean);
            break;
          case 'productType':
            input.productType = change.revertToValue;
            break;
          case 'vendor':
            input.vendor = change.revertToValue;
            break;
        }
      }

      const mutation = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const result = await adminApiClient.graphql(mutation, { variables: { input } });
      const data = await result.json();

      if (data.data?.productUpdate?.userErrors?.length > 0) {
        errors.push(`Product ${productId}: ${data.data.productUpdate.userErrors[0].message}`);
      } else {
        processed += productChanges.length;
        console.log(`✅ Reverted product ${productId}: ${productChanges.length} fields`);
      }
    } catch (error) {
      errors.push(`Product ${productGid}: ${error}`);
    }
  }

  return { processed, errors };
}

async function processVariantChanges(
  changes: RevertChange[],
  adminApiClient: any
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Group by variant
  const variantGroups = changes.reduce((acc, change) => {
    if (!acc[change.resourceGid]) {
      acc[change.resourceGid] = [];
    }
    acc[change.resourceGid].push(change);
    return acc;
  }, {} as Record<string, RevertChange[]>);

  for (const [variantGid, variantChanges] of Object.entries(variantGroups)) {
    try {
      const variantId = variantGid.split('/').pop();
      const input: any = { id: variantGid };

      for (const change of variantChanges) {
        switch (change.field) {
          case 'price':
            input.price = change.revertToValue;
            break;
          case 'compareAtPrice':
            input.compareAtPrice = change.revertToValue || null;
            break;
          case 'inventoryQuantity':
            // Inventory requires special handling
            input.inventoryQuantities = [{
              availableQuantity: parseInt(change.revertToValue),
              locationId: "gid://shopify/Location/1" // This would need to be dynamic
            }];
            break;
        }
      }

      const mutation = `
        mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant {
              id
              price
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const result = await adminApiClient.graphql(mutation, { variables: { input } });
      const data = await result.json();

      if (data.data?.productVariantUpdate?.userErrors?.length > 0) {
        errors.push(`Variant ${variantId}: ${data.data.productVariantUpdate.userErrors[0].message}`);
      } else {
        processed += variantChanges.length;
        console.log(`✅ Reverted variant ${variantId}: ${variantChanges.length} fields`);
      }
    } catch (error) {
      errors.push(`Variant ${variantGid}: ${error}`);
    }
  }

  return { processed, errors };
}
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get bulk edit history for this shop
    const batches = await db.bulkEditBatch.findMany({
      where: { shop },
      include: {
        items: {
          select: {
            id: true,
            productTitle: true,
            variantTitle: true,
            fieldChanged: true,
            oldValue: true,
            newValue: true,
            changeType: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 batches
    });

    console.log(`📊 Bulk History Loader: Found ${batches.length} batches`);
    batches.forEach((batch, idx) => {
      console.log(`  Batch ${idx + 1}: ${batch.operationName} - ${batch.items.length} items`);
    });

    return json({ success: true, batches });
  } catch (error) {
    console.error("Error fetching bulk edit history:", error);
    return json({ success: false, error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    // Create new bulk edit record
    if (action === "create") {
      const data = JSON.parse(formData.get("data") as string);
      const { operationType, operationName, description, changes, totalProducts, totalVariants } = data;
      
      if (!operationType || !operationName || !changes || !Array.isArray(changes)) {
        return json({ 
          success: false, 
          error: "Invalid data: operationType, operationName, and changes array are required" 
        }, { status: 400 });
      }
      
      // Create batch with all items in single transaction
      const batch = await db.bulkEditBatch.create({
        data: {
          shop,
          operationType,
          operationName,
          description: description || null,
          totalProducts: totalProducts || 0,
          totalVariants: totalVariants || 0,
          canRevert: true,
          isReverted: false,
          items: {
            create: changes.map((change: any) => ({
              productId: change.productId,
              variantId: change.variantId || null,
              productTitle: change.productTitle,
              variantTitle: change.variantTitle || null,
              fieldChanged: change.fieldChanged,
              oldValue: change.oldValue || null,
              newValue: change.newValue || null,
              changeType: change.changeType,
            }))
          }
        },
        include: {
          items: true
        }
      });
      
      console.log(`✅ Created bulk edit batch: ${operationName} (${batch.id}) with ${changes.length} items`);
      
      return json({ 
        success: true, 
        batch,
        message: `Operation "${operationName}" saved to history`
      });
    }

    if (action === "revert") {
      const batchId = formData.get("batchId") as string;
      
      if (!batchId) {
        return json({ success: false, error: "Batch ID is required" }, { status: 400 });
      }

      // Get the batch with its items
      const batch = await db.bulkEditBatch.findUnique({
        where: { id: batchId, shop },
        include: { items: true }
      });

      if (!batch || !batch.canRevert || batch.isReverted) {
        return json({ 
          success: false, 
          error: "Batch cannot be reverted" 
        }, { status: 400 });
      }

      // Group items by product/variant for efficient Shopify API calls
      const itemsByProduct = new Map<string, any[]>();
      
      for (const item of batch.items) {
        const key = item.variantId || item.productId;
        if (!itemsByProduct.has(key)) {
          itemsByProduct.set(key, []);
        }
        const items = itemsByProduct.get(key);
        if (items) {
          items.push(item);
        }
      }

      // Process reverts based on operation type
      let revertedCount = 0;
      const errors: string[] = [];

      for (const [key, items] of itemsByProduct) {
        try {
          await revertItems(admin, items, batch.operationType);
          revertedCount += items.length;
        } catch (error) {
          console.error(`Error reverting items for ${key}:`, error);
          errors.push(`Failed to revert ${items[0].productTitle}`);
        }
      }

      // Mark batch as reverted
      await db.bulkEditBatch.update({
        where: { id: batchId },
        data: { 
          isReverted: true, 
          revertedAt: new Date(),
          canRevert: false // Prevent double reverts
        }
      });

      return json({ 
        success: true, 
        revertedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in bulk history action:", error);
    return json({ success: false, error: "Failed to process request" }, { status: 500 });
  }
}

async function revertItems(admin: any, items: any[], operationType: string) {
  switch (operationType) {
    case 'pricing':
      await revertPricing(admin, items);
      break;
    case 'inventory':
      await revertInventory(admin, items);
      break;
    case 'collections':
      await revertCollections(admin, items);
      break;
    case 'tags':
      await revertTags(admin, items);
      break;
    case 'content':
      await revertContent(admin, items);
      break;
    case 'variants':
      await revertVariants(admin, items);
      break;
    default:
      throw new Error(`Unsupported operation type: ${operationType}`);
  }
}

async function revertPricing(admin: any, items: any[]) {
  console.log(`🔄 Reverting pricing for ${items.length} items`);
  
  for (const item of items) {
    if (!item.variantId || !item.oldValue) {
      console.log(`⚠️ Skipping item: missing variantId or oldValue`, item);
      continue;
    }
    
    try {
      const mutation = `
        mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant {
              id
              price
              compareAtPrice
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      // Construct the input based on field changed
      const input: any = {
        id: `gid://shopify/ProductVariant/${item.variantId}`,
      };
      
      if (item.fieldChanged === 'price') {
        input.price = item.oldValue;
      } else if (item.fieldChanged === 'compareAtPrice') {
        input.compareAtPrice = item.oldValue === 'null' ? null : item.oldValue;
      }
      
      console.log(`🔄 Reverting ${item.fieldChanged} for variant ${item.variantId}: ${item.newValue} → ${item.oldValue}`);
      
      const response = await admin.graphql(mutation, {
        variables: { input }
      });
      
      const result = await response.json();
      if (result.data?.productVariantUpdate?.userErrors?.length > 0) {
        console.error(`❌ GraphQL errors for variant ${item.variantId}:`, result.data.productVariantUpdate.userErrors);
        throw new Error(`GraphQL errors: ${result.data.productVariantUpdate.userErrors.map((e: any) => e.message).join(', ')}`);
      }
      
      console.log(`✅ Successfully reverted ${item.fieldChanged} for variant ${item.variantId}`);
    } catch (error) {
      console.error(`❌ Failed to revert variant ${item.variantId}:`, error);
      throw error;
    }
  }
}

async function revertInventory(admin: any, items: any[]) {
  console.log(`🔄 Reverting inventory for ${items.length} items`);
  
  const inventoryItems = items.filter(item => item.variantId && item.fieldChanged === 'inventoryQuantity');
  
  if (inventoryItems.length === 0) {
    console.log('📦 No inventory items to revert');
    return;
  }
  
  // First, get the inventory item IDs for each variant
  const variantIds = inventoryItems.map(item => `gid://shopify/ProductVariant/${item.variantId}`);
  const variantQuery = `
    query getVariants($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          inventoryItem {
            id
          }
        }
      }
    }
  `;
  
  try {
    const response = await admin.graphql(variantQuery, {
      variables: { ids: variantIds }
    });
    
    const result = await response.json();
    const variants = result.data?.nodes || [];
    
    const inventoryAdjustments = [];
    
    for (const item of inventoryItems) {
      const variantGid = `gid://shopify/ProductVariant/${item.variantId}`;
      const variant = variants.find((v: any) => v.id === variantGid);
      
      if (!variant?.inventoryItem?.id) {
        console.log(`⚠️ No inventory item found for variant ${item.variantId}`);
        continue;
      }
      
      const oldQty = parseInt(item.oldValue || '0');
      const newQty = parseInt(item.newValue || '0');
      const adjustment = oldQty - newQty; // Calculate reverse adjustment
      
      if (adjustment !== 0) {
        inventoryAdjustments.push({
          inventoryItemId: variant.inventoryItem.id,
          availableDelta: adjustment
        });
        
        console.log(`🔄 Inventory adjustment for variant ${item.variantId}: ${adjustment} (${newQty} → ${oldQty})`);
      }
    }

    if (inventoryAdjustments.length > 0) {
      const mutation = `
        mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
          inventoryAdjustQuantities(input: $input) {
            inventoryAdjustmentGroup {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const adjustResponse = await admin.graphql(mutation, {
        variables: {
          input: {
            name: "Bulk Edit Revert",
            changes: inventoryAdjustments
          }
        }
      });
      
      const adjustResult = await adjustResponse.json();
      if (adjustResult.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
        console.error(`❌ Inventory adjustment errors:`, adjustResult.data.inventoryAdjustQuantities.userErrors);
        throw new Error(`Inventory errors: ${adjustResult.data.inventoryAdjustQuantities.userErrors.map((e: any) => e.message).join(', ')}`);
      }
      
      console.log(`✅ Successfully reverted inventory for ${inventoryAdjustments.length} items`);
    }
  } catch (error) {
    console.error(`❌ Failed to revert inventory:`, error);
    throw error;
  }
}

async function revertCollections(admin: any, items: any[]) {
  // Group items by product
  const itemsByProduct = new Map<string, any[]>();
  for (const item of items) {
    if (!itemsByProduct.has(item.productId)) {
      itemsByProduct.set(item.productId, []);
    }
    const productItems = itemsByProduct.get(item.productId);
    if (productItems) {
      productItems.push(item);
    }
  }

  for (const [productId, productItems] of itemsByProduct) {
    // Get current collections
    const productQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          collections(first: 250) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `;

    const productResponse = await admin.graphql(productQuery, {
      variables: { id: `gid://shopify/Product/${productId}` }
    });

    const currentCollectionIds = productResponse.body.data.product.collections.edges
      .map((edge: any) => edge.node.id);

    // Calculate what collections should be based on the revert
    const revertedCollectionIds = new Set(currentCollectionIds);
    
    for (const item of productItems) {
      const collectionId = `gid://shopify/Collection/${item.oldValue}`;
      
      if (item.changeType === 'add') {
        // If it was added, remove it
        revertedCollectionIds.delete(collectionId);
      } else if (item.changeType === 'remove') {
        // If it was removed, add it back
        revertedCollectionIds.add(collectionId);
      }
    }

    // Update product collections
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await admin.graphql(mutation, {
      variables: {
        input: {
          id: `gid://shopify/Product/${productId}`,
          collectionsToJoin: Array.from(revertedCollectionIds)
        }
      }
    });
  }
}

async function revertTags(admin: any, items: any[]) {
  // Group items by product
  const itemsByProduct = new Map<string, any[]>();
  for (const item of items) {
    if (!itemsByProduct.has(item.productId)) {
      itemsByProduct.set(item.productId, []);
    }
    const productItems = itemsByProduct.get(item.productId);
    if (productItems) {
      productItems.push(item);
    }
  }

  for (const [productId, productItems] of itemsByProduct) {
    // Get current tags
    const productQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          tags
        }
      }
    `;

    const productResponse = await admin.graphql(productQuery, {
      variables: { id: `gid://shopify/Product/${productId}` }
    });

    const currentTags = new Set(productResponse.body.data.product.tags);

    // Calculate what tags should be based on the revert
    for (const item of productItems) {
      if (item.changeType === 'add') {
        // If tag was added, remove it
        currentTags.delete(item.newValue);
      } else if (item.changeType === 'remove') {
        // If tag was removed, add it back
        currentTags.add(item.oldValue);
      }
    }

    // Update product tags
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await admin.graphql(mutation, {
      variables: {
        input: {
          id: `gid://shopify/Product/${productId}`,
          tags: Array.from(currentTags)
        }
      }
    });
  }
}

async function revertContent(admin: any, items: any[]) {
  // Group items by product
  const itemsByProduct = new Map<string, any[]>();
  for (const item of items) {
    if (!itemsByProduct.has(item.productId)) {
      itemsByProduct.set(item.productId, []);
    }
    const productItems = itemsByProduct.get(item.productId);
    if (productItems) {
      productItems.push(item);
    }
  }

  for (const [productId, productItems] of itemsByProduct) {
    const updates: any = {};
    
    for (const item of productItems) {
      if (item.fieldChanged === 'title') {
        updates.title = item.oldValue;
      } else if (item.fieldChanged === 'description') {
        updates.descriptionHtml = item.oldValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      const mutation = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      await admin.graphql(mutation, {
        variables: {
          input: {
            id: `gid://shopify/Product/${productId}`,
            ...updates
          }
        }
      });
    }
  }
}

async function revertVariants(_admin: any, _items: any[]) {
  // Similar implementation for variant-specific reverts
  // This would handle SKU, weight, etc. changes
  console.log("Variant revert not yet implemented");
}
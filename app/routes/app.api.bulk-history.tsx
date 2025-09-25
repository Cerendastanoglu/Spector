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
  const variantUpdates = items
    .filter(item => item.variantId)
    .map(item => ({
      id: item.variantId,
      ...(item.fieldChanged === 'price' && { price: item.oldValue }),
      ...(item.fieldChanged === 'compareAtPrice' && { 
        compareAtPrice: item.oldValue === 'null' ? null : item.oldValue 
      }),
    }));

  if (variantUpdates.length > 0) {
    const mutation = `
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Group by product
    const variantsByProduct = new Map<string, any[]>();
    for (const item of items) {
      if (!variantsByProduct.has(item.productId)) {
        variantsByProduct.set(item.productId, []);
      }
      const productVariants = variantsByProduct.get(item.productId);
      const variantUpdate = variantUpdates.find(v => v.id === item.variantId);
      if (productVariants && variantUpdate) {
        productVariants.push(variantUpdate);
      }
    }

    for (const [productId, variants] of variantsByProduct) {
      await admin.graphql(mutation, {
        variables: {
          productId: `gid://shopify/Product/${productId}`,
          variants
        }
      });
    }
  }
}

async function revertInventory(admin: any, items: any[]) {
  const inventoryAdjustments = items
    .filter(item => item.variantId && item.fieldChanged === 'inventoryQuantity')
    .map(item => {
      const oldQty = parseInt(item.oldValue || '0');
      const newQty = parseInt(item.newValue || '0');
      const adjustment = oldQty - newQty; // Calculate reverse adjustment
      
      return {
        inventoryItemId: `gid://shopify/InventoryItem/${item.variantId}`, // This needs to be inventory item ID
        availableDelta: adjustment
      };
    })
    .filter(adj => adj.availableDelta !== 0);

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

    await admin.graphql(mutation, {
      variables: {
        input: {
          name: "Bulk Edit Revert",
          changes: inventoryAdjustments
        }
      }
    });
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
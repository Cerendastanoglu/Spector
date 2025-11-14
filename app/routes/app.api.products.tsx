import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { applyRateLimit } from "~/utils/rateLimit";
import { RATE_LIMITS } from "~/utils/security";
import { logger } from "~/utils/logger";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ message: "Products API endpoint" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Apply rate limiting (100 requests per minute for products API)
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_PRODUCTS);
  if (rateLimitResponse) return rateLimitResponse;

  const { admin } = await authenticate.admin(request);
  
  // Handle both JSON and form data
  let actionType;
  let requestData;
  
  if (request.headers.get("Content-Type")?.includes("application/json")) {
    requestData = await request.json();
    actionType = requestData.action;
  } else {
    const formData = await request.formData();
    actionType = formData.get("action");
    requestData = formData;
  }

  if (actionType === "get-shop-info") {
    try {
      const response = await admin.graphql(
        `#graphql
          query getShopInfo {
            shop {
              currencyCode
              myshopifyDomain
              name
              url
            }
          }`
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch shop info" }, { status: 500 });
      }

      return json({
        shop: responseJson.data?.shop || {}
      });
    } catch (error) {
      console.error("Error fetching shop info:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (actionType === "get-all-products") {
    try {
      const response = await admin.graphql(
        `#graphql
          query getAllProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  status
                  totalInventory
                  tags
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  collections(first: 250) {
                    edges {
                      node {
                        id
                        handle
                        title
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        inventoryQuantity
                        inventoryPolicy
                        price
                        sku
                        inventoryItem {
                          id
                          tracked
                        }
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 250,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch products" }, { status: 500 });
      }

      const products = responseJson.data?.products?.edges?.map((edge: any) => edge.node) || [];
      const hasNextPage = responseJson.data?.products?.pageInfo?.hasNextPage || false;

      return json({
        products,
        hasNextPage,
      });
    } catch (error) {
      console.error("Error fetching all products:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (actionType === "fetch-out-of-stock") {
    try {
      const response = await admin.graphql(
        `#graphql
          query getOutOfStockProducts($first: Int!) {
            products(first: $first, query: "inventory_total:0") {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  totalInventory
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        inventoryQuantity
                        inventoryPolicy
                        price
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 50,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch products" }, { status: 500 });
      }

      const products = responseJson.data?.products?.edges?.map((edge: any) => edge.node) || [];
      const hasNextPage = responseJson.data?.products?.pageInfo?.hasNextPage || false;

      return json({
        products,
        hasNextPage,
      });
    } catch (error) {
      console.error("Error fetching out of stock products:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (actionType === "fetch-low-stock") {
    try {
      // Fetch products with low stock (inventory between 1 and 10)
      const response = await admin.graphql(
        `#graphql
          query getLowStockProducts($first: Int!) {
            products(first: $first, query: "inventory_total:1..10") {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  totalInventory
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        inventoryQuantity
                        inventoryPolicy
                        price
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 50,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch products" }, { status: 500 });
      }

      const products = responseJson.data?.products?.edges?.map((edge: any) => edge.node) || [];
      const hasNextPage = responseJson.data?.products?.pageInfo?.hasNextPage || false;

      return json({
        products,
        hasNextPage,
      });
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (actionType === "get-stats") {
    try {
      // Get basic statistics
      const [outOfStockResponse, lowStockResponse, totalProductsResponse] = await Promise.all([
        admin.graphql(`
          query getOutOfStockCount {
            products(first: 1, query: "inventory_total:0") {
              edges {
                node {
                  id
                }
              }
            }
          }
        `),
        admin.graphql(`
          query getLowStockCount {
            products(first: 1, query: "inventory_total:1..10") {
              edges {
                node {
                  id
                }
              }
            }
          }
        `),
        admin.graphql(`
          query getTotalProductsCount {
            products(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `),
      ]);

      const outOfStockData = await outOfStockResponse.json();
      const lowStockData = await lowStockResponse.json();
      const totalProductsData = await totalProductsResponse.json();

      return json({
        outOfStockCount: outOfStockData.data?.products?.edges?.length || 0,
        lowStockCount: lowStockData.data?.products?.edges?.length || 0,
        totalProductsCount: totalProductsData.data?.products?.edges?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // New action for notifications: Fetch products with variants and inventory locations
  if (actionType === "fetch-products-with-variants-and-locations") {
    try {
      const response = await admin.graphql(
        `#graphql
          query getProductsWithVariantsAndLocations($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  status
                  totalInventory
                  tags
                  productType
                  vendor
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  media(first: 1) {
                    edges {
                      node {
                        ... on MediaImage {
                          id
                          image {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        sku
                        price
                        compareAtPrice
                        taxable
                        inventoryQuantity
                        inventoryPolicy
                        inventoryItem {
                          id
                          tracked
                          unitCost {
                            amount
                          }
                        }
                      }
                    }
                  }

                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 100,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch products with variants" }, { status: 500 });
      }

      return json({
        products: responseJson.data?.products || { edges: [] },
      });
    } catch (error) {
      console.error("Error fetching products with variants:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // New action for notifications: Fetch collections
  if (actionType === "fetch-collections") {
    try {
      const response = await admin.graphql(
        `#graphql
          query getCollections($first: Int!) {
            collections(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  productsCount {
                    count
                  }
                  description
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 50,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        console.error("GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch collections" }, { status: 500 });
      }

      return json({
        collections: responseJson.data?.collections || { edges: [] },
      });
    } catch (error) {
      console.error("Error fetching collections:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // New action for notifications: Fetch locations
  if (actionType === "fetch-locations") {
    try {
      // Use mock locations since the app doesn't have access to the locations API
      const mockLocations = {
        edges: [
          {
            node: {
              id: 'gid://shopify/Location/1',
              name: 'Main Store',
              address: {
                formatted: '123 Main St, New York, NY 10001, US',
                address1: '123 Main St',
                city: 'New York',
                province: 'NY',
                country: 'US'
              },
              fulfillsOnlineOrders: true,
              isActive: true
            }
          },
          {
            node: {
              id: 'gid://shopify/Location/2',
              name: 'Warehouse',
              address: {
                formatted: '456 Storage Ave, Los Angeles, CA 90210, US',
                address1: '456 Storage Ave',
                city: 'Los Angeles',
                province: 'CA',
                country: 'US'
              },
              fulfillsOnlineOrders: false,
              isActive: true
            }
          },
          {
            node: {
              id: 'gid://shopify/Location/3',
              name: 'Pop-up Store',
              address: {
                formatted: '789 Retail Blvd, Chicago, IL 60601, US',
                address1: '789 Retail Blvd',
                city: 'Chicago',
                province: 'IL',
                country: 'US'
              },
              fulfillsOnlineOrders: true,
              isActive: true
            }
          }
        ]
      };

      return json({
        locations: mockLocations,
      });
    } catch (error) {
      console.error("Error fetching locations:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (actionType === "update-product-prices") {
    try {
      let updates;
      let batchInfo;
      
      if (requestData instanceof FormData) {
        updates = JSON.parse(requestData.get("updates") as string);
        const batchInfoStr = requestData.get("batchInfo");
        if (batchInfoStr) {
          batchInfo = JSON.parse(batchInfoStr as string);
        }
      } else {
        updates = requestData.updates;
        batchInfo = requestData.batchInfo;
      }
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return json({ error: "No updates provided" }, { status: 400 });
      }

      const results = [];
      
      // First, get the current prices for all variants being updated
      const variantIds = updates.map(update => update.variantId);
      const variantPrices = new Map();
      
      // Get current prices in batches
      for (let i = 0; i < variantIds.length; i += 10) {
        const batch = variantIds.slice(i, i + 10);
        const variantsQuery = batch.map((id, idx) => `
          v${idx}: productVariant(id: "${id}") {
            id
            price
            compareAtPrice
          }
        `).join('\n');
        
        try {
          const priceResponse = await admin.graphql(`
            query getVariantPrices {
              ${variantsQuery}
            }
          `);
          
          const priceData = await priceResponse.json();
          
          // Extract prices from response
          batch.forEach((id, idx) => {
            const variant = priceData.data[`v${idx}`];
            if (variant) {
              variantPrices.set(id, {
                price: variant.price,
                compareAtPrice: variant.compareAtPrice
              });
            }
          });
        } catch (error) {
          console.error("Error fetching variant prices:", error);
          // Continue with updates even if we can't get current prices
        }
      }
      
      // Now process all updates with original price data
      for (const update of updates) {
        try {
          // Store the original price
          const originalPriceData = variantPrices.get(update.variantId) || { price: "0.00", compareAtPrice: null };
          update.oldPrice = originalPriceData.price;
          update.oldCompareAtPrice = originalPriceData.compareAtPrice;
          
          // Build variant input object - only price, compareAtPrice, and taxable are supported
          const variantInput: any = {
            id: update.variantId,
            price: update.price,
            compareAtPrice: update.compareAtPrice || null
          };
          
          // Add taxable if defined
          if (update.taxable !== undefined) {
            variantInput.taxable = update.taxable;
          }
          
          console.log('📦 Updating variant:', {
            variantId: update.variantId,
            input: variantInput,
            hasCost: update.cost !== undefined,
            hasUnitPrice: update.unitPrice !== undefined
          });
          
          // Update product variant (price, compare price, taxable)
          const response = await admin.graphql(
            `#graphql
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  product {
                    id
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          price
                          compareAtPrice
                          taxable
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `,
            {
              variables: {
                productId: update.productId,
                variants: [variantInput]
              }
            }
          );

          const data = await response.json();
          
          if (data.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            results.push({
              productId: update.productId,
              variantId: update.variantId,
              success: false,
              error: data.data.productVariantsBulkUpdate.userErrors[0].message
            });
            continue; // Skip cost/unit price updates if variant update failed
          }
          
          const updatedVariant = data.data?.productVariantsBulkUpdate?.product?.variants?.edges?.[0]?.node;
          
          // Update cost per item if provided (requires separate mutation)
          if (update.cost !== undefined && update.cost !== null) {
            console.log('💰 Updating cost for variant:', update.variantId, 'to', update.cost);
            try {
              // First get the inventory item ID
              const variantResponse = await admin.graphql(
                `#graphql
                  query getInventoryItem($id: ID!) {
                    productVariant(id: $id) {
                      id
                      inventoryItem {
                        id
                      }
                    }
                  }
                `,
                { variables: { id: update.variantId } }
              );
              
              const variantData = await variantResponse.json();
              const inventoryItemId = variantData.data?.productVariant?.inventoryItem?.id;
              
              if (inventoryItemId) {
                await admin.graphql(
                  `#graphql
                    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                      inventoryItemUpdate(id: $id, input: $input) {
                        inventoryItem {
                          id
                        }
                        userErrors {
                          field
                          message
                        }
                      }
                    }
                  `,
                  {
                    variables: {
                      id: inventoryItemId,
                      input: {
                        cost: parseFloat(update.cost),
                        tracked: true
                      }
                    }
                  }
                );
              }
            } catch (costError) {
              console.error('Error updating cost:', costError);
            }
          }
          
          // Update unit price if provided
          if (update.unitPrice !== undefined && update.unitPrice !== null) {
            console.log('📏 Updating unit price for variant:', update.variantId, 'to', update.unitPrice);
            try {
              const variantResponse = await admin.graphql(
                `#graphql
                  query getInventoryItem($id: ID!) {
                    productVariant(id: $id) {
                      id
                      inventoryItem {
                        id
                        measurement {
                          weight {
                            unit
                          }
                        }
                      }
                    }
                  }
                `,
                { variables: { id: update.variantId } }
              );
              
              const variantData = await variantResponse.json();
              const inventoryItemId = variantData.data?.productVariant?.inventoryItem?.id;
              
              if (inventoryItemId) {
                await admin.graphql(
                  `#graphql
                    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                      inventoryItemUpdate(id: $id, input: $input) {
                        inventoryItem {
                          id
                          unitCost {
                            amount
                          }
                        }
                        userErrors {
                          field
                          message
                        }
                      }
                    }
                  `,
                  {
                    variables: {
                      id: inventoryItemId,
                      input: {
                        unitCost: {
                          amount: parseFloat(update.unitPrice)
                        }
                      }
                    }
                  }
                );
              }
            } catch (unitPriceError) {
              console.error('Error updating unit price:', unitPriceError);
            }
          }
          
          results.push({
            productId: update.productId,
            variantId: update.variantId,
            success: true,
            newPrice: updatedVariant?.price || update.price,
            newCompareAtPrice: updatedVariant?.compareAtPrice || update.compareAtPrice
          });
        } catch (error) {
          results.push({
            productId: update.productId,
            variantId: update.variantId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Record successful price changes in history
      const successfulUpdates = results.filter(r => r.success);
      
      if (successfulUpdates.length > 0 && batchInfo) {
        try {
          // Create history record for bulk edit
          const historyData = {
            operationType: batchInfo.type || 'pricing',
            operationName: batchInfo.operationName || `Price Update ${new Date().toLocaleDateString()}`,
            description: batchInfo.description || `${successfulUpdates.length} variants affected`,
            totalProducts: successfulUpdates.length,
            totalVariants: successfulUpdates.length,
            changes: successfulUpdates.map(update => ({
              productId: update.productId.replace('gid://shopify/Product/', ''),
              variantId: update.variantId.replace('gid://shopify/ProductVariant/', ''),
              productTitle: updates.find(u => u.variantId === update.variantId)?.productTitle || 'Product',
              variantTitle: 'Default Variant',
              fieldChanged: 'price',
              oldValue: updates.find(u => u.variantId === update.variantId)?.oldPrice || '0.00',
              newValue: update.newPrice || '0.00',
              changeType: 'update'
            }))
          };
          
          // Create form data for the history API
          const historyFormData = new FormData();
          historyFormData.append('action', 'create');
          historyFormData.append('data', JSON.stringify(historyData));
          
          // Call the bulk history API endpoint
          const historyUrl = new URL(request.url);
          const bulkHistoryUrl = `${historyUrl.protocol}//${historyUrl.host}/app/api/bulk-history`;
          
          // Use the same session cookie for authentication
          const cookie = request.headers.get('cookie');
          
          const historyResponse = await fetch(bulkHistoryUrl, {
            method: 'POST',
            body: historyFormData,
            headers: {
              'Cookie': cookie || ''
            }
          });
          
          const historyResult = await historyResponse.json();
          logger.info('✅ Bulk history recorded:', historyResult);
        } catch (historyError) {
          // Don't fail the main operation if history recording fails
          console.error('Failed to record price changes in history:', historyError);
        }
      }
      
      return json({ 
        success: true, 
        results,
        updated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Error updating product prices:', error);
      return json({ 
        error: `Failed to update prices: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  // New action for updating product collections
  if (actionType === "update-collections") {
    try {
      let updates;
      if (requestData instanceof FormData) {
        const updatesData = requestData.get("updates");
        updates = JSON.parse(updatesData as string);
      } else {
        updates = requestData.updates;
      }
      
      const results = [];
      
      for (const update of updates) {
        try {
          const { productId, collectionIds, operation } = update;
          
          if (operation === 'add') {
            // Add products to each collection
            logger.info(`➕ Adding product ${productId} to collections:`, collectionIds);
            for (const collectionId of collectionIds) {
              const addMutation = `#graphql
                mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
                  collectionAddProducts(id: $id, productIds: $productIds) {
                    collection {
                      id
                      title
                      products(first: 5) {
                        edges {
                          node {
                            id
                            title
                          }
                        }
                      }
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }`;
              
              const addResponse = await admin.graphql(addMutation, { 
                variables: { id: collectionId, productIds: [productId] } 
              });
              const addJson = await addResponse.json();
              logger.info(`📤 Collection addition response for ${collectionId}:`, addJson);
              
              if (addJson.data?.collectionAddProducts?.userErrors?.length > 0) {
                results.push({
                  productId,
                  success: false,
                  error: addJson.data.collectionAddProducts.userErrors.map((e: any) => e.message).join(', ')
                });
                continue;
              }
            }
            
            results.push({
              productId,
              success: true,
              operation: 'add',
              collectionIds
            });
            continue;
          } else if (operation === 'remove') {
            // Remove products from each collection
            // Removing product from collections
            logger.info(`🗑️ Removing product ${productId} from collections:`, collectionIds);
            for (const collectionId of collectionIds) {
              const removeMutation = `#graphql
                mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
                  collectionRemoveProducts(id: $id, productIds: $productIds) {
                    job {
                      done
                      id
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }`;
              
              const removeResponse = await admin.graphql(removeMutation, { 
                variables: { id: collectionId, productIds: [productId] } 
              });
              const removeJson = await removeResponse.json();
              
              // Collection removal response processed
              logger.info(`📤 Collection removal response for ${collectionId}:`, removeJson);
              
              if (removeJson.data?.collectionRemoveProducts?.userErrors?.length > 0) {
                results.push({
                  productId,
                  success: false,
                  error: removeJson.data.collectionRemoveProducts.userErrors.map((e: any) => e.message).join(', ')
                });
                continue;
              }
            }
            
            results.push({
              productId,
              success: true,
              operation: 'remove',
              collectionIds
            });
            continue;
          }
          
        } catch (error) {
          results.push({
            productId: update.productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return json({
        success: true,
        results,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Error updating collections:', error);
      return json({ 
        error: `Failed to update collections: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  // New action for updating product tags
  if (actionType === "update-tags") {
    try {
      let productIds, tagOperation, tagValue, tagRemoveValue;
      
      if (requestData instanceof FormData) {
        const updatesData = requestData.get("updates");
        const updates = JSON.parse(updatesData as string);
        // Legacy format - convert to new format
        productIds = updates.map((u: any) => u.productId);
        tagOperation = updates[0]?.operation;
        tagValue = updates[0]?.tags?.join(', ');
        tagRemoveValue = updates[0]?.tags?.join(', ');
      } else {
        // New format from frontend
        ({ productIds, tagOperation, tagValue, tagRemoveValue } = requestData);
      }
      
      const results = [];
      
      // Process tags - convert string to array
      let tagsArray: string[] = [];
      if (tagOperation === 'add' && tagValue) {
        tagsArray = tagValue.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      } else if (tagOperation === 'remove' && tagRemoveValue) {
        tagsArray = tagRemoveValue.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
      
      for (const productId of productIds) {
        try {
          const variables: any = { id: productId, tags: tagsArray };
          let mutation = '';
          
          if (tagOperation === 'add') {
            mutation = `#graphql
              mutation tagsAdd($id: ID!, $tags: [String!]!) {
                tagsAdd(id: $id, tags: $tags) {
                  node {
                    id
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`;
          } else if (tagOperation === 'remove') {
            mutation = `#graphql
              mutation tagsRemove($id: ID!, $tags: [String!]!) {
                tagsRemove(id: $id, tags: $tags) {
                  node {
                    id
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`;
          } else if (tagOperation === 'replace') {
            // For replace, we first need to get current tags, then remove all and add new ones
            const currentTagsResponse = await admin.graphql(
              `#graphql
                query getProductTags($id: ID!) {
                  product(id: $id) {
                    tags
                  }
                }`,
              { variables: { id: productId } }
            );

            const currentTagsJson = await currentTagsResponse.json();
            const currentTags = currentTagsJson.data?.product?.tags || [];
            
            // Remove all current tags
            if (currentTags.length > 0) {
              await admin.graphql(
                `#graphql
                  mutation tagsRemove($id: ID!, $tags: [String!]!) {
                    tagsRemove(id: $id, tags: $tags) {
                      userErrors {
                        field
                        message
                      }
                    }
                  }`,
                { variables: { id: productId, tags: currentTags } }
              );
            }
            
            // Add new tags (only if there are tags to add)
            if (tagsArray.length > 0) {
              mutation = `#graphql
                mutation tagsAdd($id: ID!, $tags: [String!]!) {
                  tagsAdd(id: $id, tags: $tags) {
                    node {
                      id
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }`;
            } else {
              // No tags to add after removal, just mark as successful
              results.push({
                productId,
                success: true,
                operation: tagOperation,
                tags: []
              });
              continue;
            }
          }
          
          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();
          
          const operationName = tagOperation === 'remove' ? 'tagsRemove' : 'tagsAdd';
          const mutationResult = responseJson.data?.[operationName];
          
          if (mutationResult?.userErrors && mutationResult.userErrors.length > 0) {
            results.push({
              productId,
              success: false,
              error: mutationResult.userErrors.map((e: any) => e.message).join(', ')
            });
          } else {
            results.push({
              productId,
              success: true,
              operation: tagOperation,
              tags: tagsArray
            });
          }
          
        } catch (error) {
          results.push({
            productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return json({
        success: true,
        results,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Error updating tags:', error);
      return json({ 
        error: `Failed to update tags: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  if (actionType === "update-titles") {
    try {
      // Use the already-parsed requestData instead of reading body again
      const body = request.headers.get("Content-Type")?.includes("application/json") 
        ? requestData 
        : await request.json();
      const { productIds, titleOperation, titleValue, titleReplaceFrom, titleReplaceTo } = body;

      if (!productIds || !Array.isArray(productIds)) {
        return json({ error: "Product IDs are required" }, { status: 400 });
      }

      const results = [];

      for (const productId of productIds) {
        try {
          // First get the current product to get its title
          const getProductResponse = await admin.graphql(
            `#graphql
              query getProduct($id: ID!) {
                product(id: $id) {
                  id
                  title
                }
              }`,
            {
              variables: {
                id: productId,
              },
            }
          );

          const getProductJson: any = await getProductResponse.json();
          
          if (getProductJson.errors) {
            results.push({
              productId,
              success: false,
              error: `Failed to get product: ${getProductJson.errors[0]?.message || 'Unknown error'}`
            });
            continue;
          }

          const currentProduct = getProductJson.data?.product;
          if (!currentProduct) {
            results.push({
              productId,
              success: false,
              error: 'Product not found'
            });
            continue;
          }

          // Calculate new title based on operation
          let newTitle = currentProduct.title;
          
          if (titleOperation === 'prefix') {
            newTitle = `${titleValue} ${currentProduct.title}`;
          } else if (titleOperation === 'suffix') {
            newTitle = `${currentProduct.title} ${titleValue}`;
          } else if (titleOperation === 'replace') {
            newTitle = currentProduct.title.replace(new RegExp(titleReplaceFrom, 'g'), titleReplaceTo);
          }

          // Update the product title
          const updateResponse = await admin.graphql(
            `#graphql
              mutation UpdateProductTitle($productId: ID!, $title: String!) {
                productUpdate(product: {
                  id: $productId,
                  title: $title
                }) {
                  product {
                    id
                    title
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`,
            {
              variables: {
                productId,
                title: newTitle,
              },
            }
          );

          const updateJson: any = await updateResponse.json();
          
          if (updateJson.errors || updateJson.data?.productUpdate?.userErrors?.length > 0) {
            const errorMessage = updateJson.errors?.[0]?.message || 
                               updateJson.data?.productUpdate?.userErrors?.[0]?.message || 
                               'Unknown error';
            results.push({
              productId,
              success: false,
              error: errorMessage
            });
          } else {
            results.push({
              productId,
              success: true,
              oldTitle: currentProduct.title,
              newTitle: updateJson.data?.productUpdate?.product?.title
            });
          }
          
        } catch (error) {
          results.push({
            productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return json({
        success: true,
        results,
        updatedProducts: results.filter(r => r.success).map(r => ({
          id: r.productId,
          title: r.newTitle
        })),
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Error updating titles:', error);
      return json({ 
        error: `Failed to update titles: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  if (actionType === "update-descriptions") {
    try {
      let productIds, descriptionOperation, descriptionValue, descriptionReplaceFrom, descriptionReplaceTo;
      
      if (requestData instanceof FormData) {
        // Handle form data (shouldn't happen for this action but keeping for safety)
        productIds = JSON.parse(requestData.get("productIds") as string || "[]");
        descriptionOperation = requestData.get("descriptionOperation") as string;
        descriptionValue = requestData.get("descriptionValue") as string;
        descriptionReplaceFrom = requestData.get("descriptionReplaceFrom") as string;
        descriptionReplaceTo = requestData.get("descriptionReplaceTo") as string;
      } else {
        // Handle JSON data
        ({ productIds, descriptionOperation, descriptionValue, descriptionReplaceFrom, descriptionReplaceTo } = requestData);
      }

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return json({ error: 'Product IDs are required' }, { status: 400 });
      }

      // Fetch current products first
      const productPromises = productIds.map(async (productId: string) => {
        const response = await admin.graphql(
          `#graphql
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                title
                descriptionHtml
              }
            }`,
          { variables: { id: productId } }
        );
        const json = await response.json();
        return json.data?.product;
      });

      const currentProducts = await Promise.all(productPromises);
      const results = [];

      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const currentProduct = currentProducts[i];
        
        if (!currentProduct) {
          results.push({
            productId,
            success: false,
            error: 'Product not found'
          });
          continue;
        }

        try {
          // Calculate new description based on operation
          let newDescription = currentProduct.descriptionHtml || '';
          
          if (descriptionOperation === 'set') {
            // Set/replace entire description
            newDescription = descriptionValue || '';
          } else if (descriptionOperation === 'prefix' || descriptionOperation === 'prepend') {
            // Add to beginning - handle empty descriptions
            newDescription = newDescription 
              ? `${descriptionValue}\n${newDescription}` 
              : descriptionValue;
          } else if (descriptionOperation === 'suffix' || descriptionOperation === 'append') {
            // Add to end - handle empty descriptions
            newDescription = newDescription 
              ? `${newDescription}\n${descriptionValue}` 
              : descriptionValue;
          } else if (descriptionOperation === 'replace') {
            // Replace text - if no existing description, nothing to replace
            // Allow empty descriptionReplaceTo to delete the found text
            if (newDescription && descriptionReplaceFrom) {
              newDescription = newDescription.replace(
                new RegExp(descriptionReplaceFrom, 'g'), 
                descriptionReplaceTo !== undefined ? descriptionReplaceTo : ''
              );
            }
          }

          // Update the product description
          const updateResponse = await admin.graphql(
            `#graphql
              mutation UpdateProductDescription($productId: ID!, $description: String!) {
                productUpdate(product: {
                  id: $productId,
                  descriptionHtml: $description
                }) {
                  product {
                    id
                    descriptionHtml
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`,
            {
              variables: {
                productId,
                description: newDescription
              }
            }
          );

          const updateJson: any = await updateResponse.json();
          
          if (updateJson.errors || updateJson.data?.productUpdate?.userErrors?.length > 0) {
            const error = updateJson.errors?.[0]?.message || updateJson.data?.productUpdate?.userErrors?.[0]?.message || 'Unknown error';
            results.push({
              productId,
              success: false,
              error
            });
          } else {
            results.push({
              productId,
              success: true,
              product: {
                id: productId,
                descriptionHtml: updateJson.data?.productUpdate?.product?.descriptionHtml
              }
            });
          }
          
        } catch (error) {
          results.push({
            productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return json({
        success: true,
        results,
        updatedProducts: results.filter(r => r.success).map(r => ({
          id: r.productId,
          description: r.product?.descriptionHtml
        })),
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Error updating descriptions:', error);
      return json({ 
        error: `Failed to update descriptions: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  if (actionType === "update-inventory") {
    try {
      const { 
        variantIds, 
        stockQuantity, 
        stockUpdateMethod,
        applySku,
        sku,
        applyBarcode,
        barcode,
        applyContinueSelling,
        continueSelling
      } = requestData;

      console.log('📦 Inventory Update Request:', {
        variantCount: variantIds?.length,
        stockQuantity,
        stockUpdateMethod,
        applySku,
        applyBarcode,
        applyContinueSelling
      });

      if (!variantIds || !Array.isArray(variantIds)) {
        return json({ error: "Variant IDs are required" }, { status: 400 });
      }

      // Check if we're updating only metadata (no stock changes)
      const isOnlyMetadata = !stockQuantity && (applySku || applyBarcode || applyContinueSelling);
      
      // Simplified to stock-only operations
      const quantity = parseInt(stockQuantity) || 0;

      // Fetch location once
      const locationsResponse = await admin.graphql(
        `#graphql
          query getLocations {
            locations(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }`
      );

      const locationsJson: any = await locationsResponse.json();
      const locationId = locationsJson.data?.locations?.edges?.[0]?.node?.id;

      if (!locationId) {
        return json({ 
          error: 'No location found for this shop. Please set up a location in Shopify first.' 
        }, { status: 400 });
      }

      // Fetch ALL variant data in batches (Shopify allows up to 250 items per query)
      const BATCH_SIZE = 100; // Reduced to avoid query complexity limits
      const allVariantsData: any[] = [];
      
      for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
        const batchIds = variantIds.slice(i, i + BATCH_SIZE);
        
        // Build query with multiple variant queries
        const variantQueries = batchIds.map((id: string, index: number) => {
          return `
            variant${index}: productVariant(id: "${id}") {
              id
              inventoryQuantity
              inventoryItem {
                id
                tracked
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      id
                      location {
                        id
                      }
                    }
                  }
                }
              }
            }
          `;
        }).join('\n');

        const batchResponse = await admin.graphql(`#graphql
          query getBatchVariants {
            ${variantQueries}
          }
        `);

        const batchJson: any = await batchResponse.json();
        
        if (batchJson.errors) {
          console.error('Error fetching variants:', batchJson.errors);
          continue;
        }

        // Extract variant data from response
        Object.values(batchJson.data || {}).forEach((variant: any) => {
          if (variant) {
            allVariantsData.push(variant);
          }
        });
      }

      console.log(`📊 Fetched ${allVariantsData.length} variants in ${Math.ceil(variantIds.length / BATCH_SIZE)} batches`);

      // First, activate inventory items at the location if needed
      const itemsToActivate: string[] = [];
      
      for (const variant of allVariantsData) {
        if (!variant.inventoryItem?.tracked) {
          continue;
        }

        // Check if inventory item is stocked at this location
        const hasInventoryAtLocation = variant.inventoryItem.inventoryLevels?.edges?.some(
          (edge: any) => edge.node.location.id === locationId
        );

        if (!hasInventoryAtLocation) {
          console.log(`📍 Need to activate inventory for ${variant.id} at location`);
          itemsToActivate.push(variant.inventoryItem.id);
        }
      }

      // Activate inventory items at location if needed
      if (itemsToActivate.length > 0) {
        console.log(`🔓 Activating ${itemsToActivate.length} inventory items at location...`);
        
        // Activate ALL items (Shopify requires one mutation per item)
        for (const inventoryItemId of itemsToActivate) {
          try {
            const activateResponse = await admin.graphql(
              `#graphql
                mutation InventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
                  inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
                    inventoryLevel {
                      id
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }`,
              {
                variables: {
                  inventoryItemId: inventoryItemId,
                  locationId: locationId
                }
              }
            );

            const activateJson: any = await activateResponse.json();
            
            if (activateJson.data?.inventoryActivate?.userErrors?.length > 0) {
              console.warn(`⚠️ Failed to activate ${inventoryItemId}:`, activateJson.data.inventoryActivate.userErrors);
            } else {
              console.log(`✅ Activated ${inventoryItemId}`);
            }
          } catch (error) {
            console.error(`❌ Error activating ${inventoryItemId}:`, error);
          }
        }
        
        console.log(`✅ Completed activation of ${itemsToActivate.length} inventory items`);
      }

      // Prepare changes for bulk update
      const changes: any[] = [];
      const variantMap = new Map();
      const skippedVariants: any[] = [];

      for (const variant of allVariantsData) {
        // Skip if inventory tracking is not enabled
        if (!variant.inventoryItem?.tracked) {
          console.log(`⚠️ Skipping ${variant.id} - inventory not tracked`);
          skippedVariants.push({
            variantId: variant.id,
            reason: 'Inventory tracking not enabled'
          });
          continue;
        }

        // Calculate the delta based on update method
        let delta = 0;
        if (stockUpdateMethod === 'set') {
          delta = quantity - (variant.inventoryQuantity || 0);
        } else if (stockUpdateMethod === 'add') {
          delta = quantity;
        } else if (stockUpdateMethod === 'subtract') {
          delta = -quantity;
        }

        if (delta !== 0) {
          changes.push({
            delta: delta,
            inventoryItemId: variant.inventoryItem.id,
            locationId: locationId
          });

          variantMap.set(variant.id, {
            oldQuantity: variant.inventoryQuantity || 0,
            newQuantity: (variant.inventoryQuantity || 0) + delta,
            delta: delta
          });
        }
      }

      console.log(`🔧 Preparing to adjust ${changes.length} variants in a single mutation`);
      if (skippedVariants.length > 0) {
        console.log(`⚠️ Skipped ${skippedVariants.length} variants (inventory not tracked)`);
      }

      if (changes.length === 0 && !isOnlyMetadata) {
        return json({
          success: skippedVariants.length === 0, // Only success if nothing was skipped
          results: [],
          updatedVariants: [],
          skippedVariants: skippedVariants,
          successful: 0,
          failed: 0,
          skipped: skippedVariants.length,
          message: skippedVariants.length > 0 
            ? `All ${skippedVariants.length} variants were skipped (inventory tracking not enabled)` 
            : 'No changes needed'
        });
      }

      // Execute inventory adjustment ONLY if we have stock changes
      if (!isOnlyMetadata && changes.length > 0) {
        const adjustResponse = await admin.graphql(
          `#graphql
            mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
              inventoryAdjustQuantities(input: $input) {
                inventoryAdjustmentGroup {
                  createdAt
                  reason
                  changes {
                    name
                    delta
                  }
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }`,
          {
            variables: {
              input: {
                reason: "correction",
                name: "available",
                referenceDocumentUri: "gid://spector-app/BulkUpdate/" + Date.now(),
                changes: changes
              }
            },
          }
        );

        const adjustJson: any = await adjustResponse.json();
        
        if (adjustJson.errors || adjustJson.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
          const errorMessage = adjustJson.errors?.[0]?.message || 
                             adjustJson.data?.inventoryAdjustQuantities?.userErrors?.[0]?.message || 
                             'Unknown error';
          console.error(`❌ Bulk inventory adjust failed:`, errorMessage);
          return json({ error: errorMessage }, { status: 500 });
        }

        console.log(`✅ Bulk inventory adjustment successful for ${changes.length} variants`);
      }

      // Update SKU, Barcode, and Continue Selling if requested
      const metadataResults: any[] = [];
      
      if (applySku || applyBarcode || applyContinueSelling) {
        console.log(`🏷️ Updating metadata for ${variantIds.length} variants...`);
        
        for (const variantId of variantIds) {
          try {
            // Build the variant input object
            const variantInput: any = { id: variantId };
            
            if (applySku) {
              variantInput.sku = sku || '';
            }
            
            if (applyBarcode) {
              variantInput.barcode = barcode || '';
            }
            
            if (applyContinueSelling && continueSelling !== null) {
              variantInput.inventoryPolicy = continueSelling ? 'CONTINUE' : 'DENY';
            }
            
            // Update the variant using productVariantsBulkUpdate
            // First, get the product ID for this variant
            const variantDataResponse = await admin.graphql(
              `#graphql
                query getVariantProduct($variantId: ID!) {
                  productVariant(id: $variantId) {
                    id
                    product {
                      id
                    }
                  }
                }`,
              {
                variables: { variantId }
              }
            );
            
            const variantDataJson: any = await variantDataResponse.json();
            const productId = variantDataJson.data?.productVariant?.product?.id;
            
            if (!productId) {
              throw new Error('Could not find product for variant');
            }
            
            // Now update the variant
            const variantUpdateResponse = await admin.graphql(
              `#graphql
                mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                    productVariants {
                      id
                      sku
                      barcode
                      inventoryPolicy
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }`,
              {
                variables: {
                  productId: productId,
                  variants: [variantInput]
                }
              }
            );
            
            const variantUpdateJson: any = await variantUpdateResponse.json();
            
            if (variantUpdateJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
              const errors = variantUpdateJson.data.productVariantsBulkUpdate.userErrors;
              console.warn(`⚠️ Metadata update failed for ${variantId}:`, errors);
              metadataResults.push({
                variantId,
                success: false,
                error: errors.map((e: any) => e.message).join(', ')
              });
            } else {
              console.log(`✅ Updated metadata for ${variantId}`);
              metadataResults.push({
                variantId,
                success: true
              });
            }
          } catch (error) {
            console.error(`❌ Error updating metadata for ${variantId}:`, error);
            metadataResults.push({
              variantId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        console.log(`✅ Completed metadata updates: ${metadataResults.filter(r => r.success).length} successful, ${metadataResults.filter(r => !r.success).length} failed`);
      }

      // Prepare results (combine stock and metadata results if both exist)
      let results;
      if (isOnlyMetadata) {
        // Only metadata was updated
        results = metadataResults;
      } else if (metadataResults.length > 0) {
        // Both stock and metadata were updated - merge results
        results = Array.from(variantMap.entries()).map(([variantId, data]) => {
          const metaResult = metadataResults.find(r => r.variantId === variantId);
          return {
            variantId,
            success: metaResult ? metaResult.success : true,
            oldQuantity: data.oldQuantity,
            newQuantity: data.newQuantity,
            delta: data.delta,
            error: metaResult?.error
          };
        });
      } else {
        // Only stock was updated
        results = Array.from(variantMap.entries()).map(([variantId, data]) => ({
          variantId,
          success: true,
          oldQuantity: data.oldQuantity,
          newQuantity: data.newQuantity,
          delta: data.delta
        }));
      }
      
      // Prepare updated variants data for immediate UI update
      const updatedVariants = results.map(r => ({
        id: r.variantId,
        inventoryQuantity: r.newQuantity
      }));
      
      console.log(`📤 API returning ${updatedVariants.length} updated variants`);
      
      return json({
        success: true,
        results,
        updatedVariants,
        skippedVariants: skippedVariants,
        successful: results.length,
        failed: 0,
        skipped: skippedVariants.length
      });
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      return json({ 
        error: `Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

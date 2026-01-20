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

// Safety constants to prevent crashes
const MEMORY_WARNING_THRESHOLD = 150; // Warn if over this many products per page

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
      logger.info("🔵 Fetching all products...");
      
      // Support pagination with cursor
      const cursor = requestData instanceof FormData 
        ? requestData.get("cursor")?.toString() 
        : requestData.cursor;
      
      const limit = requestData instanceof FormData
        ? parseInt(requestData.get("limit")?.toString() || "100")
        : (requestData.limit || 100);
      
      logger.info(`🔵 Fetching ${limit} products${cursor ? ` after cursor ${cursor.substring(0, 20)}...` : ' (first page)'}`);
      
      const response = await admin.graphql(
        `#graphql
          query getAllProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              edges {
                cursor
                node {
                  id
                  title
                  handle
                  description
                  descriptionHtml
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
            first: Math.min(limit, 250), // Shopify max is 250
            after: cursor || null,
          },
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        logger.error("🔴 GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to fetch products" }, { status: 500 });
      }

      const edges = responseJson.data?.products?.edges || [];
      const products = edges.map((edge: any) => edge.node);
      const pageInfo = responseJson.data?.products?.pageInfo || {};
      const hasNextPage = pageInfo.hasNextPage || false;
      const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
      
      const productCount = products.length;
      logger.info(`🔵 Fetched ${productCount} products. Has next page: ${hasNextPage}`);
      
      if (productCount > MEMORY_WARNING_THRESHOLD) {
        logger.warn(`⚠️  Fetching ${productCount} products in single request. Consider using smaller page size.`);
      }

      return json({
        products,
        hasNextPage,
        endCursor,
        productCount,
        totalFetched: productCount,
      });
    } catch (error) {
      logger.error("🔴 Error fetching all products:", error);
      return json({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
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
                  descriptionHtml
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
                  descriptionHtml
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
                  descriptionHtml
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

      const results: any[] = [];
      
      // Group updates by product to batch variants together
      const updatesByProduct = new Map<string, any[]>();
      updates.forEach(update => {
        if (!updatesByProduct.has(update.productId)) {
          updatesByProduct.set(update.productId, []);
        }
        const productUpdates = updatesByProduct.get(update.productId);
        if (productUpdates) {
          productUpdates.push(update);
        }
      });
      
      // Process each product's variants in a single bulk update
      for (const [productId, productUpdates] of updatesByProduct.entries()) {
        try {
          // Build variant inputs for this product
          const variantInputs = productUpdates.map(update => {
            const variantInput: any = {
              id: update.variantId,
              price: update.price,
              compareAtPrice: update.compareAtPrice || null
            };
            
            if (update.taxable !== undefined) {
              variantInput.taxable = update.taxable;
            }
            
            return variantInput;
          });
          
          // Single bulk update for all variants of this product
          const response = await admin.graphql(
            `#graphql
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  product {
                    id
                    variants(first: 100) {
                      edges {
                        node {
                          id
                          price
                          compareAtPrice
                          taxable
                          inventoryItem {
                            id
                          }
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
                productId,
                variants: variantInputs
              }
            }
          );

          const data = await response.json();
          
          if (data.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            // If bulk update fails, mark all variants as failed
            productUpdates.forEach(update => {
              results.push({
                productId: update.productId,
                variantId: update.variantId,
                success: false,
                error: data.data.productVariantsBulkUpdate.userErrors[0].message
              });
            });
            continue;
          }
          
          const updatedVariants = data.data?.productVariantsBulkUpdate?.product?.variants?.edges || [];
          
          // Handle cost and unit price updates if needed (these require separate calls)
          const costUpdates = productUpdates.filter(u => u.cost !== undefined && u.cost !== null);
          if (costUpdates.length > 0) {
            // Batch cost updates
            for (const update of costUpdates) {
              try {
                const variant = updatedVariants.find((v: any) => v.node.id === update.variantId);
                const inventoryItemId = variant?.node?.inventoryItem?.id;
                
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
          }
          
          // Add successful results for all variants
          productUpdates.forEach(update => {
            const variant = updatedVariants.find((v: any) => v.node.id === update.variantId);
            results.push({
              productId: update.productId,
              variantId: update.variantId,
              productTitle: update.productTitle,
              success: true,
              newPrice: variant?.node?.price || update.price,
              newCompareAtPrice: variant?.node?.compareAtPrice || update.compareAtPrice
            });
          });
          
        } catch (error) {
          // Mark all variants as failed if an error occurs
          productUpdates.forEach(update => {
            results.push({
              productId: update.productId,
              variantId: update.variantId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
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
      const results: any[] = [];
      let totalMatchesFound = 0;
      let productsWithNoMatches = 0;

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
          let matchesInThisProduct = 0;
          
          console.log('📝 Description Update Debug:', {
            productId,
            operation: descriptionOperation,
            currentDescription: newDescription,
            valueToApply: descriptionValue,
            replaceFrom: descriptionReplaceFrom,
            replaceTo: descriptionReplaceTo
          });
          
          if (descriptionOperation === 'set') {
            // Set/replace entire description - always use the new value
            newDescription = descriptionValue || '';
            console.log('✏️ SET operation - New description:', newDescription);
          } else if (descriptionOperation === 'prefix' || descriptionOperation === 'prepend') {
            // Add to beginning - handle empty descriptions
            if (descriptionValue) {
              if (!newDescription) {
                // If product has no description, just use the prefix
                newDescription = descriptionValue;
              } else {
                // Add prefix with proper HTML line break
                newDescription = `${descriptionValue}<br/>${newDescription}`;
              }
              console.log('➕ PREFIX operation - New description:', newDescription);
            }
          } else if (descriptionOperation === 'suffix' || descriptionOperation === 'append') {
            // Add to end - handle empty descriptions
            if (descriptionValue) {
              if (!newDescription) {
                // If product has no description, just use the suffix
                newDescription = descriptionValue;
              } else {
                // Add suffix with proper HTML line break
                newDescription = `${newDescription}<br/>${descriptionValue}`;
              }
              console.log('➕ SUFFIX operation - New description:', newDescription);
            }
          } else if (descriptionOperation === 'replace') {
            // Replace text - if no existing description, nothing to replace
            // Allow empty descriptionReplaceTo to delete the found text
            if (newDescription && descriptionReplaceFrom) {
              const oldDescription = newDescription;
              
              // Escape special regex characters to treat search string literally
              const escapedSearchString = descriptionReplaceFrom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              
              // Count matches before replacing (case-insensitive)
              const matches = (newDescription.match(new RegExp(escapedSearchString, 'gi')) || []).length;
              matchesInThisProduct = matches;
              totalMatchesFound += matches;
              
              if (matches > 0) {
                newDescription = newDescription.replace(
                  new RegExp(escapedSearchString, 'gi'), 
                  descriptionReplaceTo !== undefined ? descriptionReplaceTo : ''
                );
                console.log('🔄 REPLACE operation:', {
                  oldDescription,
                  newDescription,
                  findText: descriptionReplaceFrom,
                  replaceText: descriptionReplaceTo,
                  matchesFound: matches
                });
              } else {
                console.log('⚠️ No matches found for:', descriptionReplaceFrom);
                productsWithNoMatches++;
              }
            } else if (!newDescription) {
              console.log('⚠️ Product has no description to search in');
              productsWithNoMatches++;
            }
          }

          console.log('📤 Sending update to Shopify:', { productId, newDescription });

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
              error,
              matchesFound: matchesInThisProduct
            });
          } else {
            results.push({
              productId,
              success: true,
              matchesFound: matchesInThisProduct,
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
        failed: results.filter(r => !r.success).length,
        totalMatchesFound,
        productsWithNoMatches
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
      const setQuantities: any[] = []; // For 'set' operation using inventorySetOnHandQuantities
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

        if (stockUpdateMethod === 'set') {
          // For 'set' operation, use inventorySetOnHandQuantities (absolute value)
          setQuantities.push({
            inventoryItemId: variant.inventoryItem.id,
            locationId: locationId,
            quantity: quantity
          });

          variantMap.set(variant.id, {
            oldQuantity: variant.inventoryQuantity || 0,
            newQuantity: quantity,
            delta: quantity - (variant.inventoryQuantity || 0)
          });
        } else {
          // For 'add' and 'subtract', use delta-based adjustment
          let delta = 0;
          if (stockUpdateMethod === 'add') {
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
      }

      const totalChanges = stockUpdateMethod === 'set' ? setQuantities.length : changes.length;
      console.log(`🔧 Preparing to ${stockUpdateMethod === 'set' ? 'set' : 'adjust'} ${totalChanges} variants`);
      if (skippedVariants.length > 0) {
        console.log(`⚠️ Skipped ${skippedVariants.length} variants (inventory not tracked)`);
      }

      if (totalChanges === 0 && !isOnlyMetadata) {
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

      // Execute inventory update based on the operation type
      if (!isOnlyMetadata && totalChanges > 0) {
        if (stockUpdateMethod === 'set' && setQuantities.length > 0) {
          // Use inventorySetOnHandQuantities for 'set' operation (exact/absolute values)
          console.log(`📦 Using inventorySetOnHandQuantities for ${setQuantities.length} items`);
          
          const setResponse = await admin.graphql(
            `#graphql
              mutation InventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
                inventorySetOnHandQuantities(input: $input) {
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
                  referenceDocumentUri: "gid://spector-app/BulkUpdate/" + Date.now(),
                  setQuantities: setQuantities
                }
              },
            }
          );

          const setJson: any = await setResponse.json();
          
          if (setJson.errors || setJson.data?.inventorySetOnHandQuantities?.userErrors?.length > 0) {
            const errorMessage = setJson.errors?.[0]?.message || 
                               setJson.data?.inventorySetOnHandQuantities?.userErrors?.[0]?.message || 
                               'Unknown error';
            console.error(`❌ Bulk inventory set failed:`, errorMessage);
            return json({ error: errorMessage }, { status: 500 });
          }

          console.log(`✅ Bulk inventory set successful for ${setQuantities.length} variants`);
        } else if (changes.length > 0) {
          // Use inventoryAdjustQuantities for 'add' and 'subtract' operations (delta-based)
          console.log(`📦 Using inventoryAdjustQuantities for ${changes.length} items`);
          
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
      }

      // Update SKU, Barcode, and Continue Selling if requested
      const metadataResults: any[] = [];
      
      if (applySku || applyBarcode || applyContinueSelling) {
        console.log(`🏷️ Updating metadata for ${variantIds.length} variants...`);
        console.log(`📋 Metadata values - SKU: "${sku}", Barcode: "${barcode}", ContinueSelling: ${continueSelling}`);
        
        // Group variants by their product ID for bulk updates
        const variantsByProduct = new Map<string, string[]>();
        
        // First, fetch product IDs for all variants
        for (let i = 0; i < variantIds.length; i += 100) {
          const batchIds = variantIds.slice(i, i + 100);
          
          const variantQueries = batchIds.map((id: string, index: number) => {
            return `
              variant${index}: productVariant(id: "${id}") {
                id
                product {
                  id
                }
              }
            `;
          }).join('\n');

          const batchResponse = await admin.graphql(`#graphql
            query getVariantProducts {
              ${variantQueries}
            }
          `);

          const batchJson: any = await batchResponse.json();
          
          if (!batchJson.errors) {
            Object.values(batchJson.data || {}).forEach((variant: any) => {
              if (variant?.product?.id) {
                const productId = variant.product.id;
                if (!variantsByProduct.has(productId)) {
                  variantsByProduct.set(productId, []);
                }
                variantsByProduct.get(productId)!.push(variant.id);
              }
            });
          }
        }

        console.log(`📦 Found ${variantsByProduct.size} products to update`);

        // Handle SKU updates separately using inventoryItemUpdate mutation
        // SKU is stored on the inventory item, not the variant
        if (applySku) {
          console.log(`🔧 Updating SKU for ${variantIds.length} variants using inventoryItemUpdate...`);
          
          for (const variantData of allVariantsData) {
            const inventoryItemId = variantData.inventoryItem?.id;
            if (!inventoryItemId) {
              console.warn(`⚠️ No inventory item found for variant ${variantData.id}`);
              continue;
            }

            try {
              const skuUpdateResponse = await admin.graphql(
                `#graphql
                  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                    inventoryItemUpdate(id: $id, input: $input) {
                      inventoryItem {
                        id
                        sku
                      }
                      userErrors {
                        field
                        message
                      }
                    }
                  }`,
                {
                  variables: {
                    id: inventoryItemId,
                    input: {
                      sku: sku || ''
                    }
                  }
                }
              );

              const skuUpdateJson: any = await skuUpdateResponse.json();
              
              if (skuUpdateJson.errors) {
                console.error(`❌ SKU update error for ${variantData.id}:`, skuUpdateJson.errors);
                metadataResults.push({
                  variantId: variantData.id,
                  success: false,
                  error: skuUpdateJson.errors.map((e: any) => e.message).join(', ')
                });
              } else if (skuUpdateJson.data?.inventoryItemUpdate?.userErrors?.length > 0) {
                const errors = skuUpdateJson.data.inventoryItemUpdate.userErrors;
                console.warn(`⚠️ SKU update failed for ${variantData.id}:`, errors);
                metadataResults.push({
                  variantId: variantData.id,
                  success: false,
                  error: errors.map((e: any) => e.message).join(', ')
                });
              } else {
                console.log(`✅ SKU updated for variant ${variantData.id}`);
                metadataResults.push({
                  variantId: variantData.id,
                  success: true,
                  sku: skuUpdateJson.data?.inventoryItemUpdate?.inventoryItem?.sku
                });
              }
            } catch (error) {
              console.error(`❌ Error updating SKU for variant ${variantData.id}:`, error);
              metadataResults.push({
                variantId: variantData.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }

        // Handle barcode and continue selling using productVariantsBulkUpdate
        // These fields are on the variant, not the inventory item
        if (applyBarcode || (applyContinueSelling && continueSelling !== null)) {
          console.log(`🔧 Updating barcode/continue selling using productVariantsBulkUpdate...`);
          
          for (const [productId, productVariantIds] of variantsByProduct) {
            try {
              // Build variant inputs for this product (only barcode and inventoryPolicy)
              const variantInputs = productVariantIds.map(variantId => {
                const input: any = { id: variantId };
                
                // Barcode is a direct field on ProductVariantsBulkInput
                if (applyBarcode) {
                  input.barcode = barcode || '';
                }
                
                if (applyContinueSelling && continueSelling !== null) {
                  input.inventoryPolicy = continueSelling ? 'CONTINUE' : 'DENY';
                }
                
                return input;
              });

              console.log(`📝 Updating ${variantInputs.length} variants for product ${productId}`);
              
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
                    variants: variantInputs
                  }
                }
              );
              
              const variantUpdateJson: any = await variantUpdateResponse.json();
              
              console.log(`📤 Bulk update response for product ${productId}:`, JSON.stringify(variantUpdateJson).substring(0, 500));
              
              if (variantUpdateJson.errors) {
                console.error(`❌ GraphQL errors for product ${productId}:`, variantUpdateJson.errors);
                productVariantIds.forEach(variantId => {
                  // Only add error if we haven't already processed this variant for SKU
                  if (!applySku) {
                    metadataResults.push({
                      variantId,
                      success: false,
                      error: variantUpdateJson.errors.map((e: any) => e.message).join(', ')
                    });
                  }
                });
              } else if (variantUpdateJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
                const errors = variantUpdateJson.data.productVariantsBulkUpdate.userErrors;
                console.warn(`⚠️ Metadata update failed for product ${productId}:`, errors);
                productVariantIds.forEach(variantId => {
                  if (!applySku) {
                    metadataResults.push({
                      variantId,
                      success: false,
                      error: errors.map((e: any) => e.message).join(', ')
                    });
                  }
                });
              } else {
                const updatedVariants = variantUpdateJson.data?.productVariantsBulkUpdate?.productVariants || [];
                console.log(`✅ Updated ${updatedVariants.length} variants for product ${productId}`);
                updatedVariants.forEach((updatedVariant: any) => {
                  // Only add success if we haven't already processed this variant for SKU
                  if (!applySku) {
                    metadataResults.push({
                      variantId: updatedVariant.id,
                      success: true,
                      sku: updatedVariant.sku,
                      barcode: updatedVariant.barcode
                    });
                  } else {
                    // Update the existing result with barcode
                    const existingResult = metadataResults.find(r => r.variantId === updatedVariant.id);
                    if (existingResult) {
                      existingResult.barcode = updatedVariant.barcode;
                    }
                  }
                });
              }
            } catch (error) {
              console.error(`❌ Error updating variants for product ${productId}:`, error);
              productVariantIds.forEach(variantId => {
                if (!applySku) {
                  metadataResults.push({
                    variantId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                }
              });
            }
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

  // Update shipping settings (weight, country of origin, HS code, physical product)
  if (actionType === "update-shipping") {
    try {
      const {
        variantIds,
        requiresShipping,
        weight,
        weightUnit,
        countryCodeOfOrigin,
        harmonizedSystemCode
      } = requestData;

      console.log('📦 Shipping Update Request:', {
        variantCount: variantIds?.length,
        requiresShipping,
        weight,
        weightUnit,
        countryCodeOfOrigin,
        harmonizedSystemCode
      });

      if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
        return json({ error: "Variant IDs are required" }, { status: 400 });
      }

      // Check if there's anything to update
      const hasWeightUpdate = weight !== null && weight !== undefined && weight > 0;
      const hasPhysicalProductUpdate = requiresShipping !== null && requiresShipping !== undefined;
      const hasCountryUpdate = countryCodeOfOrigin && countryCodeOfOrigin.length > 0;
      const hasHsCodeUpdate = harmonizedSystemCode && harmonizedSystemCode.length > 0;

      if (!hasWeightUpdate && !hasPhysicalProductUpdate && !hasCountryUpdate && !hasHsCodeUpdate) {
        return json({ error: "No shipping fields to update" }, { status: 400 });
      }

      // Fetch inventory item IDs for all variants
      const BATCH_SIZE = 50;
      const allVariantsData: any[] = [];

      for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
        const batchIds = variantIds.slice(i, i + BATCH_SIZE);

        const variantQueries = batchIds.map((id: string, index: number) => {
          return `
            variant${index}: productVariant(id: "${id}") {
              id
              title
              inventoryItem {
                id
                requiresShipping
                countryCodeOfOrigin
                harmonizedSystemCode
                measurement {
                  weight {
                    value
                    unit
                  }
                }
              }
              product {
                id
                title
              }
            }
          `;
        }).join('\n');

        const batchResponse = await admin.graphql(`#graphql
          query getBatchVariantsShipping {
            ${variantQueries}
          }
        `);

        const batchJson: any = await batchResponse.json();

        if (batchJson.errors) {
          console.error('Error fetching variants for shipping:', batchJson.errors);
          continue;
        }

        Object.values(batchJson.data || {}).forEach((variant: any) => {
          if (variant) {
            allVariantsData.push(variant);
          }
        });
      }

      console.log(`📊 Fetched ${allVariantsData.length} variants for shipping update`);

      // Update each inventory item
      const results: any[] = [];

      for (const variant of allVariantsData) {
        const inventoryItemId = variant.inventoryItem?.id;
        if (!inventoryItemId) {
          console.warn(`⚠️ No inventory item found for variant ${variant.id}`);
          results.push({
            variantId: variant.id,
            success: false,
            error: 'No inventory item found'
          });
          continue;
        }

        try {
          // Build the input object only with fields that should be updated
          const input: any = {};

          if (hasPhysicalProductUpdate) {
            input.requiresShipping = requiresShipping;
          }

          if (hasCountryUpdate) {
            input.countryCodeOfOrigin = countryCodeOfOrigin;
          }

          if (hasHsCodeUpdate) {
            input.harmonizedSystemCode = harmonizedSystemCode;
          }

          if (hasWeightUpdate) {
            input.measurement = {
              weight: {
                value: weight,
                unit: weightUnit || 'KILOGRAMS'
              }
            };
          }

          console.log(`📝 Updating inventory item ${inventoryItemId} with:`, input);

          const updateResponse = await admin.graphql(
            `#graphql
              mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                inventoryItemUpdate(id: $id, input: $input) {
                  inventoryItem {
                    id
                    requiresShipping
                    countryCodeOfOrigin
                    harmonizedSystemCode
                    measurement {
                      weight {
                        value
                        unit
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`,
            {
              variables: {
                id: inventoryItemId,
                input
              }
            }
          );

          const updateJson: any = await updateResponse.json();

          if (updateJson.errors) {
            console.error(`❌ GraphQL errors for ${variant.id}:`, updateJson.errors);
            results.push({
              variantId: variant.id,
              success: false,
              error: updateJson.errors.map((e: any) => e.message).join(', ')
            });
          } else if (updateJson.data?.inventoryItemUpdate?.userErrors?.length > 0) {
            const errors = updateJson.data.inventoryItemUpdate.userErrors;
            console.warn(`⚠️ User errors for ${variant.id}:`, errors);
            results.push({
              variantId: variant.id,
              success: false,
              error: errors.map((e: any) => e.message).join(', ')
            });
          } else {
            const updatedItem = updateJson.data?.inventoryItemUpdate?.inventoryItem;
            console.log(`✅ Shipping updated for variant ${variant.id}`);
            results.push({
              variantId: variant.id,
              success: true,
              requiresShipping: updatedItem?.requiresShipping,
              countryCodeOfOrigin: updatedItem?.countryCodeOfOrigin,
              harmonizedSystemCode: updatedItem?.harmonizedSystemCode,
              weight: updatedItem?.measurement?.weight
            });
          }
        } catch (error) {
          console.error(`❌ Error updating shipping for variant ${variant.id}:`, error);
          results.push({
            variantId: variant.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`✅ Shipping update completed: ${successful} successful, ${failed} failed`);

      return json({
        success: failed === 0,
        results,
        successful,
        failed
      });

    } catch (error) {
      console.error('Error updating shipping:', error);
      return json({
        error: `Failed to update shipping: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  }

  // Duplicate a product with a new title
  if (actionType === "duplicate-product") {
    try {
      const productId = requestData instanceof FormData 
        ? requestData.get("productId")?.toString() 
        : requestData.productId;
      const newTitle = requestData instanceof FormData 
        ? requestData.get("newTitle")?.toString() 
        : requestData.newTitle;

      if (!productId) {
        return json({ error: "Product ID is required" }, { status: 400 });
      }

      logger.info(`🔵 Duplicating product ${productId} with title: ${newTitle}`);

      // Use Shopify's productDuplicate mutation
      const response = await admin.graphql(
        `#graphql
          mutation productDuplicate($productId: ID!, $newTitle: String!) {
            productDuplicate(
              productId: $productId,
              newTitle: $newTitle
            ) {
              newProduct {
                id
                title
                handle
                status
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
            newTitle: newTitle || "Copy"
          }
        }
      );

      const responseJson: any = await response.json();
      
      if (responseJson.errors) {
        logger.error("🔴 GraphQL Errors:", responseJson.errors);
        return json({ error: "Failed to duplicate product", details: responseJson.errors }, { status: 500 });
      }

      const result = responseJson.data?.productDuplicate;
      
      if (result?.userErrors && result.userErrors.length > 0) {
        logger.error("🔴 User Errors:", result.userErrors);
        return json({ 
          error: "Failed to duplicate product", 
          details: result.userErrors.map((e: any) => e.message).join(', ')
        }, { status: 400 });
      }

      logger.info(`✅ Product duplicated successfully: ${result?.newProduct?.title}`);
      
      return json({
        success: true,
        newProduct: result?.newProduct
      });

    } catch (error) {
      logger.error('Error duplicating product:', error);
      return json({ 
        error: `Failed to duplicate product: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  // Add variants to products using productVariantsBulkCreate
  if (actionType === "add-variants") {
    try {
      const { productIds, options } = requestData;

      console.log('🎨 Add Variants Request:', {
        productCount: productIds?.length,
        options
      });

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return json({ error: "Product IDs are required" }, { status: 400 });
      }

      if (!options || !Array.isArray(options) || options.length === 0) {
        return json({ error: "At least one option is required" }, { status: 400 });
      }

      // Validate options structure and normalize option names
      // Shopify recognizes standard option names: Color, Size, Material, Style, Title
      const normalizeOptionName = (name: string): string => {
        const trimmed = name.trim();
        // Capitalize first letter of each word to match Shopify's standard format
        return trimmed.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      };

      for (const opt of options) {
        if (!opt.name || typeof opt.name !== 'string' || !opt.name.trim()) {
          return json({ error: "Each option must have a name" }, { status: 400 });
        }
        if (!opt.values || !Array.isArray(opt.values) || opt.values.length === 0) {
          return json({ error: `Option "${opt.name}" must have at least one value` }, { status: 400 });
        }
      }

      // Normalize option names to match Shopify's expected format
      const normalizedOptions = options.map(opt => ({
        name: normalizeOptionName(opt.name),
        values: opt.values.map((v: string) => v.trim()).filter((v: string) => v)
      }));

      // Generate all variant combinations from normalized options
      const generateCombinations = (opts: Array<{name: string, values: string[]}>): Array<{[key: string]: string}> => {
        if (opts.length === 0) return [{}];
        
        const [first, ...rest] = opts;
        const subCombinations = generateCombinations(rest);
        const combinations: Array<{[key: string]: string}> = [];
        
        for (const value of first.values) {
          for (const subCombo of subCombinations) {
            combinations.push({ [first.name]: value, ...subCombo });
          }
        }
        
        return combinations;
      };

      const variantCombinations = generateCombinations(normalizedOptions);
      console.log(`📊 Generated ${variantCombinations.length} variant combinations`);

      const results: Array<{productId: string, success: boolean, error?: string, variantsCreated?: number}> = [];
      let totalVariantsCreated = 0;

      for (const productId of productIds) {
        try {
          // First, get existing product options and variants
          const productResponse = await admin.graphql(`#graphql
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                title
                options {
                  id
                  name
                  position
                  values
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          `, {
            variables: { id: productId }
          });

          const productJson: any = await productResponse.json();
          
          if (productJson.errors) {
            console.error(`❌ Error fetching product ${productId}:`, productJson.errors);
            results.push({
              productId,
              success: false,
              error: productJson.errors.map((e: any) => e.message).join(', ')
            });
            continue;
          }

          const product = productJson.data?.product;
          if (!product) {
            results.push({
              productId,
              success: false,
              error: 'Product not found'
            });
            continue;
          }

          console.log(`📦 Processing product: ${product.title}`);
          console.log(`📦 Existing options:`, product.options);

          // Check existing options - Shopify allows max 3 options
          const existingOptions = product.options || [];
          
          // For products with only "Title" option (default), we need to replace it
          const hasOnlyDefaultOption = existingOptions.length === 1 && 
            existingOptions[0].name === 'Title' && 
            existingOptions[0].values.length === 1 && 
            existingOptions[0].values[0] === 'Default Title';

          // Check if we would exceed 3 options
          const newOptionsNeeded = normalizedOptions.filter(opt => 
            !existingOptions.some((existing: any) => 
              existing.name.toLowerCase() === opt.name.toLowerCase()
            )
          );

          const totalOptionsNeeded = hasOnlyDefaultOption ? 
            normalizedOptions.length : 
            existingOptions.length + newOptionsNeeded.length;

          if (totalOptionsNeeded > 3) {
            results.push({
              productId,
              success: false,
              error: `Would exceed maximum of 3 options. Product has ${existingOptions.length}, trying to add ${newOptionsNeeded.length} new options.`
            });
            continue;
          }

          // STEP 1: If product has only default option or needs new options, use productOptionsCreate first
          if (hasOnlyDefaultOption || newOptionsNeeded.length > 0) {
            console.log(`📝 Creating/updating options for product ${productId}`);
            
            // Prepare options for creation
            const optionsToCreate = normalizedOptions.map((opt, idx) => ({
              name: opt.name,
              position: idx + 1,
              values: opt.values.map(v => ({ name: v }))
            }));

            console.log(`📝 Options to create:`, JSON.stringify(optionsToCreate, null, 2));

            const createOptionsResponse = await admin.graphql(`#graphql
              mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
                productOptionsCreate(productId: $productId, options: $options) {
                  product {
                    id
                    options {
                      id
                      name
                      position
                      values
                    }
                  }
                  userErrors {
                    field
                    message
                    code
                  }
                }
              }
            `, {
              variables: {
                productId,
                options: optionsToCreate
              }
            });

            const createOptionsJson: any = await createOptionsResponse.json();
            console.log(`📥 Create options response:`, JSON.stringify(createOptionsJson, null, 2));

            if (createOptionsJson.errors) {
              console.error(`❌ GraphQL errors creating options for ${productId}:`, createOptionsJson.errors);
              results.push({
                productId,
                success: false,
                error: createOptionsJson.errors.map((e: any) => e.message).join(', ')
              });
              continue;
            }

            if (createOptionsJson.data?.productOptionsCreate?.userErrors?.length > 0) {
              const errors = createOptionsJson.data.productOptionsCreate.userErrors;
              console.error(`❌ User errors creating options for ${productId}:`, errors);
              results.push({
                productId,
                success: false,
                error: errors.map((e: any) => `${e.field || 'Error'}: ${e.message}`).join(', ')
              });
              continue;
            }

            console.log(`✅ Options created for product ${productId}`);
          }

          // STEP 2: Now create the variants
          // Build variants input - each variant needs option values
          const variantsInput = variantCombinations.map(combo => ({
            optionValues: normalizedOptions.map(opt => ({
              optionName: opt.name,
              name: combo[opt.name]
            }))
          }));

          console.log(`📝 Creating ${variantsInput.length} variants for product ${productId}`);
          console.log(`📝 Variants input:`, JSON.stringify(variantsInput.slice(0, 3), null, 2));

          const createVariantsResponse = await admin.graphql(`#graphql
            mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
              productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
                product {
                  id
                  options {
                    id
                    name
                    values
                  }
                }
                productVariants {
                  id
                  title
                  selectedOptions {
                    name
                    value
                  }
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `, {
            variables: {
              productId,
              variants: variantsInput,
              strategy: hasOnlyDefaultOption ? 'REMOVE_STANDALONE_VARIANT' : 'DEFAULT'
            }
          });

          const createVariantsJson: any = await createVariantsResponse.json();

          console.log(`📥 Create variants response:`, JSON.stringify(createVariantsJson, null, 2));

          if (createVariantsJson.errors) {
            console.error(`❌ GraphQL errors creating variants for ${productId}:`, createVariantsJson.errors);
            results.push({
              productId,
              success: false,
              error: createVariantsJson.errors.map((e: any) => e.message).join(', ')
            });
            continue;
          }

          if (createVariantsJson.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
            const errors = createVariantsJson.data.productVariantsBulkCreate.userErrors;
            console.error(`❌ User errors creating variants for ${productId}:`, errors);
            results.push({
              productId,
              success: false,
              error: errors.map((e: any) => `${e.field || 'Error'}: ${e.message}`).join(', ')
            });
            continue;
          }

          const createdVariants = createVariantsJson.data?.productVariantsBulkCreate?.productVariants || [];
          totalVariantsCreated += createdVariants.length;
          
          console.log(`✅ Created ${createdVariants.length} variants for product ${productId}`);
          
          results.push({
            productId,
            success: true,
            variantsCreated: createdVariants.length
          });

        } catch (error) {
          console.error(`❌ Error processing product ${productId}:`, error);
          results.push({
            productId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successfulProducts = results.filter(r => r.success);
      const failedProducts = results.filter(r => !r.success);

      console.log(`✅ Add variants completed: ${successfulProducts.length} successful, ${failedProducts.length} failed, ${totalVariantsCreated} variants created`);

      return json({
        success: failedProducts.length === 0,
        updatedProducts: successfulProducts,
        failedProducts,
        totalVariantsCreated
      });

    } catch (error) {
      console.error('Error adding variants:', error);
      return json({
        error: `Failed to add variants: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

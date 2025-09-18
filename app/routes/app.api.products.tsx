import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ message: "Products API endpoint" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
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
                  media(first: 10) {
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
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        inventoryQuantity
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
            first: 100,
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
                        inventoryQuantity
                        inventoryPolicy
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
      if (requestData instanceof FormData) {
        updates = JSON.parse(requestData.get("updates") as string);
      } else {
        updates = requestData.updates;
      }
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return json({ error: "No updates provided" }, { status: 400 });
      }

      const results = [];
      
      for (const update of updates) {
        try {
          // Update product variant price using bulk update
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
                variants: [{
                  id: update.variantId,
                  price: update.price,
                  compareAtPrice: update.compareAtPrice || null
                }]
              }
            }
          );

          const data = await response.json();
          
          if (data.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            results.push({
              productId: update.productId,
              success: false,
              error: data.data.productVariantsBulkUpdate.userErrors[0].message
            });
          } else {
            const updatedVariant = data.data?.productVariantsBulkUpdate?.product?.variants?.edges?.[0]?.node;
            results.push({
              productId: update.productId,
              success: true,
              newPrice: updatedVariant?.price
            });
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
          
          let mutation = '';
          let variables: any = { productId };
          
          if (operation === 'add') {
            // Add products to each collection
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
          let mutation = '';
          let variables: any = { id: productId, tags: tagsArray };
          
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
      const body = await request.json();
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
          
          if (descriptionOperation === 'append') {
            newDescription = `${newDescription}\n${descriptionValue}`;
          } else if (descriptionOperation === 'prepend') {
            newDescription = `${descriptionValue}\n${newDescription}`;
          } else if (descriptionOperation === 'replace') {
            newDescription = newDescription.replace(new RegExp(descriptionReplaceFrom, 'g'), descriptionReplaceTo);
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
              oldDescription: currentProduct.descriptionHtml,
              newDescription: updateJson.data?.productUpdate?.product?.descriptionHtml
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
          description: r.newDescription
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
      const body = await request.json();
      const { variantIds, inventoryOperation, stockQuantity, stockUpdateMethod } = body;

      if (!variantIds || !Array.isArray(variantIds)) {
        return json({ error: "Variant IDs are required" }, { status: 400 });
      }

      if (inventoryOperation !== 'stock') {
        return json({ error: "Only stock operations are currently supported" }, { status: 400 });
      }

      const quantity = parseInt(stockQuantity) || 0;
      const results = [];

      for (const variantId of variantIds) {
        try {
          // First get the variant to get its inventory item
          const getVariantResponse = await admin.graphql(
            `#graphql
              query getVariant($id: ID!) {
                productVariant(id: $id) {
                  id
                  inventoryQuantity
                  inventoryItem {
                    id
                  }
                  product {
                    id
                    title
                  }
                }
              }`,
            {
              variables: {
                id: variantId,
              },
            }
          );

          const getVariantJson: any = await getVariantResponse.json();
          
          if (getVariantJson.errors) {
            results.push({
              variantId,
              success: false,
              error: `Failed to get variant: ${getVariantJson.errors[0]?.message || 'Unknown error'}`
            });
            continue;
          }

          const variant = getVariantJson.data?.productVariant;
          if (!variant) {
            results.push({
              variantId,
              success: false,
              error: 'Variant not found'
            });
            continue;
          }

          // Calculate the delta based on update method
          let delta = 0;
          if (stockUpdateMethod === 'set') {
            delta = quantity - variant.inventoryQuantity;
          } else if (stockUpdateMethod === 'add') {
            delta = quantity;
          } else if (stockUpdateMethod === 'subtract') {
            delta = -quantity;
          }

          if (delta === 0) {
            results.push({
              variantId,
              success: true,
              message: 'No change needed'
            });
            continue;
          }

          // Get the first location (we'll use the first available location)
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
            results.push({
              variantId,
              success: false,
              error: 'No location found'
            });
            continue;
          }

          // Adjust inventory using the inventoryAdjustQuantities mutation
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
                  changes: [{
                    delta: delta,
                    inventoryItemId: variant.inventoryItem.id,
                    locationId: locationId
                  }]
                }
              },
            }
          );

          const adjustJson: any = await adjustResponse.json();
          
          if (adjustJson.errors || adjustJson.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
            const errorMessage = adjustJson.errors?.[0]?.message || 
                               adjustJson.data?.inventoryAdjustQuantities?.userErrors?.[0]?.message || 
                               'Unknown error';
            results.push({
              variantId,
              success: false,
              error: errorMessage
            });
          } else {
            results.push({
              variantId,
              success: true,
              oldQuantity: variant.inventoryQuantity,
              newQuantity: variant.inventoryQuantity + delta,
              delta: delta
            });
          }
          
        } catch (error) {
          results.push({
            variantId,
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
      console.error('Error updating inventory:', error);
      return json({ 
        error: `Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

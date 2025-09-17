import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ message: "Products API endpoint" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const actionType = formData.get("action");

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
      const updates = JSON.parse(formData.get("updates") as string);
      
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

  return json({ error: "Invalid action" }, { status: 400 });
};

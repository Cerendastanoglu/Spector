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

  return json({ error: "Invalid action" }, { status: 400 });
};

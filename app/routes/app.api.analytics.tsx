import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
  }>;
  recentOrders: Array<{
    id: string;
    name: string;
    amount: number;
    date: string;
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    // Fetch orders data
    const ordersResponse = await admin.graphql(
      `#graphql
      query getOrders($first: Int!) {
        orders(first: $first) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          first: 50,
        },
      }
    );

    // Fetch products data
    const productsResponse = await admin.graphql(
      `#graphql
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              totalInventory
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          first: 50,
        },
      }
    );

    const ordersData = await ordersResponse.json();
    const productsData = await productsResponse.json();

    // Process orders data
    const orders = ordersData.data?.orders?.edges || [];
    let totalRevenue = 0;
    const recentOrders = orders.slice(0, 10).map((orderEdge: any) => {
      const order = orderEdge.node;
      const amount = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");
      totalRevenue += amount;
      
      return {
        id: order.id,
        name: order.name,
        amount: amount,
        date: new Date(order.createdAt).toLocaleDateString(),
      };
    });

    // Process products data
    const products = productsData.data?.products?.edges || [];
    const topProducts = products
      .map((productEdge: any) => {
        const product = productEdge.node;
        const variant = product.variants?.edges?.[0]?.node;
        return {
          name: product.title,
          quantity: variant?.inventoryQuantity || 0,
        };
      })
      .filter((product: any) => product.quantity > 0)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate analytics
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const lowStockCount = products.filter((productEdge: any) => {
      const product = productEdge.node;
      const variant = product.variants?.edges?.[0]?.node;
      return (variant?.inventoryQuantity || 0) < 5;
    }).length;
    const outOfStockCount = products.filter((productEdge: any) => {
      const product = productEdge.node;
      const variant = product.variants?.edges?.[0]?.node;
      return (variant?.inventoryQuantity || 0) === 0;
    }).length;

    const analyticsData: AnalyticsData = {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      outOfStockCount,
      lowStockCount,
      topProducts,
      recentOrders,
    };

    return json({ success: true, data: analyticsData });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch analytics data" 
      },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  // Handle POST requests (same as loader for now)
  return loader({ request, params, context: {} });
}

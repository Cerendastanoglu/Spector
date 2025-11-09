import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logger } from "~/utils/logger";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    logger.info("Test API: Starting test...");
    
    const { admin, session } = await authenticate.admin(request);
    logger.info("Test API: Authentication successful", { shop: session.shop });
    
    // Test basic GraphQL query
    const response = await admin.graphql(`
      query {
        shop {
          name
          myshopifyDomain
        }
        products(first: 1) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `);
    
    const data = await response.json();
    logger.info("Test API: GraphQL response", data);
    
    if (data.errors) {
      return json({
        success: false,
        error: "GraphQL errors",
        details: data.errors,
        session: {
          shop: session.shop,
          accessToken: session.accessToken ? "present" : "missing"
        }
      });
    }
    
    return json({
      success: true,
      shop: data.data?.shop,
      productCount: data.data?.products?.edges?.length || 0,
      firstProduct: data.data?.products?.edges?.[0]?.node || null,
      session: {
        shop: session.shop,
        accessToken: session.accessToken ? "present" : "missing"
      }
    });
    
  } catch (error) {
    logger.error("Test API Error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
};

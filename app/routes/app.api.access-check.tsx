import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const checkType = formData.get("checkType") as string;

    switch (checkType) {
      case "orders": {
        // Check if we can access orders
        try {
          const response = await admin.graphql(
            `#graphql
              query getOrdersAccess {
                orders(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }`
          );
          
          const data = await response.json();
          
          if (data.data?.errors || !data.data?.orders) {
            return json({
              success: false,
              hasAccess: false,
              error: "Orders access not available",
              missingScopes: ["read_orders"],
              message: "To enable order analysis and forecasting features, please grant order access permissions."
            });
          }
          
          return json({
            success: true,
            hasAccess: true,
            message: "Orders access available"
          });
        } catch (error) {
          return json({
            success: false,
            hasAccess: false,
            error: "Orders access check failed",
            message: "Unable to verify order access permissions."
          });
        }
      }

      case "products": {
        // Check if we can access products
        try {
          const response = await admin.graphql(
            `#graphql
              query getProductsAccess {
                products(first: 1) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
              }`
          );
          
          const data = await response.json();
          
          if (data.data?.errors || !data.data?.products) {
            return json({
              success: false,
              hasAccess: false,
              error: "Products access not available",
              missingScopes: ["read_products"],
              message: "To enable product management features, please grant product access permissions."
            });
          }
          
          return json({
            success: true,
            hasAccess: true,
            message: "Products access available"
          });
        } catch (error) {
          return json({
            success: false,
            hasAccess: false,
            error: "Products access check failed",
            message: "Unable to verify product access permissions."
          });
        }
      }

      default:
        return json({
          success: false,
          error: "Invalid check type",
          message: "Please specify a valid access check type."
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Access check error:", error);
    return json({
      success: false,
      error: "Access check failed",
      message: "An error occurred while checking permissions."
    }, { status: 500 });
  }
};
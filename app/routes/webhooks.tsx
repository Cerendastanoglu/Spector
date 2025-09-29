import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(
    request
  );

  console.log(`Received webhook: ${topic} for shop: ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      console.log("Customer data request received:", payload);
      // Handle customer data request
      break;

    case "CUSTOMERS_REDACT":
      console.log("Customer redact request received:", payload);
      // Handle customer data deletion
      break;

    case "SHOP_REDACT":
      console.log("Shop redact request received:", payload);
      // Handle shop data deletion
      break;

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response("OK", { status: 200 });
};
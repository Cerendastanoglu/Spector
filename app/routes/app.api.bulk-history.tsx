import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  // Return empty batches array
  return json({ 
    success: true, 
    batches: [],
    message: "This feature has been removed"
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  return json({ 
    success: true, 
    message: "This feature has been removed"
  });
}

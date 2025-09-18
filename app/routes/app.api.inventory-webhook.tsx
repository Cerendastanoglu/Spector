import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request: _request }) => {
  return json({ message: "Inventory Webhook API endpoint" });
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.text();
    let webhookData;
    
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error("Invalid webhook payload:", error);
      return json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Mock processing inventory webhook
    console.log("Received inventory webhook:", webhookData);
    
    const { productId, variantId, inventoryLevel, locationId } = webhookData;
    
    if (!productId || inventoryLevel === undefined) {
      return json({ error: "Product ID and inventory level are required" }, { status: 400 });
    }

    // Mock processing the inventory change
    // In a real app, this would:
    // 1. Update local inventory cache
    // 2. Check against configured thresholds
    // 3. Trigger notifications if thresholds are met
    // 4. Send customer alerts via configured channels
    
    const shouldTriggerAlert = inventoryLevel <= 5; // Mock threshold
    
    if (shouldTriggerAlert) {
      console.log(`🚨 Inventory alert triggered for product ${productId}: ${inventoryLevel} units remaining`);
      
      // Mock sending notifications
      // This would integrate with the notification channels configured in the app
    }

    return json({ 
      success: true, 
      message: "Webhook processed successfully",
      productId,
      variantId,
      inventoryLevel,
      locationId,
      alertTriggered: shouldTriggerAlert,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

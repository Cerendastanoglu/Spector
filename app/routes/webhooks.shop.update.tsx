import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  if (!shop) {
    throw new Response("Unauthorized", { status: 401 });
  }

  console.log(`[SHOP_UPDATE] Received shop update for: ${shop}`);
  
  try {
    const shopData = payload as any;
    
    // Log the shop update for debugging
    console.log(`[SHOP_UPDATE] Shop data:`, {
      shop: shopData.domain,
      plan: shopData.plan_name,
      partnerDevelopment: shopData.plan_display_name === 'Partner test store'
    });

    // Check if the store was upgraded from development to paid
    const wasPartnerDevelopment = shopData.plan_display_name === 'Partner test store';
    const isPaidPlan = !wasPartnerDevelopment && shopData.plan_name !== 'staff';

    if (!wasPartnerDevelopment && isPaidPlan) {
      console.log(`[SHOP_UPDATE] Development store ${shop} upgraded to paid plan: ${shopData.plan_name}`);
      
      // Log this upgrade for potential billing enforcement
      // In a real app, you might want to:
      // 1. Block app access until user subscribes
      // 2. Send email notification about required subscription
      // 3. Create a pending subscription charge
      
      // For now, we'll just log it
      await db.complianceAudit.create({
        data: {
          shop: shop,
          topic: 'shop_upgrade',
          payload: JSON.stringify(shopData),
          status: 'completed',
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          notes: 'Development store upgraded to paid plan - subscription required'
        }
      });
      
      console.log(`[SHOP_UPDATE] Logged shop upgrade requiring subscription for: ${shop}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`[SHOP_UPDATE] Error processing shop update for ${shop}:`, error);
    return new Response("Error processing shop update", { status: 500 });
  }
};
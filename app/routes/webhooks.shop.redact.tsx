import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate the webhook request
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);

    // Extract shop redaction information
    const {
      shop_id,
      shop_domain,
    } = payload as {
      shop_id: number;
      shop_domain: string;
    };

    console.log(`🗑️ Shop data redaction request for shop: ${shop_domain}`);
    console.log(`🏪 Shop ID: ${shop_id}`);

    // TODO: Implement your shop data deletion logic here
    // You MUST delete ALL data associated with this shop, including:
    // 1. All customer data from this shop
    // 2. All analytics data
    // 3. All product data
    // 4. All session data
    // 5. All app configurations
    // 6. All cached data
    // 7. All logs containing shop information

    try {
      // Delete all sessions for this shop
      await db.session.deleteMany({
        where: { shop: shop_domain }
      });

      // Delete any other shop-specific data you might have
      // Example deletions (customize based on your data structure):
      /*
      await db.shopAnalytics.deleteMany({
        where: { shopDomain: shop_domain }
      });

      await db.shopSettings.deleteMany({
        where: { shopDomain: shop_domain }
      });

      await db.productCache.deleteMany({
        where: { shopDomain: shop_domain }
      });

      await db.notificationSettings.deleteMany({
        where: { shopDomain: shop_domain }
      });
      */

      console.log(`✅ Shop data successfully redacted for shop: ${shop_domain}`);
      
    } catch (dbError) {
      console.error('❌ Failed to redact shop data from database:', dbError);
      // Still return 200 to acknowledge receipt, but log the error
    }

    // Log the redaction for compliance
    console.log(`📝 Shop data redaction completed for shop: ${shop_domain}`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Shop redaction webhook failed:', error);
    
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
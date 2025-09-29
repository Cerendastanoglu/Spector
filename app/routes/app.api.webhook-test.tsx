import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { testWebhookVerification, manualWebhookVerification } from "../utils/webhookVerification";
import { authenticate } from "../shopify.server";

// Test webhook verification functionality
export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    throw new Response('Not Found', { status: 404 });
  }

  // Run verification test
  const testResult = testWebhookVerification();
  
  return json({
    success: true,
    message: 'Webhook verification test completed',
    testResult,
    timestamp: new Date().toISOString(),
    info: {
      hmacVerification: 'authenticate.webhook() handles HMAC verification automatically',
      shopifyRemixSecurity: 'Built-in security with @shopify/shopify-app-remix',
      status: testResult ? 'HMAC verification working correctly' : 'HMAC verification failed'
    }
  });
};

// Test webhook endpoint for manual verification
export const action = async ({ request }: ActionFunctionArgs) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    throw new Response('Not Found', { status: 404 });
  }

  try {
    console.log('🧪 Testing webhook HMAC verification...');
    
    // Method 1: Use Shopify's built-in authentication (recommended)
    try {
      const { shop, topic } = await authenticate.webhook(request.clone());
      console.log('✅ Shopify authenticate.webhook() succeeded');
      console.log(`✅ HMAC verified for shop: ${shop}, topic: ${topic}`);
      
      return json({
        success: true,
        method: 'shopify-authenticate',
        shop,
        topic,
        message: 'HMAC verification successful using Shopify Remix authentication',
        verified: true
      });
    } catch (authError) {
      console.log('❌ Shopify authenticate.webhook() failed:', authError);
    }

    // Method 2: Manual verification (for testing/backup)
    const manualResult = await manualWebhookVerification(request.clone());
    
    return json({
      success: manualResult.isValid,
      method: 'manual-verification',
      shop: manualResult.shop,
      topic: manualResult.topic,
      message: manualResult.isValid 
        ? 'HMAC verification successful using manual method'
        : 'HMAC verification failed',
      verified: manualResult.isValid,
      error: !manualResult.isValid ? 'Invalid HMAC signature or missing headers' : undefined
    });

  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    
    return json({
      success: false,
      message: 'Webhook test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      verified: false
    }, { status: 500 });
  }
};
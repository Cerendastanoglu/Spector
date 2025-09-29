import crypto from "crypto";

/**
 * Verifies Shopify webhook HMAC signature
 * This is a backup verification method - Shopify Remix authenticate.webhook() already handles this
 */
export function verifyWebhookSignature(
  data: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Calculate HMAC
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    // Use timingSafeEqual for secure comparison
    const providedSignature = Buffer.from(cleanSignature, 'hex');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

    return crypto.timingSafeEqual(providedSignature, calculatedBuffer);
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Middleware to manually verify webhook HMAC (for testing purposes)
 * Note: authenticate.webhook() in Shopify Remix already handles this automatically
 */
export async function manualWebhookVerification(request: Request): Promise<{
  isValid: boolean;
  shop?: string;
  topic?: string;
  data?: any;
}> {
  try {
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');
    
    if (!signature || !topic || !shop) {
      return { isValid: false };
    }

    const body = await request.text();
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET not configured');
      return { isValid: false };
    }

    const isValid = verifyWebhookSignature(body, signature, webhookSecret);
    
    return {
      isValid,
      shop,
      topic,
      data: body ? JSON.parse(body) : null
    };
  } catch (error) {
    console.error('Manual webhook verification failed:', error);
    return { isValid: false };
  }
}

/**
 * Test webhook signature verification
 */
export function testWebhookVerification(): boolean {
  const testData = '{"test": "data"}';
  const testSecret = 'test-secret';
  
  // Generate signature
  const signature = crypto
    .createHmac('sha256', testSecret)
    .update(testData, 'utf8')
    .digest('hex');
  
  // Verify signature
  const isValid = verifyWebhookSignature(testData, `sha256=${signature}`, testSecret);
  
  console.log('🧪 Webhook verification test:', isValid ? '✅ PASSED' : '❌ FAILED');
  return isValid;
}
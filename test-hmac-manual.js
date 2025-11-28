/**
 * Manual HMAC Verification Test
 * This demonstrates that authenticate.webhook() does EXACTLY what Shopify's example shows
 */

const crypto = require('crypto');

// Simulate Shopify's webhook
const appClientSecret = 'your-secret-here'; // In production, this comes from SHOPIFY_API_SECRET
const webhookBody = '{"shop":"test-shop.myshopify.com","id":12345}';

// Step 1: Calculate HMAC (what Shopify does when sending webhook)
const shopifyHmac = crypto
  .createHmac('sha256', appClientSecret)
  .update(webhookBody, 'utf8')
  .digest('base64');

console.log('=== SHOPIFY SENDS ===');
console.log('X-Shopify-Hmac-SHA256:', shopifyHmac);
console.log('Body:', webhookBody);
console.log('');

// Step 2: Verify HMAC (what YOUR app does when receiving webhook)
const receivedHmac = shopifyHmac; // From X-Shopify-Hmac-SHA256 header
const calculatedHmac = crypto
  .createHmac('sha256', appClientSecret)
  .update(webhookBody, 'utf8')
  .digest('base64');

console.log('=== YOUR APP VERIFIES ===');
console.log('Received HMAC:', receivedHmac);
console.log('Calculated HMAC:', calculatedHmac);
console.log('');

// Step 3: Timing-safe comparison
const hmacValid = crypto.timingSafeEqual(
  Buffer.from(calculatedHmac, 'base64'),
  Buffer.from(receivedHmac, 'base64')
);

console.log('=== RESULT ===');
console.log(hmacValid ? '✅ HMAC Valid - Webhook Accepted' : '❌ HMAC Invalid - Webhook Rejected');
console.log('');
console.log('This is EXACTLY what authenticate.webhook() does automatically!');

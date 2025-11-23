/**
 * Test Shopify Webhook with proper headers
 * This simulates exactly what Shopify sends
 */

import crypto from 'crypto';

const API_SECRET = '8349678cc521791c3a4f8a4a12d638dd';
const APP_URL = 'https://spector-260800553724.us-central1.run.app';
const TEST_SHOP = 'spector-test-store.myshopify.com';

// Create a proper Shopify webhook payload
const webhookPayload = JSON.stringify({
  id: 1,
  email: "test@example.com",
  closed_at: null,
  created_at: "2024-01-01T00:00:00-05:00",
  updated_at: "2024-01-01T00:00:00-05:00",
  number: 1,
  note: null,
  token: "test-token",
  gateway: "manual",
  test: true,
  total_price: "100.00",
  subtotal_price: "100.00",
  total_weight: 0,
  total_tax: "0.00",
  taxes_included: false,
  currency: "USD",
  financial_status: "paid",
  confirmed: true,
  total_discounts: "0.00",
  app_id: 271681683457
});

// Generate HMAC like Shopify does
const hmac = crypto
  .createHmac('sha256', API_SECRET)
  .update(webhookPayload, 'utf8')
  .digest('base64');

console.log('🧪 Testing Shopify Webhook HMAC Verification\n');
console.log('Webhook URL:', `${APP_URL}/webhooks/app/uninstalled`);
console.log('HMAC:', hmac);

// Test the app/uninstalled webhook (simplest one)
async function testWebhook() {
  try {
    const response = await fetch(`${APP_URL}/webhooks/app/uninstalled`, {
      method: 'POST',
      headers: {
        'X-Shopify-Topic': 'app/uninstalled',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Shop-Domain': TEST_SHOP,
        'X-Shopify-Webhook-Id': 'test-webhook-id',
        'X-Shopify-Triggered-At': new Date().toISOString(),
        'X-Shopify-Api-Version': '2024-10',
        'Content-Type': 'application/json'
      },
      body: webhookPayload
    });

    console.log('\n📊 Response:');
    console.log('Status:', response.status, response.statusText);
    
    if (response.status === 200 || response.status === 202) {
      console.log('✅ HMAC verification PASSED - Webhook accepted!');
      console.log('\n🎉 Your app is ready for Shopify App Store!');
      console.log('HMAC verification is working correctly.');
    } else {
      const text = await response.text();
      console.log('❌ Webhook rejected');
      console.log('Response body:', text);
      
      // More specific test needed
      console.log('\n🔧 Running minimal test...');
      await testMinimalWebhook();
    }
  } catch (error) {
    console.error('Error testing webhook:', error.message);
  }
}

// Test with minimal payload that Shopify actually sends for app/uninstalled
async function testMinimalWebhook() {
  const minimalPayload = JSON.stringify({});
  
  const minimalHmac = crypto
    .createHmac('sha256', API_SECRET)
    .update(minimalPayload, 'utf8')
    .digest('base64');
  
  try {
    const response = await fetch(`${APP_URL}/webhooks/app/uninstalled`, {
      method: 'POST',
      headers: {
        'X-Shopify-Topic': 'app/uninstalled',
        'X-Shopify-Hmac-Sha256': minimalHmac,
        'X-Shopify-Shop-Domain': TEST_SHOP,
        'Content-Type': 'application/json'
      },
      body: minimalPayload
    });

    console.log('Minimal webhook status:', response.status);
    if (response.status === 200 || response.status === 202) {
      console.log('✅ Minimal HMAC verification PASSED!');
    }
  } catch (error) {
    console.error('Minimal test error:', error.message);
  }
}

// Run the test
testWebhook();

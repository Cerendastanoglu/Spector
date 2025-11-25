/**
 * Generate HMAC for Postman Testing
 * Run this to get the HMAC signature for your webhook payload
 */

import crypto from 'crypto';

// Your app credentials
const API_SECRET = '8349678cc521791c3a4f8a4a12d638dd';
const TEST_SHOP = 'spector-test-store.myshopify.com';

// Example payload - you can modify this
const payload = {
  shop_id: 987654321,
  shop_domain: TEST_SHOP
};

// Convert to JSON string (IMPORTANT: No extra spaces or formatting)
const payloadString = JSON.stringify(payload);

// Generate HMAC exactly like Shopify does
const hmac = crypto
  .createHmac('sha256', API_SECRET)
  .update(payloadString, 'utf8')
  .digest('base64');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔐 POSTMAN WEBHOOK TEST CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📍 REQUEST URL:');
console.log('https://spector-445znzcibq-uc.a.run.app/webhooks/shop/redact');
console.log('');

console.log('📋 METHOD:');
console.log('POST');
console.log('');

console.log('📦 HEADERS:');
console.log('Content-Type: application/json');
console.log('X-Shopify-Topic: shop/redact');
console.log('X-Shopify-Hmac-Sha256:', hmac);
console.log('X-Shopify-Shop-Domain:', TEST_SHOP);
console.log('X-Shopify-Webhook-Id: webhook-test-' + Date.now());
console.log('X-Shopify-Triggered-At:', new Date().toISOString());
console.log('X-Shopify-Api-Version: 2024-10');
console.log('');

console.log('📝 BODY (raw JSON):');
console.log(payloadString);
console.log('');

console.log('🔑 GENERATED HMAC:');
console.log(hmac);
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('💡 IMPORTANT NOTES:');
console.log('═══════════════════════════════════════════════════════════');
console.log('1. The body MUST be EXACTLY: ' + payloadString);
console.log('2. No extra spaces, newlines, or formatting in the JSON');
console.log('3. Use "raw" body type in Postman, NOT "JSON"');
console.log('4. If you change the body, you MUST regenerate the HMAC');
console.log('5. Expected response: 200 OK for valid HMAC, 401 for invalid');
console.log('');

// Also show examples for other webhooks
console.log('\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 OTHER WEBHOOK ENDPOINTS TO TEST:');
console.log('═══════════════════════════════════════════════════════════\n');

const otherWebhooks = [
  {
    name: 'App Uninstalled',
    url: 'https://spector-445znzcibq-uc.a.run.app/webhooks/app/uninstalled',
    topic: 'app/uninstalled',
    payload: {}
  },
  {
    name: 'Customer Data Request',
    url: 'https://spector-445znzcibq-uc.a.run.app/webhooks/customers/data_request',
    topic: 'customers/data_request',
    payload: {
      customer: { id: 123, email: "test@example.com" },
      orders_requested: [1, 2, 3],
      shop_id: 456,
      shop_domain: TEST_SHOP
    }
  },
  {
    name: 'Customer Redact',
    url: 'https://spector-445znzcibq-uc.a.run.app/webhooks/customers/redact',
    topic: 'customers/redact',
    payload: {
      customer: { id: 123, email: "test@example.com" },
      orders_to_redact: [1, 2, 3],
      shop_id: 456,
      shop_domain: TEST_SHOP
    }
  }
];

otherWebhooks.forEach(webhook => {
  const webhookPayloadString = JSON.stringify(webhook.payload);
  const webhookHmac = crypto
    .createHmac('sha256', API_SECRET)
    .update(webhookPayloadString, 'utf8')
    .digest('base64');
  
  console.log(`\n📌 ${webhook.name}`);
  console.log(`URL: ${webhook.url}`);
  console.log(`Topic: ${webhook.topic}`);
  console.log(`HMAC: ${webhookHmac}`);
  console.log(`Body: ${webhookPayloadString}`);
});

console.log('\n═══════════════════════════════════════════════════════════\n');



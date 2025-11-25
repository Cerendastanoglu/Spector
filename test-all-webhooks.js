/**
 * Comprehensive Webhook Test for Shopify App Store Compliance
 * Tests all webhook endpoints with proper Shopify headers
 */

import crypto from 'crypto';

const API_SECRET = '8349678cc521791c3a4f8a4a12d638dd';
const APP_URL = 'https://spector-445znzcibq-uc.a.run.app';
const TEST_SHOP = 'spector-test-store.myshopify.com';

// Test all webhook endpoints
const webhookTests = [
  {
    name: 'app/uninstalled',
    endpoint: '/webhooks/app/uninstalled',
    payload: {},
    topic: 'app/uninstalled'
  },
  {
    name: 'customers/data_request',
    endpoint: '/webhooks/customers/data_request',
    payload: {
      customer: {
        id: 123456789,
        email: "customer@example.com",
        phone: "+1234567890"
      },
      orders_requested: [1001, 1002, 1003],
      shop_id: 987654321,
      shop_domain: TEST_SHOP
    },
    topic: 'customers/data_request'
  },
  {
    name: 'customers/redact',
    endpoint: '/webhooks/customers/redact',
    payload: {
      customer: {
        id: 123456789,
        email: "customer@example.com",
        phone: "+1234567890"
      },
      orders_to_redact: [1001, 1002, 1003],
      shop_id: 987654321,
      shop_domain: TEST_SHOP
    },
    topic: 'customers/redact'
  },
  {
    name: 'shop/redact',
    endpoint: '/webhooks/shop/redact',
    payload: {
      shop_id: 987654321,
      shop_domain: TEST_SHOP
    },
    topic: 'shop/redact'
  }
];

async function testWebhook(test) {
  const payloadString = JSON.stringify(test.payload);
  
  // Generate HMAC exactly like Shopify does
  const hmac = crypto
    .createHmac('sha256', API_SECRET)
    .update(payloadString, 'utf8')
    .digest('base64');

  console.log(`\n🧪 Testing ${test.name}`);
  console.log(`📍 Endpoint: ${APP_URL}${test.endpoint}`);
  console.log(`🔐 HMAC: ${hmac}`);

  try {
    const response = await fetch(`${APP_URL}${test.endpoint}`, {
      method: 'POST',
      headers: {
        // Required Shopify headers
        'Content-Type': 'application/json',
        'X-Shopify-Topic': test.topic,
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Shop-Domain': TEST_SHOP,
        'X-Shopify-Webhook-Id': `webhook-${Date.now()}`,
        'X-Shopify-Triggered-At': new Date().toISOString(),
        'X-Shopify-Api-Version': '2024-10',
        'User-Agent': 'Shopify/1.0 (+https://shopify.com/webhooks)',
        // Additional headers that Shopify might send
        'X-Forwarded-For': '127.0.0.1',
        'X-Forwarded-Proto': 'https'
      },
      body: payloadString
    });

    console.log(`📊 Response: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('✅ HMAC verification PASSED - Webhook accepted!');
      return true;
    } else if (response.status === 400 || response.status === 401) {
      console.log('⚠️ HMAC verification rejected (expected for invalid requests)');
      return false;
    } else {
      const text = await response.text();
      console.log('❌ Unexpected response');
      console.log('Response body:', text);
      return false;
    }
  } catch (error) {
    console.error('💥 Request failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive webhook tests...\n');
  
  let passedTests = 0;
  let totalTests = webhookTests.length;
  
  for (const test of webhookTests) {
    const passed = await testWebhook(test);
    if (passed) passedTests++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📈 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All webhook tests PASSED!');
    console.log('🏆 Your app is ready for Shopify App Store submission!');
  } else if (passedTests > 0) {
    console.log('\n⚠️ Some webhooks are working, but not all.');
    console.log('Check the failed endpoints above.');
  } else {
    console.log('\n💥 All webhook tests failed.');
    console.log('Check your HMAC verification implementation.');
  }
  
  return passedTests === totalTests;
}

// Run the tests
runAllTests().catch(console.error);

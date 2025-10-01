#!/usr/bin/env node

/**
 * GDPR Compliance Webhook Test Script
 * 
 * This script tests all three mandatory GDPR compliance webhooks:
 * - customers/data_request
 * - customers/redact  
 * - shop/redact
 */

import crypto from 'crypto';
import process from 'process';

// Test webhook payloads matching Shopify's webhook structure
const testWebhooks = {
  'customers/data_request': {
    payload: {
      shop_id: 12345,
      shop_domain: 'test-store.myshopify.com',
      orders_requested: ['1234567', '2345678'],
      customer: {
        id: 987654321,
        email: 'customer@example.com',
        phone: '+1234567890'
      },
      data_request: {
        id: 42
      }
    },
    expectedResponse: 200
  },
  
  'customers/redact': {
    payload: {
      shop_id: 12345,
      shop_domain: 'test-store.myshopify.com',
      customer: {
        id: 987654321,
        email: 'customer@example.com',
        phone: '+1234567890'
      },
      orders_to_redact: ['1234567', '2345678']
    },
    expectedResponse: 200
  },
  
  'shop/redact': {
    payload: {
      shop_id: 12345,
      shop_domain: 'test-store.myshopify.com'
    },
    expectedResponse: 200
  }
};

// HMAC generation matching Shopify's webhook signature format
function generateTestHMAC(payload, secret = 'test-webhook-secret-for-gdpr-testing') {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');
}

// Test both with and without HMAC verification
const WEBHOOK_SECRET = 'test-webhook-secret-for-gdpr-testing';

async function testWebhook(topic, testData) {
  const payloadString = JSON.stringify(testData.payload);
  
  console.log(`\n🧪 Testing ${topic} webhook...`);
  console.log(`📦 Payload: ${payloadString.substring(0, 100)}${payloadString.length > 100 ? '...' : ''}`);
  
  try {
    const response = await fetch('http://localhost:51970/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': topic,
        'X-Shopify-Shop-Domain': testData.payload.shop_domain,
        'X-Shopify-Webhook-Id': `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        'X-Shopify-Hmac-Sha256': generateTestHMAC(payloadString, WEBHOOK_SECRET),
        'User-Agent': 'Shopify/1.0 (Test/GDPR-Compliance)'
      },
      body: payloadString
    });
    
    const status = response.status;
    const responseText = await response.text();
    
    if (status === testData.expectedResponse) {
      console.log(`✅ ${topic}: SUCCESS (${status})`);
      console.log(`📄 Response: ${responseText}`);
      return true;
    } else {
      console.log(`❌ ${topic}: FAILED - Expected ${testData.expectedResponse}, got ${status}`);
      console.log(`📄 Response: ${responseText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${topic}: ERROR - ${error.message}`);
    return false;
  }
}

// Test HMAC verification specifically
async function testHMACVerification() {
  console.log('\n🔐 Testing HMAC Verification...');
  
  const testPayload = JSON.stringify({
    shop_id: 12345,
    shop_domain: 'test-store.myshopify.com',
    customer: { id: 987654321, email: 'test@example.com' }
  });
  
  // Test 1: Valid HMAC
  console.log('🧪 Test 1: Valid HMAC signature');
  try {
    const response = await fetch('http://localhost:51970/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'customers/data_request',
        'X-Shopify-Shop-Domain': 'test-store.myshopify.com',
        'X-Shopify-Webhook-Id': 'test-hmac-valid',
        'X-Shopify-Hmac-Sha256': generateTestHMAC(testPayload, WEBHOOK_SECRET),
        'User-Agent': 'Shopify/1.0 (Test/HMAC-Valid)'
      },
      body: testPayload
    });
    
    if (response.status === 200) {
      console.log('✅ Valid HMAC: SUCCESS (200)');
    } else {
      console.log(`❌ Valid HMAC: FAILED (${response.status})`);
    }
  } catch (error) {
    console.log(`❌ Valid HMAC: ERROR - ${error.message}`);
  }
  
  // Test 2: Invalid HMAC
  console.log('🧪 Test 2: Invalid HMAC signature');
  try {
    const response = await fetch('http://localhost:51970/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'customers/data_request',
        'X-Shopify-Shop-Domain': 'test-store.myshopify.com',
        'X-Shopify-Webhook-Id': 'test-hmac-invalid',
        'X-Shopify-Hmac-Sha256': 'invalid-hmac-signature',
        'User-Agent': 'Shopify/1.0 (Test/HMAC-Invalid)'
      },
      body: testPayload
    });
    
    if (response.status === 401) {
      console.log('✅ Invalid HMAC: SUCCESS (401 Unauthorized as expected)');
    } else {
      console.log(`❌ Invalid HMAC: FAILED - Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Invalid HMAC: ERROR - ${error.message}`);
  }
}

async function runTests() {
  console.log('🔒 GDPR Compliance Webhook Test Suite');
  console.log('=====================================');
  
  // Wait a moment for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test HMAC verification first
  await testHMACVerification();
  
  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [topic, testData] of Object.entries(testWebhooks)) {
    totalTests++;
    const result = await testWebhook(topic, testData);
    results.push({ topic, passed: result });
    if (result) passedTests++;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  results.forEach(({ topic, passed }) => {
    console.log(`${passed ? '✅' : '❌'} ${topic}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🏁 Final Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All GDPR compliance webhooks are working correctly!');
    console.log('🔒 Your Shopify app is ready for GDPR compliance requirements.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the webhook implementation.');
    process.exit(1);
  }
}

// Check if server is accessible before running tests
async function checkServer() {
  try {
    const response = await fetch('http://localhost:51970/');
    console.log(`🌐 Server is accessible (${response.status})`);
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible. Please start the development server first:');
    console.log('   npm run dev');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  if (await checkServer()) {
    await runTests();
  } else {
    process.exit(1);
  }
})();
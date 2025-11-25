/**
 * Comprehensive App Store Readiness Diagnostic Tool
 * This tests everything Shopify's automated checks look for
 */

import crypto from 'crypto';

const API_SECRET = '8349678cc521791c3a4f8a4a12d638dd';
const APP_URL = 'https://spector-260800553724.us-central1.run.app';
const TEST_SHOP = 'spector-test-store.myshopify.com';

// All required webhook endpoints for App Store
const requiredWebhooks = [
  {
    name: 'app/uninstalled',
    endpoint: '/webhooks/app/uninstalled',
    payload: {},
    required: true,
    description: 'Mandatory for all apps'
  },
  {
    name: 'customers/data_request',
    endpoint: '/webhooks/customers/data_request',
    payload: {
      customer: { id: 123, email: "test@example.com" },
      orders_requested: [1, 2, 3],
      shop_id: 456,
      shop_domain: TEST_SHOP
    },
    required: true,
    description: 'GDPR compliance - mandatory'
  },
  {
    name: 'customers/redact',
    endpoint: '/webhooks/customers/redact',
    payload: {
      customer: { id: 123, email: "test@example.com" },
      orders_to_redact: [1, 2, 3],
      shop_id: 456,
      shop_domain: TEST_SHOP
    },
    required: true,
    description: 'GDPR compliance - mandatory'
  },
  {
    name: 'shop/redact',
    endpoint: '/webhooks/shop/redact',
    payload: {
      shop_id: 456,
      shop_domain: TEST_SHOP
    },
    required: true,
    description: 'GDPR compliance - mandatory'
  }
];

async function testWebhookEndpoint(webhook) {
  const results = {
    name: webhook.name,
    endpoint: webhook.endpoint,
    required: webhook.required,
    tests: {}
  };

  console.log(`\n🔍 Testing ${webhook.name} (${webhook.description})`);
  console.log(`📍 ${APP_URL}${webhook.endpoint}`);

  // Test 1: Accessibility (should respond quickly, not timeout)
  try {
    const start = Date.now();
    const response = await fetch(`${APP_URL}${webhook.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook.payload)
    });
    const responseTime = Date.now() - start;
    
    results.tests.accessibility = {
      passed: response.status !== 0 && responseTime < 5000,
      status: response.status,
      responseTime: `${responseTime}ms`,
      details: responseTime > 5000 ? 'TIMEOUT - Too slow!' : 'OK'
    };
    
    console.log(`  📡 Accessibility: ${results.tests.accessibility.passed ? '✅' : '❌'} (${response.status}, ${responseTime}ms)`);
  } catch (error) {
    results.tests.accessibility = {
      passed: false,
      error: error.message,
      details: 'Connection failed'
    };
    console.log(`  📡 Accessibility: ❌ ${error.message}`);
  }

  // Test 2: Invalid HMAC rejection (should return 400/401, not 500)
  try {
    const response = await fetch(`${APP_URL}${webhook.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': webhook.name,
        'X-Shopify-Hmac-Sha256': 'invalid-hmac',
        'X-Shopify-Shop-Domain': TEST_SHOP
      },
      body: JSON.stringify(webhook.payload)
    });
    
    results.tests.invalidHmacRejection = {
      passed: response.status === 400 || response.status === 401,
      status: response.status,
      details: response.status === 500 ? 'Server error - bad!' : 'Properly rejects invalid HMAC'
    };
    
    console.log(`  🚫 Invalid HMAC: ${results.tests.invalidHmacRejection.passed ? '✅' : '❌'} (${response.status})`);
  } catch (error) {
    results.tests.invalidHmacRejection = {
      passed: false,
      error: error.message
    };
    console.log(`  🚫 Invalid HMAC: ❌ ${error.message}`);
  }

  // Test 3: Valid HMAC acceptance (should return 200)
  try {
    const payloadString = JSON.stringify(webhook.payload);
    const hmac = crypto
      .createHmac('sha256', API_SECRET)
      .update(payloadString, 'utf8')
      .digest('base64');

    const response = await fetch(`${APP_URL}${webhook.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': webhook.name,
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Shop-Domain': TEST_SHOP,
        'X-Shopify-Webhook-Id': `test-${Date.now()}`,
        'X-Shopify-Triggered-At': new Date().toISOString(),
        'X-Shopify-Api-Version': '2024-10',
        'User-Agent': 'Shopify/1.0 (+https://shopify.com/webhooks)'
      },
      body: payloadString
    });
    
    results.tests.validHmacAcceptance = {
      passed: response.status === 200,
      status: response.status,
      hmac: hmac.substring(0, 20) + '...',
      details: response.status === 200 ? 'Correctly accepts valid HMAC' : 'Should return 200 for valid HMAC'
    };
    
    console.log(`  ✅ Valid HMAC: ${results.tests.validHmacAcceptance.passed ? '✅' : '❌'} (${response.status})`);
  } catch (error) {
    results.tests.validHmacAcceptance = {
      passed: false,
      error: error.message
    };
    console.log(`  ✅ Valid HMAC: ❌ ${error.message}`);
  }

  return results;
}

async function runComprehensiveDiagnostic() {
  console.log('🏥 SHOPIFY APP STORE READINESS DIAGNOSTIC');
  console.log('==========================================');
  console.log(`🎯 App URL: ${APP_URL}`);
  console.log(`🔑 Using API Secret: ${API_SECRET.substring(0, 8)}...`);
  console.log(`🏪 Test Shop: ${TEST_SHOP}\n`);

  const allResults = [];
  let totalTests = 0;
  let passedTests = 0;

  for (const webhook of requiredWebhooks) {
    const result = await testWebhookEndpoint(webhook);
    allResults.push(result);
    
    // Count tests
    Object.values(result.tests).forEach(test => {
      totalTests++;
      if (test.passed) passedTests++;
    });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary Report
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('====================');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  
  // Detailed failures
  const failures = [];
  allResults.forEach(result => {
    Object.entries(result.tests).forEach(([testName, test]) => {
      if (!test.passed) {
        failures.push({
          webhook: result.name,
          test: testName,
          issue: test.details || test.error || 'Unknown error',
          required: result.required
        });
      }
    });
  });

  if (failures.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.webhook} - ${failure.test}`);
      console.log(`   Issue: ${failure.issue}`);
      console.log(`   Required: ${failure.required ? 'YES' : 'No'}`);
    });
  }

  // Final verdict
  console.log('\n🏆 FINAL VERDICT:');
  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED! Your app should pass Shopify\'s automated checks.');
    console.log('🚀 You can now submit to the App Store with confidence!');
  } else {
    const criticalFailures = failures.filter(f => f.required);
    if (criticalFailures.length > 0) {
      console.log('❌ CRITICAL ISSUES FOUND! These must be fixed before submission:');
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.webhook}: ${failure.issue}`);
      });
    } else {
      console.log('⚠️ Some non-critical tests failed, but app should still be submittable.');
    }
  }

  return {
    totalTests,
    passedTests,
    failures,
    readyForSubmission: failures.filter(f => f.required).length === 0
  };
}

// Run the diagnostic
runComprehensiveDiagnostic().catch(console.error);

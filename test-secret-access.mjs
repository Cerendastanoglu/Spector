// Test if Cloud Run can access the SHOPIFY_API_SECRET at runtime
console.log('Testing secret access...');
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? `SET ✓ (length: ${process.env.SHOPIFY_API_SECRET.length})` : 'NOT SET ✗');
console.log('SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL || 'NOT SET ✗');

// Don't print actual values for security
if (process.env.SHOPIFY_API_SECRET) {
  console.log('Secret first 4 chars:', process.env.SHOPIFY_API_SECRET.substring(0, 4));
  console.log('Secret last 4 chars:', process.env.SHOPIFY_API_SECRET.substring(process.env.SHOPIFY_API_SECRET.length - 4));
}

console.log('\nIf secret is SET but webhooks still fail:');
console.log('→ Secret in Shopify Partner Dashboard ≠ Secret in Google Cloud');
console.log('→ You MUST verify they match EXACTLY');




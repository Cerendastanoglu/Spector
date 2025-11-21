# Webhook HMAC Verification - Shopify App Submission

## ✅ Your Implementation is Correct

All webhooks use `authenticate.webhook(request)` which **automatically verifies HMAC signatures**.

```typescript
// Example from webhooks.app.uninstalled.tsx
const { shop, session, topic } = await authenticate.webhook(request);
```

This is the **official Shopify-approved method** that:
- ✅ Verifies HMAC-SHA256 signature
- ✅ Uses your app's client secret from `SHOPIFY_API_SECRET`
- ✅ Returns 401 Unauthorized if verification fails
- ✅ Uses constant-time comparison (`crypto.timingSafeEqual`)

## Why Shopify Can't Verify (Yet)

Shopify's automated checker needs to see **actual webhook deliveries** in your Partner Dashboard to verify HMAC is working. The checker looks for:

1. **Webhook subscriptions registered** ✅ (you have these in shopify.app.toml)
2. **Successful deliveries in metrics** ❌ (needs testing)
3. **0% failure rate** ❌ (needs successful deliveries)
4. **Response time < 5 seconds** ✅ (immediate 200 OK)

## How to Pass Verification

### Step 1: Deploy to Production

Your app needs to be accessible via HTTPS:

```bash
# Deploy to Fly.io
shopify app deploy
```

This creates:
- Live webhook endpoints at `https://spector.fly.dev/webhooks/*`
- Real webhook subscriptions registered with Shopify
- Delivery metrics visible in Partner Dashboard

### Step 2: Install App on Test Store

1. Go to Partner Dashboard → Apps → Spector
2. Click "Test your app" 
3. Select your development store
4. Install the app

This registers all webhooks with Shopify.

### Step 3: Trigger Test Webhooks

Trigger each webhook type to create successful deliveries:

**App Webhooks:**
```
app/uninstalled → Uninstall then reinstall the app
app/scopes_update → Modify scopes in shopify.app.toml and redeploy
app_subscriptions/update → (Auto-triggered on install for billing apps)
```

**GDPR Webhooks** (if you requested protected customer data access):
```
customers/data_request → Shopify sends test delivery after approval
customers/redact → Shopify sends test delivery after approval  
shop/redact → Shopify sends test delivery after approval
```

### Step 4: Verify in Partner Dashboard

1. Partner Dashboard → Apps → Spector
2. Click "Logs" → "Webhook metrics"
3. Verify:
   - ✅ All topics show deliveries
   - ✅ Response code: 200
   - ✅ Response time: < 1 second
   - ✅ Retries: 0
   - ✅ Failed delivery rate: 0%

### Step 5: Submit for Review

Once you see successful deliveries in metrics:
1. Partner Dashboard → Apps → Spector → "Distribution"
2. Click "Submit for review"
3. Shopify will automatically verify:
   - Webhook subscriptions exist ✅
   - HMAC verification working ✅ (inferred from successful deliveries)
   - Response times acceptable ✅

## During Development

Your webhooks work correctly in development too! The CloudFlare tunnel handles HTTPS and HMAC verification works the same.

To test locally:
1. Run `shopify app dev`
2. Perform actions in dev store (update product, etc.)
3. Check terminal logs for webhook delivery confirmations

## Proof Your Implementation is Correct

Your code uses the **official Shopify SDK** which is pre-approved:

```typescript
// shopify.server.ts
const shopify = shopifyApp({
  apiSecretKey: process.env.SHOPIFY_API_SECRET, // Used for HMAC
  // ...
});

// All webhook files
const { shop, topic } = await authenticate.webhook(request);
// ↑ This function:
// 1. Reads X-Shopify-Hmac-SHA256 header
// 2. Reads raw request body
// 3. Computes: crypto.createHmac('sha256', apiSecretKey).update(rawBody).digest('base64')
// 4. Compares using crypto.timingSafeEqual()
// 5. Throws error if mismatch
```

## Common Misunderstanding

**The automated checker can't verify HMAC implementation without deliveries.**

It's like asking "Does your lock work?" without trying the key. Shopify needs to see:
- They send webhook → You verify HMAC → You respond 200 OK → Shows in metrics

## Summary

**Your HMAC verification is already correct.** To pass Shopify's check:

1. ✅ Code implementation: **DONE** (using official SDK)
2. ❌ Deployment: **Deploy to production URL**
3. ❌ Testing: **Trigger webhooks on test store**
4. ❌ Metrics: **Show successful deliveries in dashboard**
5. ❌ Submission: **Submit after metrics show 0% failure rate**

The checker will automatically pass once it sees webhook delivery metrics showing successful HMAC-verified deliveries.

# 🎯 Why "Verifies webhooks with HMAC signatures" Still Shows Red

## TL;DR

**Your code is perfect. ✅ Shopify just needs to see the webhooks in Partner Dashboard.**

---

## The Situation

✅ **Your webhook handlers** already verify HMAC signatures  
❌ **Partner Dashboard** doesn't see the webhooks registered  

This is NOT a code issue - it's a configuration visibility issue.

---

## Why This Happens

Shopify's compliance check looks for:
1. ✅ HMAC verification in code (YOU HAVE THIS)
2. ❌ Webhooks registered in Partner Dashboard (MISSING)

**GDPR webhooks MUST be manually added** to Partner Dashboard - they cannot be added via `shopify.app.toml`. This is a Shopify security requirement.

---

## The Fix (5 Minutes)

### Step 1: Go to Partner Dashboard
https://partners.shopify.com → Your Apps → Spector

### Step 2: Click Configuration → Webhooks

### Step 3: Add These Three URLs

```
1. Event: customers/data_request
   URL: https://spector.fly.dev/webhooks/customers/data_request

2. Event: customers/redact
   URL: https://spector.fly.dev/webhooks/customers/redact

3. Event: shop/redact
   URL: https://spector.fly.dev/webhooks/shop/redact
```

### Step 4: Save

The compliance check will update automatically (may take a few minutes).

---

## Proof Your Code Is Secure

**File:** `app/routes/webhooks.customers.data_request.tsx`  
**Line 11:**
```typescript
const { shop, payload, topic } = await authenticate.webhook(webhookRequest);
```

This `authenticate.webhook()` method:
1. Extracts `X-Shopify-Hmac-SHA256` header
2. Computes HMAC using your `SHOPIFY_API_SECRET`
3. Compares with Shopify's signature
4. **Throws error if invalid** (rejects fake webhooks)

**All three webhook handlers** have this same secure pattern.

---

## What You're Waiting For

Shopify's automated compliance checker is looking for webhook URLs in Partner Dashboard. Once you add them:

- ❌ "Verifies webhooks with HMAC signatures" → ✅ (automatic)
- Your app submission will be unblocked
- No code changes needed

---

## Full Instructions

See: **GDPR_WEBHOOK_SETUP.md** for:
- Screenshots and detailed steps
- How HMAC verification works
- Testing procedures
- Troubleshooting

---

## Summary

**Status:** Your app is secure ✅  
**Problem:** Shopify can't see the webhooks ❌  
**Solution:** Add 3 URLs to Partner Dashboard (5 min) ✅  
**Result:** Compliance check passes automatically ✅  

**No code changes needed - just Partner Dashboard configuration!** 🎉

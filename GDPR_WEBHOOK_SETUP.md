# 🔐 GDPR Webhook Setup Guide

## Why This Is Required

Shopify requires **all apps to have HMAC-verified GDPR webhooks** configured in the Partner Dashboard before app submission. This cannot be done via `shopify.app.toml` - it's a manual Partner Dashboard configuration.

## ✅ Your Implementation Status

Your app **already has all the webhook handlers implemented**:
- ✅ `app/routes/webhooks.customers.data_request.tsx` (handles customer data export)
- ✅ `app/routes/webhooks.customers.redact.tsx` (handles customer deletion)
- ✅ `app/routes/webhooks.shop.redact.tsx` (handles shop deletion)
- ✅ All handlers use `authenticate.webhook()` which **automatically verifies HMAC signatures**

**The code is ready** - you just need to register the webhook URLs in Partner Dashboard.

---

## 📋 Step-by-Step Setup (Partner Dashboard)

### 1. Go to Shopify Partner Dashboard

Navigate to: https://partners.shopify.com/organizations

### 2. Select Your App

- Click on "Apps" in the left sidebar
- Select "Spector" from your app list

### 3. Go to Configuration → Webhooks

- Click "Configuration" tab
- Scroll down to "Webhooks" section
- Click "Add webhook" or "Configure webhooks"

### 4. Add the Three Required GDPR Webhooks

#### Webhook #1: Customer Data Request
```
Event: customers/data_request
Version: 2024-10 (or latest)
URL: https://spector.fly.dev/webhooks/customers/data_request
Format: JSON
```

#### Webhook #2: Customer Redact
```
Event: customers/redact
Version: 2024-10 (or latest)
URL: https://spector.fly.dev/webhooks/customers/redact
Format: JSON
```

#### Webhook #3: Shop Redact
```
Event: shop/redact
Version: 2024-10 (or latest)
URL: https://spector.fly.dev/webhooks/shop/redact
Format: JSON
```

### 5. Save and Verify

- Click "Save" for each webhook
- Verify all three appear in your webhooks list
- Shopify will automatically include HMAC signatures in webhook requests

---

## 🔍 How to Verify It's Working

### Check Partner Dashboard Compliance

1. Go to your app in Partner Dashboard
2. Click "App setup" or "Distribution"
3. Look for "Protected customer data" section
4. You should see: ✅ "Verifies webhooks with HMAC signatures"

### Test Webhooks (Optional)

You can test webhooks using Shopify's webhook tester:

1. In Partner Dashboard → Your App → Webhooks
2. Click "Send test webhook" next to each webhook
3. Check your server logs to verify the webhook was received and HMAC verified

---

## 🛡️ Security Information

### HMAC Verification

Your app uses the Shopify SDK's `authenticate.webhook()` method which:

1. **Extracts** the `X-Shopify-Hmac-SHA256` header from incoming requests
2. **Computes** the HMAC using your `SHOPIFY_API_SECRET` (stored in `.env`)
3. **Compares** the computed hash with Shopify's header value
4. **Rejects** any requests with invalid signatures

**Code reference:**
```typescript
// app/routes/webhooks.customers.data_request.tsx (line 11)
const { shop, payload, topic } = await authenticate.webhook(webhookRequest);
// ☝️ This automatically verifies HMAC - if invalid, it throws an error
```

### What This Protects Against

- ❌ Fake webhook requests from attackers
- ❌ Replay attacks
- ❌ Man-in-the-middle tampering
- ✅ Only genuine Shopify webhooks are processed

---

## 📝 Compliance Checklist

Before submitting to Shopify App Store:

- [ ] All three GDPR webhooks added to Partner Dashboard
- [ ] Webhook URLs point to production domain (`https://spector.fly.dev`)
- [ ] Partner Dashboard shows: ✅ "Verifies webhooks with HMAC signatures"
- [ ] Privacy policy link added to app listing
- [ ] Test webhooks to ensure handlers work correctly

---

## 🚨 Common Issues

### Issue: "Verifies webhooks with HMAC signatures" still showing ❌

**Solution:** The checkmark appears after you:
1. Add all three GDPR webhooks in Partner Dashboard
2. Save the configuration
3. Wait a few minutes for Shopify to update the compliance status

### Issue: Webhooks not being received

**Check:**
1. URLs are correct (no typos)
2. App is deployed and running on Fly.io
3. No firewall blocking webhook requests
4. Check server logs for any errors

### Issue: HMAC verification failing

**Check:**
1. `SHOPIFY_API_SECRET` environment variable is set correctly
2. Secret matches the one in Partner Dashboard
3. Request body hasn't been modified before verification

---

## 📚 Additional Resources

- [Shopify GDPR Webhooks Documentation](https://shopify.dev/docs/apps/build/privacy-law-compliance)
- [Webhook HMAC Verification](https://shopify.dev/docs/apps/build/webhooks/subscribe/https#hmac-validation)
- [Protected Customer Data Requirements](https://shopify.dev/docs/apps/launch/privacy-compliance)

---

## ✅ Summary

**Your app code is complete and secure.** You just need to:

1. Log into Shopify Partner Dashboard
2. Add the three GDPR webhook URLs (5 minutes)
3. Wait for compliance check to update (automatic)
4. Submit your app! 🚀

The HMAC verification is **already working** in your code - Shopify just needs to see the webhooks registered in Partner Dashboard to mark the compliance check as passed.

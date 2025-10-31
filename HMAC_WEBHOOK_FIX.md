# 🎯 HMAC Webhook Verification - Quick Fix

## The Issue

Partner Dashboard shows: ❌ "Verifies webhooks with HMAC signatures"

## Why This Happens

**GDPR webhooks MUST be manually configured in Partner Dashboard** - they cannot be added via `shopify.app.toml`. Shopify requires this manual setup for security compliance.

## ✅ Your Code Status

**Already implemented and working!** Your webhook handlers:
- ✅ Use `authenticate.webhook()` (automatic HMAC verification)
- ✅ Reject invalid signatures automatically
- ✅ Handle all three GDPR webhook types
- ✅ Log verification success

## 🔧 The Fix (5 Minutes)

### Go to Partner Dashboard and add these URLs:

```
1. customers/data_request
   → https://spector.fly.dev/webhooks/customers/data_request

2. customers/redact  
   → https://spector.fly.dev/webhooks/customers/redact

3. shop/redact
   → https://spector.fly.dev/webhooks/shop/redact
```

**That's it!** The compliance check will automatically update to ✅.

## 📖 Full Instructions

See `GDPR_WEBHOOK_SETUP.md` for:
- Step-by-step screenshots guide
- How HMAC verification works
- Testing instructions
- Troubleshooting

## 🔒 Security Confirmation

Your app is **already secure**. The code verifies HMAC signatures on every webhook request. Shopify just needs to see the webhooks registered in Partner Dashboard to mark the compliance check as passed.

**No code changes needed - just Partner Dashboard configuration!**

# GDPR Webhook Registration Guide

## Why HMAC Check is Failing ❌

The "Verifies webhooks with HMAC signatures" check fails because:
1. ✅ Your code is correct (authenticate.webhook verifies HMAC)
2. ✅ Your webhooks respond quickly (< 1 second)
3. ❌ **GDPR webhooks are NOT registered in Partner Dashboard yet**

**The check won't pass until all 3 GDPR webhooks are registered.**

## Current Blockers

🚫 Cannot register GDPR webhooks via `shopify.app.toml`
🚫 Cannot register them via API
✅ **MUST** register manually in Partner Dashboard
⏳ **REQUIRES** Protected Customer Data access approval first

## Step-by-Step Process

### Step 1: Submit Protected Customer Data Request ✅ DONE

You've already completed the questionnaire at:
**Partner Dashboard → Your App → API access requests → Protected customer data access**

Status: **Pending Shopify Review** (1-3 business days)

### Step 2: Wait for Approval ⏳ CURRENT STEP

**Check status daily:**
1. Go to Partner Dashboard
2. Navigate to your app
3. Click "API access requests"
4. Look for "Protected customer data access" status

**Possible statuses:**
- **Pending** → Keep waiting, check tomorrow
- **Approved** ✅ → Proceed to Step 3
- **Rejected** ❌ → Resubmit with more detailed answers

**What Shopify Reviews:**
- Your app's purpose and functionality
- Why you need access to customer data
- How you handle data retention/deletion
- Your privacy policy compliance
- Your data security measures

### Step 3: Reinstall App (After Approval)

Once approved, you MUST reinstall your app:

1. **Go to your test/development store**
   - Store Admin → Apps → Spector

2. **Uninstall the app**
   - Click "Delete" or "Uninstall"

3. **Reinstall the app**
   - Go to your app URL or Partner Dashboard
   - Click "Install" on your test store
   - Accept new permissions (protected data scopes)

**Why reinstall?**
- Shopify needs to grant your app the new protected data scopes
- Existing installations don't automatically get new scopes
- Reinstalling triggers the OAuth flow with updated permissions

### Step 4: Register GDPR Webhooks Manually

After reinstalling, go to Partner Dashboard:

**Location:** Your App → API access requests → Event subscriptions

**Add these 3 webhooks:**

#### 1. Customer Data Request
```
Topic: customers/data_request
URL: https://spector.fly.dev/webhooks/customers/data_request
API Version: 2024-10
Format: JSON
```

#### 2. Customer Redact
```
Topic: customers/redact
URL: https://spector.fly.dev/webhooks/customers/redact
API Version: 2024-10
Format: JSON
```

#### 3. Shop Redact
```
Topic: shop/redact
URL: https://spector.fly.dev/webhooks/shop/redact
API Version: 2024-10
Format: JSON
```

### Step 5: Verify HMAC Check Passes

After registering all 3 webhooks:

1. **Shopify automatically tests each webhook**
   - Sends test payload
   - Checks for 200 OK response
   - Verifies HMAC signature

2. **Check Partner Dashboard**
   - Go to App Store submission checklist
   - Look for "Verifies webhooks with HMAC signatures"
   - Should now show ✅ (green checkmark)

3. **If it still fails:**
   - Check app logs for webhook errors
   - Verify URLs are correct
   - Ensure production app is deployed
   - Wait 5-10 minutes for Shopify to retest

## What We've Already Fixed

✅ **HMAC Verification Code**
- All webhook handlers use `authenticate.webhook(request)`
- This automatically verifies X-Shopify-Hmac-SHA256 header
- Uses SHOPIFY_API_SECRET to validate signature

✅ **Fast Response Time**
- All webhooks return 200 OK immediately (< 1 second)
- Processing happens asynchronously after response
- Prevents Shopify timeout (5 second limit)

✅ **Webhook Handler Files**
- `webhooks.customers.data_request.tsx` → Handles data requests
- `webhooks.customers.redact.tsx` → Deletes customer data
- `webhooks.shop.redact.tsx` → Deletes all shop data

✅ **Compliance Features**
- Database operations for data deletion
- Audit logging (30-day retention)
- GDPR/CCPA compliant data handling

## Common Issues & Solutions

### Issue: "Event subscriptions" section not visible
**Solution:** Protected Customer Data access not approved yet. Wait for approval.

### Issue: Webhooks registered but check still fails
**Solution:** 
1. Verify all 3 webhooks are registered
2. Check webhook URLs are correct
3. Ensure app is deployed to production
4. Wait 10 minutes and refresh

### Issue: Webhook test shows 401 Unauthorized
**Solution:** Check SHOPIFY_API_SECRET in environment variables

### Issue: Webhook test shows timeout
**Solution:** Check your webhook handlers are deployed and accessible

### Issue: Protected Customer Data rejected
**Solution:** Resubmit with more detailed explanations:
- Explain exactly what data you store
- Detail your data retention policy
- Link to your privacy policy
- Describe your security measures

## Timeline Expectations

| Step | Duration | Status |
|------|----------|--------|
| Submit GDPR access request | 5 minutes | ✅ Done |
| Wait for Shopify approval | 1-3 business days | ⏳ Current |
| Reinstall app | 2 minutes | ⏳ Waiting |
| Register webhooks | 5 minutes | ⏳ Waiting |
| Shopify tests webhooks | Automatic | ⏳ Waiting |
| HMAC check passes | Immediate | ⏳ Waiting |

**Total time:** 1-3 business days (most of it waiting for approval)

## After HMAC Check Passes ✅

Once the check is green, you can:
1. ✅ Submit your app to Shopify App Store
2. ✅ Pass App Store review
3. ✅ Launch publicly

## Need Help?

If you encounter issues:
1. Check Shopify Partner Dashboard notifications
2. Review webhook logs in your app
3. Contact Shopify Partner Support
4. Reference: https://shopify.dev/docs/apps/build/webhooks

## Summary

**Why it's failing now:** GDPR webhooks not registered (requires approval first)

**What you're waiting for:** Shopify to approve Protected Customer Data access

**What to do when approved:**
1. Reinstall app in test store
2. Register 3 GDPR webhooks manually
3. Verify HMAC check turns green ✅

**Your code is ready!** Just waiting on Shopify's approval process.

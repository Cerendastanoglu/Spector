# Managed Pricing Implementation Checklist

Based on official Shopify documentation: https://shopify.dev/docs/apps/launch/billing/managed-pricing

## ✅ Code Changes (COMPLETED)

- [x] Remove Billing API charge creation code (createRecurringCharge)
- [x] Remove subscription cancellation code (cancelSubscription)  
- [x] Remove trial management code (initializeSubscription)
- [x] Keep subscription status checking (checkSubscriptionStatus via GraphQL)
- [x] Update UI components to direct to Shopify billing settings
- [x] Simplify billing API routes (keep GET only)
- [x] Register APP_SUBSCRIPTIONS_UPDATE webhook in shopify.app.toml
- [x] Create webhook handler for subscription updates

## 📋 Partner Dashboard Setup (TODO)

### 1. Opt in to Managed Pricing
**Priority: HIGH - Required before anything else works**

- [ ] Go to Partner Dashboard → Apps → All Apps
- [ ] Click your app "Spector"
- [ ] Click **Distribution**
- [ ] Beside "Shopify App Store listing", click **Manage listing**
- [ ] Under "Published languages", click **Edit** for your locale
- [ ] Under "Pricing content", click **Manage**
- [ ] Click **Settings**
- [ ] Select **"Managed pricing"**
- [ ] In confirmation dialog, click **Switch**

⚠️ **Important**: If you have existing Billing API plans, you must remove them first before switching.

### 2. Create Public Plan (Required)
**Priority: HIGH - Your app needs at least one plan**

#### Step 2a: Add the Plan Billing Details
- [ ] From Pricing index page, under **Public plans**, click **Add**
- [ ] Under **Billing**, select: **Monthly**
- [ ] Under **Monthly charge**, enter: **$9.99**
- [ ] Under **Free trial duration**, enter: **3** days
- [ ] (Optional) Under **Welcome link**, add: `/welcome` or leave empty
- [ ] Click **Save**

#### Step 2b: Add Plan Description for Each Language
- [ ] From Partner Dashboard → Apps → "Spector" → Distribution
- [ ] Click **Manage listing**
- [ ] Under **Published languages**, click **Edit** for English (or your locale)
- [ ] Under **Pricing content**, find your recently added plan
- [ ] Under **Display name**, enter: **Spector Basic**
- [ ] Under **Top features**, add:
  ```
  - Unlimited product management & bulk operations
  - Advanced inventory forecasting
  - Real-time analytics dashboard
  - Low stock notifications
  - Revenue tracking
  - Email support
  ```
- [ ] Click **Save**
- [ ] Repeat for each translated app listing (if you have multiple locales)

### 3. Test the Plan Selection Page (Required)
**Priority: HIGH - Verify everything works**

- [ ] Find your plan selection URL: `https://admin.shopify.com/store/[store-handle]/charges/spector/pricing_plans`
- [ ] Replace `[store-handle]` with your dev store handle
- [ ] Visit the URL while logged into your dev store
- [ ] Verify your "Spector Basic" plan appears with correct pricing
- [ ] Verify plan description and features are displayed correctly

### 4. Test Subscription Flow (Required)
**Priority: HIGH - End-to-end testing**

- [ ] **Reinstall** your app on dev store (uninstall first if already installed)
- [ ] During install, Shopify should prompt for plan selection
- [ ] Select "Spector Basic" plan
- [ ] Approve the charge (free on dev stores)
- [ ] Verify redirect back to your app
- [ ] Check that your app detects active subscription:
  ```
  hasActiveSubscription: true
  subscription.status: 'ACTIVE'
  ```
- [ ] Verify all app features are accessible
- [ ] Test "Go to Billing Settings" button works
- [ ] Confirm subscription shows in dev store: Admin → Settings → Billing

### 5. Configure Welcome Link (Optional but Recommended)
**Priority: MEDIUM - Better onboarding experience**

- [ ] From Partner Dashboard, edit your plan
- [ ] Under **Welcome link**, add: `/welcome` (relative path to your app)
- [ ] Create a welcome page in your app at `/app/welcome`
- [ ] Query subscription status after approval
- [ ] Display onboarding message or tutorial
- [ ] Note: `charge_id` parameter is automatically appended to URL

### 6. Webhook Verification (Already Done in Code)
**Priority: HIGH - Keep subscription status in sync**

- [x] APP_SUBSCRIPTIONS_UPDATE webhook registered in `shopify.app.toml`
- [x] Webhook handler created at `webhooks.app.subscription_update.tsx`
- [ ] Test webhook delivery after plan approval
- [ ] Verify subscription status updates in database
- [ ] Check webhook logs in Partner Dashboard

## 🎯 Additional Features (Optional)

### 7. Private Plans (Optional)
**Priority: LOW - Only needed for custom clients**

If you need custom pricing for specific clients:

- [ ] From Pricing index page, under **Private plans**, click **Add**
- [ ] Configure billing details (monthly/yearly, price, trial)
- [ ] Under **Display name**, enter plan name
- [ ] Under **Description**, describe plan features
- [ ] Under **Stores with plan access**, add up to 20 store domains
- [ ] Click **Save**

**Limits**: Up to 10 private plans, 20 stores per plan

### 8. Discounts (Optional)
**Priority: LOW - For promotions or customer retention**

To offer a discount to a merchant:

- [ ] From Partner Dashboard, search for merchant store name
- [ ] Click store name in search results
- [ ] Beside **Discount**, click **Create**
- [ ] Search for your app "Spector" and select it
- [ ] Select discount type, value, and duration:
  - Percentage (e.g., 20% off)
  - Fixed amount (e.g., $2 off)
  - Duration: 1-12 months or forever
- [ ] Click **Create** then **Apply** to confirm
- [ ] Shopify emails merchant automatically

**Note**: Requires "Manage credits and refunds" permission

### 9. Trial Extensions (Optional)
**Priority: LOW - For customer support**

To extend a merchant's trial period:

- [ ] From Partner Dashboard, search for merchant store name
- [ ] Click store name in search results
- [ ] Beside **Trial extension**, click **Create**
- [ ] Search for your app "Spector" and select it
- [ ] Under **Extra trial days**, enter number of days
- [ ] Click **Create** then **Apply** to confirm
- [ ] Shopify emails merchant automatically

### 10. Multiple Plans (Optional)
**Priority: LOW - Only if you need tiered pricing**

You can create up to 4 public plans:

- [ ] Create additional plans (e.g., "Spector Pro", "Spector Enterprise")
- [ ] Configure different pricing for each tier
- [ ] Add descriptions for each plan
- [ ] Update app logic to check plan name and enable/disable features accordingly

## 🧪 Testing Checklist

### Development Store Testing
- [ ] Test subscription flows on dev store (free/test charges)
- [ ] Verify plan selection page displays correctly
- [ ] Test plan approval and redirect flow
- [ ] Check subscription status detection in app
- [ ] Test feature access control based on subscription
- [ ] Verify "Go to Billing Settings" button works
- [ ] Test webhook delivery and status updates

### Production Store Testing (Before Launch)
- [ ] Test on a real Shopify store (non-dev)
- [ ] Verify actual payment processing works
- [ ] Test trial period countdown (if applicable)
- [ ] Test plan switching/upgrading
- [ ] Verify billing cycles and charges
- [ ] Test subscription cancellation flow
- [ ] Verify refund/proration logic

## 📊 Important Notes from Documentation

### Trial Proration
- Shopify tracks trial days over **180-day period**
- Prevents merchants from exploiting trials by reinstalling
- Previously consumed trial days are subtracted from new totals

### Plan Downgrading
- Downgrading to free plan is **deferred** (effective at end of paid cycle)
- Upgrade happens immediately

### Test Charges
- Dev stores get **free test subscriptions** automatically
- Your Partner account is NOT charged for dev store subscriptions
- Test subscriptions DON'T convert to paid when transferring stores
- After transfer, merchant needs to create new plan

### Limitations
- ❌ Only supports **fixed, recurring** pricing (no usage-based)
- ❌ Can't create charges via Billing API after opting in
- ❌ Old Billing API charges continue to work but can't create new ones
- ⚠️ Plan selection page may return 404 if dev store and app listing use different locales

### Webhook Delays
- APP_SUBSCRIPTIONS_UPDATE webhooks can take **several minutes** to deliver
- App must handle delays gracefully
- Don't rely on instant webhook delivery for critical flows
- Query subscription status via GraphQL for real-time checks

## 🚀 Launch Readiness

Before submitting to Shopify App Store:

- [ ] Managed pricing configured in Partner Dashboard
- [ ] At least one public plan created with description
- [ ] Plan selection page tested and working
- [ ] Subscription flow tested end-to-end on dev store
- [ ] Webhook handler tested and working
- [ ] App correctly detects subscription status
- [ ] Access control works (blocks features without subscription)
- [ ] Billing settings redirect works
- [ ] Test charge documentation reviewed
- [ ] Production testing completed (if possible)

## 📚 Reference Links

- [Managed Pricing Docs](https://shopify.dev/docs/apps/launch/billing/managed-pricing)
- [Test Billing Guide](https://shopify.dev/docs/apps/launch/billing/offer-free-trials#set-up-free-testing)
- [Webhook Best Practices](https://shopify.dev/docs/apps/build/webhooks/best-practices)
- [App Store Review Checklist](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review)

---

## Next Immediate Steps (Priority Order)

1. **Switch to Managed Pricing in Partner Dashboard** (Required)
2. **Create public plan with $9.99/month pricing** (Required)
3. **Add plan description "Spector Basic"** (Required)
4. **Test on dev store by reinstalling app** (Required)
5. **Verify subscription detection in app** (Required)

Once these 5 steps are complete, your app will be fully functional with Managed Pricing! 🎉

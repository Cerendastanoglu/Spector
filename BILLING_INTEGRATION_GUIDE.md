# Billing System Integration Guide

## ✅ What's Been Built

A complete, production-ready billing system for Spector app with:

1. **Database Schema** (`prisma/schema.prisma`)
   - `Subscription` model with trial management, billing dates, and status tracking
   
2. **Configuration** (`app/config/billing.config.ts`)
   - Single "Basic Plan" at $10.99/month
   - 3-day free trial for all new installations
   - Helper functions for trial calculations and price formatting

3. **Billing Service** (`app/services/billing.server.ts`)
   - Initialize subscription with trial
   - Create recurring charges via Shopify Billing API
   - Check subscription access
   - Sync subscription status with Shopify
   - Cancel subscriptions

4. **API Routes** (`app/routes/app.api.billing.tsx`)
   - GET: Fetch subscription status and trial info
   - POST: Create subscription charge
   - DELETE: Cancel subscription

5. **Middleware** (`app/utils/billing.middleware.ts`)
   - `requireActivePlan()` - Protect routes requiring subscription
   - `withBillingProtection()` - Wrapper for API routes

6. **UI Components**
   - `app/components/SubscriptionBanner.tsx` - Trial countdown banner
   - `app/components/SubscriptionModal.tsx` - Subscription required modal

7. **Webhook Handler** (`app/routes/webhooks.app.subscription_update.tsx`)
   - Handles `APP_SUBSCRIPTIONS_UPDATE` webhook
   - Updates subscription status automatically

8. **Webhook Registration** (`shopify.app.toml`)
   - Registered `app_subscriptions/update` webhook

---

## 🚀 How to Integrate

### Step 1: Add Billing to Main App Route

Update `app/routes/app._index.tsx`:

```tsx
import { SubscriptionBanner } from "../components/SubscriptionBanner";
import { SubscriptionModal } from "../components/SubscriptionModal";
import { useFetcher } from "@remix-run/react";

// In your loader function, add:
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  // Initialize subscription for new shops
  const { subscription } = await initializeSubscription(shop);
  
  // Check subscription access
  const { hasAccess } = await checkSubscriptionAccess(shop);
  
  // Fetch shop info...
  const response = await admin.graphql(/* ... */);
  const data = await response.json();
  
  return {
    shop: data.data?.shop || null,
    subscription: {
      status: subscription.status,
      hasAccess,
      isTrialing: subscription.status === 'trialing',
      daysRemainingInTrial: getDaysRemainingInTrial(subscription.trialEndsAt),
      hoursRemainingInTrial: getHoursRemainingInTrial(subscription.trialEndsAt),
      formattedPrice: formatPrice(),
      planName: BILLING_CONFIG.PLAN_NAME,
    },
  };
};

// In your component:
export default function Index() {
  const { shop, subscription } = useLoaderData<typeof loader>();
  const billingFetcher = useFetcher();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleSubscribe = async () => {
    // Call billing API to create charge
    const response = await fetch('/app/api/billing', {
      method: 'POST',
    });
    const data = await response.json();
    
    if (data.confirmationUrl) {
      // Redirect to Shopify billing confirmation
      window.top.location.href = data.confirmationUrl;
    }
  };

  // Show modal if no access
  useEffect(() => {
    if (!subscription.hasAccess && isAppReady) {
      setShowSubscriptionModal(true);
    }
  }, [subscription.hasAccess, isAppReady]);

  return (
    <Page>
      <AppHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        outOfStockCount={outOfStockCount}
        shop={shop}
      />
      
      {/* Show subscription banner */}
      <SubscriptionBanner
        subscription={subscription}
        onSubscribe={handleSubscribe}
        loading={billingFetcher.state === 'submitting'}
      />
      
      {/* Show modal if access blocked */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribe={handleSubscribe}
        loading={billingFetcher.state === 'submitting'}
        price={subscription.formattedPrice}
        reason={!subscription.hasAccess ? 'trial_expired' : undefined}
      />
      
      {/* Rest of your app... */}
      <Layout>
        {renderActiveTabContent()}
      </Layout>
    </Page>
  );
}
```

---

### Step 2: Protect API Routes

Add billing checks to protected API routes:

#### Example: `app/routes/app.api.products.tsx`

```tsx
import { requireActivePlan } from "~/utils/billing.middleware";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  
  // Check billing FIRST
  const billingCheck = await requireActivePlan(session.shop, { returnJson: true });
  if (!billingCheck.hasAccess) {
    return billingCheck.response; // Returns 402 error
  }
  
  // Continue with your logic...
  const products = await fetchProducts(admin);
  return json({ products });
}
```

---

### Step 3: Handle Billing Success Callback

When merchant approves the charge, they're redirected back to your app.
Add this to your main app route:

```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const billingSuccess = url.searchParams.get('billing') === 'success';
  
  if (billingSuccess) {
    // Sync subscription status from Shopify
    const { session, admin } = await authenticate.admin(request);
    await syncSubscriptionStatus(admin.graphql, session.shop);
    
    // Redirect to clean URL
    return redirect('/app');
  }
  
  // Rest of loader...
};
```

---

### Step 4: Add Billing to Settings Page

Update the Settings tab in `app._index.tsx`:

```tsx
case "settings":
  return (
    <BlockStack gap="500">
      {/* Subscription Status Card */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Subscription & Plan
          </Text>
          
          {subscription.status === 'active' && (
            <Badge tone="success">Active</Badge>
          )}
          {subscription.isTrialing && (
            <Badge tone="info">
              Trial: {subscription.daysRemainingInTrial} days left
            </Badge>
          )}
          
          <Text as="p" variant="bodyMd">
            Plan: {subscription.planName} - {subscription.formattedPrice}/month
          </Text>
          
          {subscription.status !== 'active' && (
            <Button onClick={handleSubscribe}>
              Subscribe Now
            </Button>
          )}
          
          {subscription.status === 'active' && (
            <Button
              variant="plain"
              tone="critical"
              onClick={handleCancelSubscription}
            >
              Cancel Subscription
            </Button>
          )}
        </BlockStack>
      </Card>
      
      {/* Rest of settings... */}
    </BlockStack>
  );
```

---

## 🔒 How It Works

### New Shop Installation Flow

1. **Shop installs app** → OAuth flow completes
2. **First page load** → `initializeSubscription()` creates DB record with 3-day trial
3. **User sees banner** → "Free trial: 3 days remaining"
4. **Trial ends** → Access blocked, modal shows: "Subscribe for $10.99/month"
5. **User clicks Subscribe** → Creates Shopify charge → Redirects to approval
6. **Merchant approves** → Redirected back → Webhook updates status to 'active'
7. **Full access granted** → No more banners/modals

### Subscription Status Flow

```
[Install] → trialing (3 days) → expired → Subscribe → active
                                        ↓
                                   Subscribe
                                        ↓
                                     active → Cancel → cancelled
```

### Access Control

- **Trial (3 days)**: Full access ✅
- **Trial expired**: Blocked ❌ → Must subscribe
- **Active subscription**: Full access ✅
- **Cancelled**: Blocked ❌ → Must resubscribe
- **Frozen** (payment failed): Blocked ❌ → Fix payment

---

## 🧪 Testing

### Test Mode

The billing system automatically uses **test mode** in development:
- Test charges don't cost real money
- Approvals are instant
- Can test full flow safely

### Test Flow

1. Install app on development store
2. See trial banner
3. Click "Subscribe"
4. Approve test charge
5. Verify status changes to 'active'
6. Try cancelling
7. Verify access is blocked

### Database Commands

```bash
# Check subscription status
npx prisma studio

# Reset subscription (for testing)
npx prisma db seed  # If you create a seed file
```

---

## 📊 Monitoring

### Check Subscription Status

```typescript
// In any server-side code
import { checkSubscriptionAccess } from "~/services/billing.server";

const { hasAccess, subscription, reason } = await checkSubscriptionAccess(shop);
console.log('Access:', hasAccess, 'Status:', subscription.status);
```

### Sync Status from Shopify

```typescript
import { syncSubscriptionStatus } from "~/services/billing.server";

// Call this periodically or after billing events
await syncSubscriptionStatus(admin.graphql, shop);
```

---

## 🚨 Important Notes

1. **Trial is ONE-TIME**: Each shop gets 3 days once. Tracked by `isTrialUsed` field.

2. **Webhook is CRITICAL**: The `APP_SUBSCRIPTIONS_UPDATE` webhook keeps your DB in sync with Shopify. Make sure it's registered (already done in `shopify.app.toml`).

3. **Test Mode**: Charges are in test mode (no real money) until you publish to production.

4. **Billing Scopes**: No special scopes needed! Billing API is available to all Shopify apps.

5. **Cancellation**: Users can cancel via your Settings page OR Shopify admin. Webhook handles both.

---

## 🎯 Next Steps

1. ✅ Run migration: `npx prisma migrate dev` (DONE)
2. ✅ Generate Prisma client: `npx prisma generate` (DONE)
3. **Add billing integration to `app._index.tsx`** (use code above)
4. **Add billing checks to protected API routes** (`products`, `product-analytics`, etc.)
5. **Test the full flow** on a development store
6. **Deploy to production**
7. **Monitor subscriptions** via Prisma Studio or Shopify Partner Dashboard

---

## 💰 Revenue Tracking

Once live, track revenue via:

1. **Shopify Partner Dashboard** → App → Billing
2. **Prisma Studio** → Subscription table
3. **Custom analytics**: Query subscription data for MRR, churn, etc.

```typescript
// Example: Get active subscribers count
const activeCount = await prisma.subscription.count({
  where: { status: 'active' }
});

// Monthly Recurring Revenue (MRR)
const subscriptions = await prisma.subscription.findMany({
  where: { status: 'active' },
  select: { price: true }
});
const mrr = subscriptions.reduce((sum, sub) => sum + sub.price, 0);
```

---

## 📞 Support

If billing issues occur:
- Check Prisma Studio for subscription status
- Check Shopify Partner Dashboard for charge status
- Check webhook logs in your app
- Sync status manually: `syncSubscriptionStatus()`

---

**Billing system is ready to go! Just integrate into the main app and start testing.** 🚀

# Partner Dashboard Setup Guide - Managed Pricing

## Step-by-Step Configuration

### 1. Access Partner Dashboard
1. Go to https://partners.shopify.com/
2. Log in with your partner account
3. Click on your app "Spector"

### 2. Navigate to Pricing Settings
1. In the left sidebar, click **"App Setup"**
2. Find and click **"Pricing"** section
3. You should see two options:
   - **Use the Billing API** (current - causing the error)
   - **Use Managed Pricing** (switch to this)

### 3. Switch to Managed Pricing
1. Select **"Use Managed Pricing"**
2. Click **"Save"** or **"Continue"**
3. Confirm the change when prompted

### 4. Configure Your Pricing Plan
Now you can create pricing plans in the dashboard:

#### Plan Configuration:
- **Plan Name**: `Spector Basic`
- **Pricing Type**: `Recurring`
- **Billing Frequency**: `Every 30 days` (monthly)
- **Price**: `$9.99 USD`
- **Trial Period** (optional): `3 days`
- **Plan Description**: 
  ```
  Get full access to Spector's powerful features:
  - Unlimited product management
  - Advanced inventory forecasting
  - Real-time analytics dashboard
  - Email support
  ```

#### Features to List:
- ✓ Unlimited product management & bulk operations
- ✓ Advanced inventory forecasting
- ✓ Real-time analytics dashboard
- ✓ Low stock notifications
- ✓ Revenue tracking
- ✓ Email support

### 5. Save and Publish
1. Review all settings
2. Click **"Save"** or **"Create Plan"**
3. If needed, publish the pricing plan

### 6. Test on Development Store
Once configured:

1. **Reinstall the app** on your dev store (or install for first time)
2. Shopify will prompt you to select a pricing plan
3. Approve the test subscription
4. Your app should now detect the active subscription!

## Verification Checklist

After setup, verify these things work:

- [ ] App installation prompts for subscription selection
- [ ] Plan shows correct price ($9.99/month)
- [ ] Trial period works (3 days if configured)
- [ ] App detects active subscription after approval
- [ ] All features are accessible with active subscription
- [ ] "Go to Billing Settings" button works
- [ ] Shopify billing page shows your subscription
- [ ] Access control blocks features without subscription (if implemented)

## Important Notes

### For Development Stores:
- Test charges are FREE (won't actually charge)
- You can test the full flow without payment
- Subscription appears active after approval

### For Production:
- Real charges apply once published
- Merchants will see these prices
- Make sure pricing is competitive

### If You Need to Change Pricing:
- Update in Partner Dashboard
- Changes apply to NEW subscriptions
- Existing subscriptions may be grandfathered

## Troubleshooting

### "Managed Pricing Apps cannot use the Billing API" Error
✅ **Already Fixed!** We removed all Billing API code. Once you switch to Managed Pricing in Partner Dashboard, this error will disappear.

### App Not Detecting Subscription
- Make sure you reinstalled the app AFTER configuring Managed Pricing
- Check that subscription was approved in dev store
- Verify GraphQL query is working in app logs

### Subscription Not Showing in Dev Store
- Check Partner Dashboard pricing is saved
- Ensure app is using Managed Pricing (not Billing API)
- Try uninstalling and reinstalling the app

## Support Resources

- [Shopify Managed Pricing Docs](https://shopify.dev/docs/apps/launch/billing-pricing/managed-pricing)
- [Partner Dashboard Guide](https://help.shopify.com/en/partners)
- [Testing Billing](https://shopify.dev/docs/apps/launch/billing-pricing/test-billing)

---

**Next Step**: After configuring in Partner Dashboard, reinstall your app on the dev store and test the complete subscription flow!

/**
 * Billing Configuration for Spector App
 * 
 * Single plan: Basic at $9.99/month
 * Free plan with limited features for all users until they subscribe
 */

export const BILLING_CONFIG = {
  // Plan Details
  PLAN_NAME: 'Basic Plan',
  PLAN_ID: 'basic',
  MONTHLY_PRICE: 9.99,
  CURRENCY: 'USD',
  
  // Free Plan Limits (applied when no active subscription)
  TRIAL_DAYS: 0, // No time-based trial - using feature limits instead
  TRIAL_HOURS: 0,
  FREE_PLAN_PRODUCT_LIMIT: 10, // Max products that can be edited on free plan
  TRIAL_PRODUCT_LIMIT: 10, // Alias for backwards compatibility
  
  // Billing Interval
  BILLING_INTERVAL: 'EVERY_30_DAYS' as const,
  
  // Feature Limits (for future use)
  FEATURES: {
    MAX_PRODUCTS: -1, // Unlimited
    BULK_OPERATIONS: true,
    INVENTORY_FORECASTING: true,
    ANALYTICS_DASHBOARD: true,
    PRIORITY_SUPPORT: false, // Future feature
  },
  
  // App Charge Configuration for Shopify
  CHARGE_CONFIG: {
    name: 'Spector Basic Plan',
    price: 9.99,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 0, // No time-based trial
    test: process.env.NODE_ENV !== 'production', // Test mode in dev
  },
} as const;

// Subscription Status Types
export type SubscriptionStatus = 
  | 'free'        // Free plan (limited features)
  | 'active'      // Paid and active
  | 'cancelled'   // User cancelled
  | 'expired'     // Subscription expired
  | 'frozen';     // Frozen by Shopify (payment failed)

// Helper function to check if subscription allows full access (no limits)
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'active';
}

// Helper function to check if user is on free plan (has limits)
export function isFreePlan(status: SubscriptionStatus): boolean {
  return status === 'free' || status === 'cancelled' || status === 'expired';
}

// Format price for display
export function formatPrice(price: number = BILLING_CONFIG.MONTHLY_PRICE, currency: string = BILLING_CONFIG.CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

// Get free plan limits
export function getFreePlanLimits() {
  return {
    productEditLimit: BILLING_CONFIG.FREE_PLAN_PRODUCT_LIMIT,
    forecastLimit: 1,
    automationRulesPerType: 1,
  };
}

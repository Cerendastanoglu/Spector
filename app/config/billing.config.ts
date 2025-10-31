/**
 * Billing Configuration for Spector App
 * 
 * Single plan: Basic at $10.99/month
 * 3-day free trial for all new installations
 */

export const BILLING_CONFIG = {
  // Plan Details
  PLAN_NAME: 'Basic Plan',
  PLAN_ID: 'basic',
  MONTHLY_PRICE: 9.99,
  CURRENCY: 'USD',
  
  // Trial Configuration
  TRIAL_DAYS: 3,
  TRIAL_HOURS: 3 * 24, // 72 hours
  
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
    trialDays: 3,
    test: process.env.NODE_ENV !== 'production', // Test mode in dev
  },
} as const;

// Subscription Status Types
export type SubscriptionStatus = 
  | 'trialing'    // In 3-day free trial
  | 'active'      // Paid and active
  | 'cancelled'   // User cancelled
  | 'expired'     // Trial or subscription expired
  | 'frozen';     // Frozen by Shopify (payment failed)

// Helper function to check if subscription allows access
export function hasActiveSubscription(status: SubscriptionStatus, trialEndsAt: Date): boolean {
  const now = new Date();
  
  if (status === 'active') {
    return true;
  }
  
  if (status === 'trialing' && now < trialEndsAt) {
    return true;
  }
  
  return false;
}

// Helper to calculate trial end date
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + BILLING_CONFIG.TRIAL_DAYS);
  return endDate;
}

// Helper to get days remaining in trial
export function getDaysRemainingInTrial(trialEndsAt: Date): number {
  const now = new Date();
  const diffTime = trialEndsAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Helper to get hours remaining in trial
export function getHoursRemainingInTrial(trialEndsAt: Date): number {
  const now = new Date();
  const diffTime = trialEndsAt.getTime() - now.getTime();
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return Math.max(0, diffHours);
}

// Format price for display
export function formatPrice(price: number = BILLING_CONFIG.MONTHLY_PRICE, currency: string = BILLING_CONFIG.CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

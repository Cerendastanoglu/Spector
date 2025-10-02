// app/services/billing.server.ts
import { authenticate } from "../shopify.server";

export interface BillingPlan {
  name: string;
  price: number;
  currency: string;
  interval: 'EVERY_30_DAYS' | 'ANNUAL';
  trialDays: number;
  features: string[];
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  pro: {
    name: 'Spector Pro',
    price: 14.99,
    currency: 'USD', 
    interval: 'EVERY_30_DAYS',
    trialDays: 3,
    features: [
      'Complete product analytics dashboard',
      'Real-time inventory monitoring',
      'Bulk product operations',
      'Performance insights',
      'Export reports',
      'Priority support'
    ]
  }
};

export async function createSubscription(
  request: Request,
  planId: keyof typeof BILLING_PLANS
) {
  const { admin } = await authenticate.admin(request);
  const plan = BILLING_PLANS[planId];
  
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const mutation = `
    mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $trialDays: Int, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, trialDays: $trialDays, lineItems: $lineItems) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          name
          status
          currentPeriodEnd
          trialDays
          test
        }
      }
    }
  `;

  const variables = {
    name: plan.name,
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback`,
    test: process.env.NODE_ENV !== 'production',
    trialDays: plan.trialDays,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: plan.price, currencyCode: plan.currency },
            interval: plan.interval
          }
        }
      }
    ]
  };

  try {
    const response = await admin.graphql(mutation, { variables });
    const data = await response.json();
    
    if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
      throw new Error(data.data.appSubscriptionCreate.userErrors[0].message);
    }
    
    return data.data?.appSubscriptionCreate;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

export async function checkIfDevelopmentStore(request: Request) {
  const { admin } = await authenticate.admin(request);
  
  const query = `
    query {
      shop {
        plan {
          partnerDevelopment
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    
    return data.data?.shop?.plan?.partnerDevelopment || false;
  } catch (error) {
    console.error('Error checking development store status:', error);
    return false;
  }
}

export async function getActiveSubscription(request: Request) {
  const { admin } = await authenticate.admin(request);
  
  const query = `
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          trialDays
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    
    return data.data?.currentAppInstallation?.activeSubscriptions || [];
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return [];
  }
}

export async function cancelSubscription(request: Request, subscriptionId: string) {
  const { admin } = await authenticate.admin(request);
  
  const mutation = `
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        userErrors {
          field
          message
        }
        appSubscription {
          id
          status
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(mutation, {
      variables: { id: subscriptionId }
    });
    const data = await response.json();
    
    if (data.data?.appSubscriptionCancel?.userErrors?.length > 0) {
      throw new Error(data.data.appSubscriptionCancel.userErrors[0].message);
    }
    
    return data.data?.appSubscriptionCancel;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

export async function extendTrialPeriod(
  request: Request, 
  subscriptionId: string, 
  additionalDays: number
) {
  const { admin } = await authenticate.admin(request);
  
  const mutation = `
    mutation AppSubscriptionTrialExtend($days: Int!, $id: ID!) {
      appSubscriptionTrialExtend(days: $days, id: $id) {
        userErrors {
          field
          message
        }
        appSubscription {
          id
          status
          trialDays
          currentPeriodEnd
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(mutation, {
      variables: { 
        id: subscriptionId,
        days: additionalDays
      }
    });
    const data = await response.json();
    
    if (data.data?.appSubscriptionTrialExtend?.userErrors?.length > 0) {
      throw new Error(data.data.appSubscriptionTrialExtend.userErrors[0].message);
    }
    
    return data.data?.appSubscriptionTrialExtend;
  } catch (error) {
    console.error('Error extending trial:', error);
    throw error;
  }
}

export function getSubscriptionStatus(subscriptions: any[], isDevelopmentStore = false) {
  // Development stores get free access
  if (isDevelopmentStore) {
    return 'development_free';
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    return 'none';
  }
  
  const activeSubscription = subscriptions.find(sub => 
    sub.status === 'ACTIVE' || sub.status === 'PENDING'
  );
  
  if (!activeSubscription) {
    return 'expired';
  }
  
  // Check if in trial period
  if (activeSubscription.trialDays > 0) {
    const currentPeriodEnd = new Date(activeSubscription.currentPeriodEnd);
    const now = new Date();
    
    if (currentPeriodEnd > now) {
      return 'trial';
    }
  }
  
  return activeSubscription.status.toLowerCase();
}
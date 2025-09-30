import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Subscription Management API
 * 
 * SHOPIFY REQUIREMENT: Apps must allow merchants to upgrade and downgrade their pricing plan 
 * without having to contact support or reinstall the app.
 * 
 * Since we currently have 1 plan, this handles:
 * 1. Plan activation
 * 2. Plan cancellation (with in-app button)
 * 3. Plan status checking
 */

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  planName?: string;
  status?: string;
  createdAt?: string;
  trialDays?: number;
  price?: number;
  billingCycle?: string;
  cancelUrl?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    console.log(`📋 Checking subscription status for shop: ${session.shop}`);
    
    // Get current app subscriptions
    const subscriptionsResponse = await admin.graphql(`
      query getCurrentSubscriptions {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            name
            status
            createdAt
            trialDays
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `);
    
    const subscriptionsData: any = await subscriptionsResponse.json();
    
    if (subscriptionsData.errors) {
      console.error("Subscription check errors:", subscriptionsData.errors);
      return json({ 
        success: false, 
        error: "Failed to check subscription status" 
      }, { status: 500 });
    }
    
    const activeSubscriptions = subscriptionsData.data?.currentAppInstallation?.activeSubscriptions || [];
    
    const subscriptionStatus: SubscriptionStatus = {
      hasActiveSubscription: activeSubscriptions.length > 0
    };
    
    if (activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0]; // We only have 1 plan
      const lineItem = subscription.lineItems?.[0];
      const pricing = lineItem?.plan?.pricingDetails;
      
      subscriptionStatus.planName = subscription.name;
      subscriptionStatus.status = subscription.status;
      subscriptionStatus.createdAt = subscription.createdAt;
      subscriptionStatus.trialDays = subscription.trialDays;
      
      if (pricing) {
        subscriptionStatus.price = parseFloat(pricing.price?.amount || "0");
        subscriptionStatus.billingCycle = pricing.interval;
      }
      
      // Generate cancellation URL
      subscriptionStatus.cancelUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/charges`;
    }
    
    console.log(`✅ Subscription status retrieved for ${session.shop}:`, {
      hasActive: subscriptionStatus.hasActiveSubscription,
      plan: subscriptionStatus.planName,
      status: subscriptionStatus.status
    });
    
    return json({
      success: true,
      subscription: subscriptionStatus,
      shop: session.shop
    });
    
  } catch (error) {
    console.error("Subscription check error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    const formData = await request.formData();
    const action = formData.get("action") as string;
    
    switch (action) {
      case "create-subscription": {
        console.log(`💳 Creating subscription for shop: ${session.shop}`);
        
        // Create app subscription
        const subscriptionResponse = await admin.graphql(`
          mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $trialDays: Int, $returnUrl: URL!) {
            appSubscriptionCreate(name: $name, lineItems: $lineItems, trialDays: $trialDays, returnUrl: $returnUrl) {
              userErrors {
                field
                message
              }
              confirmationUrl
              appSubscription {
                id
                status
              }
            }
          }
        `, {
          variables: {
            name: "Spector Pro Plan",
            lineItems: [
              {
                plan: {
                  appRecurringPricingDetails: {
                    price: { amount: 29.99, currencyCode: "USD" },
                    interval: "EVERY_30_DAYS"
                  }
                }
              }
            ],
            trialDays: 7,
            returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`
          }
        });
        
        const subscriptionData: any = await subscriptionResponse.json();
        
        if (subscriptionData.errors || subscriptionData.data?.appSubscriptionCreate?.userErrors?.length > 0) {
          const errors = subscriptionData.errors || subscriptionData.data.appSubscriptionCreate.userErrors;
          console.error("Subscription creation errors:", errors);
          return json({ 
            success: false, 
            error: "Failed to create subscription",
            details: errors
          }, { status: 400 });
        }
        
        return json({
          success: true,
          confirmationUrl: subscriptionData.data.appSubscriptionCreate.confirmationUrl,
          subscriptionId: subscriptionData.data.appSubscriptionCreate.appSubscription.id
        });
      }
      
      case "cancel-subscription": {
        const subscriptionId = formData.get("subscriptionId") as string;
        
        if (!subscriptionId) {
          return json({
            success: false,
            error: "Subscription ID required for cancellation"
          }, { status: 400 });
        }
        
        console.log(`❌ Canceling subscription ${subscriptionId} for shop: ${session.shop}`);
        
        const cancelResponse = await admin.graphql(`
          mutation appSubscriptionCancel($id: ID!) {
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
        `, {
          variables: {
            id: subscriptionId
          }
        });
        
        const cancelData: any = await cancelResponse.json();
        
        if (cancelData.errors || cancelData.data?.appSubscriptionCancel?.userErrors?.length > 0) {
          const errors = cancelData.errors || cancelData.data.appSubscriptionCancel.userErrors;
          console.error("Subscription cancellation errors:", errors);
          return json({ 
            success: false, 
            error: "Failed to cancel subscription",
            details: errors
          }, { status: 400 });
        }
        
        console.log(`✅ Subscription cancelled successfully for shop: ${session.shop}`);
        
        return json({
          success: true,
          message: "Subscription cancelled successfully",
          status: cancelData.data.appSubscriptionCancel.appSubscription.status
        });
      }
      
      default: {
        return json({
          success: false,
          error: "Invalid action"
        }, { status: 400 });
      }
    }
    
  } catch (error) {
    console.error("Subscription action error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};
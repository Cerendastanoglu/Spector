/**
 * Billing Middleware (Managed Pricing)
 * 
 * Protects routes and ensures merchants have active subscription
 * Note: With Managed Pricing, this is optional since Shopify can enforce billing at install
 */

import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { checkAccess } from "~/services/billing.server";

/**
 * Middleware to require active subscription or trial
 * Use this in loader functions for protected routes
 * 
 * @example
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const { session } = await authenticate.admin(request);
 *   
 *   // Check billing first
 *   const billingCheck = await requireActivePlan(session.shop);
 *   if (!billingCheck.hasAccess) {
 *     return billingCheck.response; // Returns error or redirect
 *   }
 *   
 *   // Continue with your route logic...
 * }
 */
export async function requireActivePlan(
  graphql: any,
  shop: string,
  options: {
    returnJson?: boolean; // If true, returns JSON error instead of redirect
  } = {}
): Promise<{
  hasAccess: boolean;
  subscription: any;
  response?: Response;
}> {
  const { returnJson = false } = options;

  const { hasAccess, subscription, reason } = await checkAccess(graphql, shop);

  if (hasAccess) {
    return {
      hasAccess: true,
      subscription,
    };
  }

  // No access - return appropriate response
  const errorMessages: Record<string, string> = {
    NO_SUBSCRIPTION: 'No subscription found. Please subscribe to continue.',
    TRIAL_EXPIRED: 'Your free trial has expired. Please subscribe to continue using Spector.',
    CANCELLED: 'Your subscription has been cancelled. Please resubscribe to continue.',
    NO_ACTIVE_PLAN: 'No active subscription. Please subscribe to continue.',
  };

  const message = reason ? errorMessages[reason] : 'Subscription required to access this feature.';

  if (returnJson) {
    return {
      hasAccess: false,
      subscription,
      response: json(
        {
          success: false,
          error: message,
          reason,
          requiresSubscription: true,
        },
        { status: 402 } // 402 Payment Required
      ),
    };
  }

  // Redirect to billing page
  return {
    hasAccess: false,
    subscription,
    response: redirect(`/app?billing=required&reason=${reason}`),
  };
}

/**
 * Check if route should be protected by billing
 * Some routes (like settings, billing page itself) should not be protected
 */
export function shouldProtectRoute(pathname: string): boolean {
  const unprotectedRoutes = [
    '/app/api/billing',           // Billing API itself
    '/auth',                      // Auth routes
    '/webhooks',                  // Webhook handlers
  ];

  return !unprotectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Wrapper for API routes that need billing protection
 * Returns a function that checks billing before executing the route handler
 * 
 * Note: With Managed Pricing, this middleware is optional.
 * Shopify can enforce subscription at app install.
 */
export function withBillingProtection<T extends (...args: any[]) => any>(handler: T): T {
  return (async function protectedHandler(...args: any[]) {
    const [requestArgs] = args as [LoaderFunctionArgs | any];
    const request = requestArgs.request;
    
    // Extract shop and graphql from request (assumes you've already authenticated)
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    const graphql = (requestArgs as any).context?.admin?.graphql;

    if (!shop || !graphql) {
      return json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check billing
    const billingCheck = await requireActivePlan(graphql, shop, { returnJson: true });
    
    if (!billingCheck.hasAccess) {
      return billingCheck.response;
    }

    // Execute original handler
    return handler(...args);
  }) as unknown as T;
}

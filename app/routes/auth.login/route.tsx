/**
 * OAuth-Only Authentication Route
 * 
 * This route enforces OAuth authentication without allowing manual shop domain entry.
 * Per Shopify App Store requirements, apps must not request manual myshopify.com URL entry.
 * 
 * Installation flow:
 * 1. Merchant clicks "Add app" from App Store
 * 2. Shopify redirects to OAuth grant page
 * 3. After approval, merchant is redirected to the app
 * 
 * If accessed directly (not via OAuth), this route redirects to the main app
 * which will trigger the OAuth flow through the authenticate.admin() call.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "../../shopify.server";

/**
 * Loader handles OAuth flow automatically
 * No manual shop domain entry allowed per Shopify requirements
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Attempt OAuth login - this will redirect to OAuth if needed
  await login(request);
  
  // If login succeeds, redirect to app home
  return redirect("/app");
};

/**
 * No action handler needed - OAuth only, no form submission
 */

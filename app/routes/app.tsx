import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ShopifyAppPerformance, useAppBridgePerformance } from "../utils/appBridgePerformance";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Ensure proper OAuth authentication before any app access
  const { admin, session } = await authenticate.admin(request);
  
  // This ensures the shop is properly authenticated and session is valid
  if (!session || !admin) {
    throw new Error('Authentication required');
  }

  console.log(`✅ Authenticated request for shop: ${session.shop}`);

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop
  };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  
  // Initialize performance optimizations
  const { markPerformanceMilestone } = useAppBridgePerformance({
    enableMetrics: true,
    preloadResources: ['/app/products'],
    loadingStrategy: 'auto'
  });

  useEffect(() => {
    // Initialize Shopify app performance optimizations
    ShopifyAppPerformance.initialize();
    markPerformanceMilestone('app-initialized');
  }, [markPerformanceMilestone]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ThemeProvider>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/market-analysis">
            Market Analysis
          </Link>
        </NavMenu>
        <Outlet />
      </ThemeProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

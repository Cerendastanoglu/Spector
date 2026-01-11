import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Frame } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ShopifyAppPerformance, useAppBridgePerformance } from "../utils/appBridgePerformance";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return json({ 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    theme: 'light', // Hardcoded for now - UserPreferences removed
  });
};

export default function App() {
  const { apiKey, theme } = useLoaderData<typeof loader>();
  
  // Initialize performance optimizations
  const { markPerformanceMilestone } = useAppBridgePerformance({
    enableMetrics: true,
    preloadResources: ['/app/products', '/app/notifications'],
    loadingStrategy: 'auto'
  });

  useEffect(() => {
    // Initialize Shopify app performance optimizations
    ShopifyAppPerformance.initialize();
    markPerformanceMilestone('app-initialized');
  }, [markPerformanceMilestone]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ThemeProvider initialTheme={theme as 'light' | 'dark'}>
        <Frame>
          <NavMenu>
            <Link to="/app" rel="home">
              Home
            </Link>
            <Link to="/app/market-research">
              Market Research
            </Link>
          </NavMenu>
          <Outlet />
        </Frame>
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

import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
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
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Fetch user preferences from database (replaces localStorage for theme)
  let userPreferences = await prisma.userPreferences.findUnique({
    where: { shop },
    select: { theme: true },
  });

  // Create default preferences if not found
  if (!userPreferences) {
    userPreferences = await prisma.userPreferences.create({
      data: { shop, theme: 'light' },
      select: { theme: true },
    });
  }

  return json({ 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    theme: userPreferences.theme || 'light',
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get('action');

  if (actionType === 'setTheme') {
    const theme = formData.get('theme') as string;
    
    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      return json({ error: 'Invalid theme' }, { status: 400 });
    }

    // Update theme preference in database
    await prisma.userPreferences.upsert({
      where: { shop },
      update: { theme },
      create: { shop, theme },
    });

    return json({ success: true, theme });
  }

  return json({ error: 'Unknown action' }, { status: 400 });
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

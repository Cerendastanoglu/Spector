import { logger } from "~/utils/logger";
import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { AppHeader } from "../components/AppHeader";
import { WelcomeModal } from "../components/WelcomeModal";
import { Help } from "../components/Help";
import { Settings } from "../components/Settings";
import { ForecastingTab } from "../components/ForecastingTab";
import { OptimizedComponents, useComponentPreloader } from "../utils/lazyLoader";
import { checkAccess, checkSubscriptionStatus, getManagedPricingUrl } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  // Check subscription status from Shopify (Managed Pricing)
  const { hasAccess, subscription: shopifySubscription } = await checkAccess(admin.graphql, shop);
  
  // Get full subscription details for settings page
  const { hasActiveSubscription, subscription: fullSubscription, error } = await checkSubscriptionStatus(
    admin.graphql,
    shop
  );
  
  // Fetch shop information
  try {
    const response = await admin.graphql(
      `#graphql
        query getShop {
          shop {
            id
            name
            myshopifyDomain
            primaryDomain {
              host
            }
          }
        }`
    );
    
    const data = await response.json();
    
    // Load product analytics directly in loader
    let productAnalytics = null;
    try {
      logger.info("🔵 Main Loader: Fetching product analytics...");
      const analyticsModule = await import("./app.api.product-analytics");
      // Call the loader function from product-analytics route
      const analyticsResponse = await analyticsModule.loader({ request } as any);
      
      // Check if response is a redirect (session expired)
      if (analyticsResponse.status === 302 || analyticsResponse.status === 301) {
        logger.warn('🟡 Main Loader: Analytics request redirected (likely session expired), skipping...');
        productAnalytics = null;
      } else if (!analyticsResponse.ok) {
        logger.error(`🔴 Main Loader: Analytics request failed with status ${analyticsResponse.status}`);
        productAnalytics = null;
      } else {
        const analyticsJson = await analyticsResponse.json();
        productAnalytics = analyticsJson.success ? analyticsJson.data : null;
        logger.info("🔵 Main Loader: Product analytics loaded successfully");
      }
    } catch (err) {
      logger.error('🔴 Main Loader: Error loading product analytics:', err instanceof Error ? err.message : 'Unknown error');
      productAnalytics = null;
    }
    
    // Load products directly in loader
    let initialProducts = null;
    try {
      logger.info("🔵 Main Loader: Fetching products...");
      const productsModule = await import("./app.api.products");
      // Call the action function with get-all-products action
      const formData = new FormData();
      formData.append('action', 'get-all-products');
      const productsRequest = new Request(request.url, {
        method: 'POST',
        body: formData,
      });
      const productsResponse = await productsModule.action({ request: productsRequest } as any);
      
      // Check if response is a redirect (session expired)
      if (productsResponse.status === 302 || productsResponse.status === 301) {
        logger.warn('🟡 Main Loader: Products request redirected (likely session expired), skipping...');
        initialProducts = null;
      } else if (!productsResponse.ok) {
        logger.error(`🔴 Main Loader: Products request failed with status ${productsResponse.status}`);
        initialProducts = null;
      } else {
        const productsJson = await productsResponse.json();
        initialProducts = productsJson.products || null;
        logger.info("🔵 Main Loader: Products loaded successfully");
      }
    } catch (err) {
      logger.error('🔴 Main Loader: Error loading products:', err instanceof Error ? err.message : 'Unknown error');
      initialProducts = null;
    }
    
    // Load forecasting data directly in loader
    let forecastingData = null;
    try {
      logger.info("🔵 Main Loader: Fetching forecasting data...");
      const forecastingModule = await import("./app.api.inventory-forecasting");
      const forecastingResponse = await forecastingModule.loader({ request } as any);
      
      // Check if response is a redirect (session expired)
      if (forecastingResponse.status === 302 || forecastingResponse.status === 301) {
        logger.warn('🟡 Main Loader: Forecasting request redirected (likely session expired), skipping...');
        forecastingData = null;
      } else if (!forecastingResponse.ok) {
        logger.error(`🔴 Main Loader: Forecasting request failed with status ${forecastingResponse.status}`);
        forecastingData = null;
      } else {
        const forecastingJson = await forecastingResponse.json();
        forecastingData = (forecastingJson.success && 'data' in forecastingJson) ? forecastingJson.data : null;
        logger.info("🔵 Main Loader: Forecasting data loaded successfully");
      }
    } catch (err) {
      logger.error('🔴 Main Loader: Error loading forecasting data:', err instanceof Error ? err.message : 'Unknown error');
      forecastingData = null;
    }
    
    return {
      shop: data.data?.shop || null,
      hasSeenWelcomeModal: false, // Hardcoded since UserPreferences removed
      productAnalytics, // ← Pass analytics data directly
      initialProducts, // ← Pass products data directly
      forecastingData, // ← Pass forecasting data directly
      subscription: {
        status: shopifySubscription?.status || 'none',
        hasAccess,
        planName: shopifySubscription?.name || 'Spector Basic',
        price: shopifySubscription?.lineItems[0]?.plan?.pricingDetails?.price?.amount || '9.99',
        currency: shopifySubscription?.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode || 'USD',
      },
      // Settings data
      settingsData: {
        subscription: fullSubscription ? {
          id: fullSubscription.id,
          name: fullSubscription.name,
          status: fullSubscription.status,
          price: fullSubscription.lineItems[0]?.plan?.pricingDetails?.price?.amount,
          currency: fullSubscription.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode,
          currentPeriodEnd: fullSubscription.currentPeriodEnd,
          test: fullSubscription.test,
          trialDays: fullSubscription.trialDays,
        } : null,
        hasActiveSubscription,
        error,
        managedPricingUrl: getManagedPricingUrl(shop),
      },
    };
  } catch (error) {
    logger.error('Error fetching shop data:', error);
    return { 
      shop: null,
      hasSeenWelcomeModal: false,
      productAnalytics: null,
      initialProducts: null,
      forecastingData: null,
      subscription: {
        status: 'error',
        hasAccess: true, // Allow access on error
        planName: 'Spector Basic',
        price: '9.99',
        currency: 'USD',
      },
      settingsData: {
        subscription: null,
        hasActiveSubscription: false,
        error: 'Failed to load subscription data',
        managedPricingUrl: getManagedPricingUrl(shop),
      },
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get('action');
  
  // Handle welcome modal dismissal
  if (actionType === 'dismissWelcome') {
    const prisma = (await import("../db.server")).default;
    try {
      await prisma.userPreferences.upsert({
        where: { shop },
        update: { hasSeenWelcomeModal: true },
        create: { shop, hasSeenWelcomeModal: true },
      });
      return { success: true };
    } catch (error) {
      logger.error('Error saving welcome preference:', error);
      return { success: false, error: 'Failed to save preference' };
    }
  }
  
  // Original product creation action
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  
  return {
    product: responseJson.data?.productCreate?.product,
  };
};

export default function Index() {
  const { shop, hasSeenWelcomeModal, subscription, settingsData, productAnalytics, initialProducts, forecastingData } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [outOfStockCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { preloadComponent } = useComponentPreloader();
  const welcomeFetcher = useFetcher();

  // Fix hydration issues by marking when client has hydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  // Wait for app to be fully loaded before checking welcome status
  useEffect(() => {
    const initializeApp = () => {
      // Add a small delay to ensure everything is rendered
      setTimeout(() => {
        setIsAppReady(true);
        
        // Check server-side preference (no localStorage!)
        if (!hasSeenWelcomeModal) {
          // Add another small delay to ensure smooth transition
          setTimeout(() => {
            setShowWelcomeModal(true);
          }, 800); // Increased delay for better stability
        }
      }, 200); // Slightly increased initial delay
    };

    initializeApp();
  }, [hasSeenWelcomeModal]);

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    
    // Save preference to server using fetcher (doesn't cause navigation)
    const formData = new FormData();
    formData.append('action', 'dismissWelcome');
    welcomeFetcher.submit(formData, { method: 'POST' });
  };

  const handleTabChange = (tab: string) => {
    logger.info('[Dashboard] Tab change requested:', tab);
    
    // Don't navigate away, just change the active tab
    setActiveTab(tab);
  };

  // Handle "Start Free Trial" - just close modal and stay on dashboard
  const handleSubscribe = () => {
    // Close the welcome modal
    handleWelcomeModalClose();
    // User stays on the dashboard to explore the app
  };

  // Remove the subscription modal useEffect - WelcomeModal handles everything now

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "out-of-stock":
        return (
          <OptimizedComponents.ProductManagement 
            isVisible={true} 
            shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain} 
            initialProducts={initialProducts}
            subscriptionStatus={settingsData.hasActiveSubscription ? 'active' : (subscription.status === 'ACTIVE' ? 'active' : 'trialing')}
            hasActiveSubscription={settingsData.hasActiveSubscription}
            managedPricingUrl={settingsData.managedPricingUrl}
          />
        );

      case "forecasting":
        return <ForecastingTab shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain} initialForecastData={forecastingData} />;

      case "help":
        return <Help isVisible={true} />;
      case "billing":
        return (
          <Card>
            <Text as="p" variant="bodyMd">
              Billing feature has been removed.
            </Text>
          </Card>
        );
      case "settings":
        return (
          <Settings
            subscription={settingsData.subscription}
            hasActiveSubscription={settingsData.hasActiveSubscription}
            error={settingsData.error}
            managedPricingUrl={settingsData.managedPricingUrl}
          />
        );
      default:
        return (
          <Card>
            <Text as="h2" variant="headingMd">
              {activeTab} Section
            </Text>
            <Text as="p" variant="bodyMd">
              This section is under development.
            </Text>
          </Card>
        );
    }
  };

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <Page>
      <BlockStack gap="500">
        <AppHeader
          onTabChange={handleTabChange}
          activeTab={activeTab}
          outOfStockCount={outOfStockCount}
          onPreloadComponent={(componentName) => {
            if (componentName === 'ProductManagement' || componentName === 'Dashboard') {
              preloadComponent(componentName as keyof typeof OptimizedComponents);
            }
          }}
        />
        
        <Layout>
          <Layout.Section>
            {/* Always render Dashboard but hide when not active */}
            <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
              <OptimizedComponents.Dashboard
                isVisible={activeTab === 'dashboard'}
                outOfStockCount={outOfStockCount}
                onNavigate={handleTabChange}
                shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain}
                productAnalytics={productAnalytics}
              />
            </div>
            
            {/* Render other tabs conditionally */}
            {activeTab !== 'dashboard' && renderActiveTabContent()}
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Unified Welcome Modal - Shows on first visit with subscription info + app features */}
      {isAppReady && (
        <WelcomeModal 
          isOpen={showWelcomeModal} 
          onClose={handleWelcomeModalClose}
          hasSubscription={subscription.hasAccess}
          onSubscribe={handleSubscribe}
          subscriptionPrice={`$${subscription.price}/${subscription.currency === 'USD' ? 'month' : subscription.currency.toLowerCase()}`}
        />
      )}
    </Page>
  );
}

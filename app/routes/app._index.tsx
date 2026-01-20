import { logger } from "~/utils/logger";
import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { defer } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Banner,
  Collapsible,
  Button,
  InlineStack,
  SkeletonBodyText,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { AppHeader } from "../components/AppHeader";
import { WelcomeModal } from "../components/WelcomeModal";
import { Help } from "../components/Help";
import { Settings } from "../components/Settings";
import { ForecastingTab } from "../components/ForecastingTab";
import { OptimizedComponents, useComponentPreloader } from "../utils/lazyLoader";
import { checkSubscriptionStatus, getManagedPricingUrl } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const startTime = Date.now();
  logger.info("🔵 Main Loader: Starting...");
  
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  logger.info(`🔵 Main Loader: Auth completed in ${Date.now() - startTime}ms`);
  
  // Run critical queries in PARALLEL for fast initial load
  const [subscriptionResult, shopResponse] = await Promise.all([
    // 1. Check subscription status (single call, not two!)
    checkSubscriptionStatus(admin.graphql, shop),
    // 2. Fetch shop info for dev store detection
    admin.graphql(
      `#graphql
        query getShop {
          shop {
            id
            name
            myshopifyDomain
            primaryDomain {
              host
            }
            plan {
              partnerDevelopment
              displayName
              shopifyPlus
            }
          }
        }`
    ),
  ]);
  
  logger.info(`🔵 Main Loader: Core queries completed in ${Date.now() - startTime}ms`);
  
  const { hasActiveSubscription, subscription: fullSubscription, error } = subscriptionResult;
  const shopData = (await shopResponse.json()).data?.shop || null;
  
  // Extract shop plan details for dev store detection
  const isDevelopmentStore = shopData?.plan?.partnerDevelopment === true;
  const shopPlanDisplayName = shopData?.plan?.displayName || 'Unknown';
  const isShopifyPlus = shopData?.plan?.shopifyPlus === true;
  
  // Determine access based on subscription or dev store
  const hasAccess = hasActiveSubscription || isDevelopmentStore;
  
  // Return core data FAST - heavy data (products, analytics, forecasting) will be loaded client-side
  // This dramatically improves initial page load time
  const coreData = {
    shop: shopData,
    hasSeenWelcomeModal: false,
    productAnalytics: null, // Loaded on-demand via fetcher
    initialProducts: null,  // Loaded on-demand via fetcher
    forecastingData: null,  // Loaded on-demand via fetcher
    storeType: {
      isDevelopmentStore,
      planDisplayName: shopPlanDisplayName,
      isShopifyPlus,
    },
    subscription: {
      status: fullSubscription?.status || 'none',
      hasAccess,
      planName: fullSubscription?.name || 'Spector Basic',
      price: fullSubscription?.lineItems[0]?.plan?.pricingDetails?.price?.amount || '9.99',
      currency: fullSubscription?.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode || 'USD',
    },
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
      isDevelopmentStore,
      shopPlanDisplayName,
      error,
      managedPricingUrl: getManagedPricingUrl(shop),
    },
  };
  
  logger.info(`🔵 Main Loader: TOTAL time ${Date.now() - startTime}ms (fast path - data loaded client-side)`);
  return coreData;
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
  const { shop, hasSeenWelcomeModal, subscription, settingsData, productAnalytics, initialProducts, forecastingData, storeType } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [outOfStockCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [trialBannerExpanded, setTrialBannerExpanded] = useState(false);
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

  // Handle "Start Free Trial" - redirect to Shopify pricing page
  const handleSubscribe = () => {
    // Close the welcome modal
    handleWelcomeModalClose();
    // Redirect to Shopify's managed pricing page for the app
    if (settingsData?.managedPricingUrl) {
      window.open(settingsData.managedPricingUrl, '_top');
    }
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
            isDevelopmentStore={storeType?.isDevelopmentStore || false}
          />
        );

      case "forecasting":
        return (
          <ForecastingTab 
            shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain} 
            initialForecastData={forecastingData}
            isTrialMode={!settingsData.hasActiveSubscription}
            isDevelopmentStore={storeType?.isDevelopmentStore || false}
            managedPricingUrl={settingsData?.managedPricingUrl}
          />
        );

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
            isDevelopmentStore={storeType?.isDevelopmentStore || false}
            shopPlanDisplayName={storeType?.planDisplayName || 'Unknown'}
            managedPricingUrl={settingsData?.managedPricingUrl}
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
        
        {/* Trial Banner - Only for live stores on trial (not dev stores) */}
        {!settingsData?.hasActiveSubscription && !storeType?.isDevelopmentStore && (
          <div style={{ 
            background: '#FFF8E5', 
            border: '1px solid #FFD79D', 
            borderRadius: '8px', 
            padding: '8px 12px'
          }}>
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  ⏱️ 3-day free trial • 10 product limit
                </Text>
                <Button 
                  variant="plain" 
                  size="slim"
                  onClick={() => setTrialBannerExpanded(!trialBannerExpanded)}
                >
                  {trialBannerExpanded ? 'Less' : 'More info'}
                </Button>
              </InlineStack>
              <Button size="slim" onClick={() => handleTabChange('settings')}>
                Subscribe
              </Button>
            </InlineStack>
            <Collapsible
              open={trialBannerExpanded}
              id="trial-banner-details"
              transition={{ duration: '150ms', timingFunction: 'ease-in-out' }}
            >
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #FFD79D' }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  During your trial, you can edit up to 10 products in bulk operations. Subscribe to unlock unlimited products, full inventory forecasting, and all premium features.
                </Text>
              </div>
            </Collapsible>
          </div>
        )}
        
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

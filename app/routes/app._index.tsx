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
import { SubscriptionBanner } from "../components/SubscriptionBanner";
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
  
  // Fetch user preferences from database (replaces localStorage)
  const prisma = (await import("../db.server")).default;
  let userPreferences;
  try {
    userPreferences = await prisma.userPreferences.findUnique({
      where: { shop },
    });
    
    // Create preferences if they don't exist
    if (!userPreferences) {
      userPreferences = await prisma.userPreferences.create({
        data: { shop },
      });
    }
  } catch (err) {
    logger.error('Error fetching user preferences:', err);
    userPreferences = { hasSeenWelcomeModal: false };
  }
  
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
    
    return {
      shop: data.data?.shop || null,
      hasSeenWelcomeModal: userPreferences?.hasSeenWelcomeModal || false,
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
      hasSeenWelcomeModal: userPreferences?.hasSeenWelcomeModal || false,
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
  const { shop, hasSeenWelcomeModal, subscription, settingsData } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [outOfStockCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { preloadComponent } = useComponentPreloader();
  const welcomeFetcher = useFetcher();

  // Fix hydration issues by marking when client has hydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  // Show welcome modal on first visit (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    // Check server-side preference (no localStorage!)
    if (!hasSeenWelcomeModal) {
      // Small delay to ensure dashboard has started loading
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 500);
    }
  }, [hasSeenWelcomeModal, isHydrated]);

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
        return <OptimizedComponents.ProductManagement isVisible={true} shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain} />;

      case "forecasting":
        return <ForecastingTab shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain} />;

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
        
        {/* Subscription Banner - Only shows if no active subscription AND not on settings tab */}
        {!subscription.hasAccess && activeTab !== 'settings' && (
          <SubscriptionBanner
            subscription={subscription as any}
            onSubscribe={handleSubscribe}
            loading={false}
          />
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
              />
            </div>
            
            {/* Render other tabs conditionally */}
            {activeTab !== 'dashboard' && renderActiveTabContent()}
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Unified Welcome Modal - Shows on first visit with subscription info + app features */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={handleWelcomeModalClose}
        hasSubscription={subscription.hasAccess}
        onSubscribe={handleSubscribe}
        subscriptionPrice={`$${subscription.price}/${subscription.currency === 'USD' ? 'month' : subscription.currency.toLowerCase()}`}
      />
    </Page>
  );
}

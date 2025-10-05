import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
import { ForecastingTab } from "../components/ForecastingTab";
import { OptimizedComponents, useComponentPreloader } from "../utils/lazyLoader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
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
      shop: data.data?.shop || null
    };
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return { shop: null };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
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
  const { shop } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [outOfStockCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const { preloadComponent } = useComponentPreloader();

  // Wait for app to be fully loaded before checking welcome status
  useEffect(() => {
    const initializeApp = () => {
      // Add a small delay to ensure everything is rendered
      setTimeout(() => {
        setIsAppReady(true);
        
        // Only check for welcome modal after app is ready
        let hasSeenWelcome = false;
        try {
          hasSeenWelcome = localStorage.getItem('spector-welcome-seen') === 'true';
        } catch (error) {
          // If localStorage is not available, don't show modal to be safe
          console.warn('Could not access localStorage:', error);
          hasSeenWelcome = true;
        }
        
        if (!hasSeenWelcome) {
          // Add another small delay to ensure smooth transition
          setTimeout(() => {
            setShowWelcomeModal(true);
          }, 800); // Increased delay for better stability
        }
      }, 200); // Slightly increased initial delay
    };

    initializeApp();
  }, []);

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    try {
      localStorage.setItem('spector-welcome-seen', 'true');
    } catch (error) {
      // Fallback if localStorage is not available (e.g., private browsing)
      console.warn('Could not save welcome preference to localStorage:', error);
    }
  };

  const handleOpenHelp = () => {
    setActiveTab("help");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <OptimizedComponents.Dashboard
            isVisible={true}
            outOfStockCount={outOfStockCount}
            onNavigate={handleTabChange}
            shopDomain={shop?.primaryDomain?.host || shop?.myshopifyDomain}
          />
        );
      case "out-of-stock":
        return <OptimizedComponents.ProductManagement isVisible={true} />;

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
          <BlockStack gap="500">
            {/* App Configuration Header */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  App Settings
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Manage your Spector app settings and subscription details.
                </Text>
              </BlockStack>
            </Card>

            {/* Subscription & Plan Information */}
            <Card>
              <BlockStack gap="500">
                <Text as="h3" variant="headingMd">
                  Subscription & Plan
                </Text>
                <Layout>
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Free Trial Active
                        </Text>
                        <Text as="p" variant="bodyMd">
                          <strong>3-Day Trial</strong>
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          • Full access to all features
                          • No payment required
                          • Export capabilities included
                          • Trial ends: October 8, 2025
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Current Plan
                        </Text>
                        <Text as="p" variant="bodyMd">
                          <strong>Basic Plan</strong>
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          • Basic inventory tracking
                          • Product analytics dashboard
                          • Bulk product operations
                          • Performance monitoring
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>


              </BlockStack>
            </Card>

            {/* Payment History */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Payment History
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  No payments yet - you're currently on your free trial.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Once you subscribe, your payment history will appear here including invoices and receipts.
                </Text>
              </BlockStack>
            </Card>

            {/* App Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  App Information
                </Text>
                
                <Layout>
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        App Version
                      </Text>
                      <Text as="p" variant="bodyMd">
                        v1.0.0
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                  
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Installed On
                      </Text>
                      <Text as="p" variant="bodyMd">
                        October 5, 2025
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                  
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Support
                      </Text>
                      <Text as="p" variant="bodyMd">
                        hello@spector-app.com
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </Card>
          </BlockStack>
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

  // Don't render modal until app is fully ready
  if (!isAppReady) {
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
              {renderActiveTabContent()}
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>
    );
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
            {renderActiveTabContent()}
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Welcome Modal - Only shows after app is stable and on first visit */}
      {isAppReady && (
        <WelcomeModal 
          isOpen={showWelcomeModal} 
          onClose={handleWelcomeModalClose}
          onOpenHelp={handleOpenHelp}
        />
      )}
    </Page>
  );
}

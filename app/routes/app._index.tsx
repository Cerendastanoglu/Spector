import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { AppHeader } from "../components/AppHeader";
import { WelcomeModal } from "../components/WelcomeModal";
import { Help } from "../components/Help";
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
  const navigate = useNavigate();
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
      case "notifications":
        return (
          <Card>
            <Text as="p" variant="bodyMd">
              Notifications feature has been removed.
            </Text>
          </Card>
        );
      case "help":
        return <Help isVisible={true} />;
      case "billing":
        // Redirect to the dedicated billing route
        navigate('/app/billing');
        return (
          <Card>
            <Text as="h2" variant="headingMd">
              Redirecting to Billing...
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
                  App Configuration
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Manage your Spector subscription, billing, and app settings.
                </Text>
              </BlockStack>
            </Card>

            {/* Subscription & Billing */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Subscription & Billing
                </Text>
                
                {/* Trial Status */}
                <Layout>
                  <Layout.Section variant="oneHalf">
                    <Card background="bg-surface-info">
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Free Trial Active
                        </Text>
                        <Text as="p" variant="bodyMd">
                          You're currently on a 3-day free trial. Access to all available features until your trial expires.
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Trial ends: October 2, 2025
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
                          <strong>Spector Limited Plan - Trial</strong>
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

                {/* Post-Trial Options */}
                <Card background="bg-surface-secondary">
                  <BlockStack gap="400">
                    <Text as="h4" variant="headingSm">
                      Continue with Spector Limited Plan
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>$14.99/month</strong> - Introductory pricing for early adopters
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      This is our beginning price as we're a new app. More advanced plans with additional features will be added in the future.
                    </Text>
                    
                    <Layout>
                      <Layout.Section variant="oneHalf">
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h5" variant="headingSm">
                              Continue with Spector Pro
                            </Text>
                            <Text as="p" variant="bodyLg" fontWeight="semibold">
                              $29.99/month
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Full access to all features, unlimited monitoring, priority support
                            </Text>
                            <Button variant="primary" size="large">
                              Subscribe Now
                            </Button>
                          </BlockStack>
                        </Card>
                      </Layout.Section>
                      
                      <Layout.Section variant="oneHalf">
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h5" variant="headingSm">
                              Not Ready to Subscribe?
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              You can uninstall the app anytime. Your data will be safely removed from our servers.
                            </Text>
                            <Button variant="secondary" tone="critical" size="large">
                              Uninstall App
                            </Button>
                          </BlockStack>
                        </Card>
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                </Card>
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
                        September 16, 2025
                      </Text>
                    </BlockStack>
                  </Layout.Section>
                  
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Support
                      </Text>
                      <Text as="p" variant="bodyMd">
                        support@spector.app
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

import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { AppHeader } from "../components/AppHeader";
import { Dashboard } from "../components/Dashboard";
import { Notifications } from "../components/Notifications";
import { WelcomeModal } from "../components/WelcomeModal";
import { OptimizedComponents, useComponentPreloader } from "../utils/lazyLoader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            isVisible={true}
            outOfStockCount={outOfStockCount}
            onNavigate={handleTabChange}
          />
        );
      case "out-of-stock":
        return <OptimizedComponents.ProductManagement isVisible={true} />;
      case "notifications":
        return <Notifications isVisible={true} />;
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
        />
      )}
    </Page>
  );
}

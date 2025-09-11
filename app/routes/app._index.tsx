import { useState } from "react";
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
import { WelcomePage } from "../components/WelcomePage";
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
  const [activeTab, setActiveTab] = useState("welcome");
  const [outOfStockCount] = useState(0);
  const { preloadComponent } = useComponentPreloader();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "welcome":
        return <WelcomePage onNavigate={handleTabChange} />;
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

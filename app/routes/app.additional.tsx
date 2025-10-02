import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import {
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Tabs,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { 
  BILLING_PLANS, 
  createSubscription, 
  getActiveSubscription, 
  cancelSubscription,
  extendTrialPeriod,
  getSubscriptionStatus,
  checkIfDevelopmentStore
} from "../services/billing.server";
import BillingManagement from "../components/BillingManagement";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  try {
    const [subscriptions, isDevelopmentStore] = await Promise.all([
      getActiveSubscription(request),
      checkIfDevelopmentStore(request)
    ]);
    
    const currentSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
    const subscriptionStatus = getSubscriptionStatus(subscriptions, isDevelopmentStore);
    
    return json({
      plans: BILLING_PLANS,
      currentSubscription,
      subscriptionStatus,
      isDevelopmentStore
    });
  } catch (error) {
    console.error('Error loading billing data:', error);
    return json({
      plans: BILLING_PLANS,
      currentSubscription: null,
      subscriptionStatus: 'none',
      isDevelopmentStore: false
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get('action');
  
  try {
    switch (action) {
      case 'subscribe': {
        const planId = formData.get('planId') as string;
        const result = await createSubscription(request, planId);
        return json(result);
      }
      
      case 'cancel': {
        const subscriptionId = formData.get('subscriptionId') as string;
        const result = await cancelSubscription(request, subscriptionId);
        return json(result);
      }
      
      case 'extend-trial': {
        const subscriptionId = formData.get('subscriptionId') as string;
        const days = parseInt(formData.get('days') as string) || 7;
        const result = await extendTrialPeriod(request, subscriptionId, days);
        return json(result);
      }
      
      default:
        return json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Billing action error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    });
  }
};

export default function AdditionalPage() {
  const { 
    isDevelopmentStore 
  } = useLoaderData<typeof loader>();
  
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    {
      id: 'billing',
      content: 'Billing & Subscription',
      panelID: 'billing-panel',
    },
    {
      id: 'template',
      content: 'Template Info',
      panelID: 'template-panel',
    }
  ];

  return (
    <Page>
      <TitleBar title="App Configuration" />
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
            >
              <BlockStack gap="400">
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    {isDevelopmentStore && (
                      <Banner tone="info">
                        <Text as="p" variant="bodyMd">
                          This is a development store. Spector is free to use for development and testing purposes.
                        </Text>
                      </Banner>
                    )}
                    <BillingManagement />
                  </BlockStack>
                )}
                {selectedTab === 1 && (
                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd">
                      The app template comes with an additional page which
                      demonstrates how to create multiple pages within app navigation
                      using{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/app-bridge"
                        target="_blank"
                        removeUnderline
                      >
                        App Bridge
                      </Link>
                      .
                    </Text>
                    <Text as="p" variant="bodyMd">
                      To create your own page and have it show up in the app
                      navigation, add a page inside app/routes, and a
                      link to it in the NavMenu component found
                      in app/routes/app.jsx.
                    </Text>
                  </BlockStack>
                )}
              </BlockStack>
            </Tabs>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Resources
              </Text>
              <List>
                <List.Item>
                  <Link
                    url="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
                    target="_blank"
                    removeUnderline
                  >
                    App nav best practices
                  </Link>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}



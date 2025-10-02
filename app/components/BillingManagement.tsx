import { useState, useEffect } from 'react';
import {
  Card,
  Page,
  Layout,
  Button,
  Text,
  Badge,
  InlineStack,
  BlockStack,
  List,
  Banner,
  Spinner,
  Modal,
  Frame
} from '@shopify/polaris';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';

interface BillingPlan {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
}

interface Subscription {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd: string;
  trialDays: number;
  test: boolean;
}

interface BillingData {
  plans: Record<string, BillingPlan>;
  currentSubscription: Subscription | null;
  subscriptionStatus: string;
  isDevelopmentStore: boolean;
}

export default function BillingManagement() {
  const { plans, currentSubscription, subscriptionStatus, isDevelopmentStore } = useLoaderData<BillingData>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const isLoading = fetcher.state === 'submitting';

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setIsModalOpen(true);
  };

  const confirmSubscription = () => {
    if (selectedPlan) {
      fetcher.submit(
        { action: 'create_subscription', planId: selectedPlan },
        { method: 'post' }
      );
    }
    setIsModalOpen(false);
  };

  const handleCancelSubscription = () => {
    if (currentSubscription) {
      fetcher.submit(
        { action: 'cancel_subscription', subscriptionId: currentSubscription.id },
        { method: 'post' }
      );
    }
  };

  // Handle redirect to billing confirmation
  useEffect(() => {
    const data = fetcher.data as any;
    if (data?.confirmationUrl) {
      window.location.href = data.confirmationUrl;
    }
  }, [fetcher.data]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'development_free':
        return <Badge tone="success">Development Store - Free Access</Badge>;
      case 'trial':
        return <Badge tone="info">Free Trial</Badge>;
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'pending':
        return <Badge tone="attention">Pending</Badge>;
      case 'expired':
        return <Badge tone="critical">Expired</Badge>;
      case 'cancelled':
        return <Badge tone="critical">Cancelled</Badge>;
      default:
        return <Badge>No Subscription</Badge>;
    }
  };

  const getTrialDaysRemaining = () => {
    if (!currentSubscription || subscriptionStatus !== 'trial') return 0;
    
    const endDate = new Date(currentSubscription.currentPeriodEnd);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <Frame>
      <Page
        title="Billing & Subscription"
        backAction={{ content: 'Back', onAction: () => navigate('/app') }}
      >
        <Layout>
          {/* Development Store Notice */}
          {isDevelopmentStore && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <Banner tone="success">
                    <p>
                      <strong>🎉 Development Store Detected!</strong><br/>
                      You have free access to all Spector features for testing purposes. 
                      When you upgrade to a paid Shopify plan, you'll need to subscribe to continue using Spector.
                    </p>
                  </Banner>
                  
                  <div style={{ marginTop: '16px' }}>
                    <InlineStack blockAlign="center" align="space-between">
                      <BlockStack gap="200">
                        <Text variant="headingMd" as="h2">
                          Development Store Access
                        </Text>
                        <Text variant="bodyMd" tone="subdued" as="p">
                          Full access to all features while testing
                        </Text>
                      </BlockStack>
                      {getStatusBadge(subscriptionStatus)}
                    </InlineStack>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}
          
          {/* Current Subscription Status */}
          {currentSubscription && !isDevelopmentStore && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <InlineStack blockAlign="center" align="space-between">
                    <BlockStack gap="200">
                      <Text variant="headingMd" as="h2">
                        Current Subscription
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        {currentSubscription.name}
                      </Text>
                    </BlockStack>
                    {getStatusBadge(subscriptionStatus)}
                  </InlineStack>
                  
                  {subscriptionStatus === 'trial' && trialDaysRemaining > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <Banner tone="info">
                        <p>
                          You have {trialDaysRemaining} days left in your free trial. 
                          Upgrade now to continue using Spector after your trial ends.
                        </p>
                      </Banner>
                      
                      <div style={{ marginTop: '12px' }}>
                        <InlineStack gap="200">
                          <Button 
                            onClick={handleCancelSubscription}
                            tone="critical"
                            loading={isLoading}
                            disabled={isLoading}
                          >
                            Cancel Subscription
                          </Button>
                        </InlineStack>
                      </div>
                    </div>
                  )}

                  {subscriptionStatus === 'active' && (
                    <div style={{ marginTop: '16px' }}>
                      <Banner tone="success">
                        <p>Your subscription is active and will renew automatically.</p>
                      </Banner>
                      
                      <div style={{ marginTop: '12px' }}>
                        <Button
                          onClick={handleCancelSubscription}
                          tone="critical"
                          loading={isLoading}
                          disabled={isLoading}
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </Layout.Section>
          )}

          {/* Available Plans - Only show for non-development stores */}
          {!isDevelopmentStore && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <Text variant="headingMd" as="h2" alignment="center">
                    Spector Pro Plan
                  </Text>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Everything you need to manage your Shopify inventory
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                    {Object.entries(plans).map(([planId, plan]) => (
                      <div key={planId} style={{ maxWidth: '400px', width: '100%' }}>
                        <Card>
                          <div style={{ padding: '20px' }}>
                          <BlockStack gap="300">
                            <Text variant="headingMd" as="h3" alignment="center">
                              {plan.name}
                            </Text>
                            
                            <div style={{ textAlign: 'center', margin: '16px 0' }}>
                              <Text variant="headingLg" as="p">
                                ${plan.price}
                              </Text>
                              <Text variant="bodySm" tone="subdued" as="p">
                                per month
                              </Text>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              <Badge tone="info">
                                {`${plan.trialDays} days free trial`}
                              </Badge>
                            </div>

                            <div style={{ margin: '16px 0' }}>
                              <List type="bullet">
                                {plan.features.map((feature, index) => (
                                  <List.Item key={index}>{feature}</List.Item>
                                ))}
                              </List>
                            </div>

                            <Button
                              variant="primary"
                              size="large"
                              onClick={() => handleSubscribe(planId)}
                              loading={isLoading && selectedPlan === planId}
                              disabled={isLoading || (currentSubscription?.name === plan.name)}
                            >
                              {currentSubscription?.name === plan.name 
                                ? 'Current Plan' 
                                : `Start 3-Day Free Trial`
                              }
                            </Button>
                          </BlockStack>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}

          {/* Trial Information - Only show for non-development stores without subscription */}
          {!currentSubscription && !isDevelopmentStore && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <Text variant="headingMd" as="h2">
                    🎉 3-Day Free Trial
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>No credit card required to start</List.Item>
                      <List.Item>Full access to all features during trial</List.Item>
                      <List.Item>Cancel anytime during trial period</List.Item>
                      <List.Item>Automatic billing starts after trial ends</List.Item>
                    </List>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}

          {/* Development Store Information */}
          {isDevelopmentStore && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '20px' }}>
                  <Text variant="headingMd" as="h2">
                    📚 Development Store Testing
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <Text variant="bodyMd" as="p">
                      As a Shopify Partner development store, you have unlimited access to test Spector's features:
                    </Text>
                    <div style={{ marginTop: '12px' }}>
                      <List type="bullet">
                        <List.Item>Complete product analytics dashboard</List.Item>
                        <List.Item>Real-time inventory monitoring</List.Item>
                        <List.Item>Smart notifications & alerts</List.Item>
                        <List.Item>Bulk product operations</List.Item>
                        <List.Item>Performance insights</List.Item>
                        <List.Item>Export reports</List.Item>
                      </List>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <Banner tone="info">
                        <p>
                          When this store is upgraded to a paid Shopify plan, you'll need to subscribe to Spector Pro 
                          ($14.99/month) to continue using these features.
                        </p>
                      </Banner>
                    </div>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}
        </Layout>

        {/* Confirmation Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm Subscription"
          primaryAction={{
            content: 'Start Free Trial',
            onAction: confirmSubscription,
            loading: isLoading
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setIsModalOpen(false)
          }]}
        >
          <Modal.Section>
            {selectedPlan && plans[selectedPlan] && (
              <BlockStack gap="200">
                <Text variant="bodyMd" as="p">
                  You're about to start a free trial for:
                </Text>
                <Text variant="headingMd" as="h3">
                  {plans[selectedPlan].name} - ${plans[selectedPlan].price}/month
                </Text>
                <Text variant="bodyMd" tone="subdued" as="p">
                  • 3 days free trial • No charges during trial period • Billing starts automatically after trial ends • Cancel anytime
                </Text>
              </BlockStack>
            )}
          </Modal.Section>
        </Modal>

        {/* Loading Overlay */}
        {isLoading && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <Card>
              <div style={{ padding: '20px' }}>
                <BlockStack gap="200" align="center">
                  <Spinner accessibilityLabel="Processing" size="large" />
                  <Text variant="bodyMd" as="p">Processing your request...</Text>
                </BlockStack>
              </div>
            </Card>
          </div>
        )}
      </Page>
    </Frame>
  );
}
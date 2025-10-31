import { logger } from "~/utils/logger";
import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Divider,
  Banner,
  Icon,
} from "@shopify/polaris";
import { CreditCardIcon, CalendarIcon, CheckIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { checkSubscriptionStatus, getManagedPricingUrl } from "../services/billing.server";
import styles from "../styles/settings.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  logger.info('[Settings] Loader called for settings page');
  
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  logger.info('[Settings] Authenticated shop:', shop);

  // Get subscription details
  const { hasActiveSubscription, subscription, error } = await checkSubscriptionStatus(
    admin.graphql,
    shop
  );
  
  logger.info('[Settings] Subscription status:', { hasActiveSubscription, error });

  return json({
    shop,
    subscription: subscription ? {
      id: subscription.id,
      name: subscription.name,
      status: subscription.status,
      price: subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount,
      currency: subscription.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode,
      currentPeriodEnd: subscription.currentPeriodEnd,
      test: subscription.test,
      trialDays: subscription.trialDays,
    } : null,
    hasActiveSubscription,
    error,
    managedPricingUrl: getManagedPricingUrl(shop),
  });
};

export default function Settings() {
  const { subscription, hasActiveSubscription, error, managedPricingUrl } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = () => {
    setIsLoading(true);
    // Redirect to Shopify's managed pricing page
    if (window.top) {
      window.top.location.href = managedPricingUrl;
    } else {
      window.location.href = managedPricingUrl;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <Badge tone="success" icon={CheckIcon}>Active</Badge>;
      case 'PENDING':
        return <Badge tone="attention">Pending Approval</Badge>;
      case 'CANCELLED':
        return <Badge tone="critical">Cancelled</Badge>;
      case 'FROZEN':
        return <Badge tone="warning">Frozen</Badge>;
      case 'EXPIRED':
        return <Badge tone="critical">Expired</Badge>;
      default:
        return <Badge tone="info">Free Trial</Badge>;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatPrice = (amount: string | undefined, currency: string | undefined) => {
    if (!amount) return 'Free';
    const symbol = currency === 'USD' ? '$' : currency || '';
    return `${symbol}${amount}`;
  };

  return (
    <Page
      title="App Settings"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Layout>
          {/* Error Banner */}
          {error && (
            <Layout.Section>
              <Banner tone="critical" title="Error loading subscription">
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          {/* Free Trial Banner - Show when no active subscription */}
          {!hasActiveSubscription && !error && (
            <Layout.Section>
              <div style={{ marginBottom: '24px' }}>
                <Banner
                  title="🎉 You're on the Free Trial"
                  tone="info"
                >
                  <BlockStack gap="200">
                    <Text as="p">
                      Enjoy full access to all Spector features for <strong>3 days</strong>. 
                      After your trial ends, subscribe to continue using the app.
                    </Text>
                    <Button 
                      onClick={handleManageSubscription}
                      loading={isLoading}
                    >
                      View Pricing Plans
                    </Button>
                  </BlockStack>
                </Banner>
              </div>
            </Layout.Section>
          )}

          {/* Subscription Overview Card */}
          <Layout.Section>
            <div style={{ marginBottom: '20px' }}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        {hasActiveSubscription ? 'Subscription Status' : 'Current Plan'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {hasActiveSubscription 
                          ? 'Your subscription details and billing information' 
                          : 'You are currently using Spector with a 3-day free trial'}
                      </Text>
                    </BlockStack>
                    {subscription ? getStatusBadge(subscription.status) : <Badge tone="info">Free Trial</Badge>}
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="400">
                    {/* Plan Name */}
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Plan Name
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {subscription?.name || 'Free Trial (3 Days)'}
                      </Text>
                    </InlineStack>

                    {/* Price */}
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <div className={styles.subscriptionIcon}>
                          <Icon source={CreditCardIcon} />
                        </div>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Monthly Cost
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {subscription ? `${formatPrice(subscription.price, subscription.currency)}/month` : 'Free during trial'}
                      </Text>
                    </InlineStack>

                    {/* Current Period End or Trial Info */}
                    {subscription?.currentPeriodEnd ? (
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <div className={styles.subscriptionIcon}>
                            <Icon source={CalendarIcon} />
                          </div>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Next Billing Date
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {formatDate(subscription.currentPeriodEnd)}
                        </Text>
                      </InlineStack>
                    ) : (
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <div className={styles.subscriptionIcon}>
                            <Icon source={CalendarIcon} />
                          </div>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Trial Status
                          </Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                          Active - Full Access
                        </Text>
                      </InlineStack>
                    )}

                    {/* Trial Days Remaining */}
                    {subscription?.trialDays && subscription.trialDays > 0 && (
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Trial Days Remaining
                        </Text>
                        <Badge tone="attention">{`${subscription.trialDays} days left`}</Badge>
                      </InlineStack>
                    )}

                    {/* Test Mode Badge */}
                    {subscription?.test && (
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Environment
                        </Text>
                        <Badge tone="info">Development Store (Test Mode)</Badge>
                      </InlineStack>
                    )}
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    {/* Manage Subscription Button */}
                    <Button
                      variant="primary"
                      onClick={handleManageSubscription}
                      loading={isLoading}
                      fullWidth
                    >
                      {hasActiveSubscription ? 'Manage Subscription' : 'View Pricing & Subscribe'}
                    </Button>

                    {hasActiveSubscription && (
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Upgrade, downgrade, or cancel your subscription through Shopify's billing page.
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>

          {/* Features Card */}
          <Layout.Section>
            <div style={{ marginBottom: '20px' }}>
              <Card>
                <BlockStack gap="500">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg">
                      What's Included
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      All features available during your {hasActiveSubscription ? 'subscription' : 'free trial'}
                    </Text>
                  </BlockStack>
                  
                  <Divider />
                  
                  <BlockStack gap="100">
                    <div className={styles.featureItem}>
                      <div className={styles.featureIcon}>
                        <Icon source={CheckIcon} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Real-time Inventory Monitoring
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Track stock levels across all products automatically
                        </Text>
                      </BlockStack>
                    </div>
                    
                    <div className={styles.featureItem}>
                      <div className={styles.featureIcon}>
                        <Icon source={CheckIcon} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Automated Email Notifications
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Get alerts when products are low or out of stock
                        </Text>
                      </BlockStack>
                    </div>
                    
                    <div className={styles.featureItem}>
                      <div className={styles.featureIcon}>
                        <Icon source={CheckIcon} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Product Analytics & Insights
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Understand sales trends and product performance
                        </Text>
                      </BlockStack>
                    </div>
                    
                    <div className={styles.featureItem}>
                      <div className={styles.featureIcon}>
                        <Icon source={CheckIcon} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Revenue Tracking & Forecasting
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Predict future revenue based on historical data
                        </Text>
                      </BlockStack>
                    </div>
                    
                    <div className={styles.featureItem}>
                      <div className={styles.featureIcon}>
                        <Icon source={CheckIcon} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Advanced Dashboard & Reporting
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Comprehensive views of your store's performance
                        </Text>
                      </BlockStack>
                    </div>
                  </BlockStack>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>

          {/* Help Section */}
          <Layout.Section>
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Need Help?
                  </Text>
                  <Text as="p" variant="bodyMd">
                    If you have questions about billing, subscriptions, or need support, please contact us at{' '}
                    <Text as="span" fontWeight="semibold" tone="success">
                      support@spector.app
                    </Text>
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </div>
    </Page>
  );
}

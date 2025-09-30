import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Spinner,
  Banner,
  Divider,
  Box
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";

interface SubscriptionManagerProps {
  shopDomain?: string;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  planName?: string;
  status?: string;
  createdAt?: string;
  trialDays?: number;
  price?: number;
  billingCycle?: string;
  cancelUrl?: string;
}

export function SubscriptionManager({ shopDomain }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const fetcher = useFetcher<{ success: boolean; subscription?: SubscriptionStatus; error?: string }>();
  const actionFetcher = useFetcher<{ success: boolean; confirmationUrl?: string; error?: string }>();

  useEffect(() => {
    // Load subscription status on mount
    fetcher.load('/app/api/subscription');
  }, [fetcher]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success && fetcher.data.subscription) {
        setSubscription(fetcher.data.subscription);
        setError(null);
      } else if (!fetcher.data.success) {
        setError(fetcher.data.error || 'Failed to load subscription status');
      }
      setIsLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (actionFetcher.data) {
      if (actionFetcher.data.success) {
        if (actionFetcher.data.confirmationUrl) {
          // Redirect to Shopify billing page
          window.parent.location.href = actionFetcher.data.confirmationUrl;
        } else {
          // Refresh subscription status after cancellation
          fetcher.load('/app/api/subscription');
          setShowCancelConfirm(false);
        }
      } else {
        setError(actionFetcher.data.error || 'Action failed');
      }
    }
  }, [actionFetcher.data, fetcher]);

  const handleSubscribe = () => {
    const formData = new FormData();
    formData.append('action', 'create-subscription');
    actionFetcher.submit(formData, { 
      method: 'POST', 
      action: '/app/api/subscription' 
    });
  };

  const handleCancelSubscription = () => {
    if (!subscription || !subscription.hasActiveSubscription) return;
    
    const formData = new FormData();
    formData.append('action', 'cancel-subscription');
    formData.append('subscriptionId', 'current'); // API will handle finding current subscription
    actionFetcher.submit(formData, { 
      method: 'POST', 
      action: '/app/api/subscription' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'cancelled':
        return <Badge tone="critical">Cancelled</Badge>;
      case 'expired':
        return <Badge tone="warning">Expired</Badge>;
      case 'pending':
        return <Badge tone="info">Pending</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Box padding="600">
          <InlineStack align="center" gap="300">
            <Spinner size="small" />
            <Text as="span">Loading subscription status...</Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Subscription Management
        </Text>
        
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            <Text as="p">{error}</Text>
          </Banner>
        )}

        {subscription?.hasActiveSubscription ? (
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  {subscription.planName || 'Spector Pro Plan'}
                </Text>
                <InlineStack gap="200" align="start">
                  {getStatusBadge(subscription.status)}
                  {subscription.trialDays && subscription.trialDays > 0 && (
                    <Badge tone="info">{`${subscription.trialDays} day trial`}</Badge>
                  )}
                </InlineStack>
              </BlockStack>
              
              {subscription.price && (
                <Text as="span" variant="headingLg" tone="success">
                  ${subscription.price.toFixed(2)}
                  <Text as="span" variant="bodySm" tone="subdued">
                    /{subscription.billingCycle === 'EVERY_30_DAYS' ? 'month' : 'cycle'}
                  </Text>
                </Text>
              )}
            </InlineStack>

            {subscription.createdAt && (
              <Text as="p" variant="bodySm" tone="subdued">
                Subscribed on {formatDate(subscription.createdAt)}
              </Text>
            )}

            <Divider />

            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">
                Plan Features
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">• Unlimited product monitoring</Text>
                <Text as="p" variant="bodySm">• Advanced analytics and reporting</Text>
                <Text as="p" variant="bodySm">• Bulk product management</Text>
                <Text as="p" variant="bodySm">• Smart inventory alerts</Text>
                <Text as="p" variant="bodySm">• Priority customer support</Text>
              </BlockStack>
            </BlockStack>

            <Divider />

            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">
                Manage Subscription
              </Text>
              
              {subscription.cancelUrl && (
                <InlineStack gap="300">
                  <Button
                    variant="secondary"
                    url={subscription.cancelUrl}
                    external
                  >
                    View in Shopify Admin
                  </Button>
                </InlineStack>
              )}

              {!showCancelConfirm ? (
                <Button
                  variant="plain"
                  tone="critical"
                  onClick={() => setShowCancelConfirm(true)}
                  loading={actionFetcher.state === 'submitting'}
                >
                  Cancel Subscription
                </Button>
              ) : (
                <Card background="bg-surface-caution">
                  <BlockStack gap="300">
                    <Text as="p" variant="bodySm">
                      Are you sure you want to cancel your subscription? You'll lose access to all premium features.
                    </Text>
                    <InlineStack gap="300">
                      <Button
                        variant="primary"
                        tone="critical"
                        onClick={handleCancelSubscription}
                        loading={actionFetcher.state === 'submitting'}
                      >
                        Yes, Cancel Subscription
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowCancelConfirm(false)}
                      >
                        Keep Subscription
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </BlockStack>
        ) : (
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              You don't have an active subscription. Subscribe to Spector Pro to unlock all features.
            </Text>

            <Card background="bg-surface-info">
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Spector Pro Plan - $29.99/month
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">• 7-day free trial</Text>
                  <Text as="p" variant="bodySm">• Unlimited product monitoring</Text>
                  <Text as="p" variant="bodySm">• Advanced analytics and reporting</Text>
                  <Text as="p" variant="bodySm">• Bulk product management</Text>
                  <Text as="p" variant="bodySm">• Smart inventory alerts</Text>
                  <Text as="p" variant="bodySm">• Priority customer support</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            <Button
              variant="primary"
              onClick={handleSubscribe}
              loading={actionFetcher.state === 'submitting'}
            >
              Start 7-Day Free Trial
            </Button>

            <Text as="p" variant="bodySm" tone="subdued">
              You can cancel anytime directly from this page or your Shopify admin. No long-term commitment required.
            </Text>
          </BlockStack>
        )}

        {shopDomain && (
          <Text as="p" variant="bodySm" tone="subdued">
            Subscription for: {shopDomain}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
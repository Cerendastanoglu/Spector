import {
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
  Banner,
  Icon,
  Button,
} from "@shopify/polaris";
import { CreditCardIcon, CalendarIcon, CheckIcon } from "@shopify/polaris-icons";
import styles from "../styles/settings.module.css";

interface Subscription {
  id: string;
  name: string;
  status: string;
  price?: string;
  currency?: string;
  currentPeriodEnd?: string;
  test: boolean;
  trialDays?: number;
  createdAt?: string;
}

interface SettingsProps {
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  error?: string;
  isDevelopmentStore?: boolean;
  shopPlanDisplayName?: string;
  managedPricingUrl?: string;
}

export function Settings({
  subscription,
  hasActiveSubscription,
  error,
  isDevelopmentStore = false,
  shopPlanDisplayName = 'Unknown',
  managedPricingUrl,
}: SettingsProps) {
  
  const handleManageSubscription = () => {
    if (managedPricingUrl) {
      window.open(managedPricingUrl, '_top');
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
  
  const getStoreTypeBadge = () => {
    if (isDevelopmentStore) {
      return <Badge tone="info">Development Store</Badge>;
    }
    return <Badge tone="success">{shopPlanDisplayName || 'Live Store'}</Badge>;
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

  // Calculate remaining trial time
  const getTrialTimeRemaining = () => {
    // Debug logging
    console.log('[Settings] Subscription data:', {
      createdAt: subscription?.createdAt,
      trialDays: subscription?.trialDays,
      status: subscription?.status,
      currentPeriodEnd: subscription?.currentPeriodEnd,
    });
    
    if (!subscription?.createdAt || subscription?.trialDays === undefined || subscription?.trialDays === null) {
      console.log('[Settings] No trial data available');
      return null;
    }
    
    // trialDays of 0 means no trial or trial already converted
    if (subscription.trialDays <= 0) {
      console.log('[Settings] trialDays is 0 or negative');
      return null;
    }
    
    try {
      const trialStart = new Date(subscription.createdAt);
      const trialEnd = new Date(trialStart.getTime() + subscription.trialDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const remainingMs = trialEnd.getTime() - now.getTime();
      
      console.log('[Settings] Trial calculation:', {
        trialStart: trialStart.toISOString(),
        trialEnd: trialEnd.toISOString(),
        now: now.toISOString(),
        remainingMs,
      });
      
      if (remainingMs <= 0) {
        return { expired: true, text: 'Trial Expired' };
      }
      
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      // Format the trial end date
      const trialEndDateFormatted = trialEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      if (days > 0) {
        return { expired: false, text: `${days}d ${remainingHours}h left`, endDate: trialEndDateFormatted };
      } else if (hours > 0) {
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return { expired: false, text: `${hours}h ${minutes}m left`, endDate: trialEndDateFormatted };
      } else {
        const minutes = Math.floor(remainingMs / (1000 * 60));
        return { expired: false, text: `${minutes}m left`, endDate: trialEndDateFormatted };
      }
    } catch (e) {
      console.error('[Settings] Error calculating trial time:', e);
      return null;
    }
  };

  const trialTimeRemaining = getTrialTimeRemaining();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Layout>
        {/* Error Banner - Only show if there's an actual error */}
        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Error loading subscription">
              <p>{error}</p>
            </Banner>
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
                  {/* Store Type */}
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Store Type
                    </Text>
                    {getStoreTypeBadge()}
                  </InlineStack>

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
                          Trial Time Remaining
                        </Text>
                      </InlineStack>
                      {trialTimeRemaining ? (
                        <BlockStack gap="100">
                          <Badge tone={trialTimeRemaining.expired ? "critical" : "attention"}>
                            ⏱️ {trialTimeRemaining.text}
                          </Badge>
                          {!trialTimeRemaining.expired && trialTimeRemaining.endDate && (
                            <Text as="p" variant="bodySm" tone="subdued">
                              Ends {trialTimeRemaining.endDate}
                            </Text>
                          )}
                        </BlockStack>
                      ) : (
                        <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                          Active - Full Access
                        </Text>
                      )}
                    </InlineStack>
                  )}

                  {/* Subscribe/Manage Button */}
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {hasActiveSubscription ? 'Manage Plan' : 'Subscribe'}
                    </Text>
                    <Button
                      variant={hasActiveSubscription ? "secondary" : "primary"}
                      onClick={handleManageSubscription}
                    >
                      {hasActiveSubscription ? 'Manage Subscription' : 'Subscribe Now'}
                    </Button>
                  </InlineStack>
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
                        Bulk Edit
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {hasActiveSubscription 
                          ? 'Edit unlimited products at once with bulk operations'
                          : 'Edit up to 10 products at once (unlimited with subscription)'}
                      </Text>
                    </BlockStack>
                  </div>
                  
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
      </Layout>
    </div>
  );
}

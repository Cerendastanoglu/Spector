/**
 * Welcome Route
 * 
 * Merchants are redirected here after approving their subscription.
 * Configure this path in Partner Dashboard as the "Welcome link" for your plan.
 * 
 * This route:
 * 1. Confirms subscription was approved successfully
 * 2. Shows onboarding message/tutorial
 * 3. Redirects to main app
 * 
 * URL format: /app/welcome?charge_id=gid://shopify/AppSubscription/123456789
 */

import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  InlineStack,
  Badge,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { checkSubscriptionStatus } from "~/services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Extract charge_id from URL (automatically appended by Shopify)
  const url = new URL(request.url);
  const chargeId = url.searchParams.get('charge_id');

  // Query subscription status to confirm approval
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(
    admin.graphql,
    shop
  );

  return json({
    shop,
    chargeId,
    hasActiveSubscription,
    subscription: subscription ? {
      id: subscription.id,
      name: subscription.name,
      status: subscription.status,
      price: subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount,
      currency: subscription.lineItems[0]?.plan?.pricingDetails?.price?.currencyCode,
      trialDays: subscription.trialDays,
    } : null,
  });
};

export default function Welcome() {
  const { chargeId, hasActiveSubscription, subscription } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Auto-redirect to main app after 5 seconds
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/app');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const handleContinue = () => {
    navigate('/app');
  };

  return (
    <Page title="Welcome to Spector! 🎉">
      <BlockStack gap="600">
        {/* Success Banner */}
        {hasActiveSubscription && subscription ? (
          <Banner
            tone="success"
            title="Subscription activated!"
          >
            <Text as="p">
              Your {subscription.name} plan is now active. You have full access to all Spector features.
            </Text>
          </Banner>
        ) : (
          <Banner
            tone="info"
            title="Subscription pending"
          >
            <Text as="p">
              Your subscription is being processed. This may take a few moments.
            </Text>
          </Banner>
        )}

        {/* Subscription Details */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Your Plan
              </Text>
              <Badge tone={hasActiveSubscription ? "success" : "attention"}>
                {subscription?.status || 'Processing'}
              </Badge>
            </InlineStack>

            {subscription && (
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Plan:</strong> {subscription.name}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Price:</strong> ${subscription.price}/{subscription.currency === 'USD' ? 'month' : subscription.currency.toLowerCase()}
                </Text>
                {subscription.trialDays && subscription.trialDays > 0 && (
                  <Text as="p" variant="bodyMd">
                    <strong>Trial Period:</strong> {subscription.trialDays} days free
                  </Text>
                )}
                {chargeId && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    <strong>Charge ID:</strong> {chargeId}
                  </Text>
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {/* Welcome Message & Features */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              What's Next?
            </Text>
            
            <Text as="p" variant="bodyMd">
              You now have access to all Spector features:
            </Text>

            <BlockStack gap="200">
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  <strong>Product Management</strong> - Manage unlimited products with bulk operations
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  <strong>Inventory Forecasting</strong> - Get AI-powered stock predictions
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  <strong>Real-Time Analytics</strong> - Track your store performance
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  <strong>Low Stock Alerts</strong> - Never run out of inventory
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  <strong>Email Support</strong> - Get help when you need it
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Auto-redirect message */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="p" variant="bodyMd">
                Redirecting to your dashboard in {countdown} seconds...
              </Text>
              {countdown > 0 && <Spinner size="small" />}
            </InlineStack>

            <Button
              variant="primary"
              onClick={handleContinue}
              fullWidth
            >
              Continue to Dashboard
            </Button>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

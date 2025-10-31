/**
 * Subscription Banner Component (Managed Pricing)
 * 
 * Shows subscription status and directs users to Shopify billing settings
 * With Managed Pricing, users manage subscriptions through Shopify admin
 */

import React from 'react';
import { Banner, Text, InlineStack, Button } from '@shopify/polaris';

interface SubscriptionData {
  status: string;
  hasAccess: boolean;
  planName: string;
  price?: string;
  currency?: string;
}

interface SubscriptionBannerProps {
  subscription: SubscriptionData;
  onSubscribe: () => void;
  loading?: boolean;
}

export function SubscriptionBanner({ subscription, onSubscribe, loading = false }: SubscriptionBannerProps) {
  // Active subscription - no banner needed
  if (subscription.status === 'ACTIVE' || subscription.hasAccess) {
    return null;
  }

  // No active subscription or pending approval
  if (!subscription.hasAccess) {
    const title = subscription.status === 'PENDING' 
      ? 'Subscription pending approval' 
      : '🎉 You\'re on the Free Trial';
    
    const message = subscription.status === 'PENDING'
      ? 'Please approve your subscription to continue using Spector.'
      : 'Enjoy full access to all Spector features for 3 days. Subscribe to continue after your trial ends.';

    const tone = subscription.status === 'PENDING' ? 'warning' : 'info';

    return (
      <Banner tone={tone}>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {title}
            </Text>
            <Text as="p" variant="bodySm">
              {message}
            </Text>
          </div>
          <Button
            variant="primary"
            onClick={onSubscribe}
            loading={loading}
          >
            View Pricing Plans
          </Button>
        </InlineStack>
      </Banner>
    );
  }

  return null;
}

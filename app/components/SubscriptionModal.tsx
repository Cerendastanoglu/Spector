/**
 * Subscription Required Modal
 * 
 * Modal shown when user tries to access feature without active subscription
 */

import React from 'react';
import { Modal, Text, BlockStack, InlineStack, Badge } from '@shopify/polaris';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  loading?: boolean;
  price?: string;
  reason?: 'trial_expired' | 'cancelled' | 'no_subscription';
}

export function SubscriptionModal({ 
  open, 
  onClose, 
  onSubscribe, 
  loading = false,
  price = '$10.99',
  reason = 'trial_expired',
}: SubscriptionModalProps) {
  
  const getTitleAndMessage = () => {
    switch (reason) {
      case 'trial_expired':
        return {
          title: 'Free Trial Ended',
          message: 'Your free trial has ended. Subscribe to continue using all of Spector\'s powerful features.',
        };
      case 'cancelled':
        return {
          title: 'Subscription Cancelled',
          message: 'Your subscription has been cancelled. Subscribe again to regain access to all features.',
        };
      case 'no_subscription':
      default:
        return {
          title: 'Subscription Required',
          message: 'Subscribe to access this feature and unlock the full power of Spector.',
        };
    }
  };

  const { title, message } = getTitleAndMessage();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={{
        content: 'View Pricing Plans',
        onAction: onSubscribe,
        loading,
      }}
      secondaryActions={[
        {
          content: 'Maybe later',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            {message}
          </Text>

          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              What's included:
            </Text>
            <BlockStack gap="100">
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  Unlimited product management & bulk operations
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  Advanced inventory forecasting
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  Real-time analytics dashboard
                </Text>
              </InlineStack>
              <InlineStack align="start" blockAlign="center" gap="200">
                <Badge tone="success">✓</Badge>
                <Text as="p" variant="bodySm">
                  Email support
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>

          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Only {price} per month
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Cancel anytime. No hidden fees.
            </Text>
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  DataTable,
  Link,
} from "@shopify/polaris";

interface HelpProps {
  isVisible: boolean;
}

export function Help({ isVisible: _isVisible }: HelpProps) {
  
  const quickStartRows = [
    [
      <Text as="span" fontWeight="semibold">Dashboard</Text>,
      <Text as="span" tone="subdued">View inventory analytics and product metrics</Text>,
      <Link url="https://aquarionlabs.com/spector/dashboard" target="_blank">Learn More</Link>
    ],
    [
      <Text as="span" fontWeight="semibold">Product Management</Text>,
      <Text as="span" tone="subdued">Edit multiple products at once with bulk operations</Text>,
      <Link url="https://aquarionlabs.com/spector/products" target="_blank">Learn More</Link>
    ],
    [
      <Text as="span" fontWeight="semibold">Forecasting</Text>,
      <Text as="span" tone="subdued">AI-powered inventory and revenue predictions</Text>,
      <Link url="https://aquarionlabs.com/spector/forecasting" target="_blank">Learn More</Link>
    ],
  ];
  
  return (
    <BlockStack gap="400">
      {/* Help & Support - Combined Card */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Help & Support
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Get help from our team - we typically respond within 24 hours
            </Text>
          </BlockStack>
          
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              For all inquiries, please contact us at:
            </Text>
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#f6f6f7', 
              borderRadius: '8px',
              display: 'inline-block',
              maxWidth: 'fit-content'
            }}>
              <Text as="p" variant="bodyLg" fontWeight="semibold">
                📧 ceren@spector-app.com
              </Text>
            </div>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Getting Started Guide */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                Getting Started
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Learn how to use Spector's powerful features
              </Text>
            </BlockStack>
            <Button 
              url="https://aquarionlabs.com/spector/" 
              target="_blank"
              variant="plain"
            >
              View Full Documentation →
            </Button>
          </InlineStack>
          
          <DataTable
            columnContentTypes={['text', 'text', 'text']}
            headings={['Feature', 'Description', 'Documentation']}
            rows={quickStartRows}
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

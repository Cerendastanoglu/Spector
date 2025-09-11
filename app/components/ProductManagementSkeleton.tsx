import { useState } from "react";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Spinner,
  Button,
  Box,
} from "@shopify/polaris";

interface ProductManagementSkeletonProps {
  isVisible: boolean;
}

export function ProductManagementSkeleton({ isVisible }: ProductManagementSkeletonProps) {
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  if (!isVisible) {
    return null;
  }

  const handleLoadFullComponent = async () => {
    setIsLoadingFull(true);
    
    // Dynamically import the full component
    try {
      await import('./ProductManagement');
      // This would trigger a re-render with the full component
      // For now, we'll show a loading state
    } catch (error) {
      console.error('Failed to load ProductManagement:', error);
    }
  };

  if (isLoadingFull) {
    return (
      <Card>
        <Box paddingBlock="800" paddingInline="600">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '16px'
          }}>
            <Spinner size="large" />
            <Text as="p" variant="bodyMd">
              Loading Product Management...
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Loading advanced features and data
            </Text>
          </div>
        </Box>
      </Card>
    );
  }

  return (
    <BlockStack gap="600">
      {/* Quick Preview Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                Product Management Center
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Advanced inventory control with smart filtering and bulk operations
              </Text>
            </BlockStack>
            <Button 
              variant="primary" 
              onClick={handleLoadFullComponent}
              loading={isLoadingFull}
            >
              Load Full Features
            </Button>
          </InlineStack>

          {/* Quick Stats Preview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {['Out of Stock', 'Critical Stock', 'Low Stock', 'Healthy Stock'].map((category, _index) => (
              <Card key={category} background="bg-surface-secondary">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    {category}
                  </Text>
                  <div style={{
                    height: '20px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    animation: 'pulse 2s ease-in-out infinite'
                  }} />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Loading data...
                  </Text>
                </BlockStack>
              </Card>
            ))}
          </div>

          {/* Feature Preview */}
          <Card background="bg-surface-info">
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                🚀 Advanced Features Available
              </Text>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                <Text as="p" variant="bodySm">✅ Bulk inventory editing</Text>
                <Text as="p" variant="bodySm">✅ Smart filtering & search</Text>
                <Text as="p" variant="bodySm">✅ CSV/JSON export</Text>
                <Text as="p" variant="bodySm">✅ Collection management</Text>
                <Text as="p" variant="bodySm">✅ Real-time sync</Text>
                <Text as="p" variant="bodySm">✅ Advanced analytics</Text>
              </div>
              <Button 
                variant="primary" 
                onClick={handleLoadFullComponent}
                loading={isLoadingFull}
              >
                Access Full Product Management
              </Button>
            </BlockStack>
          </Card>
        </BlockStack>
      </Card>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </BlockStack>
  );
}

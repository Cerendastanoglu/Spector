import { BlockStack, InlineStack, Box, Text, Badge, Button } from "@shopify/polaris";

interface TopProduct {
  id: string;
  name: string;
  value: number;
  variants: number;
  inventoryStatus: string;
  priceRange: string;
}

interface TopProductsSliderProps {
  /** Array of top products to display */
  products: TopProduct[];
  /** Currency symbol for displaying values */
  currencySymbol: string;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Callback to retry loading data */
  onRetry?: () => void;
  /** Function to format currency values */
  formatCurrency: (value: number) => string;
}

/**
 * Displays a horizontal scrolling list of top products by catalog value
 * 
 * Features:
 * - Horizontal scroll for many products
 * - Loading skeleton state
 * - Error state with retry
 * - Empty state
 * - Responsive card layout
 */
export function TopProductsSlider({
  products,
  currencySymbol: _currencySymbol,
  isLoading = false,
  error = null,
  onRetry,
  formatCurrency,
}: TopProductsSliderProps) {
  
  // Loading skeleton
  const renderSkeleton = () => (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
        {[1, 2, 3, 4].map((i) => (
          <Box 
            key={i}
            minWidth="280px"
            padding="400"
            background="bg-surface" 
            borderRadius="300"
            borderWidth="025" 
            borderColor="border"
          >
            <BlockStack gap="300">
              <Box background="bg-surface-secondary" padding="400" borderRadius="100" />
              <Box background="bg-surface-secondary" padding="200" borderRadius="100" />
              <Box background="bg-surface-secondary" padding="150" borderRadius="100" />
            </BlockStack>
          </Box>
        ))}
      </div>
    </div>
  );

  // Error state
  if (error && !products) {
    return (
      <Box padding="400" background="bg-surface-critical" borderRadius="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodyMd" tone="critical">
            {error}
          </Text>
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="primary"
              size="micro"
            >
              Retry
            </Button>
          )}
        </InlineStack>
      </Box>
    );
  }

  // Initial loading
  if (isLoading && !products) {
    return renderSkeleton();
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
          No products to display
        </Text>
      </Box>
    );
  }

  // Main content
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
        {products.map((product, index) => (
          <Box 
            key={product.id}
            minWidth="280px"
            padding="400"
            background="bg-surface" 
            borderRadius="300"
            borderWidth="025" 
            borderColor="border"
          >
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="start">
                <InlineStack gap="200" blockAlign="center">
                  <Box 
                    background="bg-surface-info" 
                    padding="150" 
                    borderRadius="100"
                  >
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      #{index + 1}
                    </Text>
                  </Box>
                  <Badge tone={product.inventoryStatus === 'In Stock' ? 'success' : 'critical'}>
                    {product.inventoryStatus}
                  </Badge>
                </InlineStack>
              </InlineStack>

              <BlockStack gap="200">
                <Text as="h4" variant="bodyLg" fontWeight="semibold" truncate>
                  {product.name}
                </Text>
                
                <InlineStack gap="200" blockAlign="center">
                  <Text as="p" variant="headingLg" fontWeight="bold" tone="success">
                    {formatCurrency(product.value)}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    catalog value
                  </Text>
                </InlineStack>

                <InlineStack gap="400" wrap={false}>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Price Range
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      {product.priceRange}
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Variants
                    </Text>
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      {product.variants}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Box>
        ))}
      </div>
    </div>
  );
}

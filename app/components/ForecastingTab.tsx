import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Icon,
  Box,
  Tooltip,
  Collapsible,
  Spinner,
  Banner
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  CashDollarIcon,
  ChartVerticalIcon,
  ViewIcon,
  EditIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "@shopify/polaris-icons";
import { useState, useEffect } from "react";

interface ForecastItem {
  id: string;
  title: string;
  sku: string;
  handle: string;
  currentStock: number;
  averageDailyDemand: number;
  forecastDays: number;
  reorderPoint: number;
  status: 'critical' | 'low' | 'healthy';
  vendor: string;
  category: string;
  lastOrderDate: string;
  suggestedReorderQuantity: number;
  profitMargin: number;
  leadTime: number;
  velocity: 'fast' | 'medium' | 'slow';
  price: number;
  totalRevenue60Days: number;
  totalSold60Days: number;
}

interface InventoryForecastingData {
  forecastItems: ForecastItem[];
  summary: {
    totalProducts: number;
    criticalItems: number;
    lowStockItems: number;
    healthyItems: number;
    totalRevenue60Days: number;
    averageDailyRevenue: number;
    fastMovingItems: number;
    mediumMovingItems: number;
    slowMovingItems: number;
  };
}

interface ForecastingTabProps {
  shopDomain?: string;
}

export function ForecastingTab({ shopDomain }: ForecastingTabProps) {
  const [showAIMethodology, setShowAIMethodology] = useState(false);
  const [forecastData, setForecastData] = useState<InventoryForecastingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real inventory forecasting data
  useEffect(() => {
    const fetchForecastData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/app/api/inventory-forecasting');
        const result = await response.json();
        
        if (result.success) {
          setForecastData(result.data);
        } else {
          setError(result.error || 'Failed to fetch forecasting data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching forecast data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecastData();
  }, []);

  // Refresh function
  const handleRefresh = () => {
    setForecastData(null);
    setLoading(true);
    setError(null);
    // Re-trigger useEffect
    window.location.reload();
  };

  // Show loading state
  if (loading) {
    return (
      <Card>
        <BlockStack gap="400" align="center">
          <Spinner accessibilityLabel="Loading forecasting data" size="large" />
          <Text as="p" variant="bodyMd" tone="subdued">
            Loading inventory forecasting data...
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Analyzing products and orders from the last 60 days
          </Text>
        </BlockStack>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <Banner tone="critical" title="Failed to load forecasting data">
          <BlockStack gap="200">
            <Text as="p">{error}</Text>
            <Button onClick={handleRefresh} variant="primary">
              Try Again
            </Button>
          </BlockStack>
        </Banner>
      </Card>
    );
  }

  // Show empty state if no data
  if (!forecastData || !forecastData.forecastItems.length) {
    return (
      <Card>
        <BlockStack gap="400" align="center">
          <Text as="h3" variant="headingMd">No forecasting data available</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            No products with inventory or sales data found for the last 60 days.
          </Text>
          <Button onClick={handleRefresh} variant="primary">
            Refresh Data
          </Button>
        </BlockStack>
      </Card>
    );
  }

  const { summary, forecastItems } = forecastData;

  return (
    <BlockStack gap="500">
      {/* Page Header */}
      <Card>
        <BlockStack gap="300">
          <Text as="h1" variant="headingLg">
            Inventory Forecasting & Demand Planning
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            AI-powered inventory forecasting to optimize stock levels and prevent stockouts
          </Text>
        </BlockStack>
      </Card>

      {/* Executive Summary Cards - Compact */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px' 
      }}>
        <Card>
          <InlineStack gap="200" blockAlign="center">
            <Box background="bg-fill-success-secondary" padding="150" borderRadius="100">
              <Icon source={CheckCircleIcon} tone="success" />
            </Box>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="medium">Inventory Health</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                {summary.healthyItems}/{summary.totalProducts}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Products well-stocked
              </Text>
            </BlockStack>
          </InlineStack>
        </Card>

        <Card>
          <InlineStack gap="200" blockAlign="center">
            <Box background="bg-fill-critical-secondary" padding="150" borderRadius="100">
              <Icon source={AlertTriangleIcon} tone="critical" />
            </Box>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="medium">Critical Actions</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
                {summary.criticalItems + summary.lowStockItems}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Need attention
              </Text>
            </BlockStack>
          </InlineStack>
        </Card>

        <Card>
          <InlineStack gap="200" blockAlign="center">
            <Box background="bg-fill-info-secondary" padding="150" borderRadius="100">
              <Icon source={CashDollarIcon} tone="info" />
            </Box>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="medium">Revenue (60 days)</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                ${summary.totalRevenue60Days.toLocaleString()}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Last 60 days revenue
              </Text>
            </BlockStack>
          </InlineStack>
        </Card>

        <Card>
          <InlineStack gap="200" blockAlign="center">
            <Box background="bg-fill-success-secondary" padding="150" borderRadius="100">
              <Icon source={ChartVerticalIcon} tone="success" />
            </Box>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="medium">Daily Revenue (60d avg)</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                ${summary.averageDailyRevenue.toFixed(2)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                From real orders
              </Text>
            </BlockStack>
          </InlineStack>
        </Card>
      </div>

      {/* Professional Inventory Table */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Inventory Forecast ({summary.totalProducts} products)
            </Text>
            <InlineStack gap="200">
              <Button variant="secondary" size="slim" onClick={handleRefresh}>
                Refresh Data
              </Button>
              <Button variant="secondary" size="slim">Export Report</Button>
            </InlineStack>
          </InlineStack>

          {/* Advanced Table */}
          <div style={{ 
            border: '1px solid #e1e3e5',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr 100px',
              gap: '16px',
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e1e3e5',
              fontSize: '12px',
              fontWeight: '600',
              color: '#4a5568',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Product & SKU</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Current Stock</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Daily Demand</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Forecast Status</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Lead Time</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Velocity</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Profit Margin</Text>
              <Text as="span" variant="bodyXs" fontWeight="semibold">Actions</Text>
            </div>

            {/* Table Rows */}
            {forecastItems.map((item, index) => (
              <div key={item.id} style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr 100px',
                gap: '16px',
                padding: '20px',
                backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc',
                borderBottom: index < forecastItems.length - 1 ? '1px solid #f1f3f4' : 'none',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafbfc';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              >
                {/* Product Info */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {item.title}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    SKU: {item.sku} • {item.vendor}
                  </Text>
                </div>

                {/* Current Stock with visual indicator */}
                <div>
                  <Text as="p" variant="bodyLg" fontWeight="bold" 
                    tone={item.status === 'critical' ? 'critical' : item.status === 'low' ? 'caution' : undefined}>
                    {item.currentStock}
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">units</Text>
                </div>

                {/* Daily Demand */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">{item.averageDailyDemand}</Text>
                  <Text as="p" variant="bodyXs" tone="subdued">per day</Text>
                </div>

                {/* Status with Days Remaining */}
                <div>
                  <Badge 
                    tone={item.status === 'critical' ? 'critical' : item.status === 'low' ? 'warning' : 'success'}
                    size="small"
                  >
                    {`${item.forecastDays} days left`}
                  </Badge>
                  <Box paddingBlockStart="100">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      {item.status === 'critical' ? 'Reorder now' : 
                       item.status === 'low' ? 'Plan reorder' : 'Well stocked'}
                    </Text>
                  </Box>
                </div>

                {/* Lead Time */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="medium">{item.leadTime}</Text>
                  <Text as="p" variant="bodyXs" tone="subdued">days</Text>
                </div>

                {/* Velocity */}
                <div>
                  <Badge 
                    tone={item.velocity === 'fast' ? 'success' : item.velocity === 'medium' ? 'info' : 'attention'}
                    size="small"
                  >
                    {item.velocity}
                  </Badge>
                </div>

                {/* Profit Margin */}
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                    {item.profitMargin.toFixed(1)}%
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">margin</Text>
                </div>

                {/* Actions */}
                <InlineStack gap="100">
                  <Tooltip content="View online store">
                    <Button
                      icon={ViewIcon}
                      variant="tertiary"
                      size="micro"
                      onClick={() => {
                        // Open product's online store page
                        if (shopDomain && item.handle) {
                          window.open(`https://${shopDomain}/products/${item.handle}`, '_blank');
                        } else {
                          console.log('Product handle or shop domain not available for:', item.id);
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip content="Edit product">
                    <Button
                      icon={EditIcon}
                      variant="tertiary"
                      size="micro"
                      onClick={() => {
                        // Open product in Shopify admin
                        if (shopDomain && item.id) {
                          window.open(`https://${shopDomain}/admin/products/${item.id}`, '_blank');
                        } else {
                          console.log('Product ID or shop domain not available for:', item.id);
                        }
                      }}
                    />
                  </Tooltip>
                </InlineStack>
              </div>
            ))}
          </div>
        </BlockStack>
      </Card>

      {/* Forecasting Methodology - Accordion */}
      <Card>
        <Box background="bg-surface-secondary" padding="300" borderRadius="200">
          <Button
            onClick={() => setShowAIMethodology(!showAIMethodology)}
            variant="plain"
            size="large"
            textAlign="left"
            fullWidth
            icon={showAIMethodology ? ChevronDownIcon : ChevronRightIcon}
          >
            How Our AI Forecasting Works
          </Button>
          
          <Collapsible
            open={showAIMethodology}
            id="ai-methodology"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <Box paddingBlockStart="400">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                  <BlockStack gap="300">
                    <InlineStack gap="300" blockAlign="center">
                      <Box background="bg-fill-info-secondary" padding="200" borderRadius="100">
                        <Icon source={ChartVerticalIcon} tone="info" />
                      </Box>
                      <Text as="p" variant="headingSm" fontWeight="semibold">Smart Demand Analysis</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We analyze your sales history, seasonal trends, and market patterns to predict accurate daily demand for each product.
                    </Text>
                  </BlockStack>
                </Box>

                <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                  <BlockStack gap="300">
                    <InlineStack gap="300" blockAlign="center">
                      <Box background="bg-fill-warning-secondary" padding="200" borderRadius="100">
                        <Icon source={ClockIcon} tone="warning" />
                      </Box>
                      <Text as="p" variant="headingSm" fontWeight="semibold">Lead Time Optimization</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Our system tracks supplier lead times and automatically adjusts reorder points to prevent stockouts while minimizing carrying costs.
                    </Text>
                  </BlockStack>
                </Box>

                <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                  <BlockStack gap="300">
                    <InlineStack gap="300" blockAlign="center">
                      <Box background="bg-fill-success-secondary" padding="200" borderRadius="100">
                        <Icon source={CashDollarIcon} tone="success" />
                      </Box>
                      <Text as="p" variant="headingSm" fontWeight="semibold">Profit-First Prioritization</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We prioritize inventory decisions based on profit margins and velocity, helping you focus capital on your most profitable products.
                    </Text>
                  </BlockStack>
                </Box>
              </div>
            </Box>
          </Collapsible>
        </Box>
      </Card>
    </BlockStack>
  );
}

export default ForecastingTab;
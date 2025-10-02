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
  Collapsible
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
import { useState } from "react";

interface ForecastingTabProps {
  shopDomain?: string;
}

export function ForecastingTab({ shopDomain }: ForecastingTabProps) {
  const [showAIMethodology, setShowAIMethodology] = useState(false);

  // Mock data for inventory forecasting (will be replaced with real API calls)
  const mockInventoryData = [
    {
      id: '1',
      title: 'Premium Cotton T-Shirt',
      sku: 'TCT-001',
      handle: 'premium-cotton-t-shirt',
      currentStock: 5,
      averageDailyDemand: 2.3,
      forecastDays: 2,
      reorderPoint: 15,
      status: 'critical',
      vendor: 'Cotton Co.',
      category: 'Clothing',
      lastOrderDate: '2024-09-15',
      suggestedReorderQuantity: 50,
      profitMargin: 28.5,
      leadTime: 14,
      velocity: 'fast'
    },
    {
      id: '2', 
      title: 'Wireless Bluetooth Headphones',
      sku: 'WBH-002',
      handle: 'wireless-bluetooth-headphones',
      currentStock: 23,
      averageDailyDemand: 1.8,
      forecastDays: 13,
      reorderPoint: 20,
      status: 'low',
      vendor: 'Audio Tech',
      category: 'Electronics',
      lastOrderDate: '2024-09-10',
      suggestedReorderQuantity: 30,
      profitMargin: 45.2,
      leadTime: 21,
      velocity: 'medium'
    },
    {
      id: '3',
      title: 'Organic Face Moisturizer',
      sku: 'OFM-003',
      handle: 'organic-face-moisturizer',
      currentStock: 45,
      averageDailyDemand: 1.2,
      forecastDays: 38,
      reorderPoint: 25,
      status: 'healthy',
      vendor: 'Beauty Supply',
      category: 'Beauty',
      lastOrderDate: '2024-08-30',
      suggestedReorderQuantity: 40,
      profitMargin: 62.1,
      leadTime: 10,
      velocity: 'slow'
    },
    {
      id: '4',
      title: 'Stainless Steel Water Bottle',
      sku: 'SSWB-004',
      handle: 'stainless-steel-water-bottle',
      currentStock: 8,
      averageDailyDemand: 3.1,
      forecastDays: 3,
      reorderPoint: 18,
      status: 'critical',
      vendor: 'DrinkWare Ltd',
      category: 'Home & Garden',
      lastOrderDate: '2024-09-12',
      suggestedReorderQuantity: 60,
      profitMargin: 35.8,
      leadTime: 12,
      velocity: 'fast'
    },
    {
      id: '5',
      title: 'Yoga Mat - Premium',
      sku: 'YMP-005',
      handle: 'yoga-mat-premium',
      currentStock: 15,
      averageDailyDemand: 0.8,
      forecastDays: 19,
      reorderPoint: 12,
      status: 'low',
      vendor: 'Fitness Pro',
      category: 'Sports',
      lastOrderDate: '2024-09-05',
      suggestedReorderQuantity: 25,
      profitMargin: 51.3,
      leadTime: 7,
      velocity: 'slow'
    }
  ];

  // Get key metrics for overview cards
  const criticalCount = mockInventoryData.filter(item => item.status === 'critical').length;
  const lowStockCount = mockInventoryData.filter(item => item.status === 'low').length;
  const totalValue = mockInventoryData.reduce((sum, item) => sum + (item.currentStock * 25), 0); // Mock price of $25
  const avgProfitMargin = mockInventoryData.reduce((sum, item) => sum + item.profitMargin, 0) / mockInventoryData.length;

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
                {mockInventoryData.length - criticalCount - lowStockCount}/{mockInventoryData.length}
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
                {criticalCount + lowStockCount}
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
              <Text as="p" variant="bodySm" fontWeight="medium">Inventory Value</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                ${totalValue.toLocaleString()}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Total investment
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
              <Text as="p" variant="bodySm" fontWeight="medium">Avg. Profit Margin</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                {avgProfitMargin.toFixed(1)}%
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Weighted average
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
              Inventory Forecast ({mockInventoryData.length} products)
            </Text>
            <InlineStack gap="200">
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
            {mockInventoryData.map((item, index) => (
              <div key={item.id} style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr 100px',
                gap: '16px',
                padding: '20px',
                backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc',
                borderBottom: index < mockInventoryData.length - 1 ? '1px solid #f1f3f4' : 'none',
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
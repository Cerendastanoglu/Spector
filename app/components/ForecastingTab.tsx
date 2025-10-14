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
  Banner,
  Tabs
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  CashDollarIcon,
  ChartVerticalIcon,
  ViewIcon,
  EditIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon
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
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

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

  // Filter items by category
  const outOfStockItems = forecastItems.filter(item => item.currentStock === 0);
  const slowMovingItems = forecastItems.filter(item => item.velocity === 'slow' && item.currentStock > 0);
  const activeInventoryItems = forecastItems.filter(item => 
    item.currentStock > 0 && item.velocity !== 'slow'
  );

  const tabs = [
    {
      id: 'out-of-stock',
      content: `Out of Stock (${outOfStockItems.length})`,
      badge: outOfStockItems.length > 0 ? String(outOfStockItems.length) : undefined,
      panelID: 'out-of-stock-panel',
    },
    {
      id: 'slow-moving',
      content: `Slow Moving (${slowMovingItems.length})`,
      badge: slowMovingItems.length > 0 ? String(slowMovingItems.length) : undefined,
      panelID: 'slow-moving-panel',
    },
    {
      id: 'active-inventory',
      content: `Active Inventory (${activeInventoryItems.length})`,
      panelID: 'active-inventory-panel',
    },
  ];

  // Helper function to render product table
  const renderProductTable = (items: ForecastItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <Box padding="800">
          <BlockStack gap="300" inlineAlign="center">
            <Icon source={CheckCircleIcon} tone="success" />
            <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
              {emptyMessage}
            </Text>
          </BlockStack>
        </Box>
      );
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              borderBottom: '2px solid #e1e3e5',
              backgroundColor: '#f8f9fa'
            }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                PRODUCT
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                CURRENT STOCK
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                DAILY DEMAND
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                DAYS LEFT
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                VELOCITY
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isExpanded = expandedRows.has(item.id);
              return (
                <>
                  <tr 
                    key={item.id}
                    style={{
                      borderBottom: isExpanded ? 'none' : '1px solid #f1f3f4',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {item.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {item.vendor}
                        </Text>
                      </BlockStack>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Text 
                        as="p" 
                        variant="bodyLg" 
                        fontWeight="bold"
                        tone={item.status === 'critical' ? 'critical' : item.status === 'low' ? 'caution' : undefined}
                      >
                        {item.currentStock}
                      </Text>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {item.averageDailyDemand.toFixed(1)}
                      </Text>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Badge
                        tone={item.status === 'critical' ? 'critical' : item.status === 'low' ? 'warning' : 'success'}
                      >
                        {item.forecastDays >= 999 ? 'N/A' : `${item.forecastDays} days`}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Badge
                        tone={item.velocity === 'fast' ? 'success' : item.velocity === 'medium' ? 'info' : 'attention'}
                      >
                        {item.velocity}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <Tooltip content="View store page">
                          <Button
                            icon={ViewIcon}
                            size="micro"
                            onClick={() => {
                              if (shopDomain && item.handle) {
                                window.open(`https://${shopDomain}/products/${item.handle}`, '_blank');
                              }
                            }}
                          />
                        </Tooltip>
                        <Tooltip content="Edit in Shopify">
                          <Button
                            icon={EditIcon}
                            variant="primary"
                            size="micro"
                            onClick={() => {
                              if (shopDomain && item.id) {
                                const productId = item.id.split('/').pop();
                                window.open(`https://admin.shopify.com/store/${shopDomain.split('.')[0]}/products/${productId}`, '_blank');
                              }
                            }}
                          />
                        </Tooltip>
                        <Tooltip content={isExpanded ? "Hide details" : "Show details"}>
                          <Button
                            icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                            size="micro"
                            onClick={() => toggleRowExpansion(item.id)}
                          />
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr 
                      key={`${item.id}-details`}
                      style={{
                        borderBottom: '1px solid #f1f3f4',
                        backgroundColor: index % 2 === 0 ? '#fafbfc' : '#ffffff'
                      }}
                    >
                      <td colSpan={6} style={{ padding: '0' }}>
                        <Box padding="500" background="bg-surface-secondary">
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '24px'
                          }}>
                            {/* Left Column - Product Info & Inventory */}
                            <BlockStack gap="400">
                              <Box background="bg-surface" padding="400" borderRadius="300" borderWidth="025" borderColor="border">
                                <BlockStack gap="300">
                                  <Text as="h4" variant="headingMd" fontWeight="bold">
                                    Product Details
                                  </Text>
                                  <div style={{ display: 'grid', gap: '12px' }}>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">SKU</Text>
                                      <Badge size="medium">{item.sku}</Badge>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Reorder Quantity</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                                        {item.suggestedReorderQuantity} units
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Reorder Point</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {item.reorderPoint} units
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Lead Time</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {item.leadTime} days
                                      </Text>
                                    </InlineStack>
                                  </div>
                                </BlockStack>
                              </Box>

                              <Box background="bg-surface" padding="400" borderRadius="300" borderWidth="025" borderColor="border">
                                <BlockStack gap="300">
                                  <InlineStack gap="200" blockAlign="center">
                                    <Icon source={CashDollarIcon} tone="success" />
                                    <Text as="h4" variant="headingMd" fontWeight="bold">
                                      Financial Performance
                                    </Text>
                                  </InlineStack>
                                  <div style={{ display: 'grid', gap: '12px' }}>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Revenue (60 days)</Text>
                                      <Text as="p" variant="headingSm" fontWeight="bold">
                                        ${item.totalRevenue60Days.toFixed(2)}
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Units Sold</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {item.totalSold60Days}
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Profit Margin</Text>
                                      <Text as="p" variant="headingSm" fontWeight="bold" tone="success">
                                        {item.profitMargin.toFixed(1)}%
                                      </Text>
                                    </InlineStack>
                                  </div>
                                </BlockStack>
                              </Box>
                            </BlockStack>

                            {/* Right Column - Order Statistics */}
                            <Box background="bg-surface" padding="400" borderRadius="300" borderWidth="025" borderColor="border">
                              <BlockStack gap="400">
                                <InlineStack gap="200" blockAlign="center">
                                  <Icon source={ChartVerticalIcon} tone="info" />
                                  <Text as="h4" variant="headingMd" fontWeight="bold">
                                    Order Trends
                                  </Text>
                                </InlineStack>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '16px'
                                }}>
                                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                    <BlockStack gap="100" inlineAlign="center">
                                      <Text as="p" variant="bodyXs" tone="subdued">Daily</Text>
                                      <Text as="p" variant="headingLg" fontWeight="bold">
                                        {item.averageDailyDemand.toFixed(1)}
                                      </Text>
                                      <Text as="p" variant="bodyXs" tone="subdued">orders/day</Text>
                                    </BlockStack>
                                  </Box>
                                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                    <BlockStack gap="100" inlineAlign="center">
                                      <Text as="p" variant="bodyXs" tone="subdued">Weekly</Text>
                                      <Text as="p" variant="headingLg" fontWeight="bold">
                                        {(item.averageDailyDemand * 7).toFixed(1)}
                                      </Text>
                                      <Text as="p" variant="bodyXs" tone="subdued">orders/week</Text>
                                    </BlockStack>
                                  </Box>
                                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                    <BlockStack gap="100" inlineAlign="center">
                                      <Text as="p" variant="bodyXs" tone="subdued">Monthly</Text>
                                      <Text as="p" variant="headingLg" fontWeight="bold">
                                        {(item.averageDailyDemand * 30).toFixed(0)}
                                      </Text>
                                      <Text as="p" variant="bodyXs" tone="subdued">orders/month</Text>
                                    </BlockStack>
                                  </Box>
                                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                    <BlockStack gap="100" inlineAlign="center">
                                      <Text as="p" variant="bodyXs" tone="subdued">Yearly</Text>
                                      <Text as="p" variant="headingLg" fontWeight="bold">
                                        {(item.averageDailyDemand * 365).toFixed(0)}
                                      </Text>
                                      <Text as="p" variant="bodyXs" tone="subdued">projected</Text>
                                    </BlockStack>
                                  </Box>
                                </div>
                                <Box paddingBlockStart="200">
                                  <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
                                    Based on 60-day sales history
                                  </Text>
                                </Box>
                              </BlockStack>
                            </Box>
                          </div>
                        </Box>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <BlockStack gap="400">
      {/* Page Header with Tabs */}
      <Card>
        <BlockStack gap="400">
          {/* Header Section */}
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="200">
                <Text as="h1" variant="headingLg" fontWeight="bold">
                  Inventory Forecasting & Demand Planning
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  AI-powered forecasting based on 60 days of sales data • {summary.totalProducts} products analyzed
                </Text>
              </BlockStack>
              <Button onClick={handleRefresh} variant="secondary">
                Refresh Data
              </Button>
            </InlineStack>

            {/* Tabs and Stats Row Combined */}
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between" blockAlign="center">
                <div style={{ flex: 1 }}>
                  <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
                </div>
                <InlineStack gap="400">
                  <BlockStack gap="050" inlineAlign="center">
                    <Text as="p" variant="bodyXs" tone="subdued">Critical</Text>
                    <Text as="p" variant="headingMd" fontWeight="bold" tone="critical">
                      {summary.criticalItems}
                    </Text>
                  </BlockStack>
                  <Box borderInlineStartWidth="025" borderColor="border" paddingInlineStart="400">
                    <BlockStack gap="050" inlineAlign="center">
                      <Text as="p" variant="bodyXs" tone="subdued">Low Stock</Text>
                      <Text as="p" variant="headingMd" fontWeight="bold" tone="caution">
                        {summary.lowStockItems}
                      </Text>
                    </BlockStack>
                  </Box>
                  <Box borderInlineStartWidth="025" borderColor="border" paddingInlineStart="400">
                    <BlockStack gap="050" inlineAlign="center">
                      <Text as="p" variant="bodyXs" tone="subdued">Healthy</Text>
                      <Text as="p" variant="headingMd" fontWeight="bold" tone="success">
                        {summary.healthyItems}
                      </Text>
                    </BlockStack>
                  </Box>
                </InlineStack>
              </InlineStack>
            </Box>
          </BlockStack>

          {/* Tab Content */}
          <Box paddingBlockStart="400">
            {/* Out of Stock Tab */}
            {selectedTab === 0 && (
                  <BlockStack gap="300">
                    {outOfStockItems.length > 0 && (
                      <Banner tone="critical">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodyMd">
                            <strong>{outOfStockItems.length} products</strong> are completely out of stock and need immediate reordering.
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            These items are currently unavailable for purchase and may be losing sales.
                          </Text>
                        </BlockStack>
                      </Banner>
                    )}
                    {renderProductTable(
                      outOfStockItems,
                      'Great! No products are out of stock. All items are available for purchase.'
                    )}
                  </BlockStack>
                )}

                {/* Slow Moving Tab */}
                {selectedTab === 1 && (
                  <BlockStack gap="300">
                    {slowMovingItems.length > 0 && (
                      <Banner tone="warning">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodyMd">
                            <strong>{slowMovingItems.length} slow-moving products</strong> detected. Consider these strategies:
                          </Text>
                          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                            <li><strong>Promotional Campaigns:</strong> Run discounts or special offers to boost sales</li>
                            <li><strong>Product Bundling:</strong> Bundle with popular fast-moving products</li>
                            <li><strong>Pricing Review:</strong> Evaluate if pricing is competitive</li>
                            <li><strong>Content Optimization:</strong> Improve product descriptions, images, and SEO</li>
                            <li><strong>Marketing Push:</strong> Feature in email campaigns or social media</li>
                            <li><strong>Customer Feedback:</strong> Review reviews and adjust based on feedback</li>
                            <li><strong>Discontinuation:</strong> Consider removing if consistently underperforming</li>
                          </ul>
                        </BlockStack>
                      </Banner>
                    )}
                    {renderProductTable(
                      slowMovingItems,
                      'Excellent! No slow-moving products detected. All items are selling at a healthy pace.'
                    )}
                  </BlockStack>
                )}

                {/* Active Inventory Tab */}
                {selectedTab === 2 && (
                  <BlockStack gap="300">
                    {activeInventoryItems.length > 0 && (
                      <Banner tone="success">
                        <Text as="p" variant="bodyMd">
                          <strong>{activeInventoryItems.length} products</strong> are in stock and selling well. Monitor inventory levels and reorder as needed based on forecasts.
                        </Text>
                      </Banner>
                    )}
                    {renderProductTable(
                      activeInventoryItems,
                      'No active inventory items to display.'
                    )}
                  </BlockStack>
                )}
          </Box>
        </BlockStack>
      </Card>

      {/* AI Methodology Section */}
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
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
  isOutOfStock: boolean;
  // Enhanced prediction data
  predictionDetails: {
    algorithm: 'moving-average' | 'seasonal' | 'trend-analysis';
    confidence: number;
    seasonalityFactor: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    volatility: 'high' | 'medium' | 'low';
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    explanation: string;
    calculationDetails: {
      totalOrderDays: number;
      averageOrderInterval: number;
      maxDailyDemand: number;
      minDailyDemand: number;
      standardDeviation: number;
      safetyStockDays: number;
    };
  };
  riskFactors: string[];
  recommendations: string[];
}

interface InventoryForecastingData {
  forecastItems: ForecastItem[];
  summary: {
    totalProducts: number;
    criticalItems: number;
    lowStockItems: number;
    healthyItems: number;
    outOfStockItems: number;
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showOutOfStock, setShowOutOfStock] = useState(false);

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

  // Toggle expanded item details
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
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
            <Box background="bg-fill-critical-secondary" padding="150" borderRadius="100">
              <Icon source={ClockIcon} tone="critical" />
            </Box>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="medium">Out of Stock</Text>
              <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
                {summary.outOfStockItems}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Requires restocking
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

            {/* OUT OF STOCK ACCORDION ROW - First row in table */}
            {summary.outOfStockItems > 0 && (
              <div>
                {/* OOS Accordion Header Row */}
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr 100px',
                    gap: '16px',
                    padding: '20px',
                    backgroundColor: '#fef2f2',
                    borderBottom: showOutOfStock ? 'none' : '1px solid #fecaca',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setShowOutOfStock(!showOutOfStock)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                >
                  <div>
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={showOutOfStock ? ChevronDownIcon : ChevronRightIcon} tone="critical" />
                      <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
                        ⚠️ Out of Stock Items
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Click to view {summary.outOfStockItems} products needing restock
                    </Text>
                  </div>

                  <div>
                    <Badge tone="critical" size="large">{summary.outOfStockItems.toString()}</Badge>
                    <Text as="p" variant="bodyXs" tone="subdued">products</Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodyMd" tone="critical" fontWeight="semibold">
                      Urgent
                    </Text>
                  </div>

                  <div>
                    <Badge tone="critical">Restock Now</Badge>
                  </div>

                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>

                {/* OOS Expanded Content */}
                {showOutOfStock && (
                  <div style={{
                    backgroundColor: '#fffbfb',
                    borderBottom: '2px solid #fecaca',
                    padding: '16px'
                  }}>
                    <BlockStack gap="300">
                      <Banner tone="critical">
                        <Text as="p" variant="bodyMd">
                          These products are out of stock. Review by last order date and sales velocity to prioritize restocking.
                        </Text>
                      </Banner>

                      {/* OOS Items Sub-table */}
                      <div style={{ 
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'white'
                      }}>
                        {/* OOS Sub-header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 0.8fr 100px',
                          gap: '12px',
                          padding: '12px 16px',
                          backgroundColor: '#fef2f2',
                          borderBottom: '1px solid #fecaca',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#991b1b',
                          textTransform: 'uppercase'
                        }}>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Product</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Last Order</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">60d Sales</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Daily Demand</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Velocity</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Priority</Text>
                          <Text as="span" variant="bodyXs" fontWeight="semibold">Actions</Text>
                        </div>

                        {/* OOS Items */}
                        {forecastItems.filter(item => item.isOutOfStock).map((item, idx) => {
                          const daysSinceLastOrder = Math.floor(
                            (Date.now() - new Date(item.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
                          );
                          
                          return (
                            <div 
                              key={item.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 0.8fr 100px',
                                gap: '12px',
                                padding: '14px 16px',
                                backgroundColor: idx % 2 === 0 ? 'white' : '#fffbfb',
                                borderBottom: idx < forecastItems.filter(i => i.isOutOfStock).length - 1 ? '1px solid #fee2e2' : 'none',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <Text as="p" variant="bodyMd" fontWeight="semibold">{item.title}</Text>
                                <Text as="p" variant="bodyXs" tone="subdued">SKU: {item.sku}</Text>
                              </div>

                              <div>
                                <Text as="p" variant="bodySm" fontWeight="semibold">
                                  {new Date(item.lastOrderDate).toLocaleDateString()}
                                </Text>
                                <Text as="p" variant="bodyXs" tone="critical">
                                  {daysSinceLastOrder}d ago
                                </Text>
                              </div>

                              <div>
                                <Text as="p" variant="bodyMd" fontWeight="bold">{item.totalSold60Days}</Text>
                                <Text as="p" variant="bodyXs" tone="subdued">units</Text>
                              </div>

                              <div>
                                <Text as="p" variant="bodyMd" fontWeight="semibold">{item.averageDailyDemand}</Text>
                                <Text as="p" variant="bodyXs" tone="subdued">per day</Text>
                              </div>

                              <div>
                                <Badge 
                                  tone={item.velocity === 'fast' ? 'critical' : item.velocity === 'medium' ? 'warning' : 'attention'}
                                  size="small"
                                >
                                  {item.velocity}
                                </Badge>
                              </div>

                              <div>
                                <Badge 
                                  tone={item.velocity === 'fast' ? 'critical' : item.velocity === 'medium' ? 'warning' : 'info'}
                                  size="small"
                                >
                                  {item.velocity === 'fast' ? 'High' : item.velocity === 'medium' ? 'Med' : 'Low'}
                                </Badge>
                              </div>

                              <InlineStack gap="100">
                                <Tooltip content="View details">
                                  <Button
                                    icon={expandedItems.has(item.id) ? ChevronDownIcon : ChevronRightIcon}
                                    variant="tertiary"
                                    size="micro"
                                    onClick={() => toggleItemExpansion(item.id)}
                                  />
                                </Tooltip>
                                <Tooltip content="Edit product">
                                  <Button
                                    icon={EditIcon}
                                    variant="tertiary"
                                    size="micro"
                                    onClick={() => {
                                      if (shopDomain && item.id) {
                                        window.open(`https://${shopDomain}/admin/products/${item.id}`, '_blank');
                                      }
                                    }}
                                  />
                                </Tooltip>
                              </InlineStack>
                            </div>
                          );
                        })}
                      </div>
                    </BlockStack>
                  </div>
                )}
              </div>
            )}

            {/* Table Rows - In Stock Items Only */}
            {forecastItems.filter(item => !item.isOutOfStock).map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <div key={item.id}>
                  {/* Main Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr 120px',
                    gap: '16px',
                    padding: '20px',
                    backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc',
                    borderBottom: isExpanded ? 'none' : (index < forecastItems.length - 1 ? '1px solid #f1f3f4' : 'none'),
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafbfc';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
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
                    {item.forecastDays === 0 ? 'Out of Stock' : 
                     item.forecastDays >= 999 ? 'No demand data' : 
                     `${item.forecastDays} days left`}
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
                  <Tooltip content="View prediction details">
                    <Button
                      icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                      variant="tertiary"
                      size="micro"
                      onClick={() => toggleItemExpansion(item.id)}
                    />
                  </Tooltip>
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

              {/* Expanded Details Section */}
              {isExpanded && (
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e1e3e5',
                  borderBottom: index < forecastItems.length - 1 ? '1px solid #f1f3f4' : 'none'
                }}>
                  <BlockStack gap="400">
                    {/* Prediction Explanation */}
                    <Card>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h4" variant="headingSm">AI Prediction Analysis</Text>
                          <Badge tone={item.predictionDetails.confidence >= 80 ? 'success' : 
                                     item.predictionDetails.confidence >= 60 ? 'info' : 'warning'}>
                            {`${item.predictionDetails.confidence}% Confidence`}
                          </Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {item.predictionDetails.explanation}
                        </Text>
                      </BlockStack>
                    </Card>

                    {/* Calculation Details */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px' 
                    }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h5" variant="bodySm" fontWeight="semibold">Sales Data (60 days)</Text>
                          <Text as="p" variant="bodyMd">{item.totalSold60Days} units sold</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Over {item.predictionDetails.calculationDetails.totalOrderDays} order days
                          </Text>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h5" variant="bodySm" fontWeight="semibold">Demand Pattern</Text>
                          <Text as="p" variant="bodyMd">
                            {item.predictionDetails.trendDirection} trend
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {item.predictionDetails.volatility} volatility
                          </Text>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h5" variant="bodySm" fontWeight="semibold">Algorithm Used</Text>
                          <Text as="p" variant="bodyMd">
                            {item.predictionDetails.algorithm.replace('-', ' ')}
                          </Text>
                          <Badge tone={
                            item.predictionDetails.dataQuality === 'excellent' ? 'success' :
                            item.predictionDetails.dataQuality === 'good' ? 'info' :
                            item.predictionDetails.dataQuality === 'fair' ? 'warning' : 'critical'
                          }>
                            {`${item.predictionDetails.dataQuality} data quality`}
                          </Badge>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h5" variant="bodySm" fontWeight="semibold">Safety Stock</Text>
                          <Text as="p" variant="bodyMd">
                            {item.predictionDetails.calculationDetails.safetyStockDays} days buffer
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            STD: {item.predictionDetails.calculationDetails.standardDeviation}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>

                    {/* Risk Factors & Recommendations */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '16px' 
                    }}>
                      {item.riskFactors.length > 0 && (
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h5" variant="bodySm" fontWeight="semibold" tone="critical">
                              Risk Factors
                            </Text>
                            <BlockStack gap="200">
                              {item.riskFactors.map((risk, idx) => (
                                <Text key={idx} as="p" variant="bodySm" tone="subdued">
                                  • {risk}
                                </Text>
                              ))}
                            </BlockStack>
                          </BlockStack>
                        </Card>
                      )}

                      {item.recommendations.length > 0 && (
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h5" variant="bodySm" fontWeight="semibold" tone="success">
                              Recommendations
                            </Text>
                            <BlockStack gap="200">
                              {item.recommendations.map((rec, idx) => (
                                <Text key={idx} as="p" variant="bodySm" tone="subdued">
                                  • {rec}
                                </Text>
                              ))}
                            </BlockStack>
                          </BlockStack>
                        </Card>
                      )}
                    </div>
                  </BlockStack>
                </div>
              )}
            </div>
            );
            })}
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
import { logger } from "~/utils/logger";
import { useFetcher } from "@remix-run/react";
import React, { useState, useEffect } from "react";
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
  ChevronUpIcon,
  LockIcon
} from "@shopify/polaris-icons";


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
  initialForecastData?: InventoryForecastingData | null; // Add support for server-side loaded data
  isTrialMode?: boolean; // True if user is on trial (no active subscription)
  isDevelopmentStore?: boolean; // True if this is a dev/partner test store
  managedPricingUrl?: string; // URL to subscription pricing page
}

export function ForecastingTab({ 
  shopDomain, 
  initialForecastData = null,
  isTrialMode = false,
  isDevelopmentStore = false,
  managedPricingUrl
}: ForecastingTabProps) {
  const [showAIMethodology, setShowAIMethodology] = useState(false);
  const [forecastData, setForecastData] = useState<InventoryForecastingData | null>(initialForecastData);
  const [loading, setLoading] = useState(!initialForecastData); // Don't show loading if we have initial data
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Trial restrictions only apply to live stores, not dev stores
  const shouldApplyTrialRestrictions = isTrialMode && !isDevelopmentStore;
  
  // Currency state
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  // Use fetchers for API calls
  const currencyFetcher = useFetcher<{ shop: any }>();
  const forecastFetcher = useFetcher<{ success: boolean; data?: InventoryForecastingData; error?: string }>();

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

  // Load store currency from Shopify API
  useEffect(() => {
    currencyFetcher.submit(
      { action: 'get-shop-info' },
      { method: 'POST', action: '/app/api/products' }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle currency data
  useEffect(() => {
    if (currencyFetcher.data?.shop) {
      const currencyCode = currencyFetcher.data.shop.currencyCode || 'USD';
      
      // Comprehensive currency symbol map
      const currencySymbols: { [key: string]: string } = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 
        'JPY': '¥', 'CHF': 'CHF ', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
        'TRY': '₺', 'TL': '₺', 'INR': '₹', 'CNY': '¥', 'BRL': 'R$',
        'MXN': '$', 'RUB': '₽', 'KRW': '₩', 'PLN': 'zł', 'CZK': 'Kč',
        'HUF': 'Ft', 'ZAR': 'R', 'SGD': 'S$', 'HKD': 'HK$', 'NZD': 'NZ$',
        'AED': 'د.إ', 'SAR': '﷼', 'ILS': '₪', 'PHP': '₱', 'THB': '฿',
        'IDR': 'Rp', 'MYR': 'RM', 'VND': '₫', 'PKR': '₨', 'EGP': '£',
        'NGN': '₦', 'KES': 'KSh', 'TWD': 'NT$', 'ARS': '$', 'CLP': '$',
        'COP': '$', 'PEN': 'S/', 'UAH': '₴', 'RON': 'lei', 'BGN': 'лв',
      };
      
      setCurrencySymbol(currencySymbols[currencyCode] || currencyCode + ' ');
      logger.info(`💰 ForecastingTab: Currency loaded: ${currencyCode} (${currencySymbols[currencyCode] || currencyCode})`);
    }
  }, [currencyFetcher.data]);

  // Fetch real inventory forecasting data (only if not already loaded)
  useEffect(() => {
    if (!initialForecastData) {
      forecastFetcher.load('/app/api/inventory-forecasting');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle forecast data
  useEffect(() => {
    if (forecastFetcher.state === 'loading') {
      setLoading(true);
    } else if (forecastFetcher.state === 'idle' && forecastFetcher.data) {
      setLoading(false);
      if (forecastFetcher.data.success && forecastFetcher.data.data) {
        setForecastData(forecastFetcher.data.data);
        setError(null);
      } else {
        setError(forecastFetcher.data.error || 'Failed to fetch forecasting data');
      }
    }
  }, [forecastFetcher.state, forecastFetcher.data]);

  // Refresh function
  const handleRefresh = () => {
    setForecastData(null);
    setLoading(true);
    setError(null);
    // Refetch data using the fetcher
    forecastFetcher.load('/app/api/inventory-forecasting');
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

    // For trial mode, only show first product clearly, rest are blurred
    const visibleItems = shouldApplyTrialRestrictions ? items.slice(0, 1) : items;
    const hasHiddenItems = shouldApplyTrialRestrictions && items.length > 1;

    return (
      <div style={{ overflowX: 'auto', position: 'relative' }}>
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
            {visibleItems.map((item, index) => {
              const isExpanded = expandedRows.has(item.id);
              return (
                <React.Fragment key={item.id}>
                  <tr 
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
                              if (item.id) {
                                // Extract numeric ID from GID format: gid://shopify/ProductVariant/123456
                                const match = item.id.match(/\/(\d+)$/);
                                if (match) {
                                  const variantId = match[1];
                                  // Open Shopify admin variant editor
                                  window.open(`https://admin.shopify.com/store/${shopDomain?.split('.')[0] || 'admin'}/products/variant/${variantId}`, '_blank');
                                }
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
                                    Inventory Management
                                  </Text>
                                  <div style={{ display: 'grid', gap: '12px' }}>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">SKU</Text>
                                      <Badge size="medium">{item.sku}</Badge>
                                    </InlineStack>
                                    <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="200" />
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Current Stock Level</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="bold">
                                        {item.currentStock} units
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Days of Supply Left</Text>
                                      <Tooltip content="Calculated as: Current Stock ÷ Average Daily Demand">
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                                          {item.forecastDays >= 999 ? 'N/A' : `${item.forecastDays} days`}
                                        </Text>
                                      </Tooltip>
                                    </InlineStack>
                                    <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="200" />
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Reorder Point Threshold</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {item.reorderPoint} units
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Suggested Reorder Qty</Text>
                                      <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">
                                        {item.suggestedReorderQuantity} units
                                      </Text>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Supplier Lead Time</Text>
                                      <Tooltip content="Estimated based on product velocity (Fast: 7 days, Medium: 14 days, Slow: 21 days)">
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                                          ~{item.leadTime} days
                                        </Text>
                                      </Tooltip>
                                    </InlineStack>
                                  </div>
                                </BlockStack>
                              </Box>

                              <Box background="bg-surface" padding="400" borderRadius="300" borderWidth="025" borderColor="border">
                                <BlockStack gap="300">
                                  <Text as="h4" variant="headingMd" fontWeight="bold">
                                    Financial Performance
                                  </Text>
                                  <div style={{ display: 'grid', gap: '12px' }}>
                                    <InlineStack align="space-between">
                                      <Text as="p" variant="bodySm" tone="subdued">Revenue (60 days)</Text>
                                      <Text as="p" variant="headingSm" fontWeight="bold">
                                        {currencySymbol}{item.totalRevenue60Days.toFixed(2)}
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
                                <Text as="h4" variant="headingMd" fontWeight="bold">
                                  Order Trends
                                </Text>
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
                                
                                {/* Additional Insights */}
                                <Box paddingBlockStart="200">
                                  <BlockStack gap="200">
                                    <Box background="bg-surface-tertiary" padding="300" borderRadius="200">
                                      <InlineStack align="space-between" blockAlign="center">
                                        <Text as="p" variant="bodyXs" tone="subdued">Peak Day Sales</Text>
                                        <Text as="p" variant="bodySm" fontWeight="semibold">
                                          {Math.ceil(item.averageDailyDemand * 1.5)} units
                                        </Text>
                                      </InlineStack>
                                    </Box>
                                    <Box background="bg-surface-tertiary" padding="300" borderRadius="200">
                                      <InlineStack align="space-between" blockAlign="center">
                                        <Text as="p" variant="bodyXs" tone="subdued">Trend</Text>
                                        <Badge tone={item.velocity === 'fast' ? 'success' : item.velocity === 'medium' ? 'info' : 'attention'}>
                                          {item.velocity === 'fast' ? '↗ Growing' : item.velocity === 'medium' ? '→ Steady' : '↘ Declining'}
                                        </Badge>
                                      </InlineStack>
                                    </Box>
                                    <Box background="bg-surface-tertiary" padding="300" borderRadius="200">
                                      <InlineStack align="space-between" blockAlign="center">
                                        <Text as="p" variant="bodyXs" tone="subdued">Stock Coverage</Text>
                                        <Text as="p" variant="bodySm" fontWeight="semibold" tone={item.forecastDays < 14 ? 'critical' : item.forecastDays < 30 ? 'caution' : 'success'}>
                                          {item.forecastDays >= 999 ? 'Excellent' : item.forecastDays >= 60 ? 'Excellent' : item.forecastDays >= 30 ? 'Good' : item.forecastDays >= 14 ? 'Fair' : 'Low'}
                                        </Text>
                                      </InlineStack>
                                    </Box>
                                  </BlockStack>
                                </Box>
                              </BlockStack>
                            </Box>
                          </div>
                        </Box>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {/* Trial mode: Show blurred preview of remaining products with subscribe overlay */}
        {hasHiddenItems && (
          <div style={{ position: 'relative' }}>
            {/* Blurred preview rows */}
            <div style={{ 
              filter: 'blur(6px)', 
              opacity: 0.5,
              pointerEvents: 'none',
              userSelect: 'none'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {items.slice(1, 4).map((item, index) => (
                    <tr 
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f3f4',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc'
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ height: '40px', background: '#e1e3e5', borderRadius: '4px', width: '150px' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ height: '20px', background: '#e1e3e5', borderRadius: '4px', width: '40px', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ height: '20px', background: '#e1e3e5', borderRadius: '4px', width: '30px', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ height: '24px', background: '#e1e3e5', borderRadius: '12px', width: '60px', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ height: '24px', background: '#e1e3e5', borderRadius: '12px', width: '50px', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ height: '28px', background: '#e1e3e5', borderRadius: '4px', width: '80px', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Subscribe overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.95))',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px 32px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'center',
                maxWidth: '400px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <Icon source={LockIcon} tone="base" />
                </div>
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  Unlock Full Forecasting
                </Text>
                <Box paddingBlockStart="200" paddingBlockEnd="300">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Subscribe to view forecasting data for all {items.length} products
                  </Text>
                </Box>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (managedPricingUrl) {
                      window.open(managedPricingUrl, '_top');
                    }
                  }}
                >
                  Subscribe Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <BlockStack gap="400">
      {/* Trial Banner - Forecasting specific */}
      {shouldApplyTrialRestrictions && (
        <div style={{ 
          background: '#FFF8E5', 
          border: '1px solid #FFD79D', 
          borderRadius: '8px', 
          padding: '8px 12px'
        }}>
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" fontWeight="semibold">
              ⏱️ 3-day free trial • 1 product forecast visible
            </Text>
            {managedPricingUrl && (
              <Button size="slim" url={managedPricingUrl}>
                Subscribe
              </Button>
            )}
          </InlineStack>
        </div>
      )}

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
                        <Text as="p" variant="bodyMd">
                          <strong>{slowMovingItems.length} slow-moving products</strong> detected.
                        </Text>
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
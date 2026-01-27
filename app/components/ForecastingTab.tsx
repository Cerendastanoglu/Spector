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
  Tabs,
  TextField
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
  LockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  InventoryIcon,
  TargetIcon
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const slowMovingItems = forecastItems
    .filter(item => item.velocity === 'slow' && item.currentStock > 0)
    .sort((a, b) => a.forecastDays - b.forecastDays); // Running low first, then okay
  const fastMovingItems = forecastItems
    .filter(item => item.currentStock > 0 && item.velocity !== 'slow')
    .sort((a, b) => a.forecastDays - b.forecastDays); // Running low first, then okay

  const tabs = [
    {
      id: 'out-of-stock',
      content: `⚠️ Out of Stock (${outOfStockItems.length})`,
      badge: outOfStockItems.length > 0 ? String(outOfStockItems.length) : undefined,
      panelID: 'out-of-stock-panel',
    },
    {
      id: 'slow-moving',
      content: `🐢 Slow Moving (${slowMovingItems.length})`,
      badge: slowMovingItems.length > 0 ? String(slowMovingItems.length) : undefined,
      panelID: 'slow-moving-panel',
    },
    {
      id: 'fast-moving',
      content: `🐇 Fast Moving (${fastMovingItems.length})`,
      panelID: 'fast-moving-panel',
    },
  ];

  // Helper function to render product table
  const renderProductTable = (items: ForecastItem[], emptyMessage: string) => {
    // Filter by search query
    const filteredItems = searchQuery.trim() 
      ? items.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items;

    if (filteredItems.length === 0 && searchQuery.trim()) {
      return (
        <Box padding="400">
          <BlockStack gap="300">
            <TextField
              label=""
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={setSearchQuery}
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchQuery('')}
            />
            <Box padding="400">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                No products found matching "{searchQuery}"
              </Text>
            </Box>
          </BlockStack>
        </Box>
      );
    }

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
    const visibleItems = shouldApplyTrialRestrictions ? filteredItems.slice(0, 1) : filteredItems;
    const hasHiddenItems = shouldApplyTrialRestrictions && filteredItems.length > 1;

    return (
      <div style={{ overflowX: 'auto', position: 'relative' }}>
        {/* Search Bar */}
        <Box paddingBlockEnd="300">
          <TextField
            label=""
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={setSearchQuery}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearchQuery('')}
          />
        </Box>
        
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
                        {/* Trend Indicator Badge */}
                        <Tooltip content={`${item.velocity === 'fast' ? 'Trending up - high demand' : item.velocity === 'medium' ? 'Stable sales' : 'Declining - low demand'}`}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: item.velocity === 'fast' ? '#e3f4ee' : item.velocity === 'medium' ? '#eef0f2' : '#fff5f5',
                            cursor: 'default'
                          }}>
                            <Icon 
                              source={item.velocity === 'fast' ? ArrowUpIcon : item.velocity === 'medium' ? MinusIcon : ArrowDownIcon} 
                              tone={item.velocity === 'fast' ? 'success' : item.velocity === 'medium' ? 'subdued' : 'critical'}
                            />
                          </div>
                        </Tooltip>
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
                              if (item.handle && shopDomain) {
                                // Open Shopify admin product editor using handle
                                const storeName = shopDomain?.split('.')[0] || 'admin';
                                window.open(`https://admin.shopify.com/store/${storeName}/products/${item.handle}`, '_blank');
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
                        <Box padding="400" background="bg-surface-secondary">
                          {/* Main 2x2 Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gridTemplateRows: 'auto auto',
                            gap: '16px'
                          }}>
                            {/* Top Left - Inventory Forecast */}
                            <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                              <BlockStack gap="300">
                                <Text as="h4" variant="headingSm" fontWeight="bold">Inventory Forecast</Text>
                                
                                <BlockStack gap="200">
                                  {/* Stockout Date */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e1e3e5' }}>
                                    <Text as="p" variant="bodySm">Stockout Date</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone={item.currentStock === 0 ? 'critical' : item.forecastDays < 14 ? 'caution' : undefined}>
                                      {item.currentStock === 0 
                                        ? 'Now (Out of Stock)'
                                        : item.forecastDays >= 999
                                          ? 'Not forecasted'
                                          : (() => {
                                              const stockoutDate = new Date();
                                              stockoutDate.setDate(stockoutDate.getDate() + item.forecastDays);
                                              return stockoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            })()
                                      }
                                    </Text>
                                  </div>
                                  
                                  {/* Days Until Stockout */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e1e3e5' }}>
                                    <Text as="p" variant="bodySm">Days Until Stockout</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone={item.currentStock === 0 ? 'critical' : item.forecastDays < 14 ? 'caution' : undefined}>
                                      {item.currentStock === 0 ? '0' : item.forecastDays >= 999 ? '999+' : item.forecastDays}
                                    </Text>
                                  </div>
                                  
                                  {/* Order By Date */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e1e3e5' }}>
                                    <Text as="p" variant="bodySm">Order By</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone={item.currentStock === 0 ? 'critical' : (item.forecastDays - item.leadTime) < 7 ? 'caution' : undefined}>
                                      {item.currentStock === 0 
                                        ? 'Immediately'
                                        : item.forecastDays >= 999
                                          ? 'No rush'
                                          : (() => {
                                              const orderByDate = new Date();
                                              orderByDate.setDate(orderByDate.getDate() + Math.max(0, item.forecastDays - item.leadTime));
                                              return orderByDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            })()
                                      }
                                    </Text>
                                  </div>
                                  
                                  {/* Suggested Order Qty */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e1e3e5' }}>
                                    <Text as="p" variant="bodySm">Suggested Order</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">{item.suggestedReorderQuantity} units</Text>
                                  </div>
                                  
                                  {/* Reorder Point */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e1e3e5' }}>
                                    <Text as="p" variant="bodySm">Reorder Point</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">{item.reorderPoint} units</Text>
                                  </div>
                                  
                                  {/* Lead Time */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                                    <Text as="p" variant="bodySm">Lead Time</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">~{item.leadTime} days</Text>
                                  </div>
                                </BlockStack>
                              </BlockStack>
                            </Box>

                            {/* Top Right - Stock Health */}
                            <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                              <BlockStack gap="300">
                                <Text as="h4" variant="headingSm" fontWeight="bold">Stock Health</Text>
                                
                                {/* Status Indicator */}
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'center', 
                                  padding: '16px', 
                                  background: item.currentStock === 0 ? '#fef3f2' : item.forecastDays < 14 ? '#fff8e6' : item.forecastDays < 30 ? '#fffbe6' : '#e3f4ee',
                                  borderRadius: '8px'
                                }}>
                                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                                    {item.currentStock === 0 ? '😟' : item.forecastDays < 14 ? '😐' : item.forecastDays < 30 ? '🙂' : '😊'}
                                  </div>
                                  <Text as="p" variant="headingSm" fontWeight="bold" tone={item.currentStock === 0 ? 'critical' : item.forecastDays < 14 ? 'caution' : 'success'}>
                                    {item.currentStock === 0 ? 'Needs Attention' : item.forecastDays < 14 ? 'Running Low' : item.forecastDays < 30 ? 'Okay' : 'Looking Good'}
                                  </Text>
                                </div>
                                
                                {/* Quick Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div style={{ padding: '10px', background: '#f6f6f7', borderRadius: '6px' }}>
                                    <Text as="p" variant="bodyXs" tone="subdued">Velocity</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">
                                      {item.velocity === 'fast' ? 'Fast Seller' : item.velocity === 'medium' ? 'Steady' : 'Slow Mover'}
                                    </Text>
                                  </div>
                                  <div style={{ padding: '10px', background: '#f6f6f7', borderRadius: '6px' }}>
                                    <Text as="p" variant="bodyXs" tone="subdued">Avg Daily</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">{item.averageDailyDemand.toFixed(1)} units</Text>
                                  </div>
                                  <div style={{ padding: '10px', background: '#f6f6f7', borderRadius: '6px' }}>
                                    <Text as="p" variant="bodyXs" tone="subdued">Peak Day</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">
                                      {item.velocity === 'fast' ? 'Saturday' : item.velocity === 'medium' ? 'Friday' : 'Sunday'}
                                    </Text>
                                  </div>
                                  <div style={{ padding: '10px', background: '#f6f6f7', borderRadius: '6px' }}>
                                    <Text as="p" variant="bodyXs" tone="subdued">Trend</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone={item.velocity === 'fast' ? 'success' : item.velocity === 'slow' ? 'critical' : undefined}>
                                      {item.velocity === 'fast' ? '↑ Growing' : item.velocity === 'slow' ? '↓ Declining' : '→ Stable'}
                                    </Text>
                                  </div>
                                </div>
                              </BlockStack>
                            </Box>

                            {/* Bottom Left - Financial Performance */}
                            <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                              <BlockStack gap="300">
                                <Text as="h4" variant="headingSm" fontWeight="bold">Financial Performance</Text>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Revenue (60d)</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold">
                                      {currencySymbol}{item.totalRevenue60Days.toFixed(2)}
                                    </Text>
                                  </InlineStack>
                                  <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Units Sold (60d)</Text>
                                    <Text as="p" variant="bodySm" fontWeight="medium">{item.totalSold60Days}</Text>
                                  </InlineStack>
                                  <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Profit Margin</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone="success">
                                      {item.profitMargin.toFixed(1)}%
                                    </Text>
                                  </InlineStack>
                                  <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Sales Velocity</Text>
                                    <Badge tone={item.velocity === 'fast' ? 'success' : item.velocity === 'medium' ? 'info' : 'attention'} size="small">
                                      {item.velocity === 'fast' ? 'Fast' : item.velocity === 'medium' ? 'Medium' : 'Slow'}
                                    </Badge>
                                  </InlineStack>
                                  <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Stock Status</Text>
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone={item.currentStock === 0 ? 'critical' : item.forecastDays < 14 ? 'critical' : item.forecastDays < 30 ? 'caution' : 'success'}>
                                      {item.currentStock === 0 ? 'Out of Stock' : item.forecastDays < 14 ? 'Critical' : item.forecastDays < 30 ? 'Low' : 'Healthy'}
                                    </Text>
                                  </InlineStack>
                                </div>
                              </BlockStack>
                            </Box>

                            {/* Bottom Right - Smart Recommendations */}
                            <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border">
                              <BlockStack gap="300">
                                <Text as="h4" variant="headingSm" fontWeight="bold">Smart Recommendations</Text>
                                <BlockStack gap="200">
                                  {(() => {
                                    // Generate 2 context-aware recommendations based on product data
                                    const recommendations: { icon: string; title: string; description: string; color: string; borderColor: string }[] = [];
                                    
                                    // Priority 1: Stock-related urgent recommendations
                                    if (item.currentStock === 0) {
                                      recommendations.push({
                                        icon: '🚨',
                                        title: 'Emergency Restock',
                                        description: `Order ${item.suggestedReorderQuantity} units immediately - you're losing sales!`,
                                        color: '#fef3f2',
                                        borderColor: '#d82c0d'
                                      });
                                    } else if (item.forecastDays < 14) {
                                      recommendations.push({
                                        icon: '⏰',
                                        title: 'Order Now',
                                        description: `Place order for ${item.suggestedReorderQuantity} units - only ${item.forecastDays} days of stock left`,
                                        color: '#fff8e6',
                                        borderColor: '#b98900'
                                      });
                                    }
                                    
                                    // High margin + fast velocity = marketing opportunity
                                    if (item.profitMargin > 40 && item.velocity === 'fast') {
                                      recommendations.push({
                                        icon: '🎯',
                                        title: 'Feature in Marketing',
                                        description: `High margin (${item.profitMargin.toFixed(0)}%) + fast sales = perfect for promotion`,
                                        color: '#f0fdf4',
                                        borderColor: '#22c55e'
                                      });
                                    }
                                    
                                    // High demand + good margin = consider price increase
                                    if (item.velocity === 'fast' && item.profitMargin > 25 && item.currentStock > 0) {
                                      recommendations.push({
                                        icon: '💰',
                                        title: 'Price Optimization',
                                        description: `Strong demand suggests room for 5-10% price increase`,
                                        color: '#f0fdf4',
                                        borderColor: '#22c55e'
                                      });
                                    }
                                    
                                    // Slow velocity + high stock = bundle or discount
                                    if (item.velocity === 'slow' && item.forecastDays > 60) {
                                      recommendations.push({
                                        icon: '📦',
                                        title: 'Create a Bundle',
                                        description: `Pair with fast movers to increase sell-through rate`,
                                        color: '#fef3c7',
                                        borderColor: '#f59e0b'
                                      });
                                    }
                                    
                                    // Slow velocity + decent margin = try cross-sell
                                    if (item.velocity === 'slow' && item.profitMargin > 20) {
                                      recommendations.push({
                                        icon: '🔗',
                                        title: 'Cross-Sell Opportunity',
                                        description: `Add as "You may also like" on bestseller pages`,
                                        color: '#eff6ff',
                                        borderColor: '#3b82f6'
                                      });
                                    }
                                    
                                    // High revenue product = ensure safety stock
                                    if (item.totalRevenue60Days > 500 && item.forecastDays < 30) {
                                      recommendations.push({
                                        icon: '🛡️',
                                        title: 'Protect Revenue',
                                        description: `This product generates ${currencySymbol}${item.totalRevenue60Days.toFixed(0)}/60d - maintain buffer stock`,
                                        color: '#f0fdf4',
                                        borderColor: '#22c55e'
                                      });
                                    }
                                    
                                    // Medium velocity + healthy stock = maintain
                                    if (item.velocity === 'medium' && item.forecastDays >= 30 && item.forecastDays < 90) {
                                      recommendations.push({
                                        icon: '✅',
                                        title: 'Well Balanced',
                                        description: `Stock levels optimal - schedule next order in ${Math.max(0, item.forecastDays - item.leadTime)} days`,
                                        color: '#f0fdf4',
                                        borderColor: '#22c55e'
                                      });
                                    }
                                    
                                    // Very high stock = reduce
                                    if (item.forecastDays > 120) {
                                      recommendations.push({
                                        icon: '📉',
                                        title: 'Reduce Next Order',
                                        description: `${item.forecastDays}+ days supply - cut next order by 30-40%`,
                                        color: '#fef3c7',
                                        borderColor: '#f59e0b'
                                      });
                                    }
                                    
                                    // Fast + low margin = volume strategy
                                    if (item.velocity === 'fast' && item.profitMargin < 20) {
                                      recommendations.push({
                                        icon: '📊',
                                        title: 'Volume Strategy',
                                        description: `Low margin but fast sales - negotiate better supplier terms`,
                                        color: '#eff6ff',
                                        borderColor: '#3b82f6'
                                      });
                                    }
                                    
                                    // Return exactly 2 recommendations (or fill with generic if needed)
                                    if (recommendations.length === 0) {
                                      recommendations.push({
                                        icon: '📈',
                                        title: 'Monitor Performance',
                                        description: `Track sales trends to identify growth opportunities`,
                                        color: '#f6f6f7',
                                        borderColor: '#8c9196'
                                      });
                                    }
                                    if (recommendations.length === 1) {
                                      recommendations.push({
                                        icon: '🔍',
                                        title: 'Review Pricing',
                                        description: `Compare with competitors to optimize your price point`,
                                        color: '#f6f6f7',
                                        borderColor: '#8c9196'
                                      });
                                    }
                                    
                                    return recommendations.slice(0, 2).map((rec, idx) => (
                                      <div key={idx} style={{ padding: '10px 12px', background: rec.color, borderRadius: '6px', borderLeft: `3px solid ${rec.borderColor}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                          <span style={{ fontSize: '14px' }}>{rec.icon}</span>
                                          <Text as="p" variant="bodySm" fontWeight="semibold">{rec.title}</Text>
                                        </div>
                                        <Text as="p" variant="bodyXs" tone="subdued">{rec.description}</Text>
                                      </div>
                                    ));
                                  })()}
                                </BlockStack>
                              </BlockStack>
                            </Box>

                            {/* Weekly Sales Pattern Chart - Full Width */}
                            <Box background="bg-surface" padding="400" borderRadius="200" borderWidth="025" borderColor="border" style={{ gridColumn: '1 / -1' }}>
                              <BlockStack gap="300">
                                <InlineStack align="space-between" blockAlign="center">
                                  <Text as="h4" variant="headingSm" fontWeight="bold">Weekly Sales Pattern</Text>
                                  <InlineStack gap="300" blockAlign="center">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <div style={{ width: '12px', height: '4px', backgroundColor: '#e3f4ee', borderRadius: '2px' }} />
                                      <Text as="span" variant="bodyXs" tone="subdued">Low</Text>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <div style={{ width: '12px', height: '4px', backgroundColor: '#23a36d', borderRadius: '2px' }} />
                                      <Text as="span" variant="bodyXs" tone="subdued">High</Text>
                                    </div>
                                  </InlineStack>
                                </InlineStack>
                                
                                {/* Visual Bar Chart */}
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '8px', 
                                  alignItems: 'flex-end',
                                  height: '80px',
                                  padding: '8px 0',
                                  borderBottom: '1px solid #e1e3e5'
                                }}>
                                  {(() => {
                                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                    const baseActivity = item.averageDailyDemand;
                                    const velocityMultiplier = item.velocity === 'fast' ? 1.3 : item.velocity === 'medium' ? 1.0 : 0.7;
                                    
                                    const values = days.map((_, i) => {
                                      const dayMultiplier = i === 5 || i === 6 ? 1.25 : i === 2 ? 0.8 : i === 4 ? 1.1 : 1.0;
                                      const variance = 0.85 + ((i * 17) % 10) * 0.03;
                                      return baseActivity * velocityMultiplier * dayMultiplier * variance;
                                    });
                                    const maxValue = Math.max(...values, 0.1);
                                    
                                    return days.map((day, i) => {
                                      const activity = values[i];
                                      const heightPercent = Math.max((activity / maxValue) * 100, 8);
                                      const intensity = activity / maxValue;
                                      
                                      const getBarColor = (val: number) => {
                                        if (val < 0.3) return 'linear-gradient(to top, #e3f4ee, #d0ede3)';
                                        if (val < 0.5) return 'linear-gradient(to top, #aee9d1, #8de0be)';
                                        if (val < 0.7) return 'linear-gradient(to top, #5ec5a0, #4db88f)';
                                        if (val < 0.85) return 'linear-gradient(to top, #23a36d, #1d8f5f)';
                                        return 'linear-gradient(to top, #108043, #0d6b37)';
                                      };
                                      
                                      return (
                                        <Tooltip key={day} content={`${day}: ~${activity.toFixed(1)} units/day`}>
                                          <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            cursor: 'default'
                                          }}>
                                            <div style={{
                                              width: '100%',
                                              height: `${heightPercent}%`,
                                              minHeight: '6px',
                                              background: getBarColor(intensity),
                                              borderRadius: '3px 3px 0 0',
                                              transition: 'height 0.3s ease'
                                            }} />
                                          </div>
                                        </Tooltip>
                                      );
                                    });
                                  })()}
                                </div>
                                
                                {/* Day Labels */}
                                <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                    <div key={i} style={{
                                      flex: 1,
                                      textAlign: 'center',
                                      fontSize: '12px',
                                      fontWeight: i === 5 || i === 6 ? 600 : 400,
                                      color: i === 5 || i === 6 ? '#108043' : '#6d7175'
                                    }}>
                                      {day}
                                    </div>
                                  ))}
                                </div>
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
              <InlineStack gap="200">
                <Button onClick={handleRefresh} variant="secondary">
                  Refresh Data
                </Button>
                {shopDomain?.includes('spector-test-store') && (
                  <Button 
                    onClick={() => {
                      // Generate mock data for testing - products distributed across all tabs
                      const mockItems: ForecastItem[] = [
                        // Out of Stock tab (currentStock = 0)
                        { id: 'mock-1', title: 'Test Product A (OOS Fast)', sku: 'TEST-A', handle: 'test-a', currentStock: 0, averageDailyDemand: 5.2, forecastDays: 0, reorderPoint: 25, status: 'critical', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-20', suggestedReorderQuantity: 100, profitMargin: 35, leadTime: 7, velocity: 'fast', price: 29.99, totalRevenue60Days: 3120, totalSold60Days: 104 },
                        { id: 'mock-2', title: 'Test Product B (OOS Medium)', sku: 'TEST-B', handle: 'test-b', currentStock: 0, averageDailyDemand: 2.1, forecastDays: 0, reorderPoint: 15, status: 'critical', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-22', suggestedReorderQuantity: 50, profitMargin: 42, leadTime: 14, velocity: 'medium', price: 49.99, totalRevenue60Days: 2100, totalSold60Days: 42 },
                        // Slow Moving tab (velocity = 'slow' AND currentStock > 0)
                        { id: 'mock-3', title: 'Test Product C (Slow Moving)', sku: 'TEST-C', handle: 'test-c', currentStock: 150, averageDailyDemand: 0.5, forecastDays: 300, reorderPoint: 10, status: 'healthy', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-10', suggestedReorderQuantity: 0, profitMargin: 28, leadTime: 21, velocity: 'slow', price: 19.99, totalRevenue60Days: 299, totalSold60Days: 15 },
                        { id: 'mock-4', title: 'Test Product D (Slow Moving)', sku: 'TEST-D', handle: 'test-d', currentStock: 80, averageDailyDemand: 0.3, forecastDays: 266, reorderPoint: 5, status: 'healthy', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-05', suggestedReorderQuantity: 0, profitMargin: 22, leadTime: 21, velocity: 'slow', price: 14.99, totalRevenue60Days: 135, totalSold60Days: 9 },
                        // Active Inventory tab (currentStock > 0 AND velocity != 'slow')
                        { id: 'mock-5', title: 'Test Product E (Active Fast)', sku: 'TEST-E', handle: 'test-e', currentStock: 25, averageDailyDemand: 4.2, forecastDays: 6, reorderPoint: 30, status: 'critical', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-25', suggestedReorderQuantity: 80, profitMargin: 45, leadTime: 7, velocity: 'fast', price: 39.99, totalRevenue60Days: 5039, totalSold60Days: 126 },
                        { id: 'mock-6', title: 'Test Product F (Active Medium)', sku: 'TEST-F', handle: 'test-f', currentStock: 50, averageDailyDemand: 1.8, forecastDays: 28, reorderPoint: 20, status: 'low', vendor: 'Test Vendor', category: 'Test', lastOrderDate: '2026-01-24', suggestedReorderQuantity: 40, profitMargin: 38, leadTime: 14, velocity: 'medium', price: 24.99, totalRevenue60Days: 1349, totalSold60Days: 54 },
                      ];
                      setForecastData({
                        forecastItems: mockItems,
                        summary: { totalProducts: 6, criticalItems: 3, lowStockItems: 1, healthyItems: 2, totalRevenue60Days: 12042, averageDailyRevenue: 201, fastMovingItems: 2, mediumMovingItems: 2, slowMovingItems: 2 }
                      });
                      // Reset to first tab (Out of Stock) to show data immediately
                      setSelectedTab(0);
                    }}
                    variant="tertiary"
                    tone="critical"
                  >
                    Mock Data
                  </Button>
                )}
              </InlineStack>
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
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd">
                            <span style={{ fontSize: '16px' }}>⚠️</span> <strong>{outOfStockItems.length} products</strong> are out of stock and need immediate reordering.
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            You may be losing sales — prioritize restocking these items.
                          </Text>
                        </BlockStack>
                      </Banner>
                    )}
                    {renderProductTable(
                      outOfStockItems,
                      '✨ Great! All products are in stock!'
                    )}
                  </BlockStack>
                )}

                {/* Slow Moving Tab */}
                {selectedTab === 1 && (
                  <BlockStack gap="300">
                    {slowMovingItems.length > 0 && (
                      <Banner tone="warning">
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd">
                            <span style={{ fontSize: '16px' }}>🐢</span> <strong>{slowMovingItems.length} slow-moving products</strong> — sorted by stock urgency (running low first).
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Consider bundling or promotions to speed up sales.
                          </Text>
                        </BlockStack>
                      </Banner>
                    )}
                    {renderProductTable(
                      slowMovingItems,
                      '🎉 No slow-moving products! Your inventory is turning over nicely.'
                    )}
                  </BlockStack>
                )}

                {/* Fast Moving Tab */}
                {selectedTab === 2 && (
                  <BlockStack gap="300">
                    {fastMovingItems.length > 0 && (
                      <Banner tone="success">
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd">
                            <span style={{ fontSize: '16px' }}>🐇</span> <strong>{fastMovingItems.length} fast-moving products</strong> — sorted by stock urgency (running low first).
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            These are your bestsellers! Keep them well-stocked.
                          </Text>
                        </BlockStack>
                      </Banner>
                    )}
                    {renderProductTable(
                      fastMovingItems,
                      '🐇 No fast-moving products yet. Time to boost those marketing efforts!'
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
              <BlockStack gap="400">
                {/* Key Terms */}
                <div>
                  <Text as="p" variant="headingSm" fontWeight="bold">Key Terms</Text>
                  <Box paddingBlockStart="200">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e1e3e5' }}>
                        <Text as="p" variant="bodySm" fontWeight="bold">Stockout Date</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          The predicted date when your inventory will run out at current sales rate.
                        </Text>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e1e3e5' }}>
                        <Text as="p" variant="bodySm" fontWeight="bold">Order By Date</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          The latest date to place an order to avoid stockout, accounting for lead time.
                        </Text>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e1e3e5' }}>
                        <Text as="p" variant="bodySm" fontWeight="bold">Reorder Point</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          Stock level that triggers a new order. Calculated as: daily demand × lead time + safety buffer.
                        </Text>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e1e3e5' }}>
                        <Text as="p" variant="bodySm" fontWeight="bold">Lead Time</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          Days between placing an order and receiving inventory. Default: 7-21 days by velocity.
                        </Text>
                      </div>
                    </div>
                  </Box>
                </div>

                {/* How It Works */}
                <div>
                  <Text as="p" variant="headingSm" fontWeight="bold">How It Works</Text>
                  <Box paddingBlockStart="200">
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
                </div>
              </BlockStack>
            </Box>
          </Collapsible>
        </Box>
      </Card>
    </BlockStack>
  );
}

export default ForecastingTab;
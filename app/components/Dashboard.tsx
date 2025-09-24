import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  // Grid,
  Button,
  Icon,
  Tabs,
  Spinner,
  Badge,
  Tooltip,
  Divider,

  TextField,
  Select,
  Checkbox,
  DataTable,
  EmptyState,
} from "@shopify/polaris";
import {
  CashDollarIcon,
  ChartVerticalIcon,
  AlertCircleIcon,
  InfoIcon,
  ClockIcon,
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  InventoryIcon,
  EditIcon,
  ViewIcon,
  MenuHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
}

interface ProductAnalyticsData {
  totalProducts: number;
  activeProducts: number;
  totalCatalogValue: number;
  avgProductPrice: number;
  catalogHealth: number;
  topProducts: Array<{
    id: string;
    name: string;
    value: number;
    variants: number;
    inventoryStatus: string;
    priceRange: string;
  }>;
  inventoryDistribution: {
    wellStocked: number;
    lowStock: number;
    outOfStock: number;
  };
  priceAnalysis: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    priceDistribution: Array<{
      range: string;
      count: number;
      orders: number;
    }>;
  };
}

interface InventoryData {
  totalProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalInventoryValue: number;
  stockoutPredictions: Array<{
    id: string;
    name: string;
    currentStock: number;
    dailySalesRate: number;
    daysRemaining: number;
    riskLevel: 'high' | 'medium' | 'low';
  }>;
  restockRecommendations: Array<{
    id: string;
    name: string;
    suggestedQuantity: number;
    urgency: 'urgent' | 'soon' | 'normal';
  }>;
}

export function Dashboard({ isVisible, outOfStockCount: _outOfStockCount, onNavigate: _onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [timePeriod, setTimePeriod] = useState('30');
  const [productAnalyticsData, setProductAnalyticsData] = useState<ProductAnalyticsData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  // Inventory Forecasting State
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [sortInventoryBy] = useState('forecast_days');
  
  // Inventory filtering state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterRisk, setFilterRisk] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchProduct, setSearchProduct] = useState('');
  const [priceDistributionIndex, setPriceDistributionIndex] = useState(0);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Top Products Slider State
  
  const productAnalyticsFetcher = useFetcher<{ success: boolean; data?: ProductAnalyticsData; error?: string }>();
  const inventoryFetcher = useFetcher<{ success: boolean; data?: InventoryData; error?: string }>();
  
  // Refs to hold current values to prevent useEffect dependencies
  const timePeriodRef = useRef(timePeriod);
  const productAnalyticsFetcherRef = useRef(productAnalyticsFetcher);
  const inventoryFetcherRef = useRef(inventoryFetcher);
  
  // Update refs when values change
  useEffect(() => {
    timePeriodRef.current = timePeriod;
    productAnalyticsFetcherRef.current = productAnalyticsFetcher;
    inventoryFetcherRef.current = inventoryFetcher;
  });

  // Cache key for localStorage
  const getCacheKey = useCallback((type: 'revenue' | 'inventory', period: string) => 
    `spector_${type}_data_${period}`, []);

  // Check if data needs refresh (manual only)
  const needsRefresh = useCallback((_lastUpdate: Date | null): boolean => {
    // Only refresh manually - no automatic refresh
    return false;
  }, []);

  // Load data from cache (only in browser)
  const loadCachedData = useCallback((type: 'revenue' | 'inventory', period: string) => {
    if (typeof window === 'undefined') return false;
    
    try {
      const cacheKey = getCacheKey(type, period);
      const cached = localStorage.getItem(cacheKey);
      const timestampKey = `${cacheKey}_timestamp`;
      const timestamp = localStorage.getItem(timestampKey);
      
      if (cached && timestamp) {
        const lastUpdate = new Date(timestamp);
        if (!needsRefresh(lastUpdate)) {
          const data = JSON.parse(cached);
          if (type === 'revenue') {
            setProductAnalyticsData(data);
          } else {
            setInventoryData(data);
          }
          console.log(`Dashboard: Loaded ${type} data from cache (${data?.totalProducts || 0} products)`);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    return false;
  }, [needsRefresh, getCacheKey]);

  // Save data to cache (only in browser)
  const saveCachedData = useCallback((type: 'revenue' | 'inventory', period: string, data: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = getCacheKey(type, period);
      const timestampKey = `${cacheKey}_timestamp`;
      const now = new Date();
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timestampKey, now.toISOString());
      console.log(`Dashboard: Saved ${type} data to cache (${data?.totalOrders || 0} orders)`);
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  }, [getCacheKey]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const timePeriodOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 3 months', value: '90' },
    { label: 'Last 6 months', value: '180' },
    { label: 'Last 1 year', value: '365' },
    { label: 'Last 2 years', value: '730' },
  ];



  const fetchFreshData = useCallback((type: 'revenue' | 'inventory', force = false) => {
    console.log(`Dashboard: ${force ? 'Manual' : 'Auto'} ${type} data refresh`);
    setIsLoading(true);
    setError(null);
    setIsManualRefresh(force);
    
    const currentPeriod = timePeriodRef.current;
    const currentProductAnalyticsFetcher = productAnalyticsFetcherRef.current;
    const currentInventoryFetcher = inventoryFetcherRef.current;
    
    console.log("Dashboard: fetchFreshData called with type:", type, "force:", force);
    if (type === 'revenue') {
      console.log("Dashboard: Calling product-analytics API...");
      currentProductAnalyticsFetcher.load(`/app/api/product-analytics`);
    } else {
      console.log("Dashboard: Calling inventory API...", currentPeriod);
      currentInventoryFetcher.load(`/app/api/inventory?period=${currentPeriod}`);
    }
  }, []); // No dependencies to prevent recreation



  // Reset loading flag when tab or period changes
  useEffect(() => {
    setHasLoadedInitialData(false);
  }, [activeTab, timePeriod]);



  // Smart data loading: check cache first, then fetch if needed
  useEffect(() => {
    console.log("Dashboard: useEffect triggered - isVisible:", isVisible, "activeTab:", activeTab, "hasLoadedInitialData:", hasLoadedInitialData);
    
    if (!isVisible) return;

    // Skip data loading for Inventory Forecasting (tab 1) and Order Analysis (tab 2) - they're in development
    if (activeTab === 1 || activeTab === 2) {
      setHasLoadedInitialData(true);
      return;
    }

    const type = activeTab === 0 ? 'revenue' : 'inventory';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cacheKey = `${type}_${activeTab}_${timePeriod}`;
    console.log("Dashboard: Loading data for activeTab:", activeTab, "type:", type, "timePeriod:", timePeriod);
    
    // Skip if we've already loaded data for this combination
    if (hasLoadedInitialData) return;
    
    // Try loading from cache first
    const hasCachedData = loadCachedData(type, timePeriod);
    
    // If no cached data or cache expired, fetch fresh data
    if (!hasCachedData) {
      console.log(`Dashboard: No cached ${type} data found, fetching fresh data`);
      fetchFreshData(type, false);
    }
    
    // Mark as loaded regardless of cache hit/miss
    setHasLoadedInitialData(true);
  }, [isVisible, activeTab, timePeriod, fetchFreshData, hasLoadedInitialData, loadCachedData]);

  // Handle revenue data response
  useEffect(() => {
    if (productAnalyticsFetcher.data) {
      console.log("Dashboard: Product analytics data received", productAnalyticsFetcher.data);
      if (productAnalyticsFetcher.data.success && productAnalyticsFetcher.data.data) {
        setProductAnalyticsData(productAnalyticsFetcher.data.data);
        saveCachedData('revenue', timePeriod, productAnalyticsFetcher.data.data);
        setError((productAnalyticsFetcher.data as any).warning || null); // Show warning if present
      } else {
        setError(productAnalyticsFetcher.data.error || 'Failed to load product analytics data');
        setProductAnalyticsData(null);
      }
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [productAnalyticsFetcher.data, timePeriod, saveCachedData]);

  // Handle product analytics fetcher state changes
  useEffect(() => {
    if (productAnalyticsFetcher.state === 'idle' && productAnalyticsFetcher.data) {
      setIsLoading(false);
    } else if (productAnalyticsFetcher.state === 'loading') {
      setIsLoading(true);
    }
  }, [productAnalyticsFetcher.state, productAnalyticsFetcher.data]);

  // Handle inventory data response
  useEffect(() => {
    if (inventoryFetcher.data) {
      if (inventoryFetcher.data.success && inventoryFetcher.data.data) {
        setInventoryData(inventoryFetcher.data.data);
        saveCachedData('inventory', timePeriod, inventoryFetcher.data.data);
        setError(null);
      } else {
        setError(inventoryFetcher.data.error || 'Failed to load inventory data');
      }
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [inventoryFetcher.data, timePeriod, saveCachedData]);

  if (!isVisible) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const tabs = [
    {
      id: 'revenue',
      content: 'Product Performance',
      accessibilityLabel: 'Product Performance',
      panelID: 'revenue-panel',
    },
    {
      id: 'inventory',
      content: 'Inventory Forecasting',
      accessibilityLabel: 'Inventory Forecasting',
      panelID: 'inventory-panel',
    },
  ];

  const renderProductPerformanceTab = () => {
    // Handle loading state
    if (isLoading) {
      return (
        <Card>
          <BlockStack align="center" gap="400">
            <Spinner accessibilityLabel="Loading product analytics" size="large" />
            <BlockStack align="center" gap="200">
              <Text as="h3">
                {isManualRefresh ? 'Analyzing product performance...' : 'Loading product analytics...'}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {isManualRefresh ? 'Getting the most up-to-date product data from your store' : 'Preparing your product performance dashboard'}
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      );
    }

    // Handle error state
    if (error) {
      return (
        <Card>
          <BlockStack align="center" gap="400">
            <Icon source={AlertCircleIcon} tone="critical" />
            <Text as="h3" tone="critical">{error}</Text>
          </BlockStack>
        </Card>
      );
    }

    // Handle empty data state (no products)
    if (!productAnalyticsData || productAnalyticsData.totalProducts === 0) {
      return (
        <Card>
          <BlockStack align="center" gap="400">
            <Box background="bg-surface-secondary" padding="800" borderRadius="200">
              <BlockStack align="center" gap="400">
                <Box 
                  background="bg-fill-info-secondary" 
                  padding="400" 
                  borderRadius="100"
                >
                  <Icon source={ChartVerticalIcon} tone="info" />
                </Box>
                <BlockStack align="center" gap="200">
                  <Text as="h3" variant="headingMd">No Products Found</Text>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Your store doesn't have any products yet. Add some products to see detailed 
                    performance analytics, pricing insights, and inventory management recommendations.
                  </Text>
                </BlockStack>
                <BlockStack align="center" gap="300">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Get started:</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">• Add your first product</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Set competitive pricing</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Manage inventory levels</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Track performance metrics</Text>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>
      );
    }

    return (
    <BlockStack gap="400">
      {/* Key Metrics - Compact Line Layout */}
      <Card>
        <InlineStack gap="600" align="space-between" wrap={false}>
          <InlineStack gap="300" blockAlign="center">
            <Box 
              background="bg-surface-info" 
              padding="200" 
              borderRadius="100"
            >
              <Icon source={ChartVerticalIcon} tone="info" />
            </Box>
            <BlockStack gap="050">
              <Text as="p" variant="bodySm" tone="subdued">Total Products</Text>
              <Text as="span" variant="headingLg" fontWeight="bold">
                {productAnalyticsData?.totalProducts || 0}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                {productAnalyticsData?.activeProducts || 0} active in catalog
              </Text>
            </BlockStack>
          </InlineStack>

          <Box background="bg-surface" width="1px" minHeight="60px" />

          <InlineStack gap="300" blockAlign="center">
            <Box 
              background="bg-surface-success" 
              padding="200" 
              borderRadius="100"
            >
              <Icon source={CashDollarIcon} tone="success" />
            </Box>
            <BlockStack gap="050">
              <Text as="p" variant="bodySm" tone="subdued">Catalog Value</Text>
              <Text as="span" variant="headingLg" fontWeight="bold">
                {formatCompactCurrency(productAnalyticsData?.totalCatalogValue || 0)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Total inventory value
              </Text>
            </BlockStack>
          </InlineStack>

          <Box background="bg-surface" width="1px" minHeight="60px" />

          <InlineStack gap="300" blockAlign="center">
            <Box 
              background="bg-surface-warning" 
              padding="200" 
              borderRadius="100"
            >
              <Icon source={ChartVerticalIcon} tone="warning" />
            </Box>
            <BlockStack gap="050">
              <Text as="p" variant="bodySm" tone="subdued">Average Price</Text>
              <Text as="span" variant="headingLg" fontWeight="bold">
                {formatCompactCurrency(productAnalyticsData?.avgProductPrice || 0)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Per product pricing
              </Text>
            </BlockStack>
          </InlineStack>

          <Box background="bg-surface" width="1px" minHeight="60px" />

          <InlineStack gap="300" blockAlign="center">
            <Box 
              background="bg-surface-critical" 
              padding="200" 
              borderRadius="100"
            >
              <Icon source={ChartVerticalIcon} tone="critical" />
            </Box>
            <BlockStack gap="050">
              <Text as="p" variant="bodySm" tone="subdued">Catalog Health</Text>
              <Text as="span" variant="headingLg" fontWeight="bold">
                {formatPercentage(productAnalyticsData?.catalogHealth || 0)}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Stock adequacy score
              </Text>
            </BlockStack>
          </InlineStack>
        </InlineStack>
      </Card>

      {/* Analytics Deep Dive - Full Width Horizontal Layout */}
      <BlockStack gap="400">
        {/* Stock Status - Full Width Horizontal */}
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Stock Status Overview
            </Text>
            
            {productAnalyticsData?.inventoryDistribution ? (
              <InlineStack gap="400" align="space-between" wrap={true}>
                <Box 
                  padding="400" 
                  background="bg-surface" 
                  borderRadius="200" 
                  borderWidth="025" 
                  borderColor="border-success"
                  minWidth="280px"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Box 
                        background="bg-surface-success" 
                        padding="200" 
                        borderRadius="100"
                      >
                        <Icon source={CheckIcon} tone="success" />
                      </Box>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Well Stocked</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">Products in good supply</Text>
                      </BlockStack>
                    </InlineStack>
                    <Text as="p" variant="heading2xl" fontWeight="bold" tone="success">
                      {productAnalyticsData.inventoryDistribution.wellStocked}
                    </Text>
                  </InlineStack>
                </Box>
                
                <Box 
                  padding="400" 
                  background="bg-surface" 
                  borderRadius="200" 
                  borderWidth="025" 
                  borderColor="border-warning"
                  minWidth="280px"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Box 
                        background="bg-surface-warning" 
                        padding="200" 
                        borderRadius="100"
                      >
                        <Icon source={AlertTriangleIcon} tone="warning" />
                      </Box>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Low Stock</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">Low inventory levels</Text>
                      </BlockStack>
                    </InlineStack>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {productAnalyticsData.inventoryDistribution.lowStock}
                    </Text>
                  </InlineStack>
                </Box>
                
                <Box 
                  padding="400" 
                  background="bg-surface" 
                  borderRadius="200" 
                  borderWidth="025" 
                  borderColor="border-critical"
                  minWidth="280px"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Box 
                        background="bg-surface-critical" 
                        padding="200" 
                        borderRadius="100"
                      >
                        <Icon source={XIcon} tone="critical" />
                      </Box>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Out of Stock</Text>
                        <Text as="p" variant="bodyXs" tone="subdued">Immediate action needed</Text>
                      </BlockStack>
                    </InlineStack>
                    <Text as="p" variant="heading2xl" fontWeight="bold" tone="critical">
                      {productAnalyticsData.inventoryDistribution.outOfStock}
                    </Text>
                  </InlineStack>
                </Box>
              </InlineStack>
            ) : (
              <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                <BlockStack align="center" gap="300">
                  <Spinner size="small" />
                  <Text as="p" variant="bodyMd" tone="subdued">Loading stock data...</Text>
                </BlockStack>
              </Box>
            )}
            
            {/* Stock Definition Note */}
            {productAnalyticsData?.inventoryDistribution && (
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  <strong>Low Stock:</strong> Products with 10 or fewer units remaining • <strong>Well Stocked:</strong> Products with more than 10 units
                </Text>
              </Box>
            )}
          </BlockStack>
        </Card>

        {/* Price Distribution - Horizontal Slider Layout */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd" fontWeight="semibold">
                  Price Distribution Analysis
                </Text>
                {productAnalyticsData?.priceAnalysis?.priceDistribution && productAnalyticsData.priceAnalysis.priceDistribution.length > 5 && (
                <InlineStack gap="300" blockAlign="center">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Showing {Math.min(priceDistributionIndex + 1, productAnalyticsData.priceAnalysis.priceDistribution.length)} - {Math.min(priceDistributionIndex + 5, productAnalyticsData.priceAnalysis.priceDistribution.length)} of {productAnalyticsData.priceAnalysis.priceDistribution.length} ranges
                  </Text>
                  <InlineStack gap="200">
                    <Button
                      size="medium"
                      disabled={priceDistributionIndex === 0}
                      onClick={() => setPriceDistributionIndex(Math.max(0, priceDistributionIndex - 5))}
                      icon={ChevronLeftIcon}
                    />
                    <Button
                      size="medium"
                      disabled={priceDistributionIndex + 5 >= productAnalyticsData.priceAnalysis.priceDistribution.length}
                      onClick={() => setPriceDistributionIndex(Math.min(productAnalyticsData.priceAnalysis.priceDistribution.length - 5, priceDistributionIndex + 5))}
                      icon={ChevronRightIcon}
                    />
                  </InlineStack>
                </InlineStack>
              )}
              </InlineStack>
              
              {/* Order Data Status Note */}
              {productAnalyticsData?.priceAnalysis?.priceDistribution && (
                <Box padding="300" background="bg-surface-info" borderRadius="200" borderWidth="025" borderColor="border-info">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={InfoIcon} tone="info" />
                    <Text as="p" variant="bodyXs">
                      <strong>Orders Data:</strong> Shows actual order quantities from your store's order history. 
                      Ranges showing 0 orders have no recent sales. This data updates as new orders are placed.
                    </Text>
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
            
            {productAnalyticsData?.priceAnalysis?.priceDistribution ? (
              <BlockStack gap="400">
                
                {/* Simple Price Range Table */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'separate', 
                    borderSpacing: '0 8px',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '8px'
                      }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          color: '#374151',
                          borderRadius: '8px 0 0 0'
                        }}>
                          Price Range
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Products
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Orders
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#374151',
                          borderRadius: '0 8px 8px 0'
                        }}>
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalyticsData.priceAnalysis.priceDistribution
                        .slice(priceDistributionIndex, priceDistributionIndex + 5)
                        .map((range, index) => {
                          const percentage = productAnalyticsData.priceAnalysis.priceDistribution.length > 0 
                            ? Math.round((range.count / productAnalyticsData.priceAnalysis.priceDistribution.reduce((sum, r) => sum + r.count, 0)) * 100) 
                            : 0;
                          const hasProducts = range.count > 0;
                          
                          return (
                            <tr 
                              key={priceDistributionIndex + index}
                              style={{ 
                                backgroundColor: hasProducts ? '#ffffff' : '#f9fafb',
                                border: hasProducts ? '1px solid #e5e7eb' : '1px solid #f3f4f6',
                                borderRadius: '8px'
                              }}
                            >
                              <td style={{ 
                                padding: '16px', 
                                fontWeight: '500',
                                color: hasProducts ? '#111827' : '#6b7280',
                                borderRadius: '8px 0 0 0'
                              }}>
                                {range.range}
                              </td>
                              <td style={{ 
                                padding: '16px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: hasProducts ? '#059669' : '#6b7280'
                              }}>
                                {range.count}
                              </td>
                              <td style={{ 
                                padding: '16px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: hasProducts ? '#dc2626' : '#6b7280'
                              }}>
                                {range.orders || 0}
                              </td>
                              <td style={{ 
                                padding: '16px', 
                                textAlign: 'right',
                                fontWeight: '500',
                                color: '#6b7280',
                                borderRadius: '0 8px 8px 0'
                              }}>
                                {percentage}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Info */}
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Price Range:</strong> ${productAnalyticsData.priceAnalysis.minPrice.toFixed(2)} - ${productAnalyticsData.priceAnalysis.maxPrice.toFixed(2)}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Average Price:</strong> ${productAnalyticsData.priceAnalysis.avgPrice.toFixed(2)}
                    </Text>
                  </InlineStack>
                </Box>
              </BlockStack>
            ) : (
              <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                <BlockStack align="center" gap="300">
                  <Spinner size="small" />
                  <Text as="p" variant="bodyMd" tone="subdued">Loading price analysis...</Text>
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>      {/* Top Products by Value - Horizontal Slider */}
      <Card>
        <BlockStack gap="500">
          <Text as="h3" variant="headingMd">
            Top Products by Catalog Value
          </Text>
          {isLoading ? (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="center" gap="200">
                <Spinner size="small" />
                <Text as="p" variant="bodyMd">Analyzing product performance...</Text>
              </InlineStack>
            </Box>
          ) : error ? (
            <Box padding="400" background="bg-surface-critical" borderRadius="200">
              <Text as="p" variant="bodyMd" tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          ) : productAnalyticsData?.topProducts && productAnalyticsData.topProducts.length > 0 ? (
            <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
                {productAnalyticsData.topProducts.map((product, index) => (
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
                            <Text as="span" variant="bodyXs" fontWeight="bold">#{index + 1}</Text>
                          </Box>
                          <Badge 
                            size="small"
                            tone={
                              product.inventoryStatus === 'Well Stocked' ? 'success' : 
                              product.inventoryStatus === 'Low Stock' ? 'warning' : 'critical'
                            }
                          >
                            {product.inventoryStatus}
                          </Badge>
                        </InlineStack>
                        <Text as="p" variant="headingMd" fontWeight="bold" tone="success">
                          {formatCompactCurrency(product.value)}
                        </Text>
                      </InlineStack>
                      
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {product.name}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {product.variants} variant{product.variants !== 1 ? 's' : ''} • {product.priceRange}
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                ))}
              </div>
            </div>
          ) : (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                No product data available
              </Text>
            </Box>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
    );
  };

  const renderInventoryTab = () => {
    // Mock data for inventory forecasting (will be replaced with real API calls)
    const mockInventoryData = [
      {
        id: '1',
        title: 'Premium Cotton T-Shirt',
        sku: 'TCT-001',
        currentStock: 5,
        averageDailyDemand: 2.3,
        forecastDays: 2,
        reorderPoint: 15,
        status: 'critical',
        vendor: 'Cotton Co.',
        category: 'Clothing',
        lastOrderDate: '2024-09-15',
        suggestedReorderQuantity: 50
      },
      {
        id: '2', 
        title: 'Wireless Bluetooth Headphones',
        sku: 'WBH-002',
        currentStock: 23,
        averageDailyDemand: 1.8,
        forecastDays: 13,
        reorderPoint: 20,
        status: 'low',
        vendor: 'Audio Tech',
        category: 'Electronics',
        lastOrderDate: '2024-09-10',
        suggestedReorderQuantity: 30
      },
      {
        id: '3',
        title: 'Organic Face Moisturizer',
        sku: 'OFM-003', 
        currentStock: 45,
        averageDailyDemand: 1.2,
        forecastDays: 38,
        reorderPoint: 25,
        status: 'healthy',
        vendor: 'Beauty Supply',
        category: 'Beauty',
        lastOrderDate: '2024-08-30',
        suggestedReorderQuantity: 40
      },
      {
        id: '4',
        title: 'Stainless Steel Water Bottle',
        sku: 'SSWB-004',
        currentStock: 8,
        averageDailyDemand: 3.1,
        forecastDays: 3,
        reorderPoint: 18,
        status: 'critical',
        vendor: 'DrinkWare Ltd',
        category: 'Home & Garden',
        lastOrderDate: '2024-09-12',
        suggestedReorderQuantity: 60
      },
      {
        id: '5',
        title: 'Yoga Mat - Premium',
        sku: 'YMP-005',
        currentStock: 15,
        averageDailyDemand: 0.8,
        forecastDays: 19,
        reorderPoint: 12,
        status: 'low',
        vendor: 'Fitness Pro',
        category: 'Sports',
        lastOrderDate: '2024-09-05',
        suggestedReorderQuantity: 25
      }
    ];

    // Filter and sort logic
    const getFilteredData = () => {
      let filtered = mockInventoryData;

      // Search filter
      if (inventorySearchQuery) {
        filtered = filtered.filter(item => 
          item.title.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
          item.vendor.toLowerCase().includes(inventorySearchQuery.toLowerCase())
        );
      }

      // Category filter
      if (inventoryCategory !== 'all') {
        filtered = filtered.filter(item => item.category === inventoryCategory);
      }

      // Status filters
      if (showLowStockOnly) {
        filtered = filtered.filter(item => item.status === 'low' || item.status === 'critical');
      }

      if (showCriticalOnly) {
        filtered = filtered.filter(item => item.status === 'critical');
      }

      // Sort
      filtered.sort((a, b) => {
        switch (sortInventoryBy) {
          case 'forecast_days':
            return a.forecastDays - b.forecastDays;
          case 'current_stock':
            return a.currentStock - b.currentStock;
          case 'title':
            return a.title.localeCompare(b.title);
          case 'category':
            return a.category.localeCompare(b.category);
          default:
            return a.forecastDays - b.forecastDays;
        }
      });

      return filtered;
    };

    const filteredData = getFilteredData();

    const getStatusBadge = (status: string, days: number) => {
      switch (status) {
        case 'critical':
          return <Badge tone="critical">{`Critical (${days}d left)`}</Badge>;
        case 'low':
          return <Badge tone="warning">{`Low Stock (${days}d left)`}</Badge>;
        case 'healthy':
          return <Badge tone="success">{`Healthy (${days}d left)`}</Badge>;
        default:
          return <Badge>Unknown</Badge>;
      }
    };

    const categories = ['all', ...Array.from(new Set(mockInventoryData.map(item => item.category)))];

    return (
      <BlockStack gap="400">
        {/* Header Section */}
        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Inventory Management ({filteredData.length} products)
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Monitor stock levels and forecast demand
            </Text>
          </BlockStack>
        </Card>

        {/* Modern Compact Search and Filter Section */}
        <Card padding="0">
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '16px 20px',
              textAlign: 'left'
            }}
          >
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={SearchIcon} />
                <Text as="h3" variant="headingXs">Filters & Search</Text>
              </InlineStack>
              <div style={{ marginLeft: 'auto' }}>
                <Icon source={isFiltersOpen ? ChevronUpIcon : ChevronDownIcon} />
              </div>
            </InlineStack>
          </button>
          
          {isFiltersOpen && (
            <div style={{ padding: '0 20px 20px 20px' }}>
              <BlockStack gap="300">

                {/* Search */}
                <TextField
                  label=""
                  value={inventorySearchQuery}
                  onChange={setInventorySearchQuery}
                  placeholder="Search by product name, handle, or SKU..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setInventorySearchQuery('')}
                />

                {/* Filter Controls - Row 1: Basic Filters */}
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Category"
                      value={inventoryCategory}
                      onChange={setInventoryCategory}
                      options={categories.map(cat => ({
                        label: cat === 'all' ? 'All Categories' : cat,
                        value: cat
                      }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Stock Status"
                      options={[
                        { label: 'All Products', value: 'all' },
                        { label: 'Critical Stock', value: 'critical' },
                        { label: 'Low Stock', value: 'low' },
                        { label: 'Healthy Stock', value: 'healthy' }
                      ]}
                      value={inventoryCategory}
                      onChange={setInventoryCategory}
                    />
                  </div>
                </InlineStack>

                {/* Quick Filters - Checkboxes */}
                <InlineStack gap="400" wrap={false}>
                  <Checkbox
                    label="Critical stock alerts only"
                    checked={showCriticalOnly}
                    onChange={setShowCriticalOnly}
                  />
                  <Checkbox
                    label="Low stock only"
                    checked={showLowStockOnly}
                    onChange={setShowLowStockOnly}
                  />
                  <div style={{ marginLeft: 'auto' }}>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        setInventorySearchQuery('');
                        setInventoryCategory('all');
                        setShowLowStockOnly(false);
                        setShowCriticalOnly(false);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </InlineStack>

              </BlockStack>
            </div>
          )}
        </Card>



        {/* Inventory Table */}
        <Card>
          <BlockStack gap="400">

            {filteredData.length === 0 ? (
              <EmptyState
                heading="No products found"
                action={{
                  content: 'Clear filters',
                  onAction: () => {
                    setInventorySearchQuery('');
                    setInventoryCategory('all');
                    setShowLowStockOnly(false);
                    setShowCriticalOnly(false);
                  }
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd" tone="subdued">
                  Try adjusting your search or filter criteria to find products.
                </Text>
              </EmptyState>
            ) : (
              <div style={{ overflow: 'hidden' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text', 'numeric', 'text', 'text']}
                  headings={[
                    'Product',
                    'SKU',
                    'Current Stock',
                    'Status',
                    'Forecast Days',
                    'Daily Demand',
                    'Actions'
                  ]}
                  rows={filteredData.map(item => [
                    <BlockStack gap="100" key={item.id}>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {item.title}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {item.vendor} • {item.category}
                      </Text>
                    </BlockStack>,
                    <Text as="p" variant="bodyMd" fontWeight="medium">
                      {item.sku}
                    </Text>,
                    <Text as="p" variant="bodyMd">
                      {item.currentStock} units
                    </Text>,
                    getStatusBadge(item.status, item.forecastDays),
                    <Text as="p" variant="bodyMd" fontWeight="medium">
                      {item.forecastDays} days
                    </Text>,
                    <Text as="p" variant="bodyMd">
                      {item.averageDailyDemand} units/day
                    </Text>,
                    <InlineStack gap="200">
                      <Tooltip content="View details">
                        <Button
                          icon={ViewIcon}
                          variant="tertiary"
                          size="slim"
                          onClick={() => console.log('View inventory item:', item.id)}
                        />
                      </Tooltip>
                      <Tooltip content="Edit product">
                        <Button
                          icon={EditIcon}
                          variant="tertiary"
                          size="slim"
                          onClick={() => console.log('Edit inventory item:', item.id)}
                        />
                      </Tooltip>
                      <Tooltip content="More actions">
                        <Button
                          icon={MenuHorizontalIcon}
                          variant="tertiary"
                          size="slim"
                          onClick={() => console.log('More actions for item:', item.id)}
                        />
                      </Tooltip>
                    </InlineStack>
                  ])}
                />
              </div>
            )}
          </BlockStack>
        </Card>

        {/* Additional Info */}
        <Card>
          <BlockStack gap="300" align="start">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              How Forecasting Works
            </Text>
            <BlockStack gap="200" align="start">
              <InlineStack gap="200" blockAlign="start">
                <Box paddingBlockStart="050">
                  <Icon source={InfoIcon} tone="info" />
                </Box>
                <BlockStack gap="100" align="start">
                  <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="start">
                    Forecast Calculation
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="start">
                    Days until stock-out = Current Stock ÷ Average Daily Demand
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <InlineStack gap="200" blockAlign="start">
                <Box paddingBlockStart="050">
                  <Icon source={ClockIcon} tone="warning" />
                </Box>
                <BlockStack gap="100" align="start">
                  <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="start">
                    Status Thresholds
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="start">
                    Critical: ≤ 7 days • Low Stock: 8-14 days • Healthy: &gt; 14 days
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <InlineStack gap="200" blockAlign="start">
                <Box paddingBlockStart="050">
                  <Icon source={InventoryIcon} tone="success" />
                </Box>
                <BlockStack gap="100" align="start">
                  <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="start">
                    Reorder Suggestions
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="start">
                    Based on historical demand patterns and lead times
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };



  return (
    <>
      
      <BlockStack gap="300">
        {/* Unified Dashboard Header and Content */}
        <Card>
          <BlockStack gap="300">
            {/* Header Section */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="200">
                  <Text as="h1" variant="headingLg">
                    Analytics Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Smart insights and comprehensive analytics for your store
                  </Text>
                </BlockStack>
              

            </InlineStack>

            <Divider />

            {/* Tabs Section */}
            <Tabs
              tabs={tabs}
              selected={activeTab}
              onSelect={(selectedTab) => {
                setActiveTab(selectedTab);
              }}
              fitted={false}
            />
          </BlockStack>

          {/* Tab Content */}
          <Box paddingBlockStart="100">
            {activeTab === 0 && renderProductPerformanceTab()}
            {activeTab === 1 && renderInventoryTab()}
          </Box>
        </BlockStack>
      </Card>

      
      </BlockStack>
    </>
  );
}

export default Dashboard;

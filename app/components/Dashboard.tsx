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
  Modal,
  Banner,
  TextField,
  Select,
  Checkbox,
  DataTable,
  EmptyState,
  Collapsible,
} from "@shopify/polaris";
import {
  RefreshIcon,
  CashDollarIcon,
  ChartVerticalIcon,
  OrderIcon,
  CalendarIcon,
  AlertCircleIcon,
  InfoIcon,
  ClockIcon,
  // PackageIcon,
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  // Inventory filtering state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterRisk, setFilterRisk] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchProduct, setSearchProduct] = useState('');
  const [priceDistributionIndex, setPriceDistributionIndex] = useState(0);

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
          setLastDataUpdate(lastUpdate);
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
      setLastDataUpdate(now);
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

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date());
    
    // Skip refresh for Inventory Forecasting (tab 1) and Order Analysis (tab 2) - they're in development
    if (activeTab === 1 || activeTab === 2) {
      console.log("Dashboard: Skipping refresh for development tab:", activeTab);
      return;
    }
    
    const type = activeTab === 0 ? 'revenue' : 'inventory';
    console.log("Dashboard: Refresh triggered, activeTab:", activeTab, "type:", type);
    fetchFreshData(type, true);
  }, [activeTab, fetchFreshData]);

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
    {
      id: 'orders',
      content: '🔒 Order Analysis', 
      accessibilityLabel: 'Order Analysis - Coming Soon',
      panelID: 'orders-panel',
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
    return (
      <Card>
        <BlockStack gap="600" align="center">
          <Box padding="800">
            <BlockStack gap="500" align="center">
              <Box 
                background="bg-fill-warning" 
                padding="600" 
                borderRadius="200"
              >
                <Icon source={AlertTriangleIcon} tone="base" />
              </Box>
              
              <BlockStack gap="300" align="center">
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Inventory Forecasting
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                  In Development
                </Text>
              </BlockStack>
              
              <BlockStack gap="400" align="center">
                <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                  Advanced inventory forecasting requires order history data to predict stock-outs, 
                  calculate reorder points, and optimize inventory levels. This feature is currently 
                  being developed and will be available soon.
                </Text>
                
                <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      🚀 Coming Soon:
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">• AI-powered stock-out predictions</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Automated reorder point calculations</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Seasonal demand forecasting</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Smart inventory optimization</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Low stock alerts & notifications</Text>
                    </BlockStack>
                  </BlockStack>
                </Box>
                
                <Box padding="300" background="bg-surface-info" borderRadius="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={InfoIcon} tone="info" />
                    <Text as="p" variant="bodySm">
                      Order data integration required for accurate forecasting
                    </Text>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Box>
        </BlockStack>
      </Card>
    );
  };

  const renderOrderAnalysisTab = () => {
    return (
      <Card>
        <BlockStack gap="600" align="center">
          <Box padding="800">
            <BlockStack gap="500" align="center">
              <Box 
                background="bg-fill-info" 
                padding="600" 
                borderRadius="200"
              >
                <Icon source={OrderIcon} tone="base" />
              </Box>
              
              <BlockStack gap="300" align="center">
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Order Analysis
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                  Coming Soon
                </Text>
              </BlockStack>
              
              <BlockStack gap="400" align="center">
                <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                  Advanced order analytics including sales trends, customer behavior patterns, 
                  revenue forecasting, and performance insights are currently in development.
                </Text>
                
                <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      📊 Planned Features:
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">• Sales trend analysis and forecasting</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Customer purchase behavior insights</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Revenue growth tracking</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Order fulfillment analytics</Text>
                      <Text as="p" variant="bodySm" tone="subdued">• Peak sales time identification</Text>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Box>
        </BlockStack>
      </Card>
    );
  };

  return (
    <>
      {/* CSS for greyed out tabs */}
      <style>{`
        .Polaris-Tabs__Tab:nth-child(3) button {
          opacity: 0.5;
          color: #8c9196 !important;
          cursor: not-allowed;
        }
        .Polaris-Tabs__Tab:nth-child(3) button:hover {
          background-color: #f6f6f7 !important;
        }
      `}</style>
      
      <BlockStack gap="500">
        {/* Unified Dashboard Header and Content */}
        <Card>
          <BlockStack gap="500">
            {/* Header Section */}
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="200">
                  <Text as="h1" variant="headingLg">
                    Analytics Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Smart insights and comprehensive analytics for your store
                  </Text>
                </BlockStack>
              
              <BlockStack gap="200" align="end">
                <Button
                  icon={RefreshIcon}
                  onClick={handleRefresh}
                  loading={isLoading}
                  tone={isManualRefresh ? 'success' : undefined}
                  accessibilityLabel="Refresh analytics data"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh Analytics'}
                </Button>
                
                {/* Data Update Information - Only for Inventory & Order Analysis */}
                {(activeTab === 1 || activeTab === 2) && (
                  <InlineStack gap="400" wrap={false} align="end">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={ClockIcon} tone="subdued" />
                      <Text as="p" variant="bodySm" tone="subdued">
                        Real-time data
                      </Text>
                    </InlineStack>
                    
                    {lastDataUpdate && (
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CalendarIcon} tone="subdued" />
                        <Text as="p" variant="bodySm" tone="subdued">
                          Last updated: {lastDataUpdate.toLocaleDateString()} at {lastDataUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </InlineStack>
                    )}

                    <Tooltip content="Analytics data updates in real-time. Click 'Refresh Now' for the latest information.">
                      <Icon source={InfoIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                )}
              </BlockStack>
            </InlineStack>

            <Divider />

            {/* Tabs Section */}
            <Tabs
              tabs={tabs}
              selected={activeTab}
              onSelect={(selectedTab) => {
                // Show coming soon message for disabled tab (2)
                if (selectedTab === 2) {
                  setShowComingSoon(true);
                  return; // Don't change tab
                }
                setActiveTab(selectedTab);
              }}
              fitted={false}
            />
          </BlockStack>

          {/* Tab Content */}
          <Box paddingBlockStart="400">
            {activeTab === 0 && renderProductPerformanceTab()}
            {activeTab === 1 && renderInventoryTab()}
            {activeTab === 2 && renderOrderAnalysisTab()}
          </Box>
        </BlockStack>
      </Card>
      
      {/* Coming Soon Modal */}
      <Modal
        open={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title="Feature Coming Soon"
        primaryAction={{
          content: 'Got it',
          onAction: () => setShowComingSoon(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  🚧 This feature is currently under development and will be available soon!
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  We're working hard to bring you advanced analytics and insights. Stay tuned for updates!
                </Text>
              </BlockStack>
            </Banner>
            
            <Box background="bg-surface-secondary" padding="400" borderRadius="300">
              <BlockStack gap="300">
                <Text as="p" variant="headingSm">
                  🎯 What's Coming:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">• AI-powered inventory forecasting</Text>
                  <Text as="p" variant="bodySm">• Advanced order pattern analysis</Text>
                  <Text as="p" variant="bodySm">• Predictive stock-out alerts</Text>
                  <Text as="p" variant="bodySm">• Seasonal demand insights</Text>
                  <Text as="p" variant="bodySm">• Smart reorder recommendations</Text>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      </BlockStack>
    </>
  );
}

export default Dashboard;

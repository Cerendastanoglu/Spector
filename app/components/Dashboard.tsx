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
  Collapsible,


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
  ChevronDownIcon,
  ViewIcon,
  CheckCircleIcon,
  PlusCircleIcon,
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
  
  // Inventory filtering state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterRisk, setFilterRisk] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchProduct, setSearchProduct] = useState('');
  const [priceDistributionIndex, setPriceDistributionIndex] = useState(0);
  const [showAIMethodology, setShowAIMethodology] = useState(false);

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
    // But don't block UI - show dashboard structure with loading states
    if (!hasCachedData) {
      console.log(`Dashboard: No cached ${type} data found, fetching fresh data`);
      // Use a timeout to allow UI to render first, then fetch data
      setTimeout(() => {
        fetchFreshData(type, false);
      }, 100);
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

  // Skeleton loading component for key metrics
  const renderMetricsSkeleton = () => (
    <Card>
      <InlineStack gap="600" align="space-between" wrap={false}>
        {[1, 2, 3, 4].map((i) => (
          <InlineStack key={i} gap="300" blockAlign="center">
            <Box 
              background="bg-surface-secondary" 
              padding="200" 
              borderRadius="100"
            >
              <div style={{ width: '20px', height: '20px' }} />
            </Box>
            <BlockStack gap="050">
              <div style={{ width: '80px', height: '12px', backgroundColor: 'var(--p-color-bg-surface-secondary)', borderRadius: '4px' }} />
              <div style={{ width: '60px', height: '20px', backgroundColor: 'var(--p-color-bg-surface-secondary)', borderRadius: '4px' }} />
              <div style={{ width: '100px', height: '10px', backgroundColor: 'var(--p-color-bg-surface-secondary)', borderRadius: '4px' }} />
            </BlockStack>
          </InlineStack>
        ))}
      </InlineStack>
    </Card>
  );

  // Skeleton loading component for product table
  const renderProductTableSkeleton = () => (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="200">
          <div style={{ width: '200px', height: '20px', backgroundColor: 'var(--p-color-bg-surface-secondary)', borderRadius: '4px' }} />
          <div style={{ width: '300px', height: '14px', backgroundColor: 'var(--p-color-bg-surface-secondary)', borderRadius: '4px' }} />
        </BlockStack>
        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
          <BlockStack gap="300">
            {[1, 2, 3, 4, 5].map((i) => (
              <InlineStack key={i} gap="400" align="space-between">
                <InlineStack gap="300">
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                  <BlockStack gap="100">
                    <div style={{ width: '150px', height: '14px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                    <div style={{ width: '100px', height: '12px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                  </BlockStack>
                </InlineStack>
                <InlineStack gap="200">
                  <div style={{ width: '60px', height: '14px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                  <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                  <div style={{ width: '50px', height: '20px', backgroundColor: 'var(--p-color-bg-surface)', borderRadius: '4px' }} />
                </InlineStack>
              </InlineStack>
            ))}
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );

  const renderProductPerformanceTab = () => {
    // Handle error state only (not loading)
    if (error && !isLoading) {
      return (
        <Card>
          <BlockStack align="center" gap="400">
            <Icon source={AlertCircleIcon} tone="critical" />
            <Text as="h3" tone="critical">{error}</Text>
            <Button 
              onClick={() => fetchFreshData('revenue', true)}
              variant="primary"
            >
              Try Again
            </Button>
          </BlockStack>
        </Card>
      );
    }

    // Handle empty data state (no products) - only when not loading and we have confirmed empty data
    if (!isLoading && productAnalyticsData && productAnalyticsData.totalProducts === 0) {
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
      {/* Key Metrics - Always show structure, with loading states or data */}
      {isLoading && !productAnalyticsData ? (
        // Show skeleton during initial load
        renderMetricsSkeleton()
      ) : (
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
                {isLoading && (
                  <InlineStack gap="100" blockAlign="center">
                    <Spinner size="small" />
                    <Text as="p" variant="bodyXs" tone="subdued">Updating...</Text>
                  </InlineStack>
                )}
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
      )}

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
                  <InlineStack gap="200" blockAlign="start">
                    <Box paddingBlockStart="050">
                      <Icon source={InfoIcon} tone="info" />
                    </Box>
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
      </BlockStack>      {/* Top Products by Value - Always show section, with loading or data */}
      <Card>
        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Top Products by Catalog Value
            </Text>
            {isLoading && (
              <InlineStack gap="200" blockAlign="center">
                <Spinner size="small" />
                <Text as="p" variant="bodySm" tone="subdued">Loading products...</Text>
              </InlineStack>
            )}
          </InlineStack>
          
          {isLoading && !productAnalyticsData?.topProducts ? (
            // Show skeleton during initial load
            renderProductTableSkeleton()
          ) : error && !productAnalyticsData ? (
            <Box padding="400" background="bg-surface-critical" borderRadius="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodyMd" tone="critical">
                  {error}
                </Text>
                <Button 
                  onClick={() => fetchFreshData('revenue', true)}
                  variant="primary"
                  size="micro"
                >
                  Retry
                </Button>
              </InlineStack>
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
                {!productAnalyticsData ? 'Loading product data...' : 'No product data available'}
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
        suggestedReorderQuantity: 50,
        profitMargin: 28.5,
        leadTime: 14,
        velocity: 'fast'
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
        suggestedReorderQuantity: 30,
        profitMargin: 45.2,
        leadTime: 21,
        velocity: 'medium'
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
        suggestedReorderQuantity: 40,
        profitMargin: 62.1,
        leadTime: 10,
        velocity: 'slow'
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
        suggestedReorderQuantity: 60,
        profitMargin: 35.8,
        leadTime: 12,
        velocity: 'fast'
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
                    <Tooltip content="View details">
                      <Button
                        icon={ViewIcon}
                        variant="tertiary"
                        size="micro"
                        onClick={() => console.log('View inventory item:', item.id)}
                      />
                    </Tooltip>
                    <Tooltip content="Quick reorder">
                      <Button
                        icon={PlusCircleIcon}
                        variant="tertiary"
                        size="micro"
                        onClick={() => console.log('Quick reorder:', item.id)}
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
                  <InlineStack gap="300" blockAlign="center">
                    <Text as="h1" variant="headingLg">
                      Analytics Dashboard
                    </Text>
                    {isLoading && (
                      <InlineStack gap="200" blockAlign="center">
                        <Spinner size="small" />
                        <Badge tone="info" size="small">
                          {isManualRefresh ? 'Refreshing' : 'Loading'}
                        </Badge>
                      </InlineStack>
                    )}
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Smart insights and comprehensive analytics for your store
                    {isLoading && !productAnalyticsData && ' • Loading product data...'}
                  </Text>
                </BlockStack>
                
                <InlineStack gap="200">
                  <Button
                    onClick={() => fetchFreshData(activeTab === 0 ? 'revenue' : 'inventory', true)}
                    loading={isLoading && isManualRefresh}
                    disabled={isLoading}
                    variant="secondary"
                    size="slim"
                  >
                    Refresh Data
                  </Button>
                </InlineStack>

            </InlineStack>

            <Divider />

            {/* Tabs Section */}
            <Box background="bg-surface-secondary" borderRadius="300" padding="200">
              <Tabs
                tabs={tabs}
                selected={activeTab}
                onSelect={(selectedTab) => {
                  setActiveTab(selectedTab);
                }}
                fitted={true}
              />
            </Box>
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

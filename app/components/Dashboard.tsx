import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Grid,
  Button,
  Icon,
  Tabs,
  Select,
  Spinner,
  Badge,
  Tooltip,
  Divider,
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
} from "@shopify/polaris-icons";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
}

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueGrowth: number;
  topRevenueProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    quantity: number;
    growthRate: number;
  }>;
  salesTrends: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  customerMetrics: {
    newCustomers: number;
    returningCustomers: number;
    avgCustomerValue: number;
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

export function Dashboard({ isVisible, outOfStockCount, onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [timePeriod, setTimePeriod] = useState('30');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  const revenueFetcher = useFetcher<{ success: boolean; data?: RevenueData; error?: string }>();
  const inventoryFetcher = useFetcher<{ success: boolean; data?: InventoryData; error?: string }>();
  
  // Refs to hold current values to prevent useEffect dependencies
  const timePeriodRef = useRef(timePeriod);
  const revenueFetcherRef = useRef(revenueFetcher);
  const inventoryFetcherRef = useRef(inventoryFetcher);
  
  // Update refs when values change
  useEffect(() => {
    timePeriodRef.current = timePeriod;
    revenueFetcherRef.current = revenueFetcher;
    inventoryFetcherRef.current = inventoryFetcher;
  });

  // Cache key for localStorage
  const getCacheKey = (type: 'revenue' | 'inventory', period: string) => 
    `spector_${type}_data_${period}`;

  // Check if data needs refresh (weekly refresh or manual)
  const needsRefresh = useCallback((lastUpdate: Date | null): boolean => {
    if (!lastUpdate) return true;
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    return Date.now() - lastUpdate.getTime() > oneWeek;
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
            setRevenueData(data);
          } else {
            setInventoryData(data);
          }
          setLastDataUpdate(lastUpdate);
          console.log(`Dashboard: Loaded ${type} data from cache (${data?.totalOrders || 0} orders)`);
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
    const currentRevenueFetcher = revenueFetcherRef.current;
    const currentInventoryFetcher = inventoryFetcherRef.current;
    
    if (type === 'revenue') {
      currentRevenueFetcher.load(`/app/api/revenue?period=${currentPeriod}`);
    } else {
      currentInventoryFetcher.load(`/app/api/inventory?period=${currentPeriod}`);
    }
  }, []); // No dependencies to prevent recreation

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date());
    const type = activeTab === 0 ? 'revenue' : 'inventory';
    fetchFreshData(type, true);
  }, [activeTab, fetchFreshData]);

  // Reset loading flag when tab or period changes
  useEffect(() => {
    setHasLoadedInitialData(false);
  }, [activeTab, timePeriod]);

  // Smart data loading: check cache first, then fetch if needed
  useEffect(() => {
    if (!isVisible) return;

    const type = activeTab === 0 ? 'revenue' : 'inventory';
    const cacheKey = `${type}_${activeTab}_${timePeriod}`;
    
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
  }, [isVisible, activeTab, timePeriod]);

  // Handle revenue data response
  useEffect(() => {
    if (revenueFetcher.data) {
      console.log("Dashboard: Revenue data received", revenueFetcher.data);
      if (revenueFetcher.data.success && revenueFetcher.data.data) {
        setRevenueData(revenueFetcher.data.data);
        saveCachedData('revenue', timePeriod, revenueFetcher.data.data);
        setError((revenueFetcher.data as any).warning || null); // Show warning if present
      } else {
        setError(revenueFetcher.data.error || 'Failed to load revenue data');
        setRevenueData(null);
      }
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [revenueFetcher.data, timePeriod, saveCachedData]);

  // Handle revenue fetcher state changes
  useEffect(() => {
    if (revenueFetcher.state === 'idle' && revenueFetcher.data) {
      setIsLoading(false);
    } else if (revenueFetcher.state === 'loading') {
      setIsLoading(true);
    }
  }, [revenueFetcher.state, revenueFetcher.data]);

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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const tabs = [
    {
      id: 'revenue',
      content: 'Revenue Analytics',
      accessibilityLabel: 'Revenue Analytics',
      panelID: 'revenue-panel',
    },
    {
      id: 'inventory',
      content: 'Inventory Forecasting',
      accessibilityLabel: 'Inventory Forecasting',
      panelID: 'inventory-panel',
    },
  ];

  const renderRevenueTab = () => {
    // Handle loading state
    if (isLoading) {
      return (
        <Card>
          <BlockStack align="center" gap="400">
            <Spinner accessibilityLabel="Loading revenue data" size="large" />
            <BlockStack align="center" gap="200">
              <Text as="h3">
                {isManualRefresh ? 'Fetching latest revenue data...' : 'Loading revenue analytics...'}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {isManualRefresh ? 'Getting the most up-to-date information from Shopify' : 'Preparing your analytics dashboard'}
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

    // Handle empty data state (no orders)
    if (!revenueData || revenueData.totalOrders === 0) {
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
                  <Icon source={CashDollarIcon} tone="info" />
                </Box>
                <BlockStack align="center" gap="200">
                  <Text as="h3" variant="headingMd">No Sales Data Yet</Text>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Your store hasn't made any sales yet. Once you start making sales, 
                    analytics will be automatically updated weekly with growth trends and insights.
                  </Text>
                </BlockStack>
                <BlockStack align="center" gap="300">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Get started:</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">• Add products to your store</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Set up your payment gateway</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Start marketing your products</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Use 'Refresh Now' for instant updates</Text>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>
      );
    }

    return (
    <BlockStack gap="500">
      {/* Revenue Overview Cards */}
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="start">
                <InlineStack gap="200" blockAlign="center">
                  <Box 
                    background="bg-fill-success-secondary" 
                    padding="200" 
                    borderRadius="100"
                  >
                    <Icon source={CashDollarIcon} tone="success" />
                  </Box>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Revenue
                  </Text>
                </InlineStack>
                <Badge tone={revenueData?.revenueGrowth && revenueData.revenueGrowth > 0 ? 'success' : 'critical'}>
                  {revenueData ? formatPercentage(revenueData.revenueGrowth) : '0%'}
                </Badge>
              </InlineStack>
              <Text as="p" variant="headingXl">
                {revenueData ? formatCurrency(revenueData.totalRevenue) : '$0.00'}
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Box 
                  background="bg-fill-info-secondary" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={OrderIcon} tone="info" />
                </Box>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Total Orders
                </Text>
              </InlineStack>
              <Text as="p" variant="headingXl">
                {revenueData?.totalOrders || 0}
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Box 
                  background="bg-fill-warning-secondary" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={ChartVerticalIcon} tone="warning" />
                </Box>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Avg Order Value
                </Text>
              </InlineStack>
              <Text as="p" variant="headingXl">
                {revenueData ? formatCurrency(revenueData.avgOrderValue) : '$0.00'}
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <Box 
                  background="bg-fill-success-secondary" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={CashDollarIcon} tone="success" />
                </Box>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Avg Customer Value
                </Text>
              </InlineStack>
              <Text as="p" variant="headingXl">
                {revenueData ? formatCurrency(revenueData.customerMetrics.avgCustomerValue) : '$0.00'}
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>

      {/* Top Revenue Products */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Top Revenue Generating Products
          </Text>
          {isLoading ? (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="center" gap="200">
                <Spinner size="small" />
                <Text as="p" variant="bodyMd">Loading revenue data...</Text>
              </InlineStack>
            </Box>
          ) : error ? (
            <Box padding="400" background="bg-surface-critical" borderRadius="200">
              <Text as="p" variant="bodyMd" tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          ) : revenueData?.topRevenueProducts && revenueData.topRevenueProducts.length > 0 ? (
            <BlockStack gap="300">
              {revenueData.topRevenueProducts.map((product, index) => (
                <Box 
                  key={product.id} 
                  paddingBlock="400" 
                  paddingInline="400" 
                  background="bg-surface-secondary" 
                  borderRadius="200"
                >
                  <InlineStack align="space-between">
                    <BlockStack gap="200">
                      <InlineStack gap="300" align="start">
                        <Badge tone="info">{`#${index + 1}`}</Badge>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {product.name}
                        </Text>
                        <Badge tone={product.growthRate > 0 ? 'success' : 'critical'}>
                          {formatPercentage(product.growthRate)}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Sold: {product.quantity} units
                      </Text>
                    </BlockStack>
                    <Text as="p" variant="headingMd" fontWeight="semibold">
                      {formatCurrency(product.revenue)}
                    </Text>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          ) : (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                No revenue data available for selected period
              </Text>
            </Box>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
    );
  };

  const renderInventoryTab = () => (
    <BlockStack gap="500">
      <Text as="h3" variant="headingMd">
        Inventory Forecasting & Analytics
      </Text>
      <Card>
        <Box padding="600" background="bg-surface-secondary" borderRadius="200">
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            Inventory analytics coming soon...
          </Text>
        </Box>
      </Card>
    </BlockStack>
  );

  return (
    <BlockStack gap="500">
      {/* Enhanced Header with Data Strategy Info */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start">
            <BlockStack gap="200">
              <Text as="h1" variant="headingLg">
                Analytics Dashboard
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Smart insights with weekly auto-refresh and on-demand updates
              </Text>
            </BlockStack>
            
            <InlineStack gap="300" align="end">
              <Box minWidth="200px">
                <Select
                  label="Time Period"
                  labelHidden
                  options={timePeriodOptions}
                  value={timePeriod}
                  onChange={setTimePeriod}
                />
              </Box>
              <Button
                icon={RefreshIcon}
                onClick={handleRefresh}
                loading={isLoading}
                tone={isManualRefresh ? 'success' : undefined}
                accessibilityLabel="Refresh data now"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Now'}
              </Button>
            </InlineStack>
          </InlineStack>

          <Divider />

          {/* Data Update Information */}
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400" wrap={false}>
              <InlineStack gap="200" blockAlign="center">
                <Icon source={ClockIcon} tone="subdued" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Auto-refreshes weekly
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
            </InlineStack>

            <Tooltip content="Data is automatically refreshed weekly to ensure performance. Click 'Refresh Now' for the latest information.">
              <Icon source={InfoIcon} tone="subdued" />
            </Tooltip>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        selected={activeTab}
        onSelect={setActiveTab}
      >
        <Card>
          <Box padding="400">
            {activeTab === 0 ? renderRevenueTab() : renderInventoryTab()}
          </Box>
        </Card>
      </Tabs>
    </BlockStack>
  );
}

export default Dashboard;

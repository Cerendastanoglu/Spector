import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Button,
  Icon,
  Spinner,
  Badge,
  Divider,
} from "@shopify/polaris";
import {
  CashDollarIcon,
  ChartVerticalIcon,
  AlertCircleIcon,
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@shopify/polaris-icons";
import { logger } from "~/utils/logger";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
  shopDomain?: string;
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

export function Dashboard({ isVisible, outOfStockCount: _outOfStockCount, onNavigate: _onNavigate, shopDomain: _shopDomain }: DashboardProps) {

  // Core state
  const [timePeriod] = useState('30'); // Fixed at 30 days
  const [productAnalyticsData, setProductAnalyticsData] = useState<ProductAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false); // Track if we've ever received data
  
  // Currency state
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  // Price distribution slider
  const [priceDistributionIndex, setPriceDistributionIndex] = useState(0);


  // Top Products Slider State
  
  const productAnalyticsFetcher = useFetcher<{ success: boolean; data?: ProductAnalyticsData; error?: string }>();
  const inventoryFetcher = useFetcher<{ success: boolean; data?: InventoryData; error?: string }>();
  
  // Refs to hold current values to prevent useEffect dependencies
  const timePeriodRef = useRef(timePeriod);
  const productAnalyticsFetcherRef = useRef(productAnalyticsFetcher);
  const inventoryFetcherRef = useRef(inventoryFetcher);
  
  // Request ID tracking to prevent race conditions
  // When user switches time periods rapidly, older requests may complete after newer ones
  // This ensures we only process the most recent request by tracking generation IDs
  const fetchGenerationRef = useRef(0);
  const currentRevenueGenerationRef = useRef(0);
  const currentInventoryGenerationRef = useRef(0);
  
  // Update refs when values change
  useEffect(() => {
    timePeriodRef.current = timePeriod;
    productAnalyticsFetcherRef.current = productAnalyticsFetcher;
    inventoryFetcherRef.current = inventoryFetcher;
  });

  // Cache key for localStorage
  const getCacheKey = useCallback((type: 'revenue' | 'inventory', period: string) => 
    `spector_${type}_data_${period}`, []);

  // Check if data needs refresh based on cache age
  const needsRefresh = useCallback((lastUpdate: Date | null): boolean => {
    if (!lastUpdate) return true;
    
    const now = new Date();
    const diffInMs = now.getTime() - lastUpdate.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    
    // Cache expiration policy:
    // - Product analytics data: expires after 5 minutes
    // - This ensures data stays fresh while reducing API calls
    // - User can always manually refresh for immediate updates
    const CACHE_EXPIRATION_MINUTES = 5;
    
    const shouldRefresh = diffInMinutes >= CACHE_EXPIRATION_MINUTES;
    
    if (shouldRefresh) {
      logger.debug(`Dashboard: Cache expired (${Math.round(diffInMinutes)} minutes old, max ${CACHE_EXPIRATION_MINUTES} minutes)`);
    } else {
      logger.debug(`Dashboard: Cache still valid (${Math.round(diffInMinutes)} minutes old)`);
    }
    
    return shouldRefresh;
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
            setHasReceivedData(true); // Mark that we've loaded data from cache
          }
          // else: Inventory data caching removed as feature not implemented yet
          logger.debug(`Dashboard: Loaded ${type} data from cache (${data?.totalProducts || 0} products)`);
          return true;
        }
      }
    } catch (error) {
      logger.warn('Dashboard: Error loading cached data (localStorage may be disabled):', error);
      // Gracefully handle localStorage errors (private browsing, quota exceeded, etc.)
      // Return false to trigger fresh data fetch
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
      logger.debug(`Dashboard: Saved ${type} data to cache (${data?.totalOrders || 0} orders)`);
    } catch (error) {
      // Gracefully handle localStorage errors with specific detection
      if (error instanceof DOMException) {
        if (error.name === 'QuotaExceededError') {
          logger.warn('Dashboard: localStorage quota exceeded. Consider clearing old cache data.');
          // Attempt to clear old cache entries to make room
          try {
            const keys = Object.keys(localStorage);
            const spectorKeys = keys.filter(k => k.startsWith('spector_'));
            if (spectorKeys.length > 0) {
              // Remove oldest entries (keep most recent)
              const sortedKeys = spectorKeys.sort();
              const toRemove = sortedKeys.slice(0, Math.ceil(sortedKeys.length / 2));
              toRemove.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  // Ignore errors during cleanup
                }
              });
              logger.debug(`Dashboard: Cleared ${toRemove.length} old cache entries`);
            }
          } catch (cleanupError) {
            logger.warn('Dashboard: Failed to cleanup cache:', cleanupError);
          }
        } else if (error.name === 'SecurityError') {
          logger.warn('Dashboard: localStorage access denied (private browsing mode or security restrictions)');
        } else {
          logger.warn('Dashboard: localStorage error:', error.name, error.message);
        }
      } else {
        logger.warn('Dashboard: Unexpected error saving cached data:', error);
      }
      // App continues to work without cache - data will be refetched next time
    }
  }, [getCacheKey]);

  // Reserved for future time period selector dropdown
  // const timePeriodOptions = [
  //   { label: 'Last 7 days', value: '7' },
  //   { label: 'Last 30 days', value: '30' },
  //   { label: 'Last 3 months', value: '90' },
  //   { label: 'Last 6 months', value: '180' },
  //   { label: 'Last 1 year', value: '365' },
  //   { label: 'Last 2 years', value: '730' },
  // ];



  const fetchFreshData = useCallback((type: 'revenue' | 'inventory', force = false) => {
    // Increment generation counter to track this specific fetch
    // Each new fetch gets a new generation number
    const fetchGeneration = ++fetchGenerationRef.current;
    
    logger.debug(`Dashboard: ${force ? 'Manual' : 'Auto'} ${type} data refresh (Generation #${fetchGeneration})`);
    setIsLoading(true);
    setError(null);
    setIsManualRefresh(force);
    
    const currentPeriod = timePeriodRef.current;
    const currentProductAnalyticsFetcher = productAnalyticsFetcherRef.current;
    const currentInventoryFetcher = inventoryFetcherRef.current;
    
    logger.debug("Dashboard: fetchFreshData called with type:", type, "force:", force, "generation:", fetchGeneration);
    if (type === 'revenue') {
      // Store this as the latest revenue fetch generation
      currentRevenueGenerationRef.current = fetchGeneration;
      logger.debug("Dashboard: Calling product-analytics API (Generation #" + fetchGeneration + ")");
      currentProductAnalyticsFetcher.load(`/app/api/product-analytics`);
    } else {
      // Store this as the latest inventory fetch generation
      currentInventoryGenerationRef.current = fetchGeneration;
      logger.debug("Dashboard: Calling inventory API (Generation #" + fetchGeneration + ")", currentPeriod);
      currentInventoryFetcher.load(`/app/api/inventory?period=${currentPeriod}`);
    }
  }, []); // No dependencies to prevent recreation

  // Load store currency from Shopify API
  const loadStoreCurrency = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'get-shop-info');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.shop) {
        const currencyCode = result.shop.currencyCode || 'USD';
        
        // Comprehensive currency symbol map supporting all major Shopify currencies
        const currencySymbols: { [key: string]: string } = {
          // Americas
          'USD': '$',        // US Dollar
          'CAD': 'C$',       // Canadian Dollar
          'MXN': '$',        // Mexican Peso
          'BRL': 'R$',       // Brazilian Real
          'ARS': '$',        // Argentine Peso
          'CLP': '$',        // Chilean Peso
          'COP': '$',        // Colombian Peso
          'PEN': 'S/',       // Peruvian Sol
          
          // Europe
          'EUR': '€',        // Euro
          'GBP': '£',        // British Pound
          'CHF': 'CHF ',     // Swiss Franc
          'SEK': 'kr',       // Swedish Krona
          'NOK': 'kr',       // Norwegian Krone
          'DKK': 'kr',       // Danish Krone
          'ISK': 'kr',       // Icelandic Króna
          'PLN': 'zł',       // Polish Złoty
          'CZK': 'Kč',       // Czech Koruna
          'HUF': 'Ft',       // Hungarian Forint
          'RON': 'lei',      // Romanian Leu
          'BGN': 'лв',       // Bulgarian Lev
          'HRK': 'kn',       // Croatian Kuna
          'RUB': '₽',        // Russian Ruble
          'UAH': '₴',        // Ukrainian Hryvnia
          'TRY': '₺',        // Turkish Lira
          'TL': '₺',         // Turkish Lira (alternative)
          
          // Asia-Pacific
          'JPY': '¥',        // Japanese Yen
          'CNY': '¥',        // Chinese Yuan
          'KRW': '₩',        // South Korean Won
          'INR': '₹',        // Indian Rupee
          'IDR': 'Rp',       // Indonesian Rupiah
          'MYR': 'RM',       // Malaysian Ringgit
          'PHP': '₱',        // Philippine Peso
          'SGD': 'S$',       // Singapore Dollar
          'THB': '฿',        // Thai Baht
          'VND': '₫',        // Vietnamese Dong
          'HKD': 'HK$',      // Hong Kong Dollar
          'TWD': 'NT$',      // Taiwan Dollar
          'AUD': 'A$',       // Australian Dollar
          'NZD': 'NZ$',      // New Zealand Dollar
          'PKR': '₨',        // Pakistani Rupee
          'BDT': '৳',        // Bangladeshi Taka
          'LKR': 'Rs',       // Sri Lankan Rupee
          'NPR': 'Rs',       // Nepalese Rupee
          
          // Middle East & Africa
          'AED': 'د.إ',      // UAE Dirham
          'SAR': '﷼',        // Saudi Riyal
          'QAR': '﷼',        // Qatari Riyal
          'KWD': 'د.ك',      // Kuwaiti Dinar
          'BHD': 'د.ب',      // Bahraini Dinar
          'OMR': '﷼',        // Omani Rial
          'JOD': 'د.ا',      // Jordanian Dinar
          'ILS': '₪',        // Israeli Shekel
          'EGP': '£',        // Egyptian Pound
          'ZAR': 'R',        // South African Rand
          'NGN': '₦',        // Nigerian Naira
          'KES': 'KSh',      // Kenyan Shilling
          'GHS': '₵',        // Ghanaian Cedi
          'MAD': 'د.م.',     // Moroccan Dirham
          'TND': 'د.ت',      // Tunisian Dinar
          
          // Other
          'NIO': 'C$',       // Nicaraguan Córdoba
          'CRC': '₡',        // Costa Rican Colón
          'BOB': 'Bs.',      // Bolivian Boliviano
          'PYG': '₲',        // Paraguayan Guaraní
          'UYU': '$U',       // Uruguayan Peso
          'VES': 'Bs.S',     // Venezuelan Bolívar
          'DOP': 'RD$',      // Dominican Peso
          'GTQ': 'Q',        // Guatemalan Quetzal
          'HNL': 'L',        // Honduran Lempira
          'PAB': 'B/.',      // Panamanian Balboa
        };
        
        setStoreCurrency(currencyCode);
        setCurrencySymbol(currencySymbols[currencyCode] || currencyCode + ' ');
        
        logger.debug(`💰 Dashboard: Store currency loaded: ${currencyCode} (${currencySymbols[currencyCode] || currencyCode})`);
      } else {
        throw new Error(result.error || 'Failed to fetch shop info');
      }
    } catch (error) {
      logger.error('Dashboard: Failed to load store currency:', error);
      // Fallback to USD
      setStoreCurrency('USD');
      setCurrencySymbol('$');
    }
  }, []);

  // Load currency on mount
  useEffect(() => {
    loadStoreCurrency();
  }, [loadStoreCurrency]);


  // Reset loading flag when tab or period changes
  useEffect(() => {
    setHasLoadedInitialData(false);
  }, [timePeriod]);



  // Smart data loading: check cache first, then fetch if needed
  useEffect(() => {
    logger.debug("Dashboard: useEffect triggered - isVisible:", isVisible, "hasLoadedInitialData:", hasLoadedInitialData);
    
    if (!isVisible) return;

    // Always load product performance data (revenue type)
    const type = 'revenue';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cacheKey = `${type}_0_${timePeriod}`;
    logger.debug("Dashboard: Loading data for type:", type, "timePeriod:", timePeriod);
    
    // Skip if we've already loaded data for this combination
    if (hasLoadedInitialData) return;
    
    // Try loading from cache first
    const hasCachedData = loadCachedData(type, timePeriod);
    
    // If no cached data or cache expired, fetch fresh data
    // But don't block UI - show dashboard structure with loading states
    if (!hasCachedData) {
      logger.debug(`Dashboard: No cached ${type} data found, fetching fresh data`);
      // Use a timeout to allow UI to render first, then fetch data
      setTimeout(() => {
        fetchFreshData(type, false);
      }, 100);
    }
    
    // Mark as loaded regardless of cache hit/miss
    setHasLoadedInitialData(true);
  }, [isVisible, timePeriod, fetchFreshData, hasLoadedInitialData, loadCachedData]);

  // Handle revenue data response
  // Race condition protection: Store the generation when effect runs
  // 
  // Memory leak analysis: This effect is safe because:
  // - It only depends on .data property (not entire fetcher object)
  // - .data only changes when API responses arrive (finite occurrences)
  // - Generation tracking prevents processing same response multiple times
  // - Effect cleanup isn't needed as we're only updating state
  const lastProcessedRevenueGeneration = useRef(-1);
  
  useEffect(() => {
    if (productAnalyticsFetcher.data) {
      const currentGeneration = currentRevenueGenerationRef.current;
      
      // Ignore responses from old fetches (race condition protection)
      // This happens when user switches periods rapidly before previous fetch completes
      if (currentGeneration <= lastProcessedRevenueGeneration.current) {
        logger.debug(`Dashboard: Ignoring stale product analytics response (Generation #${currentGeneration}, already processed #${lastProcessedRevenueGeneration.current})`);
        return;
      }
      
      lastProcessedRevenueGeneration.current = currentGeneration;
      logger.debug(`Dashboard: Product analytics data received (Generation #${currentGeneration})`, productAnalyticsFetcher.data);
      
      setHasReceivedData(true); // Mark that we've received data (even if empty)
      
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
  // Note: This useEffect is intentionally dependent on fetcher state/data
  // It's designed to react to state changes and won't cause memory leaks
  // because the state transitions are finite (loading -> idle)
  useEffect(() => {
    if (productAnalyticsFetcher.state === 'idle' && productAnalyticsFetcher.data) {
      setIsLoading(false);
    } else if (productAnalyticsFetcher.state === 'loading') {
      setIsLoading(true);
    }
  }, [productAnalyticsFetcher.state, productAnalyticsFetcher.data]);

  // Handle inventory data response
  // Race condition protection: Store the generation when effect runs
  //
  // Memory leak analysis: This effect is safe because:
  // - It only depends on .data property (not entire fetcher object)
  // - .data only changes when API responses arrive (finite occurrences)
  // - Generation tracking prevents processing same response multiple times
  // - Effect cleanup isn't needed as we're only updating state
  const lastProcessedInventoryGeneration = useRef(-1);
  
  useEffect(() => {
    if (inventoryFetcher.data) {
      const currentGeneration = currentInventoryGenerationRef.current;
      
      // Ignore responses from old fetches (race condition protection)
      // This happens when user switches periods rapidly before previous fetch completes
      if (currentGeneration <= lastProcessedInventoryGeneration.current) {
        console.log(`Dashboard: Ignoring stale inventory response (Generation #${currentGeneration}, already processed #${lastProcessedInventoryGeneration.current})`);
        return;
      }
      
      lastProcessedInventoryGeneration.current = currentGeneration;
      console.log(`Dashboard: Inventory data received (Generation #${currentGeneration})`);
      
      if (inventoryFetcher.data.success && inventoryFetcher.data.data) {
        // Inventory data state removed as feature not implemented yet
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
      currency: storeCurrency
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };





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
              onClick={() => {
                // Retry both revenue and inventory data fetches for complete recovery
                fetchFreshData('revenue', true);
                fetchFreshData('inventory', true);
              }}
              variant="primary"
            >
              Try Again
            </Button>
          </BlockStack>
        </Card>
      );
    }

    // Handle empty data state (no products)
    // Show empty state if:
    // 1. We've received data response (!isLoading && hasReceivedData), AND
    // 2. The data shows 0 products (productAnalyticsData?.totalProducts === 0)
    // This prevents showing empty state during initial skeleton loading
    if (!isLoading && hasReceivedData && productAnalyticsData?.totalProducts === 0) {
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
                  {(productAnalyticsData?.catalogHealth || 0).toFixed(1)}%
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
                    onClick={() => fetchFreshData('revenue', true)}
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
          </BlockStack>

          {/* Product Performance Content */}
          <Box paddingBlockStart="100">
            {renderProductPerformanceTab()}
          </Box>
        </BlockStack>
      </Card>

      
      </BlockStack>
    </>
  );
}

export default Dashboard;

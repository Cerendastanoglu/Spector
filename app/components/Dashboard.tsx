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
  Collapsible,
  Tooltip,
  ButtonGroup,
  Modal,
  Banner,
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
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";
import { logger } from "~/utils/logger";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
  shopDomain?: string;
  productAnalytics?: ProductAnalyticsData | null; // ← Add analytics prop
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
  outOfStockProducts: Array<{
    id: string;
    title: string;
    handle: string;
    sku: string | null;
    price: number;
    vendor: string | null;
    variantIds: string[];
    avgDailySales: number;
    daysSinceLastSale: number | null;
    recommendedReorder: number;
  }>;
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
  hasOrderAccess?: boolean; // Flag indicating if order data is available
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

export function Dashboard({ isVisible, outOfStockCount: _outOfStockCount, onNavigate, shopDomain: _shopDomain, productAnalytics }: DashboardProps) {

  // Core state
  const [timePeriod] = useState('30'); // Fixed at 30 days
  const [productAnalyticsData, setProductAnalyticsData] = useState<ProductAnalyticsData | null>(productAnalytics || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(!!productAnalytics);
  const [hasReceivedData, setHasReceivedData] = useState(!!productAnalytics); // Track if we've ever received data
  
  // Currency state
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  // Price distribution slider
  const [priceDistributionIndex, setPriceDistributionIndex] = useState(0);
  
  // Out of Stock accordion state
  const [isOosAccordionOpen, setIsOosAccordionOpen] = useState(false);
  const [safetyStockBuffers, setSafetyStockBuffers] = useState<{ [productId: string]: number }>({});
  
  // Safety Stock Buffer confirmation modal state
  const [bufferModalOpen, setBufferModalOpen] = useState(false);
  const [bufferUpdateLoading, setBufferUpdateLoading] = useState(false);
  const [bufferSuccessMessage, setBufferSuccessMessage] = useState<string | null>(null);
  const [bufferErrorMessage, setBufferErrorMessage] = useState<string | null>(null);
  const [pendingBufferAction, setPendingBufferAction] = useState<{
    productId: string;
    productTitle: string;
    bufferPercent: number;
    recommendedReorder: number;
    totalUnits: number;
    variantIds: string[];
  } | null>(null);

  // Inventory update fetcher for safety stock buffer
  const inventoryUpdateFetcher = useFetcher<{ success?: boolean; error?: string }>();

  // Top Products Slider State
  
  const productAnalyticsFetcher = useFetcher<{ success: boolean; data?: ProductAnalyticsData; error?: string }>();
  const inventoryFetcher = useFetcher<{ success: boolean; data?: InventoryData; error?: string }>();
  
  // Refs to hold current values to prevent useEffect dependencies
  const timePeriodRef = useRef(timePeriod);
  
  // Request ID tracking to prevent race conditions
  // When user switches time periods rapidly, older requests may complete after newer ones
  // This ensures we only process the most recent request by tracking generation IDs
  const fetchGenerationRef = useRef(0);
  const currentRevenueGenerationRef = useRef(0);
  const currentInventoryGenerationRef = useRef(0);
  
  // Track if initial fetch has been started to prevent duplicate calls during React Strict Mode
  const hasFetchedRef = useRef(false);
  
  // Update refs when values change
  useEffect(() => {
    timePeriodRef.current = timePeriod;
  });

  // NOTE: localStorage caching removed to comply with Shopify embedded app requirements
  // Data is fetched fresh on each page load. For better performance, consider implementing
  // server-side caching using Prisma/database or React Query for in-memory caching.

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
    
    if (type === 'revenue') {
      // Store this as the latest revenue fetch generation
      currentRevenueGenerationRef.current = fetchGeneration;
      logger.debug("Dashboard: Loading product-analytics data (Generation #" + fetchGeneration + ")");
      
      // Use the same pattern as ProductManagement - this works!
      productAnalyticsFetcher.load('/app/api/product-analytics');
    } else {
      // Inventory API not yet implemented
      currentInventoryGenerationRef.current = fetchGeneration;
      logger.warn("Dashboard: Inventory API not implemented yet");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - fetcher is stable

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


  // Smart data loading: fetch data when dashboard becomes visible
  useEffect(() => {
    logger.debug("Dashboard: useEffect triggered - isVisible:", isVisible, "hasLoadedInitialData:", hasLoadedInitialData, "hasFetchedRef:", hasFetchedRef.current);
    
    // Prevent duplicate fetches during React Strict Mode or re-renders
    if (!isVisible || hasLoadedInitialData || hasFetchedRef.current) return;

    // Always load product performance data (revenue type)
    const type = 'revenue';
    logger.debug("Dashboard: Loading data for type:", type, "timePeriod:", timePeriod);
    
    // Fetch fresh data (no caching to comply with Shopify requirements)
    logger.debug(`Dashboard: Fetching fresh ${type} data`);
    
    // Mark as loading to prevent duplicate fetches (both state and ref)
    setHasLoadedInitialData(true);
    hasFetchedRef.current = true;
    
    // Use a timeout to allow UI to render first, then fetch data
    setTimeout(() => {
      fetchFreshData(type, false);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, timePeriod, hasLoadedInitialData]);

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
        // Note: Caching removed to comply with Shopify embedded app requirements
        setError((productAnalyticsFetcher.data as any).warning || null); // Show warning if present
      } else {
        setError(productAnalyticsFetcher.data.error || 'Failed to load product analytics data');
        setProductAnalyticsData(null);
      }
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [productAnalyticsFetcher.data, timePeriod]);

  // Handle product analytics fetcher state changes
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
        logger.info(`Dashboard: Ignoring stale inventory response (Generation #${currentGeneration}, already processed #${lastProcessedInventoryGeneration.current})`);
        return;
      }
      
      lastProcessedInventoryGeneration.current = currentGeneration;
      logger.info(`Dashboard: Inventory data received (Generation #${currentGeneration})`);
      
      if (inventoryFetcher.data.success && inventoryFetcher.data.data) {
        // Inventory data state removed as feature not implemented yet
        // Note: Caching removed to comply with Shopify embedded app requirements
        setError(null);
      } else {
        setError(inventoryFetcher.data.error || 'Failed to load inventory data');
      }
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [inventoryFetcher.data, timePeriod]);

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
          <div className="metrics-grid">
            <InlineStack gap="300" wrap={true} blockAlign="start">
            <div className="metric-card-wrapper">
              <InlineStack gap="200" blockAlign="center">
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
                    {productAnalyticsData?.activeProducts || 0} active
                  </Text>
                  {isLoading && (
                    <InlineStack gap="100" blockAlign="center">
                      <Spinner size="small" />
                      <Text as="p" variant="bodyXs" tone="subdued">Updating...</Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </InlineStack>
            </div>

            <div className="metric-card-wrapper">
              <InlineStack gap="200" blockAlign="center">
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
                    Total inventory
                  </Text>
                </BlockStack>
              </InlineStack>
            </div>

            <div className="metric-card-wrapper">
              <InlineStack gap="200" blockAlign="center">
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
                    Per product
                  </Text>
                </BlockStack>
              </InlineStack>
            </div>

            <div className="metric-card-wrapper">
              <InlineStack gap="200" blockAlign="center">
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
                    Stock score
                  </Text>
                </BlockStack>
              </InlineStack>
            </div>
          </InlineStack>
          </div>
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
              <div className="stock-cards-grid">
                <InlineStack gap="300" wrap={true} blockAlign="start">
                <div className="stock-card-wrapper">
                  <Box 
                    padding="300" 
                    background="bg-surface" 
                    borderRadius="200" 
                    borderWidth="025" 
                    borderColor="border-success"
                  >
                    <InlineStack align="space-between" blockAlign="center" wrap={false}>
                      <InlineStack gap="200" blockAlign="center">
                        <Box 
                          background="bg-surface-success" 
                          padding="200" 
                          borderRadius="100"
                        >
                          <Icon source={CheckIcon} tone="success" />
                        </Box>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Well Stocked</Text>
                          <Text as="p" variant="bodyXs" tone="subdued">Good supply</Text>
                        </BlockStack>
                      </InlineStack>
                      <Text as="p" variant="heading2xl" fontWeight="bold" tone="success">
                        {productAnalyticsData.inventoryDistribution.wellStocked}
                      </Text>
                    </InlineStack>
                  </Box>
                </div>
                
                <div className="stock-card-wrapper">
                  <Box 
                    padding="300" 
                    background="bg-surface" 
                    borderRadius="200" 
                    borderWidth="025" 
                    borderColor="border-warning"
                  >
                    <InlineStack align="space-between" blockAlign="center" wrap={false}>
                      <InlineStack gap="200" blockAlign="center">
                        <Box 
                          background="bg-surface-warning" 
                          padding="200" 
                          borderRadius="100"
                        >
                          <Icon source={AlertTriangleIcon} tone="warning" />
                        </Box>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Low Stock</Text>
                          <Text as="p" variant="bodyXs" tone="subdued">Low levels</Text>
                        </BlockStack>
                      </InlineStack>
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {productAnalyticsData.inventoryDistribution.lowStock}
                      </Text>
                    </InlineStack>
                  </Box>
                </div>
                
                {/* Out of Stock Card - Clickable */}
                <div 
                  className="stock-card-wrapper"
                  onClick={() => productAnalyticsData.inventoryDistribution.outOfStock > 0 && setIsOosAccordionOpen(!isOosAccordionOpen)}
                  style={{ 
                    cursor: productAnalyticsData.inventoryDistribution.outOfStock > 0 ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    animation: productAnalyticsData.inventoryDistribution.outOfStock > 0 && !isOosAccordionOpen ? 'subtle-pulse 2s ease-in-out infinite' : 'none',
                    borderRadius: '8px',
                  }}
                  onMouseEnter={(e) => {
                    if (productAnalyticsData.inventoryDistribution.outOfStock > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <style>{`
                    @keyframes subtle-pulse {
                      0%, 100% { 
                        box-shadow: 0 0 0 0 rgba(228, 25, 59, 0); 
                      }
                      50% { 
                        box-shadow: 0 0 0 3px rgba(228, 25, 59, 0.15); 
                      }
                    }
                  `}</style>
                  <Box 
                    padding="300" 
                    background="bg-surface" 
                    borderRadius="200" 
                    borderWidth="025" 
                    borderColor="border-critical"
                  >
                    <InlineStack align="space-between" blockAlign="center" wrap={false}>
                      <InlineStack gap="200" blockAlign="center">
                        <Box 
                          background="bg-surface-critical" 
                          padding="200" 
                          borderRadius="100"
                        >
                          <Icon source={XIcon} tone="critical" />
                        </Box>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Out of Stock</Text>
                          <Text as="p" variant="bodyXs" tone="subdued">
                            {productAnalyticsData.inventoryDistribution.outOfStock > 0 
                              ? (isOosAccordionOpen ? 'Click to collapse' : 'Active products only →') 
                              : 'All stocked ✓'}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="heading2xl" fontWeight="bold" tone="critical">
                          {productAnalyticsData.inventoryDistribution.outOfStock}
                        </Text>
                        {productAnalyticsData.inventoryDistribution.outOfStock > 0 && (
                          <Icon 
                            source={isOosAccordionOpen ? ChevronUpIcon : ChevronDownIcon} 
                            tone="subdued" 
                          />
                        )}
                      </InlineStack>
                    </InlineStack>
                  </Box>
                </div>
              </InlineStack>
              </div>
            ) : (
              <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                <BlockStack align="center" gap="300">
                  <Spinner size="small" />
                  <Text as="p" variant="bodyMd" tone="subdued">Loading stock data...</Text>
                </BlockStack>
              </Box>
            )}

            {/* Out of Stock Products Accordion */}
            {productAnalyticsData?.inventoryDistribution?.outOfStock > 0 && (
              <Collapsible
                open={isOosAccordionOpen}
                id="oos-accordion"
                transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
              >
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="400">
                    {/* Success/Error Banners */}
                    {bufferSuccessMessage && (
                      <Banner tone="success" onDismiss={() => setBufferSuccessMessage(null)}>
                        {bufferSuccessMessage}
                      </Banner>
                    )}
                    {bufferErrorMessage && (
                      <Banner tone="critical" onDismiss={() => setBufferErrorMessage(null)}>
                        {bufferErrorMessage}
                      </Banner>
                    )}
                    
                    {/* Explanation Banner */}
                    <Box padding="300" background="bg-surface-info" borderRadius="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={AlertCircleIcon} tone="info" />
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            Set a safety stock buffer to order extra inventory and prevent future stockouts. Buffers are calculated from recommended reorder quantities.
                          </Text>
                          <Text as="p" variant="bodyXs" tone="subdued">
                            Only showing <strong>Active</strong> (live) products that are out of stock. Draft and archived products are excluded.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                    
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="h4" variant="headingMd" fontWeight="semibold">
                          Active Products Out of Stock ({productAnalyticsData.inventoryDistribution.outOfStock})
                        </Text>
                        <Badge tone="success">Live products only</Badge>
                      </BlockStack>
                      <InlineStack gap="300">
                        <Button
                          variant="primary"
                          tone="success"
                          onClick={() => onNavigate('forecasting')}
                          icon={ChartVerticalIcon}
                        >
                          View Forecast
                        </Button>
                        <ButtonGroup>
                          <Tooltip content="Add 10% extra inventory to ALL out of stock products below">
                            <Button
                              size="slim"
                              onClick={() => {
                                // TODO: Apply 10% buffer to all OOS products
                                console.log('Apply 10% buffer');
                              }}
                            >
                              +10% All
                            </Button>
                          </Tooltip>
                          <Tooltip content="Add 20% extra inventory to ALL out of stock products below">
                            <Button
                              size="slim"
                              onClick={() => {
                                // TODO: Apply 20% buffer to all OOS products
                                console.log('Apply 20% buffer');
                              }}
                            >
                              +20% All
                            </Button>
                          </Tooltip>
                        </ButtonGroup>
                      </InlineStack>
                    </InlineStack>
                    
                    <Divider />
                    
                    {/* OOS Product List */}
                    <BlockStack gap="300">
                      {productAnalyticsData.outOfStockProducts?.map((product) => {
                        const currentBuffer = safetyStockBuffers[product.id] || 0;
                        const baseUnits = product.recommendedReorder || 10;
                        const bufferUnits = Math.ceil(baseUnits * (currentBuffer / 100));
                        const totalUnits = baseUnits + bufferUnits;
                        
                        return (
                          <Box key={product.id} padding="300" background="bg-surface" borderRadius="200" borderWidth="025" borderColor="border">
                            <BlockStack gap="200">
                              <InlineStack align="space-between" blockAlign="start" wrap={false}>
                                <BlockStack gap="100">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
                                  <InlineStack gap="200">
                                    {product.sku && <Text as="span" variant="bodySm" tone="subdued">SKU: {product.sku}</Text>}
                                    <Text as="span" variant="bodySm" tone="subdued">{currencySymbol}{product.price.toFixed(2)}</Text>
                                  </InlineStack>
                                </BlockStack>
                                <BlockStack gap="100" inlineAlign="end">
                                  <Text as="p" variant="bodySm" tone="subdued">Recommended: {baseUnits} units</Text>
                                  {currentBuffer > 0 && (
                                    <Badge tone="info">+{currentBuffer}% buffer ({bufferUnits} extra)</Badge>
                                  )}
                                </BlockStack>
                              </InlineStack>
                              
                              <InlineStack align="space-between" blockAlign="center">
                                <ButtonGroup>
                                  {[10, 20, 30].map((percent) => (
                                    <Button
                                      key={percent}
                                      size="slim"
                                      variant={currentBuffer === percent ? 'primary' : 'secondary'}
                                      onClick={() => {
                                        const newBuffer = currentBuffer === percent ? 0 : percent;
                                        const newBufferUnits = Math.ceil(baseUnits * (newBuffer / 100));
                                        const newTotal = baseUnits + newBufferUnits;
                                        setPendingBufferAction({
                                          productId: product.id,
                                          productTitle: product.title,
                                          bufferPercent: newBuffer,
                                          recommendedReorder: baseUnits,
                                          totalUnits: newTotal,
                                          variantIds: product.variantIds || [],
                                        });
                                        setBufferModalOpen(true);
                                      }}
                                    >
                                      +{percent}%
                                    </Button>
                                  ))}
                                </ButtonGroup>
                                <BlockStack gap="050" inlineAlign="end">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                                    Order: {totalUnits} units
                                  </Text>
                                  <Text as="p" variant="bodyXs" tone="subdued">
                                    {currentBuffer > 0 ? `(${baseUnits} + ${bufferUnits} buffer)` : 'No buffer added'}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </BlockStack>
                          </Box>
                        );
                      })}
                      
                      {(!productAnalyticsData.outOfStockProducts || productAnalyticsData.outOfStockProducts.length === 0) && (
                        <Box padding="400" background="bg-surface" borderRadius="200">
                          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                            No out of stock products found
                          </Text>
                        </Box>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Box>
              </Collapsible>
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
            <InlineStack align="space-between" blockAlign="center" wrap={false}>
              <Text as="h3" variant="headingMd" fontWeight="semibold">
                Price Distribution Analysis
              </Text>
              {productAnalyticsData?.priceAnalysis?.priceDistribution && productAnalyticsData.priceAnalysis.priceDistribution.length > 5 && (
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Showing {Math.min(priceDistributionIndex + 1, productAnalyticsData.priceAnalysis.priceDistribution.length)} - {Math.min(priceDistributionIndex + 5, productAnalyticsData.priceAnalysis.priceDistribution.length)} of {productAnalyticsData.priceAnalysis.priceDistribution.length}
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
                        <th className="hide-mobile" style={{ 
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
                              <td className="hide-mobile" style={{ 
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
                  <InlineStack align="space-between" blockAlign="center" wrap={true}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Range:</strong> ${productAnalyticsData.priceAnalysis.minPrice.toFixed(2)} - ${productAnalyticsData.priceAnalysis.maxPrice.toFixed(2)}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Average:</strong> ${productAnalyticsData.priceAnalysis.avgPrice.toFixed(2)}
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
            <div className="product-carousel-container" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
                {productAnalyticsData.topProducts.map((product, index) => (
                  <div key={product.id} className="product-card">
                    <Box 
                      padding="300"
                      background="bg-surface" 
                      borderRadius="300"
                      borderWidth="025" 
                      borderColor="border"
                    >
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="start">
                        <InlineStack gap="200" blockAlign="center" wrap={false}>
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
                      </InlineStack>
                      
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {product.name}
                        </Text>
                        <InlineStack gap="100" blockAlign="center">
                          <Text as="p" variant="bodySm" tone="subdued">
                            {product.variants} variant{product.variants !== 1 ? 's' : ''}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">•</Text>
                          <Text as="p" variant="bodySm" fontWeight="semibold" tone="success">
                            {formatCurrency(product.value)}
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  </Box>
                  </div>
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
      <style dangerouslySetInnerHTML={{
        __html: `
          /* ============================================
             Mobile & Tablet Optimizations ONLY
             Desktop (>900px) is COMPLETELY UNCHANGED
             ============================================ */
          
          /* MOBILE ONLY: ≤768px */
          @media (max-width: 768px) {
            /* 1. Dashboard Header - Title with button on same line */
            .dashboard-header-row {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              gap: 12px !important;
              width: 100% !important;
            }
            
            .dashboard-title-subtitle {
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
              flex: 1 !important;
            }
            
            .dashboard-title h1 {
              font-size: 18px !important;
              line-height: 1.3 !important;
              margin: 0 !important;
            }
            
            .dashboard-subtitle p {
              font-size: 11px !important;
              line-height: 1.3 !important;
              margin: 0 !important;
            }
            
            .dashboard-button-wrapper {
              flex-shrink: 0 !important;
            }
            
            .dashboard-button-wrapper button {
              font-size: 12px !important;
              padding: 6px 12px !important;
              min-height: 32px !important;
            }
            
            /* 2. Metrics Grid - 2x2 layout, smaller, aligned */
            .metrics-grid .metric-card-wrapper {
              flex-basis: calc(50% - 8px) !important;
              max-width: calc(50% - 8px) !important;
            }
            
            .metric-card-wrapper .Polaris-Text--headingLg {
              font-size: 18px !important;
            }
            
            .metric-card-wrapper .Polaris-Text--bodySm {
              font-size: 11px !important;
            }
            
            .metric-card-wrapper .Polaris-Text--bodyXs {
              font-size: 10px !important;
            }
            
            /* 3. Stock Cards - Stack vertically */
            .stock-cards-grid .stock-card-wrapper {
              flex-basis: 100% !important;
              max-width: 100% !important;
            }
            
            .stock-card-wrapper .Polaris-Text--heading2xl {
              font-size: 24px !important;
            }
            
            .stock-card-wrapper .Polaris-Text--bodyMd {
              font-size: 13px !important;
            }
            
            .stock-card-wrapper .Polaris-Text--bodyXs {
              font-size: 11px !important;
            }
            
            /* Hide Orders column on mobile */
            .hide-mobile {
              display: none !important;
            }
            
            /* 4. Price Distribution - Keep simple */
            table {
              font-size: 12px !important;
            }
            
            table th {
              padding: 8px 12px !important;
              font-size: 11px !important;
            }
            
            table td {
              padding: 12px !important;
              font-size: 12px !important;
            }
          }
          
          /* DESKTOP: >900px - Explicitly preserve default behavior */
          @media (min-width: 901px) {
            .dashboard-header-row {
              display: revert !important;
            }
            
            .dashboard-title-subtitle {
              display: revert !important;
            }
            
            .dashboard-button-wrapper {
              display: revert !important;
            }
            
            .metrics-grid .metric-card-wrapper {
              flex: 1 !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            
            .stock-cards-grid .stock-card-wrapper {
              flex: 1 !important;
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
            }
          }
          
          /* TABLET ONLY: 769px - 900px */
          @media (min-width: 769px) and (max-width: 900px) {
            /* 1. Dashboard Header - Title with button on right */
            .dashboard-header-row {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              gap: 12px !important;
            }
            
            .dashboard-title-subtitle {
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
            }
            
            .dashboard-title h1 {
              font-size: 20px !important;
            }
            
            .dashboard-subtitle p {
              font-size: 12px !important;
            }
            
            .dashboard-button-wrapper button {
              font-size: 13px !important;
              min-height: 34px !important;
            }
            
            /* 2. Metrics Grid - 2x2 on tablet */
            .metric-card-wrapper {
              flex: 1 1 calc(50% - 16px) !important;
              min-width: calc(50% - 16px) !important;
              max-width: calc(50% - 16px) !important;
            }
            
            .metric-card-wrapper .Polaris-Text--headingLg {
              font-size: 20px !important;
            }
            
            /* 3. Stock Cards - Stack vertically on tablet too */
            .stock-card-wrapper {
              flex: 1 1 100% !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            
            /* 4. Price Distribution - Text above arrows on tablet */
            .price-distribution-header {
              display: flex !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              flex-wrap: wrap !important;
              gap: 12px !important;
            }
            
            .price-distribution-controls {
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-end !important;
              gap: 8px !important;
            }
            
            .price-distribution-controls .range-text {
              font-size: 12px !important;
              white-space: nowrap !important;
            }
            
            /* Table styling */
            table {
              font-size: 13px !important;
            }
            
            table th {
              padding: 10px 14px !important;
              font-size: 12px !important;
            }
            
            table td {
              padding: 14px !important;
              font-size: 13px !important;
            }
          }
        `
      }} />
      <BlockStack gap="300">
        {/* Unified Dashboard Header and Content */}
        <Card>
          <BlockStack gap="300">
            {/* Header Section */}
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="200">
                  <InlineStack gap="300" blockAlign="center">
                    <div className="dashboard-title">
                      <Text as="h1" variant="headingLg">
                        Analytics Dashboard
                      </Text>
                    </div>
                    {isLoading && (
                      <InlineStack gap="200" blockAlign="center">
                        <Spinner size="small" />
                        <Badge tone="info" size="small">
                          {isManualRefresh ? 'Refreshing' : 'Loading'}
                        </Badge>
                      </InlineStack>
                    )}
                  </InlineStack>
                  <div className="dashboard-subtitle">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Smart insights and comprehensive analytics for your store
                      {isLoading && !productAnalyticsData && ' • Loading product data...'}
                    </Text>
                  </div>
                </BlockStack>
                
                <div className="dashboard-button-wrapper">
                  <Button
                    onClick={() => fetchFreshData('revenue', true)}
                    loading={isLoading && isManualRefresh}
                    disabled={isLoading}
                    variant="secondary"
                    size="slim"
                  >
                    Refresh Data
                  </Button>
                </div>
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

      {/* Safety Stock Buffer Confirmation Modal */}
      <Modal
        open={bufferModalOpen}
        onClose={() => {
          if (!bufferUpdateLoading) {
            setBufferModalOpen(false);
            setPendingBufferAction(null);
          }
        }}
        title="Confirm Safety Stock Buffer"
        primaryAction={{
          content: bufferUpdateLoading ? 'Updating...' : (pendingBufferAction?.bufferPercent === 0 ? 'Remove Buffer' : 'Add Inventory'),
          loading: bufferUpdateLoading,
          onAction: async () => {
            if (pendingBufferAction && pendingBufferAction.variantIds.length > 0) {
              setBufferUpdateLoading(true);
              
              try {
                // Call the inventory update API
                const response = await fetch('/app/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update-inventory',
                    variantIds: pendingBufferAction.variantIds,
                    stockQuantity: pendingBufferAction.totalUnits.toString(),
                    stockUpdateMethod: 'set', // Set to exact quantity
                  }),
                });
                
                const result = await response.json();
                
                if (result.error) {
                  console.error('Inventory update failed:', result.error);
                  setBufferErrorMessage(`Failed to update inventory: ${result.error}`);
                  setTimeout(() => setBufferErrorMessage(null), 5000);
                  setBufferUpdateLoading(false);
                  setBufferModalOpen(false);
                  setPendingBufferAction(null);
                  return;
                }
                
                // Success - update local state and remove from OOS list
                setSafetyStockBuffers(prev => ({
                  ...prev,
                  [pendingBufferAction.productId]: pendingBufferAction.bufferPercent,
                }));
                
                // Remove the product from OOS list by refetching data
                // The product should no longer be OOS after inventory update
                setProductAnalyticsData(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    outOfStockProducts: prev.outOfStockProducts.filter(p => p.id !== pendingBufferAction.productId),
                    inventoryDistribution: {
                      ...prev.inventoryDistribution,
                      outOfStock: Math.max(0, prev.inventoryDistribution.outOfStock - 1),
                      wellStocked: prev.inventoryDistribution.wellStocked + 1,
                    }
                  };
                });
                
                // Show success message
                setBufferSuccessMessage(`✓ Added ${pendingBufferAction.totalUnits} units to "${pendingBufferAction.productTitle}"`);
                setTimeout(() => setBufferSuccessMessage(null), 5000);
                
                setBufferModalOpen(false);
                setPendingBufferAction(null);
              } catch (error) {
                console.error('Error updating inventory:', error);
                setBufferErrorMessage('Failed to update inventory. Please try again.');
                setTimeout(() => setBufferErrorMessage(null), 5000);
              } finally {
                setBufferUpdateLoading(false);
              }
            } else {
              // No variant IDs - show error
              setBufferErrorMessage('Cannot update inventory: No variant IDs available');
              setTimeout(() => setBufferErrorMessage(null), 5000);
              setBufferModalOpen(false);
              setPendingBufferAction(null);
            }
          },
          tone: pendingBufferAction?.bufferPercent === 0 ? 'critical' : undefined,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            disabled: bufferUpdateLoading,
            onAction: () => {
              setBufferModalOpen(false);
              setPendingBufferAction(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {pendingBufferAction && (
              <>
                <Text as="p" variant="bodyMd">
                  {pendingBufferAction.bufferPercent === 0 
                    ? `Are you sure you want to remove the safety stock buffer from "${pendingBufferAction.productTitle}"?`
                    : `Are you sure you want to add ${pendingBufferAction.totalUnits} units of inventory to "${pendingBufferAction.productTitle}"?`
                  }
                </Text>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" tone="subdued">Recommended reorder:</Text>
                      <Text as="span" variant="bodySm" fontWeight="semibold">{pendingBufferAction.recommendedReorder} units</Text>
                    </InlineStack>
                    {pendingBufferAction.bufferPercent > 0 && (
                      <>
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodySm" tone="subdued">Buffer ({pendingBufferAction.bufferPercent}%):</Text>
                          <Text as="span" variant="bodySm" fontWeight="semibold">+{Math.ceil(pendingBufferAction.recommendedReorder * (pendingBufferAction.bufferPercent / 100))} units</Text>
                        </InlineStack>
                        <Divider />
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">Total to order:</Text>
                          <Text as="span" variant="bodyMd" fontWeight="bold" tone="success">{pendingBufferAction.totalUnits} units</Text>
                        </InlineStack>
                      </>
                    )}
                  </BlockStack>
                </Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  This buffer helps prevent future stockouts by ordering extra inventory above the minimum recommended amount.
                </Text>
              </>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}

export default Dashboard;

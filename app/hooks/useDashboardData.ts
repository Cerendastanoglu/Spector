import { useState, useCallback, useRef, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { logger } from "~/utils/logger";

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

interface UseDashboardDataOptions {
  timePeriod: string;
  autoRefresh?: boolean;
}

interface UseDashboardDataReturn {
  productAnalyticsData: ProductAnalyticsData | null;
  inventoryData: InventoryData | null;
  isLoading: boolean;
  error: string | null;
  isManualRefresh: boolean;
  hasLoadedInitialData: boolean;
  hasReceivedData: boolean;
  fetchFreshData: (type: 'revenue' | 'inventory', force?: boolean) => void;
  productAnalyticsFetcher: ReturnType<typeof useFetcher<{ success: boolean; data?: ProductAnalyticsData; error?: string }>>;
  inventoryFetcher: ReturnType<typeof useFetcher<{ success: boolean; data?: InventoryData; error?: string }>>;
}

const CACHE_EXPIRATION_MINUTES = 5;

/**
 * Custom hook for managing Dashboard data fetching, caching, and state
 * 
 * Handles:
 * - Data fetching from APIs
 * - LocalStorage caching with expiration
 * - Loading and error states
 * - Race condition prevention
 * - Manual and auto refresh
 * 
 * @param options Configuration options
 * @returns Dashboard data and control functions
 */
export function useDashboardData({ timePeriod, autoRefresh = true }: UseDashboardDataOptions): UseDashboardDataReturn {
  // State
  const [productAnalyticsData, setProductAnalyticsData] = useState<ProductAnalyticsData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);

  // Fetchers
  const productAnalyticsFetcher = useFetcher<{ success: boolean; data?: ProductAnalyticsData; error?: string }>();
  const inventoryFetcher = useFetcher<{ success: boolean; data?: InventoryData; error?: string }>();

  // Refs to hold current values
  const timePeriodRef = useRef(timePeriod);
  const productAnalyticsFetcherRef = useRef(productAnalyticsFetcher);
  const inventoryFetcherRef = useRef(inventoryFetcher);

  // Request ID tracking to prevent race conditions
  const fetchGenerationRef = useRef(0);
  const currentRevenueGenerationRef = useRef(0);
  const currentInventoryGenerationRef = useRef(0);

  // Update refs when values change
  useEffect(() => {
    timePeriodRef.current = timePeriod;
    productAnalyticsFetcherRef.current = productAnalyticsFetcher;
    inventoryFetcherRef.current = inventoryFetcher;
  });

  // Cache helpers
  const getCacheKey = useCallback((type: 'revenue' | 'inventory', period: string) => 
    `spector_${type}_data_${period}`, []);

  const needsRefresh = useCallback((lastUpdate: Date | null): boolean => {
    if (!lastUpdate) return true;
    
    const now = new Date();
    const diffInMs = now.getTime() - lastUpdate.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    
    const shouldRefresh = diffInMinutes >= CACHE_EXPIRATION_MINUTES;
    
    if (shouldRefresh) {
      logger.debug(`useDashboardData: Cache expired (${Math.round(diffInMinutes)} minutes old, max ${CACHE_EXPIRATION_MINUTES} minutes)`);
    } else {
      logger.debug(`useDashboardData: Cache still valid (${Math.round(diffInMinutes)} minutes old)`);
    }
    
    return shouldRefresh;
  }, []);

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
            setHasReceivedData(true);
          } else if (type === 'inventory') {
            setInventoryData(data);
          }
          logger.debug(`useDashboardData: Loaded ${type} data from cache (${data?.totalProducts || 0} products)`);
          return true;
        }
      }
    } catch (error) {
      logger.warn('useDashboardData: Error loading cached data:', error);
    }
    return false;
  }, [needsRefresh, getCacheKey]);

  const saveCachedData = useCallback((type: 'revenue' | 'inventory', period: string, data: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = getCacheKey(type, period);
      const timestampKey = `${cacheKey}_timestamp`;
      const now = new Date();
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timestampKey, now.toISOString());
      logger.debug(`useDashboardData: Saved ${type} data to cache`);
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'QuotaExceededError') {
          logger.warn('useDashboardData: localStorage quota exceeded');
          // Attempt cleanup
          try {
            const keys = Object.keys(localStorage);
            const spectorKeys = keys.filter(k => k.startsWith('spector_'));
            if (spectorKeys.length > 0) {
              const sortedKeys = spectorKeys.sort();
              const toRemove = sortedKeys.slice(0, Math.ceil(sortedKeys.length / 2));
              toRemove.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  // Ignore cleanup errors
                }
              });
              logger.debug(`useDashboardData: Cleared ${toRemove.length} old cache entries`);
            }
          } catch (cleanupError) {
            logger.warn('useDashboardData: Failed to cleanup cache:', cleanupError);
          }
        }
      }
    }
  }, [getCacheKey]);

  // Fetch fresh data
  const fetchFreshData = useCallback((type: 'revenue' | 'inventory', force = false) => {
    const fetchGeneration = ++fetchGenerationRef.current;
    
    logger.debug(`useDashboardData: ${force ? 'Manual' : 'Auto'} ${type} data refresh (Generation #${fetchGeneration})`);
    setIsLoading(true);
    setError(null);
    setIsManualRefresh(force);
    
    const currentPeriod = timePeriodRef.current;
    const currentProductAnalyticsFetcher = productAnalyticsFetcherRef.current;
    const currentInventoryFetcher = inventoryFetcherRef.current;
    
    if (type === 'revenue') {
      currentRevenueGenerationRef.current = fetchGeneration;
      logger.debug("useDashboardData: Calling product-analytics API (Generation #" + fetchGeneration + ")");
      currentProductAnalyticsFetcher.load(`/app/api/product-analytics`);
    } else {
      currentInventoryGenerationRef.current = fetchGeneration;
      logger.debug("useDashboardData: Calling inventory API (Generation #" + fetchGeneration + ")", currentPeriod);
      currentInventoryFetcher.load(`/app/api/inventory?period=${currentPeriod}`);
    }
  }, []);

  // Handle product analytics fetcher response
  useEffect(() => {
    if (productAnalyticsFetcher.data) {
      logger.debug("useDashboardData: Product analytics fetcher data received");
      
      if (productAnalyticsFetcher.data.success && productAnalyticsFetcher.data.data) {
        setProductAnalyticsData(productAnalyticsFetcher.data.data);
        setHasReceivedData(true);
        saveCachedData('revenue', timePeriod, productAnalyticsFetcher.data.data);
        
        if (!hasLoadedInitialData) {
          setHasLoadedInitialData(true);
        }
      } else if (productAnalyticsFetcher.data.error) {
        setError(productAnalyticsFetcher.data.error);
      }
      
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [productAnalyticsFetcher.data, hasLoadedInitialData, timePeriod, saveCachedData]);

  // Handle inventory fetcher response
  useEffect(() => {
    if (inventoryFetcher.data) {
      logger.debug("useDashboardData: Inventory fetcher data received");
      
      if (inventoryFetcher.data.success && inventoryFetcher.data.data) {
        setInventoryData(inventoryFetcher.data.data);
        saveCachedData('inventory', timePeriod, inventoryFetcher.data.data);
      } else if (inventoryFetcher.data.error) {
        setError(inventoryFetcher.data.error);
      }
      
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [inventoryFetcher.data, timePeriod, saveCachedData]);

  // Initial data load
  useEffect(() => {
    if (!hasLoadedInitialData && autoRefresh) {
      logger.debug("useDashboardData: Initial data load");
      
      // Try to load from cache first
      const hasCachedRevenue = loadCachedData('revenue', timePeriod);
      
      if (hasCachedRevenue) {
        setHasLoadedInitialData(true);
        setIsLoading(false);
      } else {
        // No cache, fetch fresh data
        fetchFreshData('revenue', false);
      }
    }
  }, [hasLoadedInitialData, autoRefresh, timePeriod, loadCachedData, fetchFreshData]);

  return {
    productAnalyticsData,
    inventoryData,
    isLoading,
    error,
    isManualRefresh,
    hasLoadedInitialData,
    hasReceivedData,
    fetchFreshData,
    productAnalyticsFetcher,
    inventoryFetcher,
  };
}

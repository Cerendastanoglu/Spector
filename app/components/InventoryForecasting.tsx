import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { openInNewTab } from "../utils/browserUtils";
import { ProductConstants } from "../utils/scopedConstants";
import {
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  DataTable,
  Checkbox,
  TextField,
  Select,
  Thumbnail,
  Spinner,
  EmptyState,
  Box,
  Icon,
  Tabs,
  ChoiceList,
  RangeSlider,
  Tooltip,
} from '@shopify/polaris';
import { 
  ProductIcon, 
  EditIcon, 
  ViewIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MoneyIcon,
  ClockIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshIcon,
  CalendarIcon,
  InventoryIcon,
  ChartVerticalIcon,
} from "@shopify/polaris-icons";
import * as ss from 'simple-statistics';

interface Product {
  id: string;
  title: string;
  handle: string;
  featuredMedia?: {
    preview?: {
      image?: {
        url: string;
        altText?: string;
      };
    };
  };
  totalInventory: number;
  status: string;
  adminUrl?: string;
  storefrontUrl?: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        inventoryQuantity: number;
        price: string;
        sku?: string;
        inventoryItem?: {
          id: string;
          tracked: boolean;
        };
      };
    }>;
  };
}

interface ForecastData {
  productId: string;
  productTitle: string;
  currentStock: number;
  orderRate: number; // units per day
  daysUntilOutOfStock: number;
  recommendedReorderQuantity: number;
  confidence: number; // 0-100%
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: string;
}

interface InventoryForecastingProps {
  isVisible: boolean;
}

type ForecastCategory = 'all' | 'critical' | 'low-stock' | 'stable' | 'increasing-demand';
type SortField = 'title' | 'stock' | 'orderRate' | 'daysUntilOut' | 'confidence' | 'trend';
type SortDirection = 'asc' | 'desc';
type ForecastPeriod = '7' | '14' | '30' | '90';

export function InventoryForecasting({ isVisible }: InventoryForecastingProps) {
  const fetcher = useFetcher<{ products: Product[]; hasNextPage: boolean; endCursor?: string; error?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState<ForecastCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('daysUntilOut');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>('30');
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(ProductConstants.MAX_RETRIES);

  // Mock order history data for forecasting calculations
  const mockOrderHistory = {
    // This would normally come from Shopify orders API
    'product-1': [5, 3, 7, 4, 6, 8, 2, 5, 9, 3, 6, 4, 7, 5, 8, 3, 6, 4, 7, 5, 8, 3, 6, 4, 7, 5, 8, 3, 6, 4], // 30 days
    'product-2': [2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 3, 1],
    'product-3': [10, 12, 8, 15, 11, 9, 13, 10, 12, 8, 15, 11, 9, 13, 10, 12, 8, 15, 11, 9, 13, 10, 12, 8, 15, 11, 9, 13, 10, 12],
  };

  // Load products on mount
  useEffect(() => {
    if (isVisible && products.length === 0) {
      fetchAllProducts();
    }
  }, [isVisible]);

  const fetchAllProducts = async () => {
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);
    
    try {
      fetcher.submit(
        { action: "get-all-products" },
        { method: "POST", action: "/app/api/products" }
      );
      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAllProducts();
        }, Math.pow(2, retryCount) * 1000);
      }
    }
  };

  // Update products when fetcher data changes
  useEffect(() => {
    if (fetcher.data?.products) {
      setProducts(fetcher.data.products);
      setError(null);
      setIsLoading(false);
      generateForecastData(fetcher.data.products);
    } else if (fetcher.data?.error) {
      setError(fetcher.data.error);
      setIsLoading(false);
    } else if (fetcher.state === 'idle' && fetcher.data && !fetcher.data.products) {
      setError('No products found or failed to load');
      setIsLoading(false);
    }
  }, [fetcher.data, fetcher.state]);

  // Handle fetcher loading state
  useEffect(() => {
    if (fetcher.state === 'loading' || fetcher.state === 'submitting') {
      setIsLoading(true);
    } else if (fetcher.state === 'idle') {
      setIsLoading(false);
    }
  }, [fetcher.state]);

  // Generate forecast data based on mock order history
  const generateForecastData = (products: Product[]) => {
    const forecasts: ForecastData[] = products.map(product => {
      const productKey = product.id.replace('gid://shopify/Product/', '');
      const orderHistory = mockOrderHistory[productKey as keyof typeof mockOrderHistory] || 
        Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1);
      
      // Calculate order rate (units per day) using simple moving average
      const orderRate = ss.mean(orderHistory.slice(-7)); // Last 7 days average
      
      // Calculate trend using linear regression
      const trendData = orderHistory.slice(-14).map((value, index) => [index, value]);
      const trend = ss.linearRegression(trendData);
      const trendDirection = trend.m > 0.1 ? 'increasing' : trend.m < -0.1 ? 'decreasing' : 'stable';
      
      // Calculate days until out of stock
      const daysUntilOutOfStock = product.totalInventory > 0 ? 
        Math.floor(product.totalInventory / orderRate) : 0;
      
      // Calculate confidence based on data consistency
      const variance = ss.variance(orderHistory);
      const confidence = Math.max(0, Math.min(100, 100 - (variance / 10)));
      
      // Calculate recommended reorder quantity (safety stock + lead time demand)
      const leadTimeDays = 14; // Mock lead time
      const safetyStockMultiplier = 1.5;
      const recommendedReorderQuantity = Math.ceil(
        (orderRate * leadTimeDays * safetyStockMultiplier) + (orderRate * 7)
      );

      return {
        productId: product.id,
        productTitle: product.title,
        currentStock: product.totalInventory,
        orderRate: Math.round(orderRate * 100) / 100,
        daysUntilOutOfStock,
        recommendedReorderQuantity,
        confidence: Math.round(confidence),
        trend: trendDirection,
        lastUpdated: new Date().toISOString(),
      };
    });

    setForecastData(forecasts);
  };

  // Filter and sort forecast data
  const filteredForecasts = forecastData.filter(forecast => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!forecast.productTitle.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Category filter
    switch (currentCategory) {
      case 'critical':
        return forecast.daysUntilOutOfStock <= 7;
      case 'low-stock':
        return forecast.daysUntilOutOfStock > 7 && forecast.daysUntilOutOfStock <= 30;
      case 'stable':
        return forecast.trend === 'stable' && forecast.daysUntilOutOfStock > 30;
      case 'increasing-demand':
        return forecast.trend === 'increasing';
      case 'all':
      default:
        return true;
    }
  }).sort((a, b) => {
    const getValue = (forecast: ForecastData) => {
      switch (sortField) {
        case 'title': return forecast.productTitle;
        case 'stock': return forecast.currentStock;
        case 'orderRate': return forecast.orderRate;
        case 'daysUntilOut': return forecast.daysUntilOutOfStock;
        case 'confidence': return forecast.confidence;
        case 'trend': return forecast.trend;
        default: return forecast.daysUntilOutOfStock;
      }
    };

    const aVal = getValue(a);
    const bVal = getValue(b);
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleProductSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const getBadgeTone = (daysUntilOut: number): 'critical' | 'warning' | 'success' => {
    if (daysUntilOut <= 7) return 'critical';
    if (daysUntilOut <= 30) return 'warning';
    return 'success';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return TrendingUpIcon;
      case 'decreasing': return TrendingDownIcon;
      default: return ChartVerticalIcon;
    }
  };

  const getTrendTone = (trend: string): 'success' | 'critical' | 'info' => {
    switch (trend) {
      case 'increasing': return 'success';
      case 'decreasing': return 'critical';
      default: return 'info';
    }
  };

  const renderForecastTable = () => {
    const rows = filteredForecasts.map(forecast => {
      const product = products.find(p => p.id === forecast.productId);
      return [
        <InlineStack key={`${forecast.productId}-title`} gap="200" blockAlign="center">
          <Checkbox
            checked={selectedProducts.includes(forecast.productId)}
            onChange={(checked) => handleProductSelection(forecast.productId, checked)}
            label=""
          />
          <Thumbnail
            source={product?.featuredMedia?.preview?.image?.url || ProductIcon}
            alt={product?.featuredMedia?.preview?.image?.altText || forecast.productTitle}
            size="small"
          />
          <BlockStack gap="100">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {forecast.productTitle}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {product?.handle || 'No handle'}
            </Text>
          </BlockStack>
        </InlineStack>,
        
        <InlineStack key={`${forecast.productId}-stock`} gap="200" blockAlign="center">
          <Badge tone={getBadgeTone(forecast.daysUntilOutOfStock)}>
            {forecast.currentStock} units
          </Badge>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-rate`} gap="200" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="medium">
            {forecast.orderRate}/day
          </Text>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-days`} gap="200" blockAlign="center">
          <Badge tone={getBadgeTone(forecast.daysUntilOutOfStock)}>
            {forecast.daysUntilOutOfStock} days
          </Badge>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-trend`} gap="200" blockAlign="center">
          <Icon source={getTrendIcon(forecast.trend)} tone={getTrendTone(forecast.trend)} />
          <Text as="span" variant="bodySm" tone={getTrendTone(forecast.trend)}>
            {forecast.trend}
          </Text>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-confidence`} gap="200" blockAlign="center">
          <Text as="span" variant="bodySm" fontWeight="medium">
            {forecast.confidence}%
          </Text>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-reorder`} gap="200" blockAlign="center">
          <Text as="span" variant="bodySm" fontWeight="medium">
            {forecast.recommendedReorderQuantity}
          </Text>
        </InlineStack>,

        <InlineStack key={`${forecast.productId}-actions`} gap="200">
          <Button
            icon={ViewIcon}
            variant="plain"
            onClick={() => {
              if (product?.storefrontUrl) {
                openInNewTab(product.storefrontUrl, () => {
                  setError('Failed to open product page. Please allow popups for this site.');
                });
              }
            }}
            accessibilityLabel={`View ${forecast.productTitle}`}
          />
          <Button
            icon={EditIcon}
            variant="plain"
            onClick={() => {
              if (product?.adminUrl) {
                openInNewTab(product.adminUrl, () => {
                  setError('Failed to open product page. Please allow popups for this site.');
                });
              }
            }}
            accessibilityLabel={`Edit ${forecast.productTitle}`}
          />
        </InlineStack>
      ];
    });

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={[
          'Product',
          'Current Stock',
          'Order Rate',
          'Days Until Out',
          'Trend',
          'Confidence',
          'Reorder Qty',
          'Actions'
        ]}
        rows={rows}
      />
    );
  };

  const renderForecastCharts = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Forecast Analytics</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Visual analytics and trend analysis will be available here. This will include:
          </Text>
          <ul>
            <li>Demand trend charts</li>
            <li>Stock level projections</li>
            <li>Seasonal pattern analysis</li>
            <li>Reorder point visualizations</li>
          </ul>
          <Button variant="secondary" disabled>
            Charts Coming Soon
          </Button>
        </BlockStack>
      </Card>
    );
  };

  const renderForecastSettings = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Forecast Settings</Text>
          <BlockStack gap="300">
            <TextField
              label="Forecast Period (Days)"
              value={forecastPeriod}
              onChange={setForecastPeriod}
              type="select"
              options={[
                { label: '7 days', value: '7' },
                { label: '14 days', value: '14' },
                { label: '30 days', value: '30' },
                { label: '90 days', value: '90' },
              ]}
            />
            <TextField
              label="Safety Stock Multiplier"
              value="1.5"
              disabled
              helpText="Multiplier for safety stock calculation"
            />
            <TextField
              label="Lead Time (Days)"
              value="14"
              disabled
              helpText="Average supplier lead time"
            />
          </BlockStack>
        </BlockStack>
      </Card>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BlockStack gap="600">
      {/* Error Display */}
      {error && (
        <Card background="bg-surface-critical">
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="p" variant="bodyMd" tone="critical">
                {error}
              </Text>
              <Button
                variant="plain"
                onClick={() => setError(null)}
                size="slim"
              >
                Dismiss
              </Button>
            </InlineStack>
            <Button
              onClick={fetchAllProducts}
              variant="secondary"
              size="slim"
              tone="critical"
            >
              Retry
            </Button>
          </BlockStack>
        </Card>
      )}

      {/* Header */}
      <Card>
        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg">
              🔒 Inventory Forecasting
            </Text>
            <InlineStack gap="300" blockAlign="center">
              <Badge tone={filteredForecasts.length === 0 ? 'attention' : 'info'}>
                {`${filteredForecasts.length} products forecasted`}
              </Badge>
              {selectedProducts.length > 0 && (
                <Badge tone="success">
                  {`${selectedProducts.length} selected`}
                </Badge>
              )}
              <Button 
                onClick={fetchAllProducts} 
                loading={isLoading || fetcher.state === 'submitting'} 
                variant="secondary"
                size="slim"
                icon={RefreshIcon}
              >
                Refresh
              </Button>
            </InlineStack>
          </InlineStack>
          
          <Text as="p" variant="bodyMd" tone="subdued">
            Predict inventory needs and optimize stock levels with AI-powered forecasting. 
            Get insights into order rates, stock depletion timelines, and reorder recommendations.
          </Text>
        </BlockStack>
      </Card>

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        height: 'calc(100vh - 200px)',
        flexDirection: 'row'
      }}>
        {/* Left Column - Filters and Settings */}
        <div style={{ 
          width: '420px', 
          minWidth: '400px', 
          flexShrink: 0
        }}>
          <BlockStack gap="400">
            {/* Filters */}
            <Card background="bg-surface-secondary" padding="400">
              <BlockStack gap="400">
                <Text as="h4" variant="headingSm">Filters & Search</Text>
                
                <TextField
                  label="Search Products"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by product name..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchQuery('')}
                />

                <Select
                  label="Forecast Category"
                  value={currentCategory}
                  onChange={(value) => setCurrentCategory(value as ForecastCategory)}
                  options={[
                    { label: 'All Products', value: 'all' },
                    { label: 'Critical (≤7 days)', value: 'critical' },
                    { label: 'Low Stock (8-30 days)', value: 'low-stock' },
                    { label: 'Stable Demand', value: 'stable' },
                    { label: 'Increasing Demand', value: 'increasing-demand' },
                  ]}
                />

                <InlineStack gap="300">
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Sort By"
                      value={`${sortField}-${sortDirection}`}
                      onChange={(value) => {
                        const [field, direction] = value.split('-');
                        setSortField(field as SortField);
                        setSortDirection(direction as SortDirection);
                      }}
                      options={[
                        { label: 'Days Until Out (Asc)', value: 'daysUntilOut-asc' },
                        { label: 'Days Until Out (Desc)', value: 'daysUntilOut-desc' },
                        { label: 'Order Rate (Asc)', value: 'orderRate-asc' },
                        { label: 'Order Rate (Desc)', value: 'orderRate-desc' },
                        { label: 'Confidence (Asc)', value: 'confidence-asc' },
                        { label: 'Confidence (Desc)', value: 'confidence-desc' },
                        { label: 'Product Name (A-Z)', value: 'title-asc' },
                        { label: 'Product Name (Z-A)', value: 'title-desc' },
                      ]}
                    />
                  </div>
                </InlineStack>

                {/* Statistics */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyXs" fontWeight="medium" tone="subdued">FORECAST SUMMARY</Text>
                  <InlineStack gap="400" wrap>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredForecasts.filter(f => f.daysUntilOutOfStock <= 7).length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Critical</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredForecasts.filter(f => f.trend === 'increasing').length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Growing</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {Math.round(ss.mean(filteredForecasts.map(f => f.confidence))) || 0}%
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Avg Confidence</Text>
                    </InlineStack>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Settings */}
            {renderForecastSettings()}
          </BlockStack>
        </div>

        {/* Right Column - Forecast Results */}
        <div style={{ 
          flex: 1, 
          height: 'calc(100vh - 200px)', 
          overflowY: 'auto' 
        }}>
          <BlockStack gap="400">
            {/* Tabs */}
            <Card>
              <Tabs
                tabs={[
                  { id: 'table', content: 'Forecast Table' },
                  { id: 'charts', content: 'Analytics' },
                ]}
                selected={activeTab}
                onSelect={setActiveTab}
              />
            </Card>

            {/* Tab Content */}
            {activeTab === 0 && (
              <Card>
                <BlockStack gap="400">
                  {isLoading ? (
                    <Box padding="800">
                      <InlineStack align="center" gap="200">
                        <Spinner size="large" />
                        <Text as="p" variant="bodyMd">Generating forecasts...</Text>
                      </InlineStack>
                    </Box>
                  ) : filteredForecasts.length === 0 ? (
                    <EmptyState
                      heading="No forecast data available"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <Text as="p" variant="bodyMd">
                        {searchQuery || currentCategory !== 'all' 
                          ? 'No products match your current filters.' 
                          : 'No products available for forecasting. Please ensure you have products with inventory tracking enabled.'}
                      </Text>
                      <Box padding="300">
                        <Button
                          onClick={() => {
                            setSearchQuery('');
                            setCurrentCategory('all');
                          }}
                          variant="primary"
                        >
                          Reset Filters
                        </Button>
                      </Box>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h4" variant="headingMd">
                          Forecast Results
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {filteredForecasts.length} products
                        </Text>
                      </InlineStack>
                      
                      {renderForecastTable()}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            )}

            {activeTab === 1 && renderForecastCharts()}
          </BlockStack>
        </div>
      </div>
    </BlockStack>
  );
}

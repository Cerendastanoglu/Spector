import { useState, useEffect } from "react";
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
  Spinner,
  Badge,
  InlineGrid,
  EmptyState,
} from "@shopify/polaris";
import {
  ProductIcon,
  ExportIcon,
  AlertCircleIcon,
  ChartVerticalIcon,
  CashDollarIcon,
  OrderIcon,
  RefreshIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";
import { PerformanceDashboard } from "./PerformanceDashboard";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
  }>;
  recentOrders: Array<{
    id: string;
    name: string;
    amount: number;
    date: string;
  }>;
}

export function Dashboard({ isVisible, outOfStockCount, onNavigate }: DashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetcher = useFetcher<{ success: boolean; data?: AnalyticsData; error?: string }>();

  const fetchAnalytics = () => {
    setIsLoading(true);
    setError(null);
    fetcher.load("/app/api/analytics");
  };

  useEffect(() => {
    if (isVisible) {
      fetchAnalytics();
    }
  }, [isVisible]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success && fetcher.data.data) {
        setAnalyticsData(fetcher.data.data);
        setError(null);
      } else {
        setError(fetcher.data.error || 'Failed to load analytics');
        setAnalyticsData(null);
      }
      setIsLoading(false);
    }
  }, [fetcher.data]);

  if (!isVisible) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Use real data when available, fallback to props or zero
  const currentOutOfStock = analyticsData?.outOfStockCount ?? outOfStockCount;

  const stats = [
    {
      title: "Out of Stock Products",
      value: currentOutOfStock.toString(),
      icon: AlertCircleIcon,
      tone: "critical" as const,
      action: () => onNavigate("out-of-stock"),
    },
    {
      title: "Total Revenue",
      value: analyticsData ? formatCurrency(analyticsData.totalRevenue) : "$0.00",
      icon: CashDollarIcon,
      tone: "success" as const,
    },
    {
      title: "Total Orders",
      value: analyticsData?.totalOrders?.toString() || "0",
      icon: OrderIcon,
      tone: "info" as const,
    },
    {
      title: "Avg Order Value",
      value: analyticsData ? formatCurrency(analyticsData.avgOrderValue) : "$0.00",
      icon: ChartVerticalIcon,
      tone: "success" as const,
    },
    {
      title: "Restock Needed",
      value: analyticsData ? analyticsData.lowStockCount.toString() : "0",
      icon: ExportIcon,
      tone: "info" as const,
      action: () => onNavigate("restock"),
    },
  ];

  return (
    <BlockStack gap="600">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">
            Welcome to Spector
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Your advanced product monitoring dashboard. Keep track of inventory levels, 
            out-of-stock items, and get insights to optimize your product management.
          </Text>
        </BlockStack>
      </Card>

      <Grid>
        {stats.map((stat, index) => (
          <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Icon source={stat.icon} />
                  <Button variant="plain" onClick={stat.action}>
                    View Details
                  </Button>
                </InlineStack>
                <BlockStack gap="100">
                  <Text as="p" variant="headingXl">
                    {stat.value}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {stat.title}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Quick Actions
          </Text>
          <InlineStack gap="300">
            <Button 
              variant="primary" 
              onClick={() => onNavigate("out-of-stock")}
            >
              View Out of Stock Products
            </Button>
            <Button 
              onClick={() => onNavigate("analytics")}
            >
              View Analytics
            </Button>
            <Button 
              onClick={() => onNavigate("reports")}
            >
              Generate Report
            </Button>
            <Button 
              variant="plain" 
              onClick={() => onNavigate("settings")}
            >
              Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Top Products
              </Text>
              {isLoading ? (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" alignment="center">Loading top products...</Text>
                </Box>
              ) : error ? (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" tone="critical" alignment="center">
                    Error loading products data
                  </Text>
                </Box>
              ) : analyticsData?.topProducts && analyticsData.topProducts.length > 0 ? (
                <BlockStack gap="200">
                  {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                    <Box 
                      key={index} 
                      paddingBlock="200" 
                      paddingInline="300" 
                      background="bg-surface-secondary" 
                      borderRadius="200"
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            {product.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Quantity: {product.quantity}
                          </Text>
                        </BlockStack>
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          Qty: {product.quantity}
                        </Text>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    No products data available
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Grid.Cell>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Recent Orders
              </Text>
              {isLoading ? (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" alignment="center">Loading orders...</Text>
                </Box>
              ) : error ? (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" tone="critical" alignment="center">
                    Error loading orders data
                  </Text>
                </Box>
              ) : analyticsData?.recentOrders && analyticsData.recentOrders.length > 0 ? (
                <BlockStack gap="200">
                  {analyticsData.recentOrders.slice(0, 5).map((order, index) => (
                    <Box 
                      key={order.id} 
                      paddingBlock="200" 
                      paddingInline="300" 
                      background="bg-surface-secondary" 
                      borderRadius="200"
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            Order #{order.name || order.id}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {order.date}
                          </Text>
                        </BlockStack>
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          {formatCurrency(order.amount)}
                        </Text>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    No orders data available
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Analytics Summary
          </Text>
          {isLoading ? (
            <Box padding="400">
              <Text as="p" variant="bodyMd" alignment="center">Loading analytics...</Text>
            </Box>
          ) : error ? (
            <Box padding="400">
              <Text as="p" variant="bodyMd" tone="critical" alignment="center">
                {error}
              </Text>
            </Box>
          ) : analyticsData ? (
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">Total Revenue</Text>
                    <Text as="p" variant="headingMd">{formatCurrency(analyticsData.totalRevenue)}</Text>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">Total Orders</Text>
                    <Text as="p" variant="headingMd">{analyticsData.totalOrders}</Text>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">Top Products</Text>
                    <Text as="p" variant="headingMd">{analyticsData.topProducts?.length || 0}</Text>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">Low Stock Items</Text>
                    <Text as="p" variant="headingMd">{analyticsData.lowStockCount}</Text>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            </Grid>
          ) : (
            <Box padding="400">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                No analytics data available
              </Text>
            </Box>
          )}
        </BlockStack>
      </Card>

      <PerformanceDashboard />
    </BlockStack>
  );
}

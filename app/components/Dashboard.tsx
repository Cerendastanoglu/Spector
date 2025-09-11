import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Grid,
  Button,
  Icon,
} from "@shopify/polaris";
import {
  ProductIcon,
  ExportIcon,
  AlertCircleIcon,
} from "@shopify/polaris-icons";
import { PerformanceDashboard } from "./PerformanceDashboard";

interface DashboardProps {
  isVisible: boolean;
  outOfStockCount: number;
  onNavigate: (tab: string) => void;
}

export function Dashboard({ isVisible, outOfStockCount, onNavigate }: DashboardProps) {
  if (!isVisible) {
    return null;
  }

  const stats = [
    {
      title: "Out of Stock Products",
      value: outOfStockCount.toString(),
      icon: AlertCircleIcon,
      tone: "critical" as const,
      action: () => onNavigate("out-of-stock"),
    },
    {
      title: "Total Products",
      value: "1,234", // This would come from API
      icon: ProductIcon,
      tone: "success" as const,
      action: () => onNavigate("products"),
    },
    {
      title: "Low Stock Alerts",
      value: "12", // This would come from API
      icon: AlertCircleIcon,
      tone: "warning" as const,
      action: () => onNavigate("low-stock"),
    },
    {
      title: "Restock Needed",
      value: "8", // This would come from API
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

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Recent Activity
          </Text>
          <BlockStack gap="200">
            <Box paddingBlock="200" paddingInline="300" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">
                  12 products went out of stock in the last 24 hours
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  2 hours ago
                </Text>
              </InlineStack>
            </Box>
            <Box paddingBlock="200" paddingInline="300" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">
                  Low stock alert triggered for 5 products
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  6 hours ago
                </Text>
              </InlineStack>
            </Box>
            <Box paddingBlock="200" paddingInline="300" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">
                  Weekly inventory report generated
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  1 day ago
                </Text>
              </InlineStack>
            </Box>
          </BlockStack>
        </BlockStack>
      </Card>

      <PerformanceDashboard />
    </BlockStack>
  );
}

import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Grid,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  InventoryIcon,
  OrderIcon,
  MarketsIcon,
  SettingsIcon,
  StarIcon,
} from "@shopify/polaris-icons";

interface WelcomePageProps {
  onNavigate: (tab: string) => void;
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  return (
    <Page>
      <BlockStack gap="500">
        {/* Welcome Hero */}
        <Card>
          <Box padding="800">
            <BlockStack gap="500" align="center">
              <BlockStack gap="300" align="center">
                <Text as="h1" variant="heading3xl" alignment="center">
                  Welcome to Spector
                </Text>
                <Text as="p" variant="headingMd" alignment="center" tone="subdued">
                  Your Intelligent Inventory Management System
                </Text>
              </BlockStack>
              <Box paddingBlockStart="300" paddingBlockEnd="200">
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  Transform your inventory management with intelligent alerts, real-time tracking, and actionable insights. 
                  Spector helps you prevent stockouts, optimize product performance, and make data-driven decisions that grow your business.
                </Text>
              </Box>
              <Button
                variant="primary"
                size="large"
                onClick={() => onNavigate("dashboard")}
              >
                Explore Your Dashboard
              </Button>
            </BlockStack>
          </Box>
        </Card>

        {/* What's New This Month */}
        <Card>
          <Box padding="600">
            <BlockStack gap="500">
              <Text as="h2" variant="headingXl" alignment="center">
                What's New in Spector This Month
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                    <BlockStack gap="300" align="center">
                      <Text as="h3" variant="headingMd">Enhanced Analytics</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        New revenue tracking and profit margin insights to help you understand your most valuable products.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                    <BlockStack gap="300" align="center">
                      <Text as="h3" variant="headingMd">Smart Forecasting</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        AI-powered predictions for when you'll need to restock based on sales velocity and trends.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                    <BlockStack gap="300" align="center">
                      <Text as="h3" variant="headingMd">Mobile Alerts</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        Get instant push notifications on your phone when critical inventory events occur.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Box>
        </Card>

        {/* Pro Tips for Success */}
        <Card>
          <Box padding="600">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Pro Tips for Success
              </Text>
              <BlockStack gap="300">
                <Box padding="400" background="bg-surface-info" borderRadius="200">
                  <InlineStack gap="300" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">Set Smart Thresholds</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Configure alerts based on your average sales velocity. Fast-moving products need higher thresholds.
                      </Text>
                    </BlockStack>
                    <Button 
                      variant="secondary"
                      onClick={() => onNavigate("settings")}
                    >
                      Configure
                    </Button>
                  </InlineStack>
                </Box>
                <Box padding="400" background="bg-surface-success" borderRadius="200">
                  <InlineStack gap="300" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">Weekly Analytics Review</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Check your dashboard every Monday to identify trends and plan inventory for the week ahead.
                      </Text>
                    </BlockStack>
                    <Button 
                      variant="secondary"
                      onClick={() => onNavigate("dashboard")}
                    >
                      View Now
                    </Button>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Box>
        </Card>

        {/* Core Features */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-success" padding="300" borderRadius="200">
                    <Icon source={InventoryIcon} tone="success" />
                  </Box>
                  <Text as="h3" variant="headingMd">Smart Alerts</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Get notified before you run out. Set custom thresholds for each product.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-info" padding="300" borderRadius="200">
                    <Icon source={ChartVerticalIcon} tone="info" />
                  </Box>
                  <Text as="h3" variant="headingMd">Real-Time Sync</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Inventory updates instantly across all sales channels. Never oversell again.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-warning" padding="300" borderRadius="200">
                    <Icon source={OrderIcon} tone="warning" />
                  </Box>
                  <Text as="h3" variant="headingMd">Sales Analytics</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Identify your best-sellers and optimize your inventory strategy.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* Pricing Plans */}
        <BlockStack gap="400">
          <Text as="h2" variant="heading2xl" alignment="center">
            Choose Your Plan
          </Text>
          <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
            Scale your inventory management as you grow
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card>
                <Box padding="600">
                  <BlockStack gap="500" align="center">
                    <BlockStack gap="200" align="center">
                      <Text as="h3" variant="headingXl">Starter</Text>
                      <InlineStack gap="100" align="center">
                        <Text as="p" variant="heading3xl">Free</Text>
                        <Text as="p" variant="bodyLg" tone="subdued">forever</Text>
                      </InlineStack>
                    </BlockStack>
                    
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                        Perfect for small stores getting started with inventory management
                      </Text>
                      <BlockStack gap="200">
                        <InlineStack gap="200">
                          <Icon source={InventoryIcon} tone="subdued" />
                          <Text as="p" variant="bodyMd">Track up to 100 products</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Icon source={ChartVerticalIcon} tone="subdued" />
                          <Text as="p" variant="bodyMd">Basic analytics dashboard</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Icon source={OrderIcon} tone="subdued" />
                          <Text as="p" variant="bodyMd">Email notifications</Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                    
                    <Button variant="secondary" fullWidth onClick={() => onNavigate("dashboard")}>
                      Current Plan
                    </Button>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card>
                <Box padding="600" background="bg-surface-secondary">
                  <BlockStack gap="500" align="center">
                    <BlockStack gap="200" align="center">
                      <InlineStack gap="200" align="center">
                        <Text as="h3" variant="headingXl">Pro</Text>
                        <Box background="bg-surface-success" padding="200" borderRadius="200">
                          <Text as="p" variant="bodySm" fontWeight="medium">Most Popular</Text>
                        </Box>
                      </InlineStack>
                      <InlineStack gap="100" align="center">
                        <Text as="p" variant="heading3xl">$19</Text>
                        <Text as="p" variant="bodyLg" tone="subdued">/month</Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="success" alignment="center">
                        14-day free trial • Cancel anytime
                      </Text>
                    </BlockStack>
                    
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                        Advanced features for growing businesses that need complete control
                      </Text>
                      <BlockStack gap="200">
                        <InlineStack gap="200">
                          <Icon source={InventoryIcon} tone="success" />
                          <Text as="p" variant="bodyMd">Unlimited products & locations</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Icon source={ChartVerticalIcon} tone="success" />
                          <Text as="p" variant="bodyMd">Advanced analytics & forecasting</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Icon source={OrderIcon} tone="success" />
                          <Text as="p" variant="bodyMd">Custom alerts & automations</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Icon source={SettingsIcon} tone="success" />
                          <Text as="p" variant="bodyMd">Priority support & API access</Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                    
                    <Button variant="primary" fullWidth onClick={() => onNavigate("help")}>
                      Upgrade to Pro
                    </Button>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
          </Grid>
        </BlockStack>

        {/* Quick Setup Guide */}
        <Card>
          <Box padding="600">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                🚀 Get the Most Out of Spector
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">1. Set Alert Thresholds</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Customize when you want to be notified for each product
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("settings")}
                      >
                        Configure Alerts →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">2. Review Analytics</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Understand your sales patterns and inventory performance
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("dashboard")}
                      >
                        View Analytics →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">3. Check Notifications</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Stay on top of important inventory updates and alerts
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("notifications")}
                      >
                        View Notifications →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Box>
        </Card>

        {/* Getting Started */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Need Help Getting Started?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Access our comprehensive guides, video tutorials, and detailed pricing information to make the most of Spector.
                  </Text>
                  <Button 
                    variant="secondary"
                    onClick={() => onNavigate("help")}
                  >
                    Visit Help Center
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Ready to Start Managing Inventory?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Jump into your analytics dashboard and discover insights about your products, sales trends, and inventory performance.
                  </Text>
                  <Button 
                    variant="primary"
                    onClick={() => onNavigate("dashboard")}
                  >
                    Open Dashboard
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}

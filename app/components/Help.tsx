import {
  Card,
  Text,
  Button,
  Icon,
  InlineStack,
  BlockStack,
  Box,
  Tabs,
  Badge,
  Banner,
  Collapsible,
  Link,
  Grid,
  Thumbnail,
  Divider,
  Tooltip,
  ProgressBar,
  List,
  CalloutCard,
  EmptyState,
} from "@shopify/polaris";
import {
  QuestionCircleIcon,
  PlayIcon,
  ExternalIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  StarIcon,
  SettingsIcon,
  NotificationIcon,
  ProductIcon,
  SearchIcon,
  FilterIcon,
  ExportIcon,
  EditIcon,
  ViewIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";
import { useState } from "react";

interface HelpProps {
  isVisible: boolean;
}

export function Help({ isVisible }: HelpProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'getting-started', content: 'Getting Started', panelID: 'getting-started-panel' },
    { id: 'features', content: 'Features', panelID: 'features-panel' },
    { id: 'troubleshooting', content: 'Troubleshooting', panelID: 'troubleshooting-panel' },
    { id: 'support', content: 'Support', panelID: 'support-panel' },
  ];

  const renderOverview = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">Welcome to Spector Help Center</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Your complete guide to mastering inventory management and analytics
              </Text>
            </BlockStack>
            <Badge tone="success" size="large">v1.0.0</Badge>
          </InlineStack>
          
          <Banner tone="info">
            <Text as="p">
              <strong>New to Spector?</strong> Start with our "Getting Started" guide to set up your inventory monitoring in minutes!
            </Text>
          </Banner>
        </BlockStack>
      </Card>

      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
          <CalloutCard
            title="Quick Start Guide"
            illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            primaryAction={{
              content: 'Start Setup',
              onAction: () => setActiveTab(1),
            }}
          >
            <Text as="p">
              Get up and running with Spector in under 5 minutes. Perfect for first-time users.
            </Text>
          </CalloutCard>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
          <CalloutCard
            title="Feature Documentation"
            illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            primaryAction={{
              content: 'Explore Features',
              onAction: () => setActiveTab(2),
            }}
          >
            <Text as="p">
              Detailed guides for every feature, from basic inventory tracking to advanced analytics.
            </Text>
          </CalloutCard>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
          <CalloutCard
            title="Need Help?"
            illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            primaryAction={{
              content: 'Contact Support',
              onAction: () => setActiveTab(4),
            }}
          >
            <Text as="p">
              Can't find what you're looking for? Our support team is here to help.
            </Text>
          </CalloutCard>
        </Grid.Cell>
      </Grid>
    </BlockStack>
  );

  const renderGettingStarted = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Getting Started with Spector</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Follow this step-by-step guide to set up your inventory monitoring system
          </Text>
          
          <ProgressBar progress={25} size="small" />
          <Text as="p" variant="bodySm" tone="subdued">
            Complete these steps to unlock the full power of Spector
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Step 1: Dashboard Overview</Text>
          <Text as="p" variant="bodyMd">
            Your dashboard is the command center for all inventory operations. Here's what you'll find:
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={SettingsIcon} tone="info" />
                  <Text as="h4" variant="headingSm">Analytics Overview</Text>
                </InlineStack>
                <List type="bullet">
                  <List.Item>Real-time inventory counts</List.Item>
                  <List.Item>Revenue tracking (when order data is available)</List.Item>
                  <List.Item>Product performance metrics</List.Item>
                  <List.Item>Low stock alerts</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                <Text as="p" variant="bodySm" fontWeight="medium">
                  📹 Video Tutorial
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Box padding="300" background="bg-surface" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      YouTube Video Placeholder
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      "Dashboard Overview - 3 minutes"
                    </Text>
                  </Box>
                </div>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Step 2: Product Management Setup</Text>
          <Text as="p" variant="bodyMd">
            Configure your product monitoring and set up inventory thresholds
          </Text>
          
          <Collapsible
            open={expandedSections['product-setup']}
            id="product-setup"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            expandOnPrint
          >
            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">Setting Up Product Monitoring</Text>
              <List type="number">
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Navigate to Product Management</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click on the "Products" tab in the main navigation
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Configure Filters</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use the search and category filters to find specific products
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Set Inventory Thresholds</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Define when you want to be notified about low stock levels
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Enable Bulk Operations</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use bulk editing for pricing, collections, and status updates
                  </Text>
                </List.Item>
              </List>
              
              <Box padding="400" background="bg-surface-info" borderRadius="300">
                <InlineStack gap="200" blockAlign="start">
                  <Icon source={InfoIcon} tone="info" />
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Pro Tip: Use the slider controls to navigate through large product lists efficiently
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      The pagination system shows 10 products per page with Previous/Next navigation
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
            </BlockStack>
          </Collapsible>
          
          <Button
            onClick={() => toggleSection('product-setup')}
            variant="tertiary"
            icon={expandedSections['product-setup'] ? ChevronUpIcon : ChevronDownIcon}
          >
            {expandedSections['product-setup'] ? 'Hide Details' : 'Show Setup Details'}
          </Button>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Step 3: Notification Configuration</Text>
          <Text as="p" variant="bodyMd">
            Set up automated alerts for low stock and inventory changes
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Available Notification Types</Text>
                <List type="bullet">
                  <List.Item>Email alerts for team members</List.Item>
                  <List.Item>Webflow integration for customer notifications</List.Item>
                  <List.Item>CSV exports for reporting</List.Item>
                  <List.Item>Slack/Discord webhooks</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                <Text as="p" variant="bodySm" fontWeight="medium">
                  📹 Video Tutorial
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Box padding="300" background="bg-surface" borderRadius="200">
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    YouTube Video Placeholder
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    "Setting Up Notifications - 5 minutes"
                  </Text>
                  </Box>
                </div>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderFeatures = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Complete Feature Documentation</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Detailed guides for every feature in Spector, with step-by-step instructions and video tutorials
          </Text>
        </BlockStack>
      </Card>

      {/* Dashboard Features */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={SettingsIcon} tone="info" />
              <Text as="h3" variant="headingMd">Dashboard & Analytics</Text>
            </InlineStack>
            <Badge tone="success">Core Feature</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Your command center for inventory insights and business metrics
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Key Features</Text>
                <List type="bullet">
                  <List.Item>Real-time inventory overview</List.Item>
                  <List.Item>Revenue tracking and analytics</List.Item>
                  <List.Item>Product performance metrics</List.Item>
                  <List.Item>Low stock alerts and warnings</List.Item>
                  <List.Item>Interactive charts and graphs</List.Item>
                  <List.Item>Export capabilities for reporting</List.Item>
                </List>
                
                <Text as="h4" variant="headingSm">How to Use</Text>
                <List type="number">
                  <List.Item>Navigate to the Dashboard tab</List.Item>
                  <List.Item>View your inventory summary at the top</List.Item>
                  <List.Item>Use the tabs to switch between different analytics views</List.Item>
                  <List.Item>Click on any metric for detailed information</List.Item>
                  <List.Item>Use the refresh button to get the latest data</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                <Text as="p" variant="bodySm" fontWeight="medium">
                  📹 Video Tutorial
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Box padding="300" background="bg-surface" borderRadius="200">
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    YouTube Video Placeholder
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    "Dashboard Overview - 4 minutes"
                  </Text>
                  </Box>
                </div>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Product Management Features */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={ProductIcon} tone="success" />
              <Text as="h3" variant="headingMd">Product Management</Text>
            </InlineStack>
            <Badge tone="success">Advanced Feature</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Comprehensive product inventory management with advanced filtering and bulk operations
          </Text>
          
          <Collapsible
            open={expandedSections['product-management']}
            id="product-management"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <BlockStack gap="400">
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                  <BlockStack gap="300">
                    <Text as="h4" variant="headingSm">Core Features</Text>
                    <List type="bullet">
                      <List.Item>Advanced product filtering and search</List.Item>
                      <List.Item>Inventory categorization (All, Out of Stock, Critical, Low Stock, In Stock)</List.Item>
                      <List.Item>Bulk operations for pricing and collections</List.Item>
                      <List.Item>Product status management (Draft, Active, Archived)</List.Item>
                      <List.Item>Pagination with slider controls</List.Item>
                      <List.Item>Export functionality (CSV)</List.Item>
                    </List>
                  </BlockStack>
                </Grid.Cell>
                
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                  <BlockStack gap="300">
                    <Text as="h4" variant="headingSm">Bulk Operations</Text>
                    <List type="bullet">
                      <List.Item>Bulk pricing updates (set, increase, decrease, round)</List.Item>
                      <List.Item>Collection management (add, remove, replace)</List.Item>
                      <List.Item>Status changes (activate, draft multiple products)</List.Item>
                      <List.Item>Advanced error handling with retry logic</List.Item>
                      <List.Item>Progress tracking for large operations</List.Item>
                    </List>
                  </BlockStack>
                </Grid.Cell>
              </Grid>
              
              <Box padding="400" background="bg-surface-info" borderRadius="300">
                <InlineStack gap="200" blockAlign="start">
                  <Icon source={InfoIcon} tone="info" />
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Pro Tips for Product Management
                    </Text>
                    <List type="bullet">
                      <List.Item>Use the search bar to quickly find specific products by name, handle, or SKU</List.Item>
                      <List.Item>Apply filters before bulk operations to target specific product groups</List.Item>
                      <List.Item>Use the slider controls to navigate through large product lists efficiently</List.Item>
                      <List.Item>Export filtered results for external analysis or reporting</List.Item>
                    </List>
                  </BlockStack>
                </InlineStack>
              </Box>
            </BlockStack>
          </Collapsible>
          
          <Button
            onClick={() => toggleSection('product-management')}
            variant="tertiary"
            icon={expandedSections['product-management'] ? ChevronUpIcon : ChevronDownIcon}
          >
            {expandedSections['product-management'] ? 'Hide Details' : 'Show Detailed Guide'}
          </Button>
        </BlockStack>
      </Card>

      {/* Notifications Features */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={NotificationIcon} tone="warning" />
              <Text as="h3" variant="headingMd">Smart Notifications</Text>
            </InlineStack>
            <Badge tone="warning">Premium Feature</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Automated inventory alerts with multi-channel delivery and customer-facing notifications
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Notification Types</Text>
                <List type="bullet">
                  <List.Item>Email alerts for team members</List.Item>
                  <List.Item>Webflow integration for customer notifications</List.Item>
                  <List.Item>CSV exports for reporting</List.Item>
                  <List.Item>Slack/Discord webhooks</List.Item>
                  <List.Item>Real-time inventory monitoring</List.Item>
                </List>
                
                <Text as="h4" variant="headingSm">Setup Process</Text>
                <List type="number">
                  <List.Item>Select products to monitor (by collection, tags, or specific products)</List.Item>
                  <List.Item>Configure alert thresholds for each product/variant</List.Item>
                  <List.Item>Set up notification channels (email, webflow, etc.)</List.Item>
                  <List.Item>Test and activate monitoring</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                <Text as="p" variant="bodySm" fontWeight="medium">
                  📹 Video Tutorial
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Box padding="300" background="bg-surface" borderRadius="200">
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    YouTube Video Placeholder
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    "Setting Up Smart Notifications - 6 minutes"
                  </Text>
                  </Box>
                </div>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Data Retention & Security */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={SettingsIcon} tone="base" />
              <Text as="h3" variant="headingMd">Data Security & Retention</Text>
            </InlineStack>
            <Badge tone="info">Enterprise Feature</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Advanced data protection with encryption and automated retention policies
          </Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Security Features</Text>
                <List type="bullet">
                  <List.Item>AES-256-GCM encryption for sensitive data</List.Item>
                  <List.Item>Automated data retention policies</List.Item>
                  <List.Item>Secure data cleanup and expiration</List.Item>
                  <List.Item>Compliance with data protection standards</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Retention Policies</Text>
                <List type="bullet">
                  <List.Item>Analytics data: 90 days (configurable)</List.Item>
                  <List.Item>Product data: 180 days (configurable)</List.Item>
                  <List.Item>Logs: 30 days (configurable)</List.Item>
                  <List.Item>Automated cleanup via cron jobs</List.Item>
                </List>
              </BlockStack>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderTroubleshooting = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Troubleshooting Guide</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Common issues and solutions to help you get back on track quickly
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={AlertTriangleIcon} tone="critical" />
              <Text as="h3" variant="headingMd">Common Issues</Text>
            </InlineStack>
            <Badge tone="critical">Quick Fix</Badge>
          </InlineStack>
          
          <Collapsible
            open={expandedSections['data-loading']}
            id="data-loading"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">Data Not Loading</Text>
              <List type="number">
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Check your internet connection</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Ensure you have a stable internet connection and try refreshing the page
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Clear browser cache</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Press Ctrl+F5 (or Cmd+Shift+R on Mac) to hard refresh the page
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Check Shopify permissions</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Ensure the app has proper permissions to access your product data
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Try the refresh button</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use the refresh button in the top-right corner of the dashboard
                  </Text>
                </List.Item>
              </List>
            </BlockStack>
          </Collapsible>
          
          <Button
            onClick={() => toggleSection('data-loading')}
            variant="tertiary"
            icon={expandedSections['data-loading'] ? ChevronUpIcon : ChevronDownIcon}
          >
            {expandedSections['data-loading'] ? 'Hide Details' : 'Show Data Loading Issues'}
          </Button>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={NotificationIcon} tone="warning" />
              <Text as="h3" variant="headingMd">Notification Issues</Text>
            </InlineStack>
            <Badge tone="warning">Setup Help</Badge>
          </InlineStack>
          
          <Collapsible
            open={expandedSections['notification-issues']}
            id="notification-issues"
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">Notifications Not Working</Text>
              <List type="number">
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Check notification settings</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Go to Notifications tab and ensure channels are enabled and verified
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Verify email addresses</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Make sure email addresses are correct and can receive messages
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Test webhook URLs</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use the "Test Connection" button to verify webhook endpoints
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Check product selection</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Ensure you have selected products to monitor and set proper thresholds
                  </Text>
                </List.Item>
              </List>
            </BlockStack>
          </Collapsible>
          
          <Button
            onClick={() => toggleSection('notification-issues')}
            variant="tertiary"
            icon={expandedSections['notification-issues'] ? ChevronUpIcon : ChevronDownIcon}
          >
            {expandedSections['notification-issues'] ? 'Hide Details' : 'Show Notification Issues'}
          </Button>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={SettingsIcon} tone="base" />
              <Text as="h3" variant="headingMd">Performance Issues</Text>
            </InlineStack>
            <Badge tone="info">Optimization</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Tips to improve app performance and loading times
          </Text>
          
          <List type="bullet">
            <List.Item>Use pagination controls to load fewer products at once</List.Item>
            <List.Item>Apply filters to reduce the amount of data being processed</List.Item>
            <List.Item>Close unused browser tabs to free up memory</List.Item>
            <List.Item>Use the latest version of your web browser</List.Item>
            <List.Item>Disable browser extensions that might interfere with the app</List.Item>
          </List>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderSupport = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Support & Contact</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Get help from our support team and access additional resources
          </Text>
        </BlockStack>
      </Card>

      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="300" blockAlign="center">
                <Icon source={QuestionCircleIcon} tone="info" />
                <Text as="h3" variant="headingMd">Contact Support</Text>
              </InlineStack>
              
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Email Support</Text>
                <Text as="p" variant="bodyMd">
                  <Link url="mailto:support@spector.app">support@spector.app</Link>
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  We typically respond within 24 hours
                </Text>
              </BlockStack>
              
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Priority Support</Text>
                <Text as="p" variant="bodyMd">
                  <Link url="mailto:priority@spector.app">priority@spector.app</Link>
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  For urgent issues and enterprise customers
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="300" blockAlign="center">
                <Icon source={ExternalIcon} tone="success" />
                <Text as="h3" variant="headingMd">Resources</Text>
              </InlineStack>
              
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Documentation</Text>
                <List type="bullet">
                  <List.Item><Link url="#">API Documentation</Link></List.Item>
                  <List.Item><Link url="#">Integration Guides</Link></List.Item>
                  <List.Item><Link url="#">Best Practices</Link></List.Item>
                  <List.Item><Link url="#">Video Tutorials</Link></List.Item>
                </List>
              </BlockStack>
              
              <BlockStack gap="300">
                <Text as="h4" variant="headingSm">Community</Text>
                <List type="bullet">
                  <List.Item><Link url="#">Discord Community</Link></List.Item>
                  <List.Item><Link url="#">GitHub Issues</Link></List.Item>
                  <List.Item><Link url="#">Feature Requests</Link></List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={StarIcon} tone="warning" />
              <Text as="h3" variant="headingMd">Feature Requests</Text>
            </InlineStack>
            <Badge tone="warning">Feedback</Badge>
          </InlineStack>
          
          <Text as="p" variant="bodyMd">
            Help us improve Spector by suggesting new features or reporting bugs
          </Text>
          
          <InlineStack gap="300">
            <Button variant="primary" url="mailto:feedback@spector.app">
              Send Feedback
            </Button>
            <Button variant="secondary" url="#">
              View Roadmap
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">System Information</Text>
          
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">App Version</Text>
                <Text as="p" variant="bodyMd">v1.0.0</Text>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">Last Updated</Text>
                <Text as="p" variant="bodyMd">January 2025</Text>
              </BlockStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">Status</Text>
                <Badge tone="success">All Systems Operational</Badge>
              </BlockStack>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  if (!isVisible) return null;

  return (
    <BlockStack gap="500">
      <Tabs
        tabs={tabs}
        selected={activeTab}
        onSelect={setActiveTab}
        fitted={false}
      />
      
      <Box paddingBlockStart="400">
        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderGettingStarted()}
        {activeTab === 2 && renderFeatures()}
        {activeTab === 3 && renderTroubleshooting()}
        {activeTab === 4 && renderSupport()}
      </Box>
    </BlockStack>
  );
}

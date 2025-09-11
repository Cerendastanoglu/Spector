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
  Divider,
} from "@shopify/polaris";
import { 
  ProductIcon, 
  NotificationIcon, 
  ExportIcon,
  ViewIcon,
  EditIcon 
} from "@shopify/polaris-icons";

interface WelcomePageProps {
  onNavigate: (tab: string) => void;
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  return (
    <Page title="Welcome to Spector">
      <BlockStack gap="600">
        {/* Hero Section */}
        <Card>
          <BlockStack gap="400">
            <Box paddingBlockStart="600" paddingBlockEnd="600">
              <BlockStack gap="300" align="center">
                <Text as="h1" variant="heading2xl" alignment="center">
                  Welcome to Spector
                </Text>
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  Intelligent inventory management for your Shopify store
                </Text>
                <Text as="p" variant="bodyMd" alignment="center">
                  Track, manage, and optimize your product inventory with advanced analytics and automation.
                </Text>
                <InlineStack gap="300">
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => onNavigate('dashboard')}
                  >
                    Get Started
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="large"
                    onClick={() => onNavigate('out-of-stock')}
                  >
                    View Products
                  </Button>
                </InlineStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>

        {/* Features Grid */}
        <Grid>
          <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" align="start">
                  <Box>
                    <Icon source={ProductIcon} tone="base" />
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      Smart Inventory Tracking
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Real-time monitoring of stock levels with intelligent alerts when products run low.
                    </Text>
                    <Button 
                      variant="plain" 
                      onClick={() => onNavigate('dashboard')}
                    >
                      View Dashboard →
                    </Button>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" align="start">
                  <Box>
                    <Icon source={EditIcon} tone="base" />
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      Bulk Product Management
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Edit prices, collections, and inventory for multiple products simultaneously.
                    </Text>
                    <Button 
                      variant="plain" 
                      onClick={() => onNavigate('out-of-stock')}
                    >
                      Manage Products →
                    </Button>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" align="start">
                  <Box>
                    <Icon source={NotificationIcon} tone="base" />
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      Smart Notifications
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Get notified when inventory levels change or products need attention.
                    </Text>
                    <Button 
                      variant="plain" 
                      onClick={() => onNavigate('notifications')}
                    >
                      View Notifications →
                    </Button>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" align="start">
                  <Box>
                    <Icon source={ExportIcon} tone="base" />
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      Advanced Analytics
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Get insights into your inventory performance with detailed reports.
                    </Text>
                    <Button 
                      variant="plain" 
                      onClick={() => onNavigate('dashboard')}
                    >
                      View Analytics →
                    </Button>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Quick Actions
            </Text>
            <Divider />
            <InlineStack gap="300" wrap={false}>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate('out-of-stock')}
                icon={ViewIcon}
              >
                View All Products
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate('notifications')}
                icon={NotificationIcon}
              >
                Check Notifications
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onNavigate('dashboard')}
                icon={ExportIcon}
              >
                View Dashboard
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

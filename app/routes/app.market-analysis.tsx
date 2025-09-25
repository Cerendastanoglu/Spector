import { useState } from "react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Divider,
  Tabs,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  CashDollarIcon,
  AlertTriangleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  await authenticate.admin(request);
  
  // In the future, we can fetch market data, competitor analysis, etc.
  return json({
    success: true,
    message: "Market Analysis page loaded successfully"
  });
};

export default function MarketAnalysis() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 'overview', content: 'Market Overview' },
    { id: 'trends', content: 'Trends Analysis' },
    { id: 'competitors', content: 'Competitive Intelligence' },
    { id: 'opportunities', content: 'Growth Opportunities' },
  ];

  const renderOverviewTab = () => (
    <BlockStack gap="400">
      <Banner tone="info">
        <Text as="p" variant="bodySm">
          Market analysis tools are currently in development. Advanced AI-powered insights and competitive intelligence features will be available soon.
        </Text>
      </Banner>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm" fontWeight="semibold">Market Size</Text>
              <Icon source={ChartVerticalIcon} tone="info" />
            </InlineStack>
            <Text as="p" variant="headingMd" fontWeight="bold">Coming Soon</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Total addressable market analysis for your product categories
            </Text>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm" fontWeight="semibold">Price Trends</Text>
              <Icon source={CashDollarIcon} tone="success" />
            </InlineStack>
            <Text as="p" variant="headingMd" fontWeight="bold">Coming Soon</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Average pricing trends and optimal price points
            </Text>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm" fontWeight="semibold">Market Risks</Text>
              <Icon source={AlertTriangleIcon} tone="warning" />
            </InlineStack>
            <Text as="p" variant="headingMd" fontWeight="bold">Coming Soon</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Potential market risks and mitigation strategies
            </Text>
          </BlockStack>
        </Card>
      </div>
    </BlockStack>
  );

  const renderPlaceholderTab = (title: string, description: string) => (
    <EmptyState
      heading={`${title} - In Development`}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <Text as="p" variant="bodySm" tone="subdued">
        {description} This feature is being built with advanced AI capabilities and will be available in a future update.
      </Text>
    </EmptyState>
  );

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Header Section */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="start">
                  <BlockStack gap="200">
                    <Text as="h1" variant="headingLg">
                      Market Analysis & AI Insights
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      AI-powered market intelligence and competitive analysis tools
                    </Text>
                  </BlockStack>
                </InlineStack>

                <Divider />

                {/* Tabs Section */}
                <Box background="bg-surface-secondary" borderRadius="300" padding="200">
                  <Tabs
                    tabs={tabs}
                    selected={activeTab}
                    onSelect={setActiveTab}
                    fitted={true}
                  />
                </Box>
              </BlockStack>
            </Card>

            {/* Tab Content */}
            <Card>
              <Box paddingBlockStart="100">
                {activeTab === 0 && renderOverviewTab()}
                {activeTab === 1 && renderPlaceholderTab('Trends Analysis', 'Advanced trend analysis using machine learning to identify market patterns and consumer behavior shifts.')}
                {activeTab === 2 && renderPlaceholderTab('Competitive Intelligence', 'Comprehensive competitor monitoring including pricing strategies, product launches, and market positioning.')}
                {activeTab === 3 && renderPlaceholderTab('Growth Opportunities', 'AI-identified growth opportunities based on market gaps, emerging trends, and demand forecasting.')}
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
import { useState } from "react";
import { json } from "@remix-run/node";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Button,
  Icon,
  Badge,
  EmptyState,
  Divider,
  Select,
  TextField,
  Spinner,
} from "@shopify/polaris";
import {
  MagicIcon,
  SearchIcon,
  InfoIcon,
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
  const [isLoading, setIsLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState('market-trends');
  const [timeframe, setTimeframe] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAnalyze = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const analysisOptions = [
    { label: 'Market Trends', value: 'market-trends' },
    { label: 'Competitor Analysis', value: 'competitor-analysis' },
    { label: 'Price Intelligence', value: 'price-intelligence' },
    { label: 'Demand Forecasting', value: 'demand-forecasting' },
    { label: 'Consumer Insights', value: 'consumer-insights' },
  ];

  const timeframeOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 3 months', value: '90' },
    { label: 'Last 6 months', value: '180' },
    { label: 'Last 1 year', value: '365' },
  ];

  return (
    <BlockStack gap="500">
      {/* Header Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="center">
                <Box 
                  background="bg-surface-info" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={MagicIcon} tone="info" />
                </Box>
                <BlockStack gap="100">
                  <Text as="h1" variant="headingLg" fontWeight="bold">
                    Market Analysis & AI Insights
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Powered by AI to give you competitive intelligence and market insights
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
            <Badge tone="info">AI Powered</Badge>
          </InlineStack>

          <Divider />

          {/* Analysis Controls */}
          <InlineStack gap="400" wrap>
            <Box minWidth="250px">
              <Select
                label="Analysis Type"
                options={analysisOptions}
                value={analysisType}
                onChange={setAnalysisType}
              />
            </Box>
            <Box minWidth="200px">
              <Select
                label="Timeframe"
                options={timeframeOptions}
                value={timeframe}
                onChange={setTimeframe}
              />
            </Box>
            <Box minWidth="300px">
              <TextField
                label="Search Keywords"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Enter product categories, brands, or keywords..."
                prefix={<Icon source={SearchIcon} />}
                autoComplete="off"
              />
            </Box>
            <div style={{ alignSelf: 'flex-end' }}>
              <Button
                variant="primary"
                icon={MagicIcon}
                loading={isLoading}
                onClick={handleAnalyze}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Market'}
              </Button>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Feature Cards Grid */}
      <InlineStack gap="400" wrap>
        {/* Market Trends Card */}
        <div style={{ minWidth: '300px', flex: 1 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="center">
                <Box 
                  background="bg-surface-success" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={MagicIcon} tone="success" />
                </Box>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Market Trends
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Track industry trends and emerging opportunities
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Coming Soon:
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">• Real-time trend detection</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Seasonal pattern analysis</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Emerging category insights</Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </div>

        {/* Competitor Analysis Card */}
        <div style={{ minWidth: '300px', flex: 1 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="center">
                <Box 
                  background="bg-surface-info" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={SearchIcon} tone="info" />
                </Box>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Competitor Intelligence
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Monitor competitor pricing and strategies
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Coming Soon:
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">• Price comparison analysis</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Product positioning insights</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Market share tracking</Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </div>

        {/* AI Insights Card */}
        <div style={{ minWidth: '300px', flex: 1 }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="center">
                <Box 
                  background="bg-surface-warning" 
                  padding="200" 
                  borderRadius="100"
                >
                  <Icon source={InfoIcon} tone="warning" />
                </Box>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    AI-Powered Insights
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Get intelligent recommendations and predictions
                  </Text>
                </BlockStack>
              </InlineStack>
              
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Coming Soon:
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">• Demand prediction models</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Pricing optimization</Text>
                    <Text as="p" variant="bodySm" tone="subdued">• Growth opportunity alerts</Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Main Content Area */}
      {isLoading ? (
        <Card>
          <BlockStack align="center" gap="400">
            <Spinner accessibilityLabel="Analyzing market data" size="large" />
            <BlockStack align="center" gap="200">
              <Text as="h3" variant="headingMd">
                Analyzing Market Data...
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Our AI is processing market trends, competitor data, and consumer insights
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      ) : (
        <Card>
          <EmptyState
            heading="Ready to Analyze"
            action={{
              content: 'Start Analysis',
              onAction: handleAnalyze,
            }}
            secondaryAction={{
              content: 'Learn More',
              url: '#',
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Box maxWidth="400px">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                Select your analysis type and timeframe above, then click "Analyze Market" to get 
                AI-powered insights about your market, competitors, and growth opportunities.
              </Text>
            </Box>
          </EmptyState>
        </Card>
      )}

      {/* Information Footer */}
      <Card>
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={InfoIcon} tone="subdued" />
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              About Market Analysis
            </Text>
          </InlineStack>
          
          <Text as="p" variant="bodySm" tone="subdued">
            Our Market Analysis feature uses advanced AI algorithms to analyze market trends, 
            competitor data, and consumer behavior patterns. This helps you make data-driven 
            decisions about pricing, product positioning, and market opportunities.
          </Text>
          
          <InlineStack gap="400" wrap>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                🤖 AI-Powered Analysis
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Machine learning models trained on market data
              </Text>
            </BlockStack>
            
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                📊 Real-Time Data
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Up-to-date market information and trends
              </Text>
            </BlockStack>
            
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="semibold">
                🎯 Actionable Insights
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                Clear recommendations for business growth
              </Text>
            </BlockStack>
          </InlineStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
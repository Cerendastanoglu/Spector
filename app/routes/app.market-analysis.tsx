import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
  Badge,
  Tabs,
  Button,
  ButtonGroup,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  await authenticate.admin(request);
  return json({
    success: true,
    message: "Market Analysis page loaded successfully"
  });
};

interface StoreAnalysis {
  storeName: string;
  domain: string;
  storeType: string;
  primaryCategories: string[];
  totalProducts: number;
  totalVariants: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  pricingStats: {
    medianPrice: number;
    stdDeviation: number;
    coefficientOfVariation: number;
    topCategory: string | null;
    topCategoryShare: number | null;
  };
  topVendors: string[];
  productTypes: { [key: string]: number };
  marketInsights: {
    storeCategory: string;
    marketDescription: string;
    competitorExamples: string[];
    marketSize: string;
    growthTrends: string[];
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
  };
}

export default function MarketAnalysis() {
  const [activeTab, setActiveTab] = useState(0);
  const [analysis, setAnalysis] = useState<StoreAnalysis | null>(null);
  const fetcher = useFetcher<{ success: boolean; data?: StoreAnalysis; error?: string }>();
  
  // Competitor research state
  const [competitorRegion, setCompetitorRegion] = useState('worldwide');
  // Using competitorSize directly without setter as it's not being modified yet
  const competitorSize = 'all';
  const [competitorLocality, setCompetitorLocality] = useState('national');
  const [competitorType, setCompetitorType] = useState('hybrid');
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);
  const [competitorData, setCompetitorData] = useState<any[]>([]);

  // Real-time competitor research function
  const fetchCompetitors = async () => {
    setIsLoadingCompetitors(true);
    try {
      const response = await fetch('/app/api/competitor-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeClassification: analysis?.primaryCategories?.[0] || 'General Retail',
          region: competitorRegion,
          size: competitorSize,
          locality: competitorLocality,
          storeType: competitorType
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompetitorData(data.competitors || []);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
      setCompetitorData([]);
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  // Load market analysis on component mount
  useEffect(() => {
    if (fetcher.state === 'idle' && !fetcher.data && !analysis) {
      console.log("🔍 Loading market analysis with improved categorization...");
      fetcher.load('/app/api/market-analysis');
    }
  }, [fetcher, analysis]);

  // Update analysis when data is received
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.data) {
      console.log("✅ Market analysis loaded successfully");
      setAnalysis(fetcher.data.data);
    } else if (fetcher.data?.error) {
      console.error("❌ Market analysis error:", fetcher.data.error);
    }
  }, [fetcher.data]);

  // Loading state
  if (fetcher.state === 'loading' || !analysis) {
    return (
      <Page title="Market Analysis">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ 
                textAlign: 'center', 
                padding: '100px 40px',
                backgroundColor: 'var(--p-color-bg-surface)'
              }}>
                <BlockStack gap="400" align="center">
                  <Spinner size="large" />
                  <Text as="h2" variant="headingLg">Analyzing Store Data</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Processing product catalog and market intelligence
                  </Text>
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Error state
  if (fetcher.data?.error) {
    return (
      <Page title="Market Analysis">
        <Layout>
          <Layout.Section>
            <Banner tone="critical" title="Analysis Failed">
              <Text as="p">{fetcher.data.error}</Text>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'market-analysis', content: 'Market Analysis' },
    { id: 'trend-analysis', content: 'Trend Analysis' },
  ];

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    trend,
    details,
    accent 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    trend?: 'up' | 'down' | 'neutral';
    details?: string[];
    accent?: 'info' | 'success' | 'warning' | 'critical';
  }) => (
    <Card>
      <div style={{ 
        padding: '24px',
        borderLeft: accent ? `4px solid var(--p-color-border-${accent})` : undefined,
        background: accent ? `var(--p-color-bg-surface-${accent}-subdued)` : undefined
      }}>
        <BlockStack gap="300">
          <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">{title}</Text>
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingXl" fontWeight="bold">{value}</Text>
            {trend && (
              <Badge tone={trend === 'up' ? 'success' : trend === 'down' ? 'critical' : 'info'}>
                {trend === 'up' ? '↗ Trending Up' : trend === 'down' ? '↘ Trending Down' : '→ Stable'}
              </Badge>
            )}
          </InlineStack>
          {subtitle && <Text as="p" variant="bodyMd" tone="subdued">{subtitle}</Text>}
          {details && (
            <BlockStack gap="150">
              {details.map((detail, index) => (
                <div key={index} style={{ 
                  padding: '8px 12px', 
                  background: 'var(--p-color-bg-surface-secondary)', 
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--p-color-border-success)'
                }}>
                  <Text as="p" variant="bodyXs" tone="subdued">{detail}</Text>
                </div>
              ))}
            </BlockStack>
          )}
        </BlockStack>
      </div>
    </Card>
  );

  const renderOverviewTab = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px',
      marginTop: '24px'
    }}>
      <MetricCard 
        title="Store Classification"
        value={analysis?.storeType || 'N/A'}
        subtitle={`${analysis?.totalProducts} products across ${analysis?.primaryCategories.length} categories`}
        accent="info"
        details={[
          `Top category: ${analysis?.primaryCategories[0] || 'N/A'}`,
          `Total variants: ${analysis?.totalVariants || 0}`,
          `Vendor diversity: ${analysis?.topVendors.length || 0} vendors`
        ]}
      />
      <MetricCard 
        title="Average Price Point"
        value={`$${analysis?.averagePrice}`}
        subtitle={`Range: $${analysis?.priceRange.min} - $${analysis?.priceRange.max}`}
        trend="neutral"
        accent="success"
        details={[
          `Median price: $${analysis?.pricingStats.medianPrice}`,
          `Price spread: ${((analysis?.priceRange.max || 0) - (analysis?.priceRange.min || 0)).toFixed(0)}`,
          `Standard deviation: $${analysis?.pricingStats.stdDeviation?.toFixed(2) || '0'}`
        ]}
      />
      <MetricCard 
        title="Price Variability"
        value={`${(analysis?.pricingStats.coefficientOfVariation * 100).toFixed(1)}%`}
        subtitle={`${(analysis?.pricingStats.coefficientOfVariation || 0) > 1 ? 'High' : (analysis?.pricingStats.coefficientOfVariation || 0) > 0.5 ? 'Medium' : 'Low'} price diversity`}
        accent="warning"
        details={[
          `Coefficient of variation indicates price consistency`,
          `Lower values suggest more uniform pricing`,
          `Higher values indicate diverse price ranges`
        ]}
      />
      <MetricCard 
        title="Market Position"
        value={analysis?.marketInsights.storeCategory || 'Analyzing...'}
        subtitle={analysis?.marketInsights.marketSize}
        accent="critical"
        details={[
          `Market description: ${analysis?.marketInsights.marketDescription?.slice(0, 50) + '...' || 'N/A'}`,
          `Growth opportunities identified: ${analysis?.marketInsights.opportunities?.length || 0}`,
          `Key competitors tracked: ${analysis?.marketInsights.competitorExamples?.length || 0}`
        ]}
      />
    </div>
  );

  const renderMarketAnalysisTab = () => (
    <div style={{ marginTop: '24px' }}>
      <BlockStack gap="400">
        {/* Market Insights Section */}
        <Card>
          <div style={{ padding: '24px' }}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Market Intelligence</Text>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                <div style={{ 
                  padding: '20px', 
                  background: 'var(--p-color-bg-surface-info-subdued)', 
                  borderRadius: '8px',
                  border: '1px solid var(--p-color-border-info-subdued)'
                }}>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Market Category</Text>
                    <Text as="p" variant="headingLg" fontWeight="bold">{analysis?.marketInsights.storeCategory}</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">{analysis?.marketInsights.marketDescription}</Text>
                  </BlockStack>
                </div>
                
                <div style={{ 
                  padding: '20px', 
                  background: 'var(--p-color-bg-surface-success-subdued)', 
                  borderRadius: '8px',
                  border: '1px solid var(--p-color-border-success-subdued)'
                }}>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Market Size</Text>
                    <Text as="p" variant="headingLg" fontWeight="bold">{analysis?.marketInsights.marketSize}</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Current market scope and reach</Text>
                  </BlockStack>
                </div>
              </div>

              {/* Growth Opportunities */}
              {analysis?.marketInsights.opportunities && analysis.marketInsights.opportunities.length > 0 && (
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Growth Opportunities</Text>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px'
                  }}>
                    {analysis.marketInsights.opportunities.slice(0, 4).map((opportunity, index) => (
                      <div key={index} style={{ 
                        padding: '16px', 
                        background: 'var(--p-color-bg-surface-warning-subdued)', 
                        borderRadius: '8px',
                        borderLeft: '4px solid var(--p-color-border-warning)'
                      }}>
                        <Text as="p" variant="bodyMd">{opportunity}</Text>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              )}

              {/* Real-time Competitor Research */}
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">Competitive Intelligence</Text>
                  <InlineStack gap="200">
                    <Badge tone="info">{`${competitorData.length} competitors found`}</Badge>
                    <Button 
                      size="micro" 
                      onClick={fetchCompetitors} 
                      loading={isLoadingCompetitors}
                    >
                      {competitorData.length === 0 ? 'Research Competitors' : 'Refresh Research'}
                    </Button>
                  </InlineStack>
                </InlineStack>

                {/* Competitor Filters */}
                <InlineStack gap="400" wrap={true}>
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Region:</Text>
                    <ButtonGroup variant="segmented">
                      <Button
                        pressed={competitorRegion === 'worldwide'}
                        onClick={() => setCompetitorRegion('worldwide')}
                      >
                        Global
                      </Button>
                      <Button
                        pressed={competitorRegion === 'north-america'}
                        onClick={() => setCompetitorRegion('north-america')}
                      >
                        North America
                      </Button>
                      <Button
                        pressed={competitorRegion === 'europe'}
                        onClick={() => setCompetitorRegion('europe')}
                      >
                        Europe
                      </Button>
                    </ButtonGroup>
                  </div>
                  
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Market Reach:</Text>
                    <ButtonGroup variant="segmented">
                      <Button
                        pressed={competitorLocality === 'national'}
                        onClick={() => setCompetitorLocality('national')}
                      >
                        National
                      </Button>
                      <Button
                        pressed={competitorLocality === 'local'}
                        onClick={() => setCompetitorLocality('local')}
                      >
                        Local
                      </Button>
                    </ButtonGroup>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Store Type:</Text>
                    <ButtonGroup variant="segmented">
                      <Button
                        pressed={competitorType === 'web'}
                        onClick={() => setCompetitorType('web')}
                      >
                        Online
                      </Button>
                      <Button
                        pressed={competitorType === 'physical'}
                        onClick={() => setCompetitorType('physical')}
                      >
                        Physical
                      </Button>
                      <Button
                        pressed={competitorType === 'hybrid'}
                        onClick={() => setCompetitorType('hybrid')}
                      >
                        Hybrid
                      </Button>
                    </ButtonGroup>
                  </div>
                </InlineStack>

                {/* Competitor Results */}
                {competitorData.length > 0 && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '16px' 
                  }}>
                    {competitorData.slice(0, 8).map((competitor, index) => (
                      <div key={index} style={{
                        padding: '16px',
                        backgroundColor: 'var(--p-color-bg-surface-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--p-color-border-subdued)'
                      }}>
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="h4" variant="headingSm">{competitor.name}</Text>
                            <Badge tone="info">{competitor.storeType}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm">{competitor.description}</Text>
                          <InlineStack gap="200" wrap={true}>
                            <Badge>{`Revenue: ${competitor.revenue}`}</Badge>
                            <Badge>{`Founded: ${competitor.founded}`}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            <strong>Specialty:</strong> {competitor.specialty}
                          </Text>
                          {competitor.strengths && (
                            <div>
                              <Text as="p" variant="bodySm" tone="success">
                                <strong>Strengths:</strong> {competitor.strengths.join(', ')}
                              </Text>
                            </div>
                          )}
                        </BlockStack>
                      </div>
                    ))}
                  </div>
                )}

                {competitorData.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: 'var(--p-color-bg-surface-secondary)',
                    borderRadius: '8px',
                    border: '1px dashed var(--p-color-border-subdued)'
                  }}>
                    <BlockStack gap="200" align="center">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Click "Research Competitors" to discover real-time competitive intelligence
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        We'll analyze your store category and find relevant competitors with current market data
                      </Text>
                    </BlockStack>
                  </div>
                )}
              </BlockStack>
            </BlockStack>
          </div>
        </Card>
      </BlockStack>
    </div>
  );

  const renderPlaceholderTab = (title: string, description: string) => (
    <div style={{ marginTop: '24px' }}>
      <Card>
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          backgroundColor: 'var(--p-color-bg-surface-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--p-color-border-subdued)'
        }}>
          <BlockStack gap="400" align="center">
            <Text as="h2" variant="headingXl">{title}</Text>
            <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
              {description}
            </Text>
            <div style={{
              padding: '12px 24px',
              backgroundColor: 'var(--p-color-bg-surface-info)',
              borderRadius: '6px',
              border: '1px solid var(--p-color-border-info)'
            }}>
              <Text as="p" variant="bodySm" tone="subdued">
                Advanced analytics feature in development
              </Text>
            </div>
          </BlockStack>
        </div>
      </Card>
    </div>
  );

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Header with Integrated Tabs */}
            <Card>
              <div style={{ padding: '20px 24px 0 24px' }}>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h1" variant="headingXl">Market Analysis</Text>
                    <InlineStack gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        AI-powered insights and competitive intelligence
                      </Text>
                      {analysis && (
                        <InlineStack gap="150">
                          <Badge tone="success">Live</Badge>
                          <Badge tone="info">{`${analysis.totalProducts} Products`}</Badge>
                        </InlineStack>
                      )}
                    </InlineStack>
                  </BlockStack>
                  <Button
                    variant="primary"
                    icon={RefreshIcon}
                    onClick={() => { setAnalysis(null); fetcher.load('/app/api/market-analysis'); }}
                  >
                    Refresh
                  </Button>
                </InlineStack>
              </div>
              
              {/* Tabs integrated in header */}
              <div style={{ padding: '16px 24px 0 24px' }}>
                <Tabs
                  tabs={tabs}
                  selected={activeTab}
                  onSelect={setActiveTab}
                  fitted={false}
                />
              </div>
            </Card>

            {/* Tab Content */}
            <Card>
            <div style={{ minHeight: '500px', padding: '24px' }}>
              {activeTab === 0 && renderOverviewTab()}
              {activeTab === 1 && renderMarketAnalysisTab()}
              {activeTab === 2 && renderPlaceholderTab('Trend Analysis', 'Advanced trend analysis with predictive insights and market forecasting. Coming soon with enhanced AI-powered market intelligence.')}
            </div>
          </Card>

          {/* How Analysis Works Info Box */}
          <Card>
            <div style={{ padding: '20px' }}>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How Our Analysis Works</Text>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--p-color-bg-surface-secondary)', 
                    borderRadius: '8px' 
                  }}>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">📊 Data Collection</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        We analyze your product catalog, pricing, categories, and vendor data in real-time.
                      </Text>
                    </BlockStack>
                  </div>
                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--p-color-bg-surface-secondary)', 
                    borderRadius: '8px' 
                  }}>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">🤖 AI Processing</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Advanced algorithms classify your store type and identify market patterns.
                      </Text>
                    </BlockStack>
                  </div>
                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--p-color-bg-surface-secondary)', 
                    borderRadius: '8px' 
                  }}>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">💡 Insights Generation</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Generate actionable recommendations based on industry benchmarks and trends.
                      </Text>
                    </BlockStack>
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  background: 'var(--p-color-bg-surface-info)', 
                  borderRadius: '6px',
                  border: '1px solid var(--p-color-border-info)'
                }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    💡 <strong>Tip:</strong> Analysis updates automatically when you make changes to your product catalog. 
                    Use the refresh button to get the latest insights.
                  </Text>
                </div>
              </BlockStack>
            </div>
          </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
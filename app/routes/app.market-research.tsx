/**
 * Market Research Page
 * 
 * Analyzes product performance and identifies underperforming products
 * that need attention. Provides insights and recommendations for improvement.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Button,
  Badge,
  Banner,
  SkeletonBodyText,
  SkeletonDisplayText,
  Divider,
  ProgressBar,
  Thumbnail,
  EmptyState,
} from "@shopify/polaris";
import {
  ProductIcon,
  RefreshIcon,
  ChevronRightIcon,
  InfoIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import { getMarketResearchAccess } from "~/services/marketResearch.server";
import { checkSubscriptionStatus } from "~/services/billing.server";
import type { 
  ProductPerformance, 
  ProductInsight, 
  AnalysisResponse,
  MarketResearchAccess,
} from "~/types/marketResearch";

interface LoaderData {
  shop: string;
  access: MarketResearchAccess;
  hasActiveSubscription: boolean;
  subscriptionStatus: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  const [access, subscriptionResult] = await Promise.all([
    getMarketResearchAccess(admin.graphql, shop),
    checkSubscriptionStatus(admin.graphql, shop),
  ]);
  
  return json<LoaderData>({
    shop,
    access,
    hasActiveSubscription: subscriptionResult.hasActiveSubscription,
    subscriptionStatus: subscriptionResult.subscription?.status || null,
  });
};

export default function MarketResearchPage() {
  const { access } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<AnalysisResponse>();
  
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [hasRunInitialAnalysis, setHasRunInitialAnalysis] = useState(false);
  
  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    fetcher.submit(
      { action: "analyze", timeframeDays: 30 },
      { 
        method: "POST", 
        action: "/app/api/market-research",
        encType: "application/json",
      }
    );
  }, [fetcher]);
  
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      setAnalysisData(fetcher.data);
      setIsAnalyzing(false);
    }
  }, [fetcher.data, fetcher.state]);
  
  useEffect(() => {
    if (!hasRunInitialAnalysis && access.tier !== 'free') {
      setHasRunInitialAnalysis(true);
      const timer = setTimeout(() => runAnalysis(), 500);
      return () => clearTimeout(timer);
    }
  }, [hasRunInitialAnalysis, access.tier, runAnalysis]);
  
  return (
    <Page
      title="Market Research"
      subtitle="Analyze product performance and identify opportunities for improvement"
      primaryAction={{
        content: isAnalyzing ? "Analyzing..." : "Run Analysis",
        onAction: runAnalysis,
        loading: isAnalyzing,
        disabled: isAnalyzing,
        icon: RefreshIcon,
      }}
    >
      <Layout>
        <Layout.Section>
          <AccessBanner access={access} />
        </Layout.Section>
        
        {isAnalyzing && !analysisData ? (
          <Layout.Section>
            <AnalysisSkeleton />
          </Layout.Section>
        ) : analysisData ? (
          <>
            <Layout.Section>
              <SummaryCards data={analysisData} />
            </Layout.Section>
            
            <Layout.Section>
              <UnderperformersCard 
                products={analysisData.products} 
                insights={analysisData.insights}
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProduct}
              />
            </Layout.Section>
          </>
        ) : (
          <Layout.Section>
            <EmptyStateCard onRunAnalysis={runAnalysis} />
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}

function AccessBanner({ access }: { access: MarketResearchAccess }) {
  const tierLabels: Record<string, string> = {
    free: 'Free Tier', trial: 'Trial', basic: 'Basic Plan', pro: 'Pro Plan',
  };
  
  const productLimit = access.limits.productsPerAnalysis === -1 
    ? 'Unlimited' 
    : `${access.limits.productsPerAnalysis} products`;
  
  if (access.tier === 'basic' || access.tier === 'pro') {
    return (
      <Banner tone="success">
        <Text as="p">
          <strong>{tierLabels[access.tier]}</strong> — Full catalog analysis enabled.
        </Text>
      </Banner>
    );
  }
  
  return (
    <Banner tone={access.tier === 'trial' ? 'info' : 'warning'}>
      <Text as="p">
        <strong>{tierLabels[access.tier]}</strong> — Analyzing bottom {productLimit}. 
        Upgrade to unlock full catalog analysis.
      </Text>
    </Banner>
  );
}

function SummaryCards({ data }: { data: AnalysisResponse }) {
  const { summary } = data;
  
  return (
    <BlockStack gap="400">
      <Card>
        <InlineStack gap="800" align="space-between" wrap={false}>
          <BlockStack gap="100">
            <Text variant="bodySm" as="span" tone="subdued">Products Analyzed</Text>
            <InlineStack gap="100" blockAlign="baseline">
              <Text variant="headingLg" as="p" fontWeight="bold">{summary.productsAnalyzed}</Text>
              <Text variant="bodySm" as="span" tone="subdued">of {summary.totalProducts}</Text>
            </InlineStack>
          </BlockStack>
          
          <BlockStack gap="100">
            <Text variant="bodySm" as="span" tone="subdued">Underperformers</Text>
            <InlineStack gap="200" blockAlign="center">
              <Text variant="headingLg" as="p" fontWeight="bold" tone={summary.underperformersCount > 0 ? "critical" : "success"}>
                {summary.underperformersCount}
              </Text>
              {summary.underperformersCount > 0 && <Badge tone="critical" size="small">Needs Attention</Badge>}
            </InlineStack>
          </BlockStack>
          
          <BlockStack gap="100">
            <Text variant="bodySm" as="span" tone="subdued">Average Score</Text>
            <InlineStack gap="200" blockAlign="center">
              <Text variant="headingLg" as="p" fontWeight="bold">{summary.averageScore}</Text>
              <Text variant="bodySm" as="span" tone="subdued">/100</Text>
              <Box minWidth="80px">
                <ProgressBar 
                  progress={summary.averageScore} 
                  tone={summary.averageScore > 50 ? "success" : summary.averageScore > 25 ? "highlight" : "critical"}
                  size="small"
                />
              </Box>
            </InlineStack>
          </BlockStack>
        </InlineStack>
      </Card>
      
      <ScoringExplanation />
    </BlockStack>
  );
}

function ScoringExplanation() {
  return (
    <Banner icon={InfoIcon} tone="info">
      <BlockStack gap="200">
        <Text as="span" fontWeight="semibold">How we calculate scores</Text>
        <Text as="p" variant="bodySm">
          Each product gets a score from 0-100 based on: <strong>Sales (40%)</strong> — recent sales volume and revenue, 
          <strong> Recency (30%)</strong> — days since last sale, 
          <strong> Inventory (15%)</strong> — stock levels and sell-through rate, 
          <strong> Listing (10%)</strong> — product images and descriptions, 
          <strong> Pricing (5%)</strong> — margin analysis. 
          Products scoring below 50 are flagged as underperformers.
        </Text>
      </BlockStack>
    </Banner>
  );
}

function UnderperformersCard({ 
  products, insights, selectedProduct, onSelectProduct,
}: { 
  products: ProductPerformance[];
  insights: ProductInsight[];
  selectedProduct: string | null;
  onSelectProduct: (id: string | null) => void;
}) {
  if (products.length === 0) {
    return (
      <Card>
        <EmptyState heading="No underperformers found" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
          <p>Great news! All your products are performing well.</p>
        </EmptyState>
      </Card>
    );
  }
  
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">Bottom Performing Products</Text>
          <Badge>{`${products.length} products`}</Badge>
        </InlineStack>
        
        <Divider />
        
        <BlockStack gap="300">
          {products.map((product, index) => (
            <ProductRow 
              key={product.productId}
              product={product}
              rank={index + 1}
              insights={insights.filter(i => i.metadata && (i.metadata as Record<string, unknown>).productId === product.productId)}
              isSelected={selectedProduct === product.productId}
              onSelect={() => onSelectProduct(selectedProduct === product.productId ? null : product.productId)}
            />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

function ProductRow({ product, rank, insights, isSelected, onSelect }: { 
  product: ProductPerformance; rank: number; insights: ProductInsight[]; isSelected: boolean; onSelect: () => void;
}) {
  const scoreColor = product.scores.overall > 50 ? "success" : product.scores.overall > 25 ? "attention" : "critical";
  
  return (
    <Box padding="300" background={isSelected ? "bg-surface-secondary" : undefined} borderRadius="200">
      <BlockStack gap="300">
        <InlineStack gap="400" align="space-between" blockAlign="center">
          <InlineStack gap="300" blockAlign="center">
            <Text variant="bodyMd" as="span" fontWeight="bold" tone="subdued">#{rank}</Text>
            <Thumbnail source={product.featuredImage || ProductIcon} alt={product.title} size="small" />
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text variant="bodyMd" as="span" fontWeight="semibold">{product.title}</Text>
                {product.status !== 'ACTIVE' && <Badge tone="attention" size="small">{product.status}</Badge>}
              </InlineStack>
              <InlineStack gap="200">
                <Text variant="bodySm" as="span" tone="subdued">{product.currency} {product.price.toFixed(2)}</Text>
                <Text variant="bodySm" as="span" tone="subdued">•</Text>
                <Text variant="bodySm" as="span" tone="subdued">{product.totalInventory} in stock</Text>
                <Text variant="bodySm" as="span" tone="subdued">•</Text>
                <Text variant="bodySm" as="span" tone="subdued">{product.performance.totalSales} sold</Text>
              </InlineStack>
            </BlockStack>
          </InlineStack>
          
          <InlineStack gap="300" blockAlign="center">
            <BlockStack gap="100" inlineAlign="end">
              <Badge tone={scoreColor}>{`${product.scores.overall}/100`}</Badge>
              <ProgressBar progress={product.scores.overall} tone={scoreColor === "success" ? "success" : scoreColor === "attention" ? "highlight" : "critical"} size="small" />
            </BlockStack>
            <Button variant="plain" onClick={onSelect} icon={ChevronRightIcon} accessibilityLabel={`View details for ${product.title}`} />
          </InlineStack>
        </InlineStack>
        
        {isSelected && (
          <Box paddingBlockStart="300" paddingInlineStart="800">
            <BlockStack gap="300">
              <Divider />
              <InlineStack gap="400" wrap>
                <ScoreBreakdown label="Sales" value={product.scores.overall} />
                <ScoreBreakdown label="Pricing" value={product.scores.pricing} />
                <ScoreBreakdown label="Inventory" value={product.scores.inventory} />
                <ScoreBreakdown label="Listing" value={product.scores.listing} />
              </InlineStack>
              <InlineStack gap="400" wrap>
                <StatItem label="Total Revenue" value={`${product.currency} ${product.performance.totalRevenue.toFixed(2)}`} />
                <StatItem label="Orders" value={String(product.performance.totalOrders)} />
                <StatItem label="Avg Order Value" value={`${product.currency} ${product.performance.averageOrderValue.toFixed(2)}`} />
                <StatItem label="Days Without Sale" value={String(product.performance.daysWithoutSale)} />
              </InlineStack>
              {insights.length > 0 && (
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">Issues Found</Text>
                  {insights.map((insight, i) => <InsightRow key={i} insight={insight} />)}
                </BlockStack>
              )}
              <InlineStack gap="200">
                <Button url={`shopify://admin/products/${product.productId}`} variant="primary" size="slim">Edit Product</Button>
                <Button url={`shopify://admin/products/${product.productId}/analytics`} variant="secondary" size="slim">View Analytics</Button>
              </InlineStack>
            </BlockStack>
          </Box>
        )}
      </BlockStack>
    </Box>
  );
}

function ScoreBreakdown({ label, value }: { label: string; value: number }) {
  const tone = value > 50 ? "success" : value > 25 ? "attention" : "critical";
  return (
    <BlockStack gap="100" inlineAlign="center">
      <Text variant="bodySm" as="span" tone="subdued">{label}</Text>
      <Badge tone={tone} size="small">{String(value)}</Badge>
    </BlockStack>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <BlockStack gap="100">
      <Text variant="bodySm" as="span" tone="subdued">{label}</Text>
      <Text variant="bodyMd" as="span" fontWeight="semibold">{value}</Text>
    </BlockStack>
  );
}

function InsightRow({ insight }: { insight: ProductInsight }) {
  const toneMap: Record<string, 'critical' | 'warning' | 'info' | 'success'> = { critical: 'critical', warning: 'warning', info: 'info', success: 'success' };
  return (
    <Banner tone={toneMap[insight.severity]} hideIcon>
      <BlockStack gap="100">
        <Text variant="bodyMd" as="span" fontWeight="semibold">{insight.title}</Text>
        <Text variant="bodySm" as="span">{insight.recommendation}</Text>
      </BlockStack>
    </Banner>
  );
}

function AnalysisSkeleton() {
  return (
    <BlockStack gap="400">
      <InlineStack gap="400">
        {[1, 2, 3].map(i => (
          <Box key={i} minWidth="200px">
            <Card><BlockStack gap="200"><SkeletonDisplayText size="small" /><SkeletonBodyText lines={2} /></BlockStack></Card>
          </Box>
        ))}
      </InlineStack>
      <Card><BlockStack gap="400"><SkeletonDisplayText size="medium" /><SkeletonBodyText lines={5} /></BlockStack></Card>
    </BlockStack>
  );
}

function EmptyStateCard({ onRunAnalysis }: { onRunAnalysis: () => void }) {
  return (
    <BlockStack gap="400">
      <Card>
        <EmptyState 
          heading="Find products that need attention" 
          action={{ content: "Run Analysis", onAction: onRunAnalysis }} 
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <BlockStack gap="200">
            <Text as="p">Click "Run Analysis" to scan your catalog and identify products that aren't performing well.</Text>
          </BlockStack>
        </EmptyState>
      </Card>
      
      <Banner icon={InfoIcon} tone="info">
        <BlockStack gap="200">
          <Text as="span" fontWeight="semibold">What the analysis does</Text>
          <Text as="p" variant="bodySm">
            We'll look at your last 30 days of sales data and score each product based on sales performance, 
            inventory levels, listing quality, and pricing. Products with low scores will be flagged with 
            specific recommendations to help you improve them.
          </Text>
        </BlockStack>
      </Banner>
    </BlockStack>
  );
}
